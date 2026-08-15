type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function serializeContext(context?: LogContext) {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }

  try {
    return JSON.stringify(context);
  } catch {
    return "[unserializable context]";
  }
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const payload = `[VoltPilot:${level}] ${message}${context ? ` ${serializeContext(context)}` : ""}`;

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export const logger = {
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    write("error", message, context);
  },
};
