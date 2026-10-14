// Self-contained XDR persistence detector. No imports, I/O or network calls.
// Pattern names are copied from xdr/persistence/patterns.json.
const PATTERNS = Object.freeze({
  newService: '서명 없는 새 서비스 등록',
  modifiedService: '서명 없는 서비스 실행 파일 변경',
  scheduledTask: '낯선 예약 작업의 임시 실행 파일',
  startupFolder: '평소 목록에 없는 시작 폴더 프로그램',
  dualEntry: '시작 프로그램과 예약 작업의 동일 임시 파일',
  persistentService: '재시작 후에도 남는 낯선 서비스',
  uncertain: '독립 악용 근거 없는 변경은 경고 또는 기록'
});
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);

export function decide(alert) {
  const a = isObject(alert) ? alert : {};
  const data = isObject(a.data) ? a.data : {};
  const rule = isObject(a.rule) ? a.rule : {};
  const description = typeof rule.description === 'string' ? rule.description : '';
  const path = typeof data.path === 'string' ? data.path : '';
  const mitre = Array.isArray(rule.mitre) ? rule.mitre : [];
  const t1543 = mitre.includes('T1543');
  const t1053 = mitre.includes('T1053');
  const temp = /\\AppData\\Local\\Temp\\[^\\]+\.(?:exe|cmd|bat)$/i.test(path);
  const startup = /\\Start Menu\\Programs\\Startup\\[^\\]+/i.test(path);
  const count = /^(?:[2-9]|[1-9][0-9]+)$/.test(String(data.count ?? ''))
    ? Number(data.count) : 0;
  let confidence = 0.12;
  let reason = PATTERNS.uncertain;

  if (t1543 && t1053
      && /시작 프로그램과 예약 작업이 같은 임시 파일/.test(description) && temp) {
    confidence = 0.98;
    reason = PATTERNS.dualEntry;
  } else if (t1543 && /서명 없는 새 서비스/.test(description) && temp) {
    confidence = 0.96;
    reason = PATTERNS.newService;
  } else if (t1543 && /서명 없는 서비스 등록이 연속/.test(description) && count >= 2) {
    confidence = 0.95;
    reason = PATTERNS.newService;
  } else if (t1543 && /서비스 실행 파일이 바뀌었고 서명이 없습니다/.test(description) && temp) {
    confidence = 0.96;
    reason = PATTERNS.modifiedService;
  } else if (t1543 && /평소 목록에 없는 서비스가 다시 켜도 남도록 등록/.test(description) && temp) {
    confidence = 0.96;
    reason = PATTERNS.persistentService;
  } else if (t1053 && /처음 보는 예약 작업|예약 작업 이름이 임의 문자열/.test(description) && temp) {
    confidence = 0.94;
    reason = PATTERNS.scheduledTask;
  } else if (t1543 && /시작 폴더에 평소 목록에 없는 프로그램이 추가/.test(description) && startup) {
    confidence = 0.94;
    reason = PATTERNS.startupFolder;
  } else if ((t1543 || t1053)
      && /예약 작업|시작 항목|시작 폴더 변경|서비스 설명|임시 폴더|서비스가 한 번/.test(description)
      && !/기존 |서명된 채로|업데이트 예약|복사를 마쳤습니다/.test(description)) {
    // Changed service description is still ambiguous even if executable stayed\n    // unchanged; unchanged executable alone does not make the event normal.
    confidence = 0.56;
    reason = PATTERNS.uncertain;
  }
  const action = confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record';
  return { action, confidence, reason };
}
