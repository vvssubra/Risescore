import { randomUUID } from 'node:crypto';
import type { Config } from '../config.ts';
import { decryptField, encryptField, newToken, safeEqual, sha256Hex } from '../crypto.ts';
import type { Db, Row } from '../db.ts';
import { EngineError, assess, validateAnswers } from '../../shared/engine.ts';
import { validateProfile } from '../../shared/profile.ts';
import type { Answers, AssessmentResult, PillarKey, PreviewResult, Profile } from '../../shared/types.ts';
import { HttpError } from './toolkits.ts';

const DAY = 86_400_000;

export interface StoredPayload { profile: Profile; answers: Answers; result: AssessmentResult }

/** Everything shown before the contact gate. Deliberately excludes alert detail, action steps and toolkits. */
export function toPreview(r: AssessmentResult): PreviewResult {
  const byPillar = {} as PreviewResult['byPillar'];
  for (const k of Object.keys(r.byPillar) as PillarKey[]) byPillar[k] = { name: r.byPillar[k].name, score: r.byPillar[k].score };
  return {
    version: r.version, track: r.track, overall: r.overall, complete: r.complete, confidence: r.confidence,
    byPillar, priority: r.priority, priorityName: r.priorityName, headline: r.headline, priorityReason: r.priorityReason,
  };
}

export class AssessmentService {
  constructor(private db: Db, private cfg: Config) {}

  /** The server validates every id/option against the versioned config and recalculates the score itself. */
  async create(rawProfile: unknown, rawAnswers: unknown) {
    const perr = validateProfile(rawProfile);
    if (perr) throw new HttpError(400, perr, 'invalid_profile');
    const profile = rawProfile as Profile;
    const p: Profile = { track: profile.track, role: profile.role, ageBand: profile.ageBand, dependants: profile.dependants, goal: profile.goal, switchIntent: profile.switchIntent };
    let answers: Answers;
    let result: AssessmentResult;
    try {
      answers = validateAnswers(p, rawAnswers);
      result = assess(p, answers);
    } catch (e) {
      if (e instanceof EngineError) throw new HttpError(400, e.message, 'invalid_answers');
      throw e;
    }
    const id = randomUUID();
    const sessionToken = newToken();
    const now = Date.now();
    const expiresAt = new Date(now + this.cfg.assessmentRetentionDays * DAY).toISOString();
    const payload: StoredPayload = { profile: p, answers, result };
    await this.db.run(
      `INSERT INTO assessments (id,scorecard_version,track,overall,priority,alert_count,payload_enc,session_token_hash,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id, result.version, p.track, result.overall, result.priority, result.alerts.length,
      encryptField(this.cfg.encryptionKey, JSON.stringify(payload), 'assessments.payload'), sha256Hex(sessionToken), new Date(now).toISOString(), expiresAt,
    );
    return { id, sessionToken, expiresAt, preview: toPreview(result) };
  }

  /** Verifies the unguessable session token that was handed out at creation. Same error for "missing" and "wrong token". */
  async authorise(id: string, token: string) {
    const row = await this.db.get('SELECT * FROM assessments WHERE id=?', id);
    if (!row || row.expires_at < new Date().toISOString() || !safeEqual(row.session_token_hash, sha256Hex(token))) {
      throw new HttpError(404, 'Assessment not found or expired. Please retake the scorecard.', 'assessment_not_found');
    }
    return row;
  }

  payload(row: Row): StoredPayload {
    return JSON.parse(decryptField(this.cfg.encryptionKey, row.payload_enc, 'assessments.payload'));
  }
}
