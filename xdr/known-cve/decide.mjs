// Standalone known-CVE defensive decision module.
// Pattern names copied from xdr/known-cve/patterns.json.
// Never runs a payload or accesses the network, filesystem, or packages.
const PATTERNS = Object.freeze({
  header: "요청 머리글의 JNDI 원격 조회 구문",
  parameter: "URL 인자 내 JNDI 원격 조회 구문",
  repeated: "동일 출발 주소의 반복적 악용 형태",
  combined: "취약점 점검 흔적과 악용 구문의 결합",
  benignMention: "조회 구문 없는 취약점 검색·도구 이름"
});
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
// Match complete, bounded JNDI lookup syntax, not a loose substring "jndi".
// This checks only evidence fields supplied in an already collected alert.
const lookup = /\$\{jndi:(?:ldap|ldaps|rmi|dns|iiop):\/\/[^\s{}]{1,300}\}/i;
const levelOf = x => Number.isFinite(Number(x)) ? Math.max(0, Math.min(20, Number(x))) : 0;
const countOf = x => typeof x === 'string' || typeof x === 'number'
  ? (/^\d{1,5}$/.test(String(x)) ? Number(x) : 0) : 0;
export function decide(alert) {
  const a = isObject(alert) ? alert : {};
  const d = isObject(a.data) ? a.data : {};
  const r = isObject(a.rule) ? a.rule : {};
  const ua = typeof d.useragent === 'string' ? d.useragent : '';
  const url = typeof d.url === 'string' ? d.url : '';
  const desc = typeof r.description === 'string' ? r.description : '';
  const inHeader = lookup.test(ua);
  const inParameter = lookup.test(url);
  const complete = inHeader || inParameter;
  const repetitions = countOf(d.count);
  const level = levelOf(r.level);
  const t1190 = Array.isArray(r.mitre) && r.mitre.includes('T1190');
  const inspection = /취약점\s*점검\s*흔적|취약점\s*점검/i.test(desc);
  const specific = /CVE-2021-44228|원격\s*조회\s*구문/i.test(desc);
  let confidence = 0.12;
  let reason = PATTERNS.benignMention;
  if (complete) {
    confidence = 0.86;
    reason = inHeader ? PATTERNS.header : PATTERNS.parameter;
    if (inHeader && inParameter) confidence = 0.97;
    if (repetitions >= 2) {
      confidence = Math.max(confidence, 0.95);
      reason = PATTERNS.repeated;
    }
    if (inspection) {
      confidence = Math.max(confidence, 0.94);
      reason = PATTERNS.combined;
    }
    if (t1190 && specific) confidence = Math.min(0.99, confidence + 0.02);
    // A structurally complete lookup is strong on its own; an arbitrary
    // T1190 label or CVE mention without the lookup is never block evidence.
  } else if (/CVE-2021-44228|\bjndi\b|취약점|점검\s*도구|조회\s*형태/i.test(desc + ' ' + url + ' ' + ua)
      || (t1190 && level >= 5)) {
    confidence = 0.56;
    reason = PATTERNS.benignMention;
    // A plain vulnerability mention or scanner-like hint is ambiguous.
  }
  const action = confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record';
  return { action, confidence: Math.round(confidence * 100) / 100, reason };
}
