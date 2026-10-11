import { loadConfig, type Config } from './config.ts';
import { Db, migrate } from './db.ts';
import { Mailer } from './mailer.ts';
import { RateLimiter } from './rateLimit.ts';
import { AssessmentService } from './services/assessments.ts';
import { AuthService } from './services/auth.ts';
import { ReportService } from './services/reports.ts';
import { ToolkitService } from './services/toolkits.ts';
import { LocalObjectStore, type ObjectStore } from './storage.ts';

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
  close(): Promise<void>;
}

export async function createContext(cfg: Config = loadConfig(), opts: { store?: ObjectStore } = {}): Promise<Context> {
  const db = await Db.connect(cfg.databaseUrl, { schema: cfg.dbSchema });
  await migrate(db);
  const store = opts.store ?? new LocalObjectStore(cfg.storageDir);
  const limiter = new RateLimiter(cfg.rateLimitDisabled);
  const mailer = new Mailer(db, cfg);
  const toolkits = new ToolkitService(db, store, cfg);
  await toolkits.seedBuiltins();
  const assessments = new AssessmentService(db, cfg);
  const auth = new AuthService(db, cfg);
  const reports = new ReportService(db, cfg, assessments, toolkits, mailer);
  return { cfg, db, store, limiter, mailer, auth, toolkits, assessments, reports, close: async () => { limiter.stop(); await db.close(); } };
}
