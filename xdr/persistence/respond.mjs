// Persistence XDR response adapter. Keeps detection separate from decisions.
// Deny candidates are NOT installed in the ALEPH engine: trusted policy API
// integration would be required; src/decider.mjs remains unchanged.
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

const TTL_MS = 15 * 60 * 1000;
const MAX_TTL_MS = 60 * 60 * 1000;
const REASON_CODE = 'persistence_autorun_suspected';
const LOG_FILE = fileURLToPath(new URL('../alerts.log', import.meta.url));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validId = value => typeof value === 'string' && /^ps-[0-9]{2,6}$/.test(value);
const validIP = value => typeof value === 'string'
  && /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value)
  && value.split('.').every(n => Number(n) <= 255);
const validDecision = out => object(out)
  && ['block', 'alert', 'record'].includes(out.action)
  && Number.isFinite(out.confidence) && out.confidence >= 0
  && out.confidence <= 1 && typeof out.reason === 'string';
const toISO = time => {
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID_TIME');
  return date.toISOString();
};

// This is a local evaluation adapter for ALREADY-VERIFIED alert metadata.
// Never deny all users for a shared source IP; the single alert ID must match.
// The ALEPH SDP request contract does NOT carry alertId/srcip: do not inject
// these fields into src/decider.mjs or treat this as installed engine policy.
export function isDeniedByCandidates(request, rules, now = Date.now()) {
  if (!object(request) || !Array.isArray(rules) || !validId(request.alertId)
      || !validIP(request.srcip) || !Number.isFinite(now)) return false;
  return rules.some(rule => rule?.source === 'persistence'
    && rule?.action === 'deny'
    && rule?.reasonCode === REASON_CODE
    && rule?.alertId === request.alertId
    && rule?.sourceAddress === request.srcip
    && Date.parse(rule.expiresAt) > now);
}

export async function respond(alerts, options = {}) {
  if (!Array.isArray(alerts)) throw new TypeError('INVALID_ALERTS');
  const now = options.now === undefined ? Date.now() : Date.parse(options.now);
  const ttlMs = options.ttlMs ?? TTL_MS;
  if (!Number.isFinite(now) || !Number.isInteger(ttlMs)
      || ttlMs < 1000 || ttlMs > MAX_TTL_MS) throw new TypeError('INVALID_TIME_OR_TTL');
  const expiresAt = toISO(now + ttlMs);
  const entries = [];
  const denyCandidates = [];
  const counts = { block: 0, alert: 0, record: 0 };

  for (const input of alerts) {
    const alert = object(input) ? input : {};
    const result = decide(alert);
    if (!validDecision(result)) throw new TypeError('INVALID_DECISION');
    counts[result.action] += 1;
    // Never turn an ambiguous warning or benign event into an IP-wide deny.
    // Only individually evidenced, strong decisions create narrow candidates.
    const eligible = result.action === 'block' && result.confidence >= 0.85
      && validId(alert.id) && validIP(alert.data?.srcip);
    if (eligible) {
      denyCandidates.push({
        source: 'persistence', action: 'deny', reasonCode: REASON_CODE,
        alertId: alert.id, sourceAddress: alert.data.srcip, expiresAt
      });
    }
    // Only nonsecret metadata is written: no path, usernames, IPs, original
    // descriptions, process commands, credential values or raw alerts.
    entries.push({
      at: toISO(now), module: 'persistence',
      alertId: validId(alert.id) ? alert.id : 'invalid',
      action: result.action, confidence: result.confidence,
      reasonCode: eligible ? REASON_CODE : 'not_block_candidate',
      expiresAt: eligible ? expiresAt : null, installed: false
    });
  }

  if (entries.length > 0) {
    const logFile = options.logFile ? resolve(options.logFile) : LOG_FILE;
    await mkdir(dirname(logFile), { recursive: true });
    await appendFile(logFile, entries.map(x => JSON.stringify(x)).join('\n') + '\n',
      { encoding: 'utf8', mode: 0o600 });
  }
  return {
    schema: 'byteback.xdr.response.v1',
    moduleKey: 'persistence', counts, denyCandidates,
    alertsLogged: entries.length, installedInEngine: false
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const fixture = JSON.parse(await readFile(new URL('../fixtures/persistence.json', import.meta.url), 'utf8'));
    if (fixture?.schema !== 'aleph.xdr.fixture.v1'
        || fixture.moduleKey !== 'persistence' || !Array.isArray(fixture.alerts)) {
      throw new Error('INVALID_FIXTURE');
    }
    const result = await respond(fixture.alerts);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch {
    // Never include an untrusted payload or filesystem detail in errors.
    process.stderr.write('XDR 응답 처리 실패: 경보 형식 또는 실행 환경을 확인하세요.\n');
    process.exitCode = 1;
  }
}
