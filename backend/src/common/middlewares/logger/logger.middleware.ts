import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'token',
  'resettoken',
  'resetpasswordtoken',
  'passwordhash',
  'jwt_secret',
  'authorization',
  'vnp_securehash',
  'vnp_securehashtype',
  'hashsecret',
  'mail_pass',
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-cap]';
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, _res: Response, next: NextFunction) {
    const body = redact(req.body);
    const query = redact(req.query);
    this.logger.log(
      `${req.method} ${req.originalUrl} body=${JSON.stringify(body)} query=${JSON.stringify(query)}`,
    );
    next();
  }
}
