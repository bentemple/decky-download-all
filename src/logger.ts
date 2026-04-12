import { callable } from "@decky/api";

const logFromUI = callable<[level: string, message: string], { success: boolean }>("log_from_ui");

export interface Logger {
  info: (message: string) => Promise<void>;
  warn: (message: string) => Promise<void>;
  error: (message: string) => Promise<void>;
}

export function createLogger(): Logger {
  const log = async (level: string, message: string) => {
    try {
      await logFromUI(level, message);
    } catch (e) {
      console.error("Failed to log:", e);
    }
  };

  return {
    info: (message) => log("info", message),
    warn: (message) => log("warning", message),
    error: (message) => log("error", message),
  };
}

export const logger = createLogger();
