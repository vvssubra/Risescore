import { loadConfig, type Config } from './config.ts';
import { openDb, migrate, type Db } from './db.ts';
import { Mailer } from './mailer.ts';
import { RateLimiter } from './rateLimit.ts';
import { AssessmentService } from './services/assessments.ts';
import { AuthService } from './services/auth.ts';
import { HandoverService } from './services/handover.ts';
import { ReportService } from './services/reports.ts';
import { ToolkitService } from './services/toolkits.ts';
import { DbObjectStore, LocalObjectStore, type ObjectStore } from './storage.ts';

export interface Context {
  cfg: Config;
  db: Db;
  store: ObjectStore;
  limiter: RateLimiter;
  mailer: Mailer;
  auth: AuthService;
  toolkits: ToolkitService;
  assessments: AssessmentService;
  reports: ReportService;
  handovers: HandoverService;
  close(): Promise<void>;
}

export async function createContext(cfg: Config = loadConfig(), opts: { store?: ObjectStore } = {}): Promise<Context> {
  const db = await openDb({ url: cfg.databaseUrl, ssl: cfg.databaseSsl, schema: cfg.databaseSchema, pglitePath: cfg.pglitePath, poolMax: cfg.databasePoolMax });
  await migrate(db);
  const store = opts.store ?? (cfg.storageDriver === 'fs' ? new LocalObjectStore(cfg.storageDir) : new DbObjectStore(db));
  const limiter = new RateLimiter(cfg.rateLimitDisabled);
  const mailer = new Mailer(db, cfg);
  const toolkits = new ToolkitService(db, store, cfg);
  await toolkits.seedBuiltins();
  const assessments = new AssessmentService(db, cfg);
  const auth = new AuthService(db, cfg);
  await auth.bootstrapAdmin(cfg.bootstrapAdmin);
  const reports = new ReportService(db, cfg, assessments, toolkits, mailer);
  const handovers = new HandoverService(db, cfg, assessments, reports);
  return { cfg, db, store, limiter, mailer, auth, toolkits, assessments, reports, handovers, close: async () => { limiter.stop(); await db.close(); } };
}
