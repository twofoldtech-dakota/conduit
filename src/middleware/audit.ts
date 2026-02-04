/**
 * Audit logging middleware for enterprise compliance.
 * Logs all operations with timestamps, user info, and results.
 */

import { pino, type Logger, type StreamEntry } from 'pino';
import { createWriteStream } from 'fs';

export interface AuditOptions {
  enabled: boolean;
  logFile?: string;
}

export interface AuditEntry {
  timestamp: string;
  operation: string;
  adapter: string;
  params: unknown;
  success: boolean;
  durationMs: number;
  error?: string;
  resultCount?: number;
}

export class AuditMiddleware {
  private logger: Logger;
  private enabled: boolean;

  constructor(options: AuditOptions) {
    this.enabled = options.enabled;

    if (options.enabled) {
      const streams: StreamEntry[] = [];

      // Always log to stdout in pretty format for dev
      if (process.env.NODE_ENV !== 'production') {
        streams.push({
          level: 'info',
          stream: pino.destination(1), // stdout
        });
      }

      // Log to file if configured
      if (options.logFile) {
        streams.push({
          level: 'info',
          stream: createWriteStream(options.logFile, { flags: 'a' }),
        });
      }

      this.logger = pino(
        {
          level: 'info',
          base: { service: 'conduit-audit' },
        },
        pino.multistream(streams.length > 0 ? streams : [{ stream: pino.destination(1) }])
      );
    } else {
      // Disabled logger (no-op)
      this.logger = pino({ level: 'silent' });
    }
  }

  /**
   * Log an audit entry.
   */
  log(entry: AuditEntry): void {
    if (!this.enabled) return;

    this.logger.info({
      type: 'audit',
      ...entry,
    });
  }

  /**
   * Wrap an async function with audit logging.
   */
  async wrap<T>(
    adapter: string,
    operation: string,
    params: unknown,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const start = Date.now();
    let success = true;
    let error: string | undefined;
    let resultCount: number | undefined;

    try {
      const result = await fn();

      // Try to extract result count for list operations
      if (result && typeof result === 'object' && 'items' in result) {
        resultCount = (result as { items: unknown[] }).items.length;
      }

      return result;
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      this.log({
        timestamp: new Date().toISOString(),
        operation,
        adapter,
        params,
        success,
        durationMs: Date.now() - start,
        error,
        resultCount,
      });
    }
  }
}
