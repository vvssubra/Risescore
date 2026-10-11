import express, { type ErrorRequestHandler, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ZodError } from 'zod';
import type { Context } from './context.ts';
import { adminRoutes } from './routes/admin.ts';
import { publicRoutes } from './routes/public.ts';
import { HttpError } from './services/toolkits.ts';

export function createApp(ctx: Context, opts: { clientDir?: string } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', ctx.cfg.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'font-src': ["'self'"],
          'connect-src': ["'self'"],
          'frame-src': ["'self'"], // inline PDF preview in admin
          'object-src': ["'self'"],
          'base-uri': ["'none'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          ...(ctx.cfg.isProd ? { 'upgrade-insecure-requests': [] } : {}),
        },
      },
      referrerPolicy: { policy: 'no-referrer' }, // report links carry a secret in the path
      hsts: ctx.cfg.isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // API responses can contain personal data: never cache.
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  // Cross-site state changes are refused outright (defence in depth beside SameSite cookies + CSRF tokens).
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && !ctx.cfg.allowedOrigins.includes(origin)) { res.status(403).json({ error: 'bad_origin', message: 'Cross-origin request refused.' }); return; }
    if (req.get('sec-fetch-site') === 'cross-site') { res.status(403).json({ error: 'bad_origin', message: 'Cross-origin request refused.' }); return; }
    next();
  });

  const json = express.json({ limit: '32kb', strict: true, type: 'application/json' });
  app.use('/api', (req, res, next) => (req.path.endsWith('/versions') && req.method === 'PUT' ? next() : json(req, res, next)));

  app.use('/api/admin', adminRoutes(ctx));
  app.use('/api', publicRoutes(ctx));
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'not_found', message: 'Not found.' }); });

  // ---- static front-end (production build) ----
  const clientDir = opts.clientDir ?? join(process.cwd(), 'dist', 'client');
  if (existsSync(clientDir)) {
    app.use(express.static(clientDir, { index: false, maxAge: '1h', setHeaders: (res, path) => { if (/\.html$/.test(path)) res.setHeader('Cache-Control', 'no-store'); if (/\/assets\//.test(path)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));
    app.get(['/admin', '/admin/*splat'], (_req, res) => res.sendFile(join(clientDir, 'admin.html')));
    app.get('/{*splat}', (_req, res) => res.sendFile(join(clientDir, 'index.html')));
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'validation', message: err.issues[0]?.message ?? 'Invalid input.', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
      return;
    }
    if (err instanceof HttpError) { res.status(err.status).json({ error: err.code, message: err.message }); return; }
    if (err?.type === 'entity.too.large') { res.status(413).json({ error: 'too_large', message: 'Request is too large.' }); return; }
    if (err?.type === 'entity.parse.failed') { res.status(400).json({ error: 'bad_json', message: 'Request body is not valid JSON.' }); return; }
    // Never echo internals or request bodies (they can contain personal data).
    console.error('[error]', err?.name, err?.message);
    res.status(500).json({ error: 'server_error', message: 'Something went wrong. Please try again.' });
  };
  app.use(onError);
  return app;
}
