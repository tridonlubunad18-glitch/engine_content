/**
 * LOGGER — Phase 0 (PRD §36 « Journal d'activité » + §4 /lib/logger).
 *
 * Logger structuré minimal, sans dépendance externe (règle §39 :
 * simple, fiable, remplaçable). Chaque module reçoit un logger nommé
 * via `createLogger(namespace)`.
 *
 * Sortie : une ligne JSON par événement via console.*
 * (Vercel structure les logs console ; export possible plus tard vers
 * la table Supabase `logs` — PRD §29).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = "info";

function readLogLevel(): LogLevel {
  const value = process.env.LOG_LEVEL?.toLowerCase();
  return value && value in LEVEL_ORDER ? (value as LogLevel) : DEFAULT_LEVEL;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function write(
  level: LogLevel,
  namespace: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[readLogLevel()]) {
    return;
  }
  const record = {
    time: new Date().toISOString(),
    level,
    namespace,
    message,
    ...(meta ?? {}),
  };
  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(namespace: string): Logger {
  return {
    debug: (message, meta) => write("debug", namespace, message, meta),
    info: (message, meta) => write("info", namespace, message, meta),
    warn: (message, meta) => write("warn", namespace, message, meta),
    error: (message, meta) => write("error", namespace, message, meta),
  };
}
