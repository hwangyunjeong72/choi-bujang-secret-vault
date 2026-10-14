// Read-only Wazuh fixture projection for local inspection.
// This module is deliberately independent of xdr/known-cve/decide.mjs.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const fixtureURL = new URL('../fixtures/known-cve.json', import.meta.url);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sensitive = /(?:password|passwd|secret|token|apikey|api[_-]?key|private[_-]?key|authorization|bearer|credential|session|\$\{|jndi:|https?:\/\/|[\r\n\t])/i;
const safe = (value, pattern, limit = 150) => {
  if (typeof value !== 'string' || value.length > limit || !pattern.test(value) || sensitive.test(value))
    return '가림';
  return value;
};
const stamp = value => safe(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/);
const address = value => safe(value, /^(?:\d{1,3}\.){3}\d{1,3}$/);
const account = value => safe(value, /^[a-zA-Z0-9_.@-]{1,64}$/);
const description = value => safe(value, /^[^\r\n\t<>\\]{1,150}$/u);
const level = value => Number.isInteger(value) && value >= 0 && value <= 20 ? String(value) : '가림';

export async function readAlerts() {
  const raw = JSON.parse(await readFile(fixtureURL, 'utf8'));
  if (raw?.schema !== 'aleph.xdr.fixture.v1' || raw.moduleKey !== 'known-cve' || !Array.isArray(raw.alerts))
    throw new Error('INVALID_KNOWN_CVE_FIXTURE');
  const lines = raw.alerts.map(item => {
    if (!isObject(item)) throw new Error('INVALID_ALERT');
    const data = isObject(item.data) ? item.data : {};
    const rule = isObject(item.rule) ? item.rule : {};
    // Only explicitly allow-listed scalar fields are ever emitted.
    return [
      '시각=' + stamp(item.timestamp),
      '출발 주소=' + address(data.srcip),
      '계정=' + account(data.srcuser ?? data.user ?? data.account),
      '규칙 수준=' + level(rule.level),
      '설명=' + description(rule.description),
    ].join(' | ');
  });
  if (lines.length !== raw.alerts.length) throw new Error('ALERT_COUNT_MISMATCH');
  return { count: raw.alerts.length, lines };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { count, lines } = await readAlerts();
    process.stdout.write(lines.join('\n') + '\n');
    process.stdout.write('경보 건수: ' + count + ' / 추출 줄 수: ' + lines.length + '\n');
  } catch {
    // Never print raw exception content that might embed fixture data.
    process.stderr.write('경보 읽기 실패: 파일 형식 또는 접근을 확인하세요.\n');
    process.exitCode = 1;
  }
}
