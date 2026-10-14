// Stage 12 self-check: only observed HTTP outcomes. Never submit note bodies,
// credentials, request headers, tokens, or data from another account.
const request=async (url, headers={})=>{
  try {
    const response=await fetch(url,{
      method:'GET',headers,redirect:'manual',cache:'no-store',
      signal:AbortSignal.timeout(10000)
    });
    // Do not parse the protected response body, even on unexpected HTTP 200.
    return 'HTTP '+response.status;
  } catch { return '요청 실패 (HTTP 결과 미확인)'; }
};
const validOrigin=value=>{
  const url=new URL(value);
  if(url.protocol!=='https:' || url.username || url.password
     || url.pathname!=='/' || url.search || url.hash) throw new Error('배포 주소 형식 오류');
  return url;
};
export async function runAttackChecks(config){
  if(config.step!==12 && config.step!==1)
    throw new Error('지원하지 않는 점검 단계입니다.');
  const app=validOrigin(config.publicAppUrl);
  if(config.step===1){
    const result=await request(new URL('/data.json',app));
    return [{attackId:'anonymous_note_read',
      expected:'가상 공개 자료 조회 확인 (1단계 연습)',
      observed:result}];
  }
  // The two probes are sequential, against the same deployed app. The second
  // probe is anonymous too: it DOES NOT impersonate a second user's login.
  const anonymous=await request(new URL('/api/notes',app));
  const otherWithoutToken=await request(new URL('/api/notes/00000000-0000-4000-8000-000000000001',app));
  // Read-only operations-summary probe: 401 is expected without credentials.
  const summary=await request(new URL('/api/operations-summary',app));
  return [
    {attackId:'s12_anonymous_notes',expected:'무인증 메모 목록 GET은 HTTP 401, 비공개 본문 없음',observed:anonymous},
    {attackId:'s12_unauthenticated_item',expected:'무인증 단건 GET은 HTTP 401, 타인 메모 실측은 별도 인증 필요',observed:otherWithoutToken},
    {attackId:'s12_anonymous_summary',expected:'무인증 작전실 요약 GET은 HTTP 401, 수치 비공개',observed:summary}
  ];
}
