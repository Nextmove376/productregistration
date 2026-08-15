/**
 * Media file validation utilities
 * Validates file content matches declared MIME type via magic bytes
 */

const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/gif": [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  ],
  "image/webp": [{ bytes: [0x52, 0x49, 0x46, 0x46] }],
  "video/mp4": [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  "video/webm": [{ bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  "video/ogg": [{ bytes: [0x4f, 0x67, 0x67, 0x53] }],
};

function isSvgContent(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 500).toString("utf-8").trim().toLowerCase();
  return head.includes("<svg") || head.includes("<?xml");
}

function isWebpContent(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const riff = buffer.subarray(0, 4).toString("ascii");
  const webp = buffer.subarray(8, 12).toString("ascii");
  return riff === "RIFF" && webp === "WEBP";
}

export function validateMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  if (buffer.length < 4) return false;
  if (declaredMimeType === "image/svg+xml") return isSvgContent(buffer);
  if (declaredMimeType === "image/webp") return isWebpContent(buffer);

  const signatures = MAGIC_BYTES[declaredMimeType];
  if (!signatures) return false;

  for (const sig of signatures) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

export const ALLOWED_TYPES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/svg+xml": ["svg"],
  "image/gif": ["gif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/ogg": ["ogg"],
};

export function isVideoType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 5;