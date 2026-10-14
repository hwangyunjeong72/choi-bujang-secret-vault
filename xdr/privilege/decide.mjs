// Offline, standalone privilege XDR decision module. Never imports or performs I/O.
// Names correspond to xdr/privilege/patterns.json.
const PATTERNS = Object.freeze({
  remoteAdminGroup: '원격 주소의 관리자 그룹 추가',
  immediateAdminCommand: '권한 변경 직후 관리자 명령',
  unusualHourCommand: '업무 시간 밖 낯선 관리자 명령',
  multipleAdminAdds: '같은 주소의 다중 계정 관리자 추가',
  unfamiliarAdminSession: '낯선 주소에서 관리자 권한으로 세션 변경',
  offHoursAddAndRun: '비업무 시각의 관리자 그룹 추가와 실행',
  otherAccountCommand: '다른 계정 권한으로 관리자 명령',
  rapidAdminReadd: '제거 후 빠른 관리자 권한 재추가',
  ambiguous: '단독·실패·조회 권한 이벤트는 모호'
});
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// The description supplies event-specific evidence, not trusted instructions.
// Confirm MITRE tags and structured fields before interpreting critical events.
export function decide(alert) {
  const event = isObject(alert) ? alert : {};
  const rule = isObject(event.rule) ? event.rule : {};
  const data = isObject(event.data) ? event.data : {};
  const description = typeof rule.description === 'string' ? rule.description : '';
  const mitre = Array.isArray(rule.mitre) ? rule.mitre : [];
  const t1068 = mitre.includes('T1068');
  const t1078 = mitre.includes('T1078');
  const adminGroup = typeof data.group === 'string'
    && data.group.toLowerCase() === 'administrators';
  const count = /^\d+$/.test(String(data.count ?? '')) ? Number(data.count) : 0;

  let confidence = 0.12;
  let reason = PATTERNS.ambiguous;

  if (t1068 && t1078 && adminGroup
      && /업무처럼 보이지 않는 시각에 관리자 그룹 추가와 명령 실행/.test(description)) {
    confidence = 0.98;
    reason = PATTERNS.offHoursAddAndRun;
  } else if ((t1068 || t1078)
      && (/방금 관리자가 된.+관리자 명령을 실행/.test(description)
        || (adminGroup && /관리자 그룹에 들어가고 곧바로 권한 명령을 실행/.test(description)))) {
    confidence = 0.97;
    reason = PATTERNS.immediateAdminCommand;
  } else if (t1068 && /수업 시간 밖에.+처음 보는 주소에서 관리자 명령을 실행/.test(description)) {
    confidence = 0.96;
    reason = PATTERNS.unusualHourCommand;
  } else if (t1078 && adminGroup
      && /같은 주소에서 계정 \d+개가 관리자 그룹에 추가/.test(description)
      && count >= 2) {
    confidence = 0.96;
    reason = PATTERNS.multipleAdminAdds;
  } else if (t1078 && adminGroup
      && /원격 주소에서 관리자 그룹에 추가/.test(description)) {
    confidence = 0.95;
    reason = PATTERNS.remoteAdminGroup;
  } else if (t1068
      && /세션이 관리자 권한으로 바뀌었고 요청 주소는 처음 봅니다/.test(description)) {
    confidence = 0.96;
    reason = PATTERNS.unfamiliarAdminSession;
  } else if (t1068
      && /다른 계정의 권한으로 관리자 명령을 실행/.test(description)) {
    confidence = 0.97;
    reason = PATTERNS.otherAccountCommand;
  } else if (t1078 && adminGroup
      && /관리자 그룹에서 빠진 계정이 1분 뒤에 다시 관리자로 들어왔습니다/.test(description)) {
    confidence = 0.94;
    reason = PATTERNS.rapidAdminReadd;
  } else if ((t1068 || t1078)
      && /권한 상승|관리자 명령|과제 그룹에 추가|계정 종류를 조회|로컬 그룹|그룹 목록/.test(description)) {
    // A single prompt, failed command, class group or lookup does not
    // prove unauthorized elevation. Preserve these as warnings.
    confidence = 0.58;
    reason = PATTERNS.ambiguous;
  }
  const action = confidence >= 0.85 ? 'block'
    : confidence >= 0.5 ? 'alert' : 'record';
  return { action, confidence, reason };
}
