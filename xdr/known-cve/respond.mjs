// Known-CVE XDR response adapter. Deliberately separate from decide.mjs.
// This file does not alter the ALEPH SDP engine or src/decider.mjs policy.
// Output rules require a trusted external SDP installer to become operative.
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_TTL_MS = 60 * 60 * 1000;
const REASON_CODE = 'known_cve_jndi_lookup';
const validId = value => typeof value === 'string' && /^kc-[0-9]{2,6}$/.test(value);
const validIP = value => typeof value === 'string' &&
  /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value) &&
  value.split('.').every(part => Number(part) <= 255);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const status = result => object(result)
  && ['block', 'alert', 'record'].includes(result.action)
  && Number.isFinite(result.confidence) && result.confidence >= 0
  && result.confidence <= 1 && typeof result.reason === 'string';
const isoTime = time => {
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) throw new Error('INVALID_RESPONSE_TIME');
  return date.toISOString();
};
const defaultLog = fileURLToPath(new URL('../alerts.log', import.meta.url));

// A rule is an expiry-bounded, candidate deny entry, NOT an installed engine rule.
// Avoid blocking a normal user who shares a source IP with a suspected request:
// scope to the single suspicious request's verified alert ID.
export function isDeniedByCandidates(request, rules, now = Date.now()) {
  if (!object(request) || !Array.isArray(rules)) return false;
  return rules.some(rule => rule?.action === 'deny'
    && rule?.source === 'known-cve'
    && rule?.alertId === request.alertId
    && validId(request.alertId)
    && typeof request.srcip === 'string'
    && rule?.sourceAddress === request.srcip
    && Date.parse(rule?.expiresAt ?? '') > now
    && rule?.reasonCode === REASON_CODE);
}

export async function respond(alerts, options = {}) {
  if (!Array.isArray(alerts)) throw new TypeError('INVALID_ALERTS');
  const now = typeof options.now === 'string' ? Date.parse(options.now) : Date.now();
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  if (!Number.isFinite(now) || !Number.isInteger(ttl) || ttl < 1000 || ttl > MAX_TTL_MS)
    throw new TypeError('INVALID_TIME_OR_TTL');
  const expiresAt = isoTime(now + ttl);
  const entries = [];
  const rules = [];
  const counts = { block: 0, alert: 0, record: 0 };
  for (const item of alerts) {
    const alert = object(item) ? item : {};
    const result = decide(alert);
    if (!status(result)) throw new TypeError('INVALID_DECISION');
    // Only strong, unambiguous, correctly formed known-CVE evidence can
    // become an isolated deny candidate. IDs and sources must be present.
    const eligible = result.action === 'block' && result.confidence >= 0.85
      && validId(alert.id) && validIP(alert.data?.srcip);
    counts[result.action]++;
    if (eligible) {
      rules.push({
        source: 'known-cve', action: 'deny', reasonCode: REASON_CODE,
        alertId: alert.id, sourceAddress: alert.data.srcip, expiresAt
      });
    }
    // Log only redacted metadata and decisions, never original payload,
    // note content, headers, credentials or full raw descriptions.
    entries.push({
      at: isoTime(now), module: 'known-cve',
      alertId: validId(alert.id) ? alert.id : 'invalid',
      action: result.action, confidence: result.confidence,
      reasonCode: eligible ? REASON_CODE : 'not_block_candidate',
      expiresAt: eligible ? expiresAt : null,
      installed: false
    });
  }
  const logFile = options.logFile ? resolve(options.logFile) : defaultLog;
  if (entries.length) {
    await mkdir(dirname(logFile), { recursive: true });
    // JSON-lines, one redacted entry per processed alert.
    await appendFile(logFile, entries.map(entry => JSON.stringify(entry)).join('\n') + '\n',
      { encoding: 'utf8', mode: 0o600 });
  }
  // Installation requires trusted ALEPH SDP policy API/contract, absent here.
  return {
    schema: 'byteback.xdr.response.v1', moduleKey: 'known-cve',
    counts, denyCandidates: rules, alertsLogged: entries.length,
    installedInEngine: false
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const fixture = JSON.parse(await readFile(new URL('../fixtures/known-cve.json', import.meta.url), 'utf8'));
    if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'known-cve'
        || !Array.isArray(fixture.alerts)) throw new Error('INVALID_FIXTURE');
    const result = await respond(fixture.alerts);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    process.stderr.write('XDR 응답 처리 실패: ' + (error?.message || 'UNKNOWN') + '\n');
    process.exitCode = 1;
  }
}
