// Privilege XDR response adapter: redacted alerts and scoped deny candidates.
// The ALEPH ZTNA contract has no alertId field or policy installation API.
// Thus these rules are local candidates, not installed engine deny rules.
// src/decider.mjs and the pure decide.mjs stay unchanged.
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_TTL_MS = 60 * 60 * 1000;
const REASON_CODE = 'privilege_escalation_suspected';
const LOG_FILE = fileURLToPath(new URL('../alerts.log', import.meta.url));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validId = value => typeof value === 'string' && /^pv-[0-9]{2,6}$/.test(value);
const validIP = value => typeof value === 'string'
  && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)
  && value.split('.').every(part => Number(part) <= 255);
const validDecision = result => isObject(result)
  && ['block', 'alert', 'record'].includes(result.action)
  && Number.isFinite(result.confidence)
  && result.confidence >= 0 && result.confidence <= 1
  && typeof result.reason === 'string';
const isoTime = time => {
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) throw new TypeError('INVALID_TIME');
  return date.toISOString();
};

// A local, test-only matcher; never deny a normal request sharing an IP.
// Both the specific alert ID and its address must match and the rule must
// still be live. Untrusted request fields must not enter the ZTNA contract.
export function isDeniedByCandidates(request, rules, now = Date.now()) {
  if (!isObject(request) || !Array.isArray(rules)
      || !validId(request.alertId) || !validIP(request.srcip)
      || !Number.isFinite(now)) return false;
  return rules.some(rule => rule?.source === 'privilege'
    && rule?.action === 'deny'
    && rule?.reasonCode === REASON_CODE
    && rule?.alertId === request.alertId
    && rule?.sourceAddress === request.srcip
    && Date.parse(rule.expiresAt ?? '') > now);
}

export async function respond(alerts, options = {}) {
  if (!Array.isArray(alerts)) throw new TypeError('INVALID_ALERTS');
  const now = options.now === undefined ? Date.now() : Date.parse(options.now);
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  if (!Number.isFinite(now) || !Number.isInteger(ttlMs)
      || ttlMs < 1000 || ttlMs > MAX_TTL_MS) throw new TypeError('INVALID_TIME_OR_TTL');
  const expiresAt = isoTime(now + ttlMs);
  const counts = { block: 0, alert: 0, record: 0 };
  const denyCandidates = [];
  const entries = [];

  for (const input of alerts) {
    const alert = isObject(input) ? input : {};
    const decision = decide(alert);
    if (!validDecision(decision)) throw new TypeError('INVALID_DECISION');
    counts[decision.action] += 1;
    // A valid strong alert generates a single-request rule candidate only.
    // Ambiguous alerts and normal events NEVER create denial candidates.
    const eligible = decision.action === 'block' && decision.confidence >= 0.85
      && validId(alert.id) && validIP(alert.data?.srcip);
    if (eligible) {
      denyCandidates.push({
        source: 'privilege', action: 'deny', reasonCode: REASON_CODE,
        alertId: alert.id, sourceAddress: alert.data.srcip, expiresAt
      });
    }
    // One sanitized JSON line per alert: no account, IP, raw description,
    // credentials or secret-looking values are stored in the log.
    entries.push({
      at: isoTime(now), module: 'privilege',
      alertId: validId(alert.id) ? alert.id : 'invalid',
      action: decision.action, confidence: decision.confidence,
      reasonCode: eligible ? REASON_CODE : 'not_block_candidate',
      expiresAt: eligible ? expiresAt : null, installed: false
    });
  }

  if (entries.length) {
    const logFile = options.logFile ? resolve(options.logFile) : LOG_FILE;
    await mkdir(dirname(logFile), { recursive: true });
    await appendFile(logFile,
      entries.map(entry => JSON.stringify(entry)).join('\n') + '\n',
      { encoding: 'utf8', mode: 0o600 });
  }
  return {
    schema: 'byteback.xdr.response.v1', moduleKey: 'privilege',
    counts, denyCandidates, alertsLogged: entries.length,
    installedInEngine: false
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const fixture = JSON.parse(await readFile(new URL('../fixtures/privilege.json', import.meta.url), 'utf8'));
    if (fixture?.schema !== 'aleph.xdr.fixture.v1'
        || fixture.moduleKey !== 'privilege' || !Array.isArray(fixture.alerts))
      throw new Error('INVALID_FIXTURE');
    const output = await respond(fixture.alerts);
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch {
    process.stderr.write('XDR 응답 처리 실패: 입력 형식 또는 실행 환경을 확인하세요.\n');
    process.exitCode = 1;
  }
}
