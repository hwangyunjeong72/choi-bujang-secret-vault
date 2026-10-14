// Read-only inspector for synthetic persistence Wazuh alerts.
// Intentionally separate from decide.mjs; never prints raw alert objects.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const fixtureURL = new URL('../fixtures/persistence.json', import.meta.url);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const secretLike = /(?:password|passwd|secret|token|api[_-]?key|private[_-]?key|authorization|bearer|credential|session|\$\{|https?:\/\/|[\r\n\t])/iu;
function limited(value, allowed, maxLength = 150) {
  if (typeof value !== 'string' || value.length > maxLength || !allowed.test(value) || secretLike.test(value))
    return '가림';
  return value;
}
const time = value => limited(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u, 40);
const address = value => {
  const s = limited(value, /^(?:\d{1,3}\.){3}\d{1,3}$/u, 15);
  return s !== '가림' && s.split('.').every(n => Number(n) <= 255) ? s : '가림';
};
const account = value => limited(value, /^[a-zA-Z0-9_.-]{1,64}$/u, 64);
const description = value => limited(value, /^[^<>\\\r\n\t]{1,150}$/u);
const level = value => Number.isInteger(value) && value >= 0 && value <= 20 ? String(value) : '가림';

export async function readAlerts() {
  const fixture = JSON.parse(await readFile(fixtureURL, 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'persistence'
      || !Array.isArray(fixture.alerts)) throw new Error('INVALID_PERSISTENCE_FIXTURE');
  const lines = fixture.alerts.map(item => {
    if (!isObject(item)) throw new Error('INVALID_ALERT');
    const data = isObject(item.data) ? item.data : {};
    const rule = isObject(item.rule) ? item.rule : {};
    return [
      '시각=' + time(item.timestamp),
      '출발 주소=' + address(data.srcip),
      '계정=' + account(data.srcuser),
      '규칙 수준=' + level(rule.level),
      '설명=' + description(rule.description),
    ].join(' | ');
  });
  if (lines.length !== fixture.alerts.length) throw new Error('ALERT_COUNT_MISMATCH');
  return { count: fixture.alerts.length, lines };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { count, lines } = await readAlerts();
    process.stdout.write(lines.join('\n') + '\n');
    process.stdout.write('경보 건수: ' + count + ' / 추출 줄 수: ' + lines.length + '\n');
  } catch {
    process.stderr.write('경보 읽기 실패: 파일 접근 또는 형식을 확인하세요.\n');
    process.exitCode = 1;
  }
}
