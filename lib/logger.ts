export type LogLevel = "info" | "warn" | "error";

interface LogContext {
  event: string;
  route?: string;
  userId?: string;
  details?: Record<string, unknown>;
  error?: unknown;
}

function normalizeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "object") {
    return error as Record<string, unknown>;
  }
  return { value: String(error) };
}

export function log(level: LogLevel, context: LogContext): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event: context.event,
    route: context.route,
    userId: context.userId,
    details: context.details,
    error: normalizeError(context.error),
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logInfo(context: LogContext): void {
  log("info", context);
}

export function logWarn(context: LogContext): void {
  log("warn", context);
}

export function logError(context: LogContext): void {
  log("error", context);
}
