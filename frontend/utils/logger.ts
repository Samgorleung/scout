/**
 * Client-Side Logging & Telemetry Utility for IPA Scout
 *
 * Provides structured event tracking, runtime error telemetry, and diagnostics
 * in development and preview environments while strictly enforcing client-side
 * data sanitization and redacting credentials, tokens, and PII.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';

export interface TelemetryEntry {
  id: string;
  timestamp: string;
  level: LogLevel | 'EVENT';
  category: string;
  message: string;
  data?: unknown;
}

export interface LoggerConfig {
  level: LogLevel;
  maxBufferSize: number;
  enableConsole: boolean;
  prefix: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Patterns matching sensitive property names (case-insensitive)
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /auth/i,
  /bearer/i,
  /credentials/i,
  /private_?key/i,
  /client_?secret/i,
  /cookie/i,
  /session_?id/i,
  /access_?token/i,
  /refresh_?token/i,
  /credit_?card/i,
  /cvv/i,
  /ssn/i
];

// Patterns matching known sensitive string values
const SENSITIVE_VALUE_REGEXES = [
  // Google / Firebase API keys
  { pattern: /AIzaSy[A-Za-z0-9_-]{33}/g, replacement: '[REDACTED_API_KEY]' },
  // Bearer authentication tokens
  { pattern: /Bearer\s+[A-Za-z0-9\-_./+=]{10,}/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
  // Standard JSON Web Tokens (JWT)
  { pattern: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, replacement: '[REDACTED_JWT]' },
  // OpenAI / standard sk- keys
  { pattern: /sk-[A-Za-z0-9]{20,}/g, replacement: 'sk-[REDACTED_KEY]' },
  // Private keys
  { pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },
  // Email addresses (partially mask to preserve diagnostic domain context: e.g. j***@cabinetoffice.gov.uk)
  {
    pattern: /([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g,
    replacement: '$1***@$2'
  }
];

/**
 * Deeply sanitizes and scrubs objects, strings, errors, and arrays to prevent
 * accidental leakage of keys, authorization headers, or sensitive user tokens.
 */
export function sanitizePayload(input: unknown, maxDepth = 5, currentDepth = 0, seen = new WeakSet()): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  // Primitive types
  if (typeof input === 'string') {
    let sanitized = input;
    for (const { pattern, replacement } of SENSITIVE_VALUE_REGEXES) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'function') {
    return `[Function: ${input.name || 'anonymous'}]`;
  }

  // Recursion depth guard
  if (currentDepth >= maxDepth) {
    return '[Max Depth Exceeded]';
  }

  // Handle Error instances specifically
  if (input instanceof Error) {
    return {
      name: input.name,
      message: sanitizePayload(input.message, maxDepth, currentDepth + 1, seen),
      stack: typeof input.stack === 'string' ? sanitizePayload(input.stack, maxDepth, currentDepth + 1, seen) : undefined
    };
  }

  // Handle Arrays
  if (Array.isArray(input)) {
    return input.map(item => sanitizePayload(item, maxDepth, currentDepth + 1, seen));
  }

  // Handle Objects
  if (typeof input === 'object') {
    // Circular reference protection
    if (seen.has(input)) {
      return '[Circular Reference]';
    }
    seen.add(input);

    const sanitizedObj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some(regex => regex.test(key));

      if (isSensitiveKey) {
        sanitizedObj[key] = '[REDACTED_SENSITIVE_DATA]';
      } else {
        sanitizedObj[key] = sanitizePayload(value, maxDepth, currentDepth + 1, seen);
      }
    }

    return sanitizedObj;
  }

  return String(input);
}

/**
 * ClientLogger: lightweight singleton class for application events and telemetry.
 */
export class ClientLogger {
  private config: LoggerConfig;
  private buffer: TelemetryEntry[] = [];

  constructor(customConfig?: Partial<LoggerConfig>) {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    this.config = {
      level: isDevelopment ? 'DEBUG' : 'WARN',
      maxBufferSize: 100,
      enableConsole: true,
      prefix: 'IPA Scout',
      ...customConfig
    };
  }

  /**
   * Adjust the active logging threshold level dynamically.
   */
  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Check if a log level satisfies the current priority filter.
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
  }

  /**
   * Internal telemetry recorder: pushes to bounded in-memory buffer.
   */
  private recordEntry(level: LogLevel | 'EVENT', category: string, message: string, data?: unknown): TelemetryEntry {
    const entry: TelemetryEntry = {
      id: `tel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data !== undefined ? sanitizePayload(data) : undefined
    };

    this.buffer.push(entry);

    if (this.buffer.length > this.config.maxBufferSize) {
      this.buffer.shift();
    }

    return entry;
  }

  /**
   * Log fine-grained debug telemetry (development only).
   */
  public debug(message: string, data?: unknown, category = 'system'): void {
    const entry = this.recordEntry('DEBUG', category, message, data);
    if (!this.shouldLog('DEBUG') || !this.config.enableConsole) return;

    if (typeof console !== 'undefined' && console.debug) {
      console.debug(
        `%c[${this.config.prefix} • DEBUG • ${category}]`,
        'color: #8b5cf6; font-weight: 600;',
        message,
        entry.data !== undefined ? entry.data : ''
      );
    }
  }

  /**
   * Log informational milestone or lifecycle events.
   */
  public info(message: string, data?: unknown, category = 'app'): void {
    const entry = this.recordEntry('INFO', category, message, data);
    if (!this.shouldLog('INFO') || !this.config.enableConsole) return;

    if (typeof console !== 'undefined' && console.info) {
      console.info(
        `%c[${this.config.prefix} • INFO • ${category}]`,
        'color: #0284c7; font-weight: 600;',
        message,
        entry.data !== undefined ? entry.data : ''
      );
    }
  }

  /**
   * Log warnings (degraded states, retries, non-fatal anomalies).
   */
  public warn(message: string, data?: unknown, category = 'warning'): void {
    const entry = this.recordEntry('WARN', category, message, data);
    if (!this.shouldLog('WARN') || !this.config.enableConsole) return;

    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        `%c[${this.config.prefix} • WARN • ${category}]`,
        'color: #d97706; font-weight: 700;',
        message,
        entry.data !== undefined ? entry.data : ''
      );
    }
  }

  /**
   * Log caught runtime exceptions or fatal errors.
   */
  public error(message: string, error?: unknown, data?: unknown, category = 'error'): void {
    const combinedData = {
      ...(error !== undefined ? { error: sanitizePayload(error) } : {}),
      ...(data !== undefined ? { context: sanitizePayload(data) } : {})
    };

    const entry = this.recordEntry('ERROR', category, message, combinedData);
    if (!this.shouldLog('ERROR') || !this.config.enableConsole) return;

    if (typeof console !== 'undefined' && console.error) {
      console.error(
        `%c[${this.config.prefix} • ERROR • ${category}]`,
        'color: #dc2626; font-weight: 800;',
        message,
        entry.data !== undefined ? entry.data : ''
      );
    }
  }

  /**
   * Record domain and UI events (e.g. status changes, search executions, exports).
   */
  public trackEvent(eventName: string, payload?: Record<string, unknown>, category = 'event'): TelemetryEntry {
    const entry = this.recordEntry('EVENT', category, eventName, payload);

    if (this.shouldLog('DEBUG') && this.config.enableConsole) {
      if (typeof console !== 'undefined' && console.log) {
        console.log(
          `%c[${this.config.prefix} • EVENT • ${category}]`,
          'color: #059669; font-weight: 700;',
          eventName,
          entry.data !== undefined ? entry.data : ''
        );
      }
    }

    return entry;
  }

  /**
   * Retrieve recent telemetry entries from memory for diagnostics or error reporting.
   */
  public getTelemetryBuffer(limit?: number): TelemetryEntry[] {
    const sliceStart = limit && limit < this.buffer.length ? this.buffer.length - limit : 0;
    return [...this.buffer.slice(sliceStart)];
  }

  /**
   * Clear the in-memory telemetry buffer.
   */
  public clearTelemetry(): void {
    this.buffer = [];
  }

  /**
   * Export the recent telemetry buffer as a formatted, sanitized JSON string.
   */
  public exportTelemetryJson(limit?: number): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        entriesCount: this.getTelemetryBuffer(limit).length,
        telemetry: this.getTelemetryBuffer(limit)
      },
      null,
      2
    );
  }

  /**
   * Public helper to sanitize any external payload directly.
   */
  public sanitize<T>(payload: T): T {
    return sanitizePayload(payload) as T;
  }
}

// Export singleton instance for immediate application use
export const logger = new ClientLogger();

export default logger;
