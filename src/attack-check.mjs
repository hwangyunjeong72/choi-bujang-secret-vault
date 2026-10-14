// This bundle records ONLY ALEPH-SDP-correlated test attempts.
// Direct fetch to Vercel does not create a judge-registered request record.
// Do not report an HTTP status as an ALEPH exercise outcome without matching
// trusted request ID / verified engine evidence. Never include private bodies.
export async function runAttackChecks(config) {
  if (![1, 12].includes(config.step)) throw new Error('UNSUPPORTED_STEP');
  if (config.step === 1) return [
    { attackId:'anonymous_note_read',
      expected:'비로그인 공개 가상 자료 조회 (1단계 시험)',
      observed:'not_run' }
  ];
  return [
    { attackId:'s12_anonymous_notes',
      expected:'ALEPH 기록이 있는 무인증 메모 조회는 접근 거부',
      observed:'not_run' },
    { attackId:'s12_unauthenticated_item',
      expected:'ALEPH 기록이 있는 단건 접근 및 타인 소유 조회는 권한 격리',
      observed:'not_run' },
    { attackId:'s12_anonymous_summary',
      expected:'ALEPH 기록이 있는 무인증 작전실 조회는 접근 거부',
      observed:'not_run' }
  ];
}
