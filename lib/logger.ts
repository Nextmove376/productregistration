type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: number =
  LEVELS[(process.env.LOG_LEVEL as Level) ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug')] ?? 20;

/**
 * Single-line JSON logging so Hostinger's log files stay greppable.
 *
 * Replaces the ad-hoc `console.log("[DELETE] ...")` instrumentation that was
 * scattered through the media routes — one structured record per event instead
 * of a dozen prefixed lines.
 */
function emit(level: Level, message: string, context?: Record<string, unknown>) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...context,
  };

  const line = safeStringify(record);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, v) => {
      if (v instanceof Error) {
        return { name: v.name, message: v.message, code: (v as NodeJS.ErrnoException).code, stack: v.stack };
      }
      if (typeof v === 'bigint') return v.toString();
      return v;
    });
  } catch {
    return JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: 'log serialization failed' });
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};

/** Redacts an IP to a coarse prefix for logs (full IPs are hashed before storage). */
export function redactIp(ip: string | null | undefined): string {
  if (!ip) return 'unknown';
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + ':…';
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.x` : 'unknown';
}
