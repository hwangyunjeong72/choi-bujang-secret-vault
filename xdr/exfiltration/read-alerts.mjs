// Read-only Wazuh exfiltration alert inspector. Separate from decide.mjs.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const fixtureURL = new URL('../fixtures/exfiltration.json', import.meta.url);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sensitive = /(?:password|passwd|secret|token|api[_-]?key|private[_-]?key|authorization|bearer|credential|otp|access[_-]?key|session[_-]?id|\$\{|https?:\/\/|[<>{}\r\n\t])/iu;
const safe = (value, pattern, length = 150) =>
  typeof value === 'string' && value.length <= length
  && pattern.test(value) && !sensitive.test(value) ? value : '가림';

const timestamp = value => safe(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u, 40);
const address = value => {
  const ip = safe(value, /^(?:\d{1,3}\.){3}\d{1,3}$/u, 15);
  return ip !== '가림' && ip.split('.').every(n => Number(n) <= 255) ? ip : '가림';
};
const account = value => safe(value, /^[A-Za-z0-9_.-]{1,64}$/u, 64);
const level = value => Number.isInteger(value) && value >= 0 && value <= 20 ? String(value) : '가림';
const description = value => safe(value, /^[^\\<>|{}\r\n\t]{1,150}$/u, 150);

export async function readAlerts() {
  const fixture = JSON.parse(await readFile(fixtureURL, 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1'
      || fixture.moduleKey !== 'exfiltration'
      || !Array.isArray(fixture.alerts)) throw new Error('INVALID_EXFILTRATION_FIXTURE');
  const lines = fixture.alerts.map(alert => {
    if (!object(alert)) throw new Error('INVALID_ALERT');
    const data = object(alert.data) ? alert.data : {};
    const rule = object(alert.rule) ? alert.rule : {};
    return [
      '시각=' + timestamp(alert.timestamp),
      '출발 주소=' + address(data.srcip),
      '계정=' + account(data.srcuser),
      '규칙 수준=' + level(rule.level),
      '설명=' + description(rule.description)
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
    process.stderr.write('경보 읽기 실패: 입력 형식 또는 실행 환경을 확인하세요.\n');
    process.exitCode = 1;
  }
}
