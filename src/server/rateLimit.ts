import type { NextFunction, Request, RequestHandler, Response } from 'express';

interface Bucket { count: number; resetAt: number }

/**
 * Fixed-window in-memory limiter. Adequate for a single instance; run behind a shared store
 * (Redis) or an edge/WAF limiter when scaling out — documented in docs/SECURITY.md.
 */
export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private timer?: NodeJS.Timeout;
  constructor(private disabled = false) {
    this.timer = setInterval(() => this.sweep(), 60_000);
    this.timer.unref();
  }
  /** Returns seconds to wait when over the limit, otherwise 0. */
  hit(key: string, limit: number, windowMs: number): number {
    if (this.disabled) return 0;
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b || b.resetAt <= now) { b = { count: 0, resetAt: now + windowMs }; this.buckets.set(key, b); }
    b.count++;
    return b.count > limit ? Math.ceil((b.resetAt - now) / 1000) : 0;
  }
  private sweep() { const now = Date.now(); for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k); }
  stop() { if (this.timer) clearInterval(this.timer); }
  reset() { this.buckets.clear(); }
}

export function limit(limiter: RateLimiter, name: string, max: number, windowMs: number, keyOf: (req: Request) => string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const wait = limiter.hit(`${name}:${keyOf(req)}`, max, windowMs);
    if (wait > 0) {
      res.setHeader('Retry-After', String(wait));
      res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please try again shortly.', retryAfterSeconds: wait });
      return;
    }
    next();
  };
}
