/**
 * Mojibake repair.
 *
 * Source files across this repo render an em dash, a right arrow or a star as a short run of
 * Latin-1 punctuation instead. `AGENTS.md` shows one in its first paragraph.
 *
 * **Root cause.** Every one of them is the same accident, not a family of separate typos:
 * a file already encoded as UTF-8 was read back as Windows-1252 and saved again as UTF-8.
 * Windows-1252 assigns a character to almost every byte, so nothing errors: each byte of
 * the original multi-byte character simply becomes a character in its own right. An em dash
 * (U+2014, bytes `E2 80 94`) re-reads as three separate characters, U+00E2 U+20AC U+201D,
 * and is then written back out as nine bytes. That is why the corruption is always a run
 * starting with U+00C2-U+00F4: those are UTF-8 lead bytes seen through a single-byte codec.
 *
 * Because the transformation is byte-preserving it is exactly invertible, which is what this
 * module does. It is not a lookup table of the sequences that happen to appear today, which
 * would have to be extended for every new character. It reverses the encoding step:
 *
 *   1. find a run that looks like a UTF-8 character seen as Windows-1252,
 *   2. map those characters back to the bytes they came from,
 *   3. decode the bytes as UTF-8, *strictly*.
 *
 * Step 3 is the safety net. A run that is not really mojibake will not decode as valid
 * UTF-8, the decode throws, and the text is left exactly as it was. Prose that legitimately
 * contains a currency symbol followed by a letter, or an Arabic word, is never touched, and
 * running this twice changes nothing the second time.
 *
 * This file is deliberately **pure ASCII**: every non-ASCII character it needs is written as
 * an escape, and none appears literally, not even in these comments. A repair tool that
 * could itself be mojibaked, or that would rewrite its own documentation on the first run,
 * would be worthless.
 */

/**
 * Windows-1252's own assignments for bytes 0x80-0x9F, where it differs from Latin-1.
 * 0x81, 0x8D, 0x8F, 0x90 and 0x9D are unassigned and so cannot appear in mojibake.
 */
const CP1252_HIGH: ReadonlyArray<[number, number]> = [
  [0x80, 0x20ac], [0x82, 0x201a], [0x83, 0x0192], [0x84, 0x201e], [0x85, 0x2026],
  [0x86, 0x2020], [0x87, 0x2021], [0x88, 0x02c6], [0x89, 0x2030], [0x8a, 0x0160],
  [0x8b, 0x2039], [0x8c, 0x0152], [0x8e, 0x017d], [0x91, 0x2018], [0x92, 0x2019],
  [0x93, 0x201c], [0x94, 0x201d], [0x95, 0x2022], [0x96, 0x2013], [0x97, 0x2014],
  [0x98, 0x02dc], [0x99, 0x2122], [0x9a, 0x0161], [0x9b, 0x203a], [0x9c, 0x0153],
  [0x9e, 0x017e], [0x9f, 0x0178],
];

/** Unicode code point back to the Windows-1252 byte that produced it. */
const BYTE_OF = new Map<number, number>(CP1252_HIGH.map(([byte, cp]) => [cp, byte]));

/**
 * A UTF-8 lead byte as Windows-1252 renders it: C2-DF (2-byte), E0-EF (3-byte),
 * F0-F4 (4-byte). Written as a range so no literal mojibake appears in this file.
 */
const LEAD = '\\u00c2-\\u00f4';

/** Anything a UTF-8 continuation byte (0x80-0xBF) can look like once misdecoded. */
const CONTINUATION = [
  '\\u0080-\\u00bf', // Latin-1 range: bytes 0xA0-0xBF pass through unchanged
  '\\u0152\\u0153\\u0160\\u0161\\u0178\\u017d\\u017e\\u0192\\u02c6\\u02dc',
  '\\u2013\\u2014\\u2018-\\u201e\\u2020-\\u2022\\u2026\\u2030\\u2039\\u203a\\u20ac\\u2122',
].join('');

/** A lead followed by 1-3 continuations: one misdecoded UTF-8 character. */
const CANDIDATE = new RegExp(`[${LEAD}][${CONTINUATION}]{1,3}`, 'g');

const strictUtf8 = new TextDecoder('utf-8', { fatal: true });

/** The bytes a run of misdecoded characters originally was, or null if it cannot be one. */
function bytesOf(run: string): Uint8Array | null {
  const bytes = new Uint8Array(run.length);
  for (let i = 0; i < run.length; i++) {
    const cp = run.codePointAt(i)!;
    const byte = BYTE_OF.get(cp) ?? (cp <= 0xff ? cp : null);
    if (byte === null) return null;
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * Repairs double-encoded text. Returns the input unchanged when there is nothing to repair.
 *
 * Idempotent: repaired text contains no candidate runs, so a second pass is a no-op.
 */
export function fixMojibake(text: string): string {
  if (!text) return text;

  return text.replace(CANDIDATE, (run) => {
    const bytes = bytesOf(run);
    if (!bytes) return run;

    let decoded: string;
    try {
      decoded = strictUtf8.decode(bytes);
    } catch {
      return run; // not valid UTF-8, so it was never mojibake
    }

    // One character in, one character out. A run that decodes to several code points is a
    // coincidence rather than a single corrupted character, and rewriting it would be a
    // guess, so leave it alone.
    return [...decoded].length === 1 ? decoded : run;
  });
}

/** True when `text` contains at least one repairable sequence. */
export function hasMojibake(text: string): boolean {
  return fixMojibake(text) !== text;
}

/**
 * The repaired sequences in `text`, for reporting. Deduplicated, in first-seen order.
 */
export function findMojibake(text: string): { broken: string; fixed: string }[] {
  const seen = new Map<string, string>();
  for (const match of text.matchAll(CANDIDATE)) {
    const run = match[0];
    if (seen.has(run)) continue;
    const fixed = fixMojibake(run);
    if (fixed !== run) seen.set(run, fixed);
  }
  return [...seen].map(([broken, fixed]) => ({ broken, fixed }));
}
