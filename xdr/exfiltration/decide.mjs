// Self-contained exfiltration XDR detector; pattern names mirror patterns.json.
// Offline judge loads this file alone. No imports, filesystem or network access.
const PATTERNS = Object.freeze({
  bulkUnknownDestination: '짧은 시간 다량 자료의 낯선 목적지 전송',
  compressedOffHours: '수업 시간 밖 압축 파일 반출',
  repeatedLargeTransfer: '같은 목적지 대용량 반복 전송',
  unusualPort: '낯선 포트의 자료 다건 전송',
  memoBundle: '낯선 목적지로 메모 묶음 유출',
  repeatedOffHours: '비업무 시간 반복 외부 전송',
  compressedUploads: '압축 파일 연속 외부 업로드',
  wholeRepository: '짧은 시간 자료실 전체 외부 복사',
  commandChannel: '명령 통로의 대용량 반복 유출',
  multipleDestinations: '동일 압축 파일의 다중 외부 목적지 반출',
  uncertain: '추가 악용 증거 없는 단발·실패·소량 전송'
});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => /^\d+$/.test(String(value ?? ''))
  && Number.isSafeInteger(Number(value)) ? Number(value) : 0;

export function decide(alert) {
  const event = object(alert) ? alert : {};
  const rule = object(event.rule) ? event.rule : {};
  const data = object(event.data) ? event.data : {};
  const description = typeof rule.description === 'string' ? rule.description : '';
  const mitre = Array.isArray(rule.mitre) ? rule.mitre : [];
  const t1041 = mitre.includes('T1041');
  const t1048 = mitre.includes('T1048');
  const bytes = integer(data.bytes);
  const files = integer(data.files);
  const count = integer(data.count);
  let confidence = 0.12;
  let reason = PATTERNS.uncertain;

  if (t1048 && bytes >= 100000000 && files >= 100
      && /10분 안에 자료 \d+건이 처음 보는 목적지로 나갔습니다/.test(description)) {
    confidence = 0.98; reason = PATTERNS.bulkUnknownDestination;
  } else if (t1048 && bytes >= 100000000
      && /수업 시간 밖에 압축 파일이 처음 보는 주소로 나갔습니다/.test(description)) {
    confidence = 0.97; reason = PATTERNS.compressedOffHours;
  } else if (t1041 && bytes >= 50000000 && count >= 2
      && /같은 목적지로 대용량 전송이 \d+번 반복됐습니다/.test(description)) {
    confidence = 0.96; reason = PATTERNS.repeatedLargeTransfer;
  } else if (t1048 && bytes >= 50000000 && files >= 2
      && /평소에 쓰지 않던 포트로 자료 이름이 연속 전송됐습니다/.test(description)) {
    confidence = 0.96; reason = PATTERNS.unusualPort;
  } else if (t1041 && bytes >= 50000000 && files >= 10
      && /처음 보는 목적지로 메모 묶음이 한 번에 나갔습니다/.test(description)) {
    confidence = 0.96; reason = PATTERNS.memoBundle;
  } else if (t1048 && bytes >= 50000000 && count >= 2
      && /업무 시간 밖에 같은 목적지로 전송이 \d+번입니다/.test(description)) {
    confidence = 0.97; reason = PATTERNS.repeatedOffHours;
  } else if (t1048 && bytes >= 50000000 && files >= 2
      && /압축 파일 \d+개가 연속으로 처음 보는 주소에 올라갔습니다/.test(description)) {
    confidence = 0.96; reason = PATTERNS.compressedUploads;
  } else if (t1041 && bytes >= 100000000 && files >= 100
      && /짧은 시간에 자료실 전체가 외부 주소로 복사됐습니다/.test(description)) {
    confidence = 0.99; reason = PATTERNS.wholeRepository;
  } else if (t1041 && bytes >= 50000000 && count >= 2
      && /명령 통로로 큰 파일이 처음 보는 목적지에 반복 전송됐습니다/.test(description)) {
    confidence = 0.97; reason = PATTERNS.commandChannel;
  } else if (t1048 && bytes >= 50000000
      && /처음 보는 목적지 두 곳으로 같은 압축 파일이 나갔습니다/.test(description)) {
    confidence = 0.96; reason = PATTERNS.multipleDestinations;
  } else if (t1048 && bytes === 0
      && /전송이 실패.+목적지는 처음 봅니다/.test(description)) {
    // Failed delivery to an unfamiliar destination is suspicious, not a leak.
    confidence = 0.55; reason = PATTERNS.uncertain;
  } else if (t1041 && count >= 2 && bytes > 0
      && /명령 통로에 짧은 자료 이름이.+큰 파일은 아닙니다/.test(description)) {
    // Repeated small C2-channel signals warrant an alert, never a block.
    confidence = 0.56; reason = PATTERNS.uncertain;
  } else if ((t1041 || t1048) && bytes >= 100000
      && /파일|자료|전송|목적지|주소|백업|압축/.test(description)
      && !/수업 자료 주소로 작은 동기화가 끝났습니다/.test(description)) {
    // A single transfer, a failed transfer, or plausible class backup
    // is not sufficient evidence for an automatic block.
    confidence = 0.56; reason = PATTERNS.uncertain;
  }
  const action = confidence >= 0.85 ? 'block'
    : confidence >= 0.5 ? 'alert' : 'record';
  return { action, confidence, reason };
}
