# BYTE BACK 방어전 자료실 · 10단계

> 현재 기준: **10단계 저장점 (2026-10-14)**. 아래의 2단계 검증 기록은 당시 이력이며 현재 동작 설명이 아닙니다.

## 현재 구현 (GitHub `main` 코드 기준)
- `public/index.html`에서 Supabase Auth 이메일·비밀번호 로그인과 로그아웃 화면을 제공하고 로그인 상태에 따라 가상 메모 목록·추가·수정·삭제 UI를 표시합니다.
- `api/notes.js`는 기존 `src/verify-login.mjs`로 Bearer 토큰을 검사합니다. 토큰이 없거나 유효하지 않으면 메모를 반환하지 않도록 구현했습니다.
- `GET /api/notes`는 서버가 검증한 사용자 ID의 `owner_id`에 해당하는 메모 목록을 반환합니다. `POST /api/notes`는 같은 ID를 새 메모의 `owner_id`에 저장합니다.
- `GET /api/notes/:id`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`를 구현했습니다. 외부 필드 `body`는 DB `learning_notes.content`에 대응합니다.
- 서버 함수는 Vercel 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 사용합니다. 공개 `public/data.json`은 배포하지 않습니다.
- `aleph.config.json`의 `step`은 **10**이며 `identityProvider`와 판정기 허용 읽기 경로 두 개가 등록되어 있습니다. 기존 메모 CRUD API 자체와 화면의 메모 목록 요청은 보존되었으나 판정기 목록 차단 정책과는 차이가 있습니다.

## 4단계 소유자 격리 (5단계에서도 유지)
단건 `GET`·`PUT`·`DELETE`도 서버가 검증한 사용자 ID와 DB 행의 `owner_id`를 동시에 필터링합니다. `POST`에서는 검증된 ID를 `owner_id`로 저장하며 요청 본문의 소유자 변경은 거부합니다. 수정 요청은 `title`·`body`만 허용합니다. **이 동작은 코드에서 확인했지만 실제 A/B 계정 테스트 결과는 아직 없습니다.** RLS/테이블 최소 권한 SQL은 제안만 했으며 실행 또는 적용 확인을 하지 않았습니다.

## 현재 검증 상태 (2026-10-14)
| 항목 | 상태 |
| --- | --- |
| GitHub `main`의 로그인·소유자 검사 포함 CRUD 구현 | 코드 확인 |
| `aleph.config.json`의 `step: 10`·발급자·허용 경로·원본 REST 주소 | 코드 확인 |
| Vercel Production 최신 배포 및 실제 주소 일치 | **미검증** (연결 권한 오류 이력) |
| A 계정 로그인·메모 추가·수정·삭제 | **미실행 / 미검증** |
| 로그아웃·비로그인 API 요청 HTTP 401 | **미실행 / 미검증** |
| A/B 계정의 타인 메모 접근 거부 | **미실행 / 미검증** |
| `npm run bundle` 제출 묶음 JSON 생성 | **미완료** (`src/attack-check.mjs`는 1단계용) |
| 과거 커밋·이전 배포의 공개 자료 노출 | **조사 필요** |

## 다시 실행 및 점검
1. Vercel 프로젝트 **Settings → Environment Variables**에서 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`가 Production에 설정됐는지 확인합니다. **값을 GitHub·로그·채팅에 기록하지 마세요.**
2. **Deployments**에서 최신 GitHub `main` 커밋이 Production에 배포됐는지 확인하고 실제 배포 주소를 `aleph.config.json`의 `publicAppUrl`과 대조합니다.
3. 시크릿 창에서 로그인 없이 `/api/notes`에 접근하면 HTTP 401 및 메모 없음이 예상됩니다. A/B 계정 각각의 메모 추가·조회·수정·삭제 및 상대 소유 행 조회·수정·삭제 실패를 직접 시험해야 합니다.
4. 정적 빌드 점검은 `npm run build -- --local`입니다. `npm run bundle`에는 깨끗한 Git 작업 폴더, 로컬 전용 `bundle-notes.json`, 해당 단계의 실제 공격 점검 구현이 필요합니다.

## 보존되는 시작 틀
`api/ai.js`, `api/threat-intel.js`, `src/detect.mjs`, XDR 연습 자료와 검사 도구는 이번 저장점에서 수정하지 않습니다. `judgeIssuer`도 변경하지 않습니다.

[AGENTS.md](AGENTS.md)의 보안 및 저장점 규칙을 따릅니다.

## 4단계 저장점 (2026-10-14)
- 적용 코드: `api/notes.js`는 검증된 로그인 사용자 ID로 모든 메모 목록·단건 GET·수정·삭제에 `owner_id` 조건을 걸고, 신규 메모의 소유자를 서버에서 확정합니다. 클라이언트의 `owner_id`/`userId`/`role` 값은 거부합니다.
- 설정: `aleph.config.json`은 `step: 4`, Supabase 인증 발급자와 기존 메서드별 허용 경로 다섯 개를 유지합니다. `judgeIssuer`는 변경하지 않습니다. 배포 호스트는 Vercel에서 별도 확인해야 합니다.
- 데이터: 학습용 A/B 메모 연결 SQL과 RLS 및 최소 권한 SQL은 이전 대화에서 **제안만** 했습니다. 데이터 변경과 RLS 정책 적용·권한 검사 성공은 여기서 확인하지 않았습니다.
- 실행·검증: Vercel Production 배포, 실제 A/B 계정 격리 테스트와 `npm run bundle`은 별도 확인이 필요합니다. `bundle-notes.json` 및 `artifacts/submission.json`은 커밋 대상에서 제외합니다.
- 재실행: 최신 `main`을 받은 뒤 `npm run build -- --local`로 정적 파일을 검사합니다. `npm run bundle`에는 Git 저장소의 깨끗한 작업 트리, 로컬 전용 `bundle-notes.json`과 단계별 실제 점검 기록이 필요합니다.

## 10단계 복구 경로 검증 보강 (S10_BACKUP_UNVERIFIED)
- **복구 서비스와 경로:** `restore-note`, `POST /api/restore-note`. `aleph.config.json.restoreRoute`에 경로를 등록했습니다. 일반 사용자용 `allowedRoutes`에는 넣지 않습니다.
- **시험 B 계정 식별:** 이메일 주소를 소스에 넣지 않고 운영 엔진에서 검증된 가상 `identity: b` 및 `userId`와 사본 `owner_id`가 동일할 때만 수락합니다. 이메일만으로 계정 B라는 신원을 부여하지 않습니다.
- **검증된 사본:** 서버 전용 `RESTORE_B_NOTE_SNAPSHOT`은 가상 한 건의 `{id,owner_id,title,content,contentSha256,version,verified}`를 포함해야 합니다. 별도로 승인한 `RESTORE_B_SNAPSHOT_SHA256`과 `RESTORE_B_VERIFIED_VERSION`은 비밀 입력란에 둡니다. 버전·사본 전체 SHA-256·내용 SHA-256 불일치, 사본 누락 또는 미검증이면 쓰기를 중단합니다.
- **실행 전 표시:** 사본 `version`과 `id`, `ownerMatched`, 내용 해시, 복원 대상 필드(`title`, `content`)는 시험 요청자가 사전 점검해야 합니다. 요청 본문에는 `{id,contentSha256,version}`을 지정하며 이외 정보·실제 메모 내용은 출력하지 않습니다.
- **재검증:** DB 쓰기 직전에 서버에서 비공개 사본을 다시 읽어 검증하고, 대상 ID와 소유자만 갱신합니다. 다른 메모와 감사 테이블을 건드리지 않습니다. 별도 시험 DB에 대한 실제 실행과 Vercel 배포, 심판 재평가 결과는 **미실행·미검증**입니다.

## 11단계 진행 중: 기기 승인 요청 및 상태 표시 (등록 서비스 미연결)
- **서버 API:** `GET /api/device-approval`는 검증된 로그인 후 기기 등록 상태를 반환하고, `POST /api/device-approval`는 승인 요청 화면용 경로입니다. 현재 별도의 신뢰할 수 있는 등록 기기 증명·승인 서비스가 없어 `registered: false`로 제한하며 POST도 승인을 부여하지 않습니다.
- **보호 자료:** `api/notes.js`의 모든 GET/POST/PUT/DELETE 앞에 서버 측 `deviceStatus` 검사를 추가했습니다. 등록 증명이 없으면 HTTP 403 `DEVICE_NOT_APPROVED`를 반환합니다. 승인 전에는 메모 UI를 비우고 숨깁니다.
- **화면:** 승인 요청·상태 다시 확인 버튼을 추가했습니다. 설치, 브라우저 저장소, 임의 요청 필드, 버튼 클릭, 로그인 성공을 기기 승인 증거로 취급하지 않습니다. 기기 개인키는 localStorage 등 브라우저 저장소에 만들거나 보관하지 않습니다.
- **중요 제약:** 현 단계에 신뢰된 실제 기기 증명·등록 서비스가 없으므로 정상 등록 기기도 아직 허용할 수 없습니다. 서버 검증 서비스를 연결하기 전까지 기존 자료실이 열리지 않는 **안전 우선 차단** 상태입니다. 승인된 기기의 정상 허용 여부를 구현·실증했다고 주장하지 않습니다.
- **검증:** GitHub 코드 수정만 완료. 실제 승인, A/B 정상·금지 요청, Vercel 새 배포 및 심판 판정은 **미실행/미검증**입니다.

## 10단계 저장점 (2026-10-14)
- **시험 정책 미리보기:** `scripts/preview-policy-restore.mjs`는 검증 플래그·시각·SHA-256을 확인해 안전 정책 사본과 시험 정책의 차이만 보여 줍니다. 안전 사본의 독립적 승인·침해 전 출처는 별도 확인이 필요합니다.
- **시험 정책 복원:** `scripts/restore-test-policy.mjs`는 미리보기에서 확인한 버전·해시를 재확인하고 별도 `test-policy.json`만 수정하도록 구현했습니다. 운영 정책, 다른 서비스 규칙, 감사 기록은 변경하지 않는 것이 설계 목적이며 실측은 미실행입니다.
- **가상 메모 단건 복원:** 서비스 `restore-note`, `POST /api/restore-note`. 검증된 심판 가상 신원 B와 서버 비공개 사본의 메모 ID·소유자·내용 SHA-256을 대조하여 시험 DB의 한 행만 복원하도록 구현했습니다. 운영 DB와 구분된 시험 DB 설정이 필요하며 실제 복원은 미실행입니다.
- **복구 후 재검증:** README의 '10단계: 복구 후 1~9단계 재검증 순서'에 정상·금지 요청, 자료·정책·감사 기록의 전후 비교 순서를 기재했습니다. 모든 재검증 결과는 **미실행**입니다. 특히 A 정상 요청과 B의 A 자료 요청 거부는 실제 API로 확인하지 않았습니다.
- **검증 상태:** GitHub 코드·문서 확인만 실시했습니다. `node --test test/policy-restore-preview.test.mjs`, `node --test test/restore-test-policy.test.mjs`, Vercel 배포, 심판 판정, `npm run bundle` 성공은 **미검증**입니다.
- **재실행:** Node.js 22 이상, 깨끗한 Git 저장소에서 위 두 시험 명령을 먼저 실행하고, 별도 시험 DB에서만 복구와 A/B 접근 거부를 확인하세요. `npm run bundle`에는 로컬 전용 `bundle-notes.json` 및 현재 단계의 실제 점검 결과가 필요합니다.
- `aleph.config.json`은 `step: 10`으로만 바꾸고 `judgeIssuer`, `identityProvider`, `allowedRoutes`, `originalApiUrl`, `publicAppUrl`, `restoreRoute`는 보존합니다. 복원 API를 판정기의 일반 읽기 허용 경로에 추가하지 않습니다.

## 10단계 작업 중: 비공개 가상 메모 1건 복구 POST (미배포/미검증)
- **서비스·경로:** `restore-note` 테스트 전용 서비스, `POST /api/restore-note`. 기존 `/api/notes` CRUD 경로와 화면은 변경하지 않았습니다. 이 관리용 경로는 `aleph.config.json`의 판정기 `allowedRoutes`에 추가하지 않습니다.
- **시험 계정 B만:** `src/verify-login.mjs`에서 검증한 **심판 가상 신원** `kind: judge` 및 `identity: b`에 한정하고, 사본의 `owner_id`와 검증된 `userId`가 같아야 합니다. 학생 JWT·요청 본문 `role`이나 `owner_id`로 B 권한을 주장할 수 없습니다.
- **비공개 사본:** `RESTORE_B_NOTE_SNAPSHOT` 서버 환경 변수에 `{id,owner_id,title,content,contentSha256}` 형식의 허가된 가상 메모 한 건을 저장합니다. 저장소·로그·응답에는 메모 본문이나 토큰을 남기지 않습니다. 내용 해시(SHA-256) 및 ID·소유자를 확인하고 대상은 본문 `{id,contentSha256}`로 지정합니다.
- **시험 DB 안전장치:** `RESTORE_TEST_ONLY=true` 및 `RESTORE_TEST_SUPABASE_HOST`가 설정돼 실제 `SUPABASE_URL` 호스트와 일치해야 동작합니다. **별도 가상 시험 DB 외에는 실행하지 마세요.** 대상 메모가 이미 존재하고 소유자가 일치할 때만 해당 `id`의 `title`/`content`를 갱신합니다. 타인 메모·다른 메모·감사 테이블은 수정하지 않습니다.
- **거부:** 사본이나 서버 설정 누락(503), 미인증(401), B 아닌 사용자(403), 해시·ID·소유자 불일치(403), 대상 누락(404), 동시 변경·확인 실패(409) 등은 실패로 반환합니다. 실제 DB의 원자적 동시성 보장은 별도의 테스트 검증이 필요합니다.
- **검증 상태:** GitHub 코드만 반영. B 시험 계정과 비공개 사본의 실제 연결, 별도 DB 복원, 복원 후 해시·감사 기록 실측, Vercel 배포, 심판 판정은 **미실행/미검증**입니다. `aleph.config.json`은 9단계 저장점 그대로 유지합니다.

## 10단계: 복구 후 1~9단계 재검증 순서 (전 항목 미실행)

> **실행 상태:** 아래는 **실행 계획**이며, 실제 확인 결과가 아닙니다. 작성 시점의 모든 시험은 **미실행**입니다. 가상 시험에서만 수행하고, 운영 메모·토큰·실명·감사 본문을 기록하거나 공개하지 않습니다. 각 검사는 **관찰된 HTTP 상태/판정 코드와 시각**만 별도 비공개 점검표에 기록하고, 실제 결과를 확인하기 전에는 '통과'로 바꾸지 않습니다. 이전 9단계 저장점과 기존 기능은 그대로 보존합니다.

### 복구 직후 먼저 확인할 사항 (0단계: 작업 전제)

1. **대상 격리:** 실제 서비스가 아닌 허가된 **별도 시험 프로젝트 및 시험 DB**인지 확인합니다. `SUPABASE_URL`이 운영 DB를 가리키면 복구·쓰기 시험을 중단합니다. `git status`로 다른 사람의 미커밋 작업을 확인하며 무조건 초기화하지 않습니다.
2. **안전 정책 사본 비교:** 검증된 사본의 출처·승인 시각·버전을 별도 확인하고 `node scripts/preview-policy-restore.mjs safe-backup.json test-policy.json`을 실행합니다. 없거나 검증 실패면 중단합니다. 변경된 항목만 확인하고 명시적으로 승인한 경우에만 시험 정책을 복원합니다. `aleph.config.json` 및 운영 정책은 수정하지 않습니다.
3. **시험 정책 복원 확인:** 승인한 버전/사본 해시/시험 정책 해시를 확인한 뒤 `scripts/restore-test-policy.mjs`의 시험 전용 복원을 수행한 경우, 동일 미리보기로 차이를 다시 확인합니다. 복원 대상 버전과 변경 범위, 타 서비스 규칙 및 감사 기록의 전후 일치 여부를 기록합니다. 정책 복원 동작·권한 회복은 **미실행/미검증**입니다.
4. **시험 B 메모 한 건 복원 확인:** 서버에 비공개 `RESTORE_B_NOTE_SNAPSHOT`, `RESTORE_TEST_ONLY`, `RESTORE_TEST_SUPABASE_HOST`가 안전하게 설정돼 있는지 확인합니다. 검증된 가상 B 신원으로만 `POST /api/restore-note`를 사용하고, 사본의 메모 `id`·`owner_id`·`contentSha256`와 복원 후 단일 행의 값을 대조합니다. 다른 메모의 ID 집합·해시 및 감사 행 수/식별자/해시도 전후 비교합니다. **실제 복원은 미실행**입니다. 사본 본문과 토큰은 결과표에 기록하지 않습니다.
5. **배포/계약 경계:** 시험 배포가 최신 GitHub 커밋을 사용하는지 Vercel **Deployments**에서 확인합니다. `docs/DECIDER_REQUEST.md`의 `decide()` 계약, `docs/DETECT_EVENTS.md`의 `detect()` 계약을 기준으로 검사합니다. 로컬 시험 통과는 심판의 실제 판정/권한 회수 증거가 아닙니다.

### 1~9단계 재시험 표 (반드시 아래 순서, 최초 상태 전체 미실행)

| 순서/단계 | 정상 요청: 기대 결과 | 금지·의심 요청: 기대 결과 | 실행 방법·증거 | 현재 결과 |
| --- | --- | --- | --- | --- |
| 1단계 공개/비공개 분리 | 로그인 화면과 허용된 공개 자원만 노출 | 비로그인 `GET /api/notes`는 **401**; 비공개 메모나 공개 `data.json` 본문 유출 없음 | 시험 배포를 시크릿 창에서 확인, 비로그인 API HTTP 코드와 공개 파일 노출 여부 기록 | **미실행** |
| 2단계 자료실 기본 기능 | 로그인 후 화면 접근 및 본인 가상 메모 목록 표시 | 잘못된 메서드 및 모르는 경로는 405/404 등으로 거부 | 화면/UI와 API 직접 요청을 **별도로** 확인 | **미실행** |
| 3단계 로그인 확인 | 유효한 Supabase 시험 로그인 토큰으로 본인 `GET /api/notes` 성공 | 토큰 없음/유효하지 않음은 401, 브라우저 제공 `role`/사용자 ID는 권한 근거로 사용되지 않음 | A/B 로그인 각각 시험, HTTP 코드만 기록 | **미실행** |
| 4단계 소유자 격리 | A는 A 메모 단건 `GET /api/notes/:id` 확인 | B가 A 메모 ID로 직접 GET/PUT/DELETE 시 **자료 미반환·변경 없음**(기존 API는 대상 없을 때 404) | 양쪽 신원으로 직접 API 시험, ID/소유자/내용 해시 전후 대조 | **미실행** |
| 5단계 서버 비밀값/최소 권한 | 허용된 본인 메모 CRUD가 서버 함수에서 정상 처리 | 요청에 `owner_id`, `role` 주입 시 403; 브라우저·공개 정적 파일·응답에 서버 비밀키 없음 | 본인 CRUD 시험, 공개 자산 정적 검색, DB RLS/역할 권한은 실제 적용 후 별도 조회 | **미실행** |
| 6단계 등록 기기 | 계약에 맞는 등록 기기 단건 GET → `allow` | 미등록 기기의 동일 가상 요청 → `deny/device_not_registered` | `npm run decider:test` 또는 별도 계약형 가상 요청; 로컬 결과는 실운영 차단 증거가 아님 | **미실행** |
| 7단계 이상 접속/추가 확인 | 정상 등록 기기 허용, 출처가 확인된 정상 재인증 이벤트는 계약 범위에서 처리 | 가상 낯선 네트워크+심야+최근 폭주가 합쳐지면 `step_up/step_up_required`; 지역만으로 영구 차단 없음 | `npm run fixture:7` 및 `npm run decider:test` 실행 결과와 실제 인증 연동을 **구분 기록** | **미실행** |
| 8단계 구역 분리 | 등록 기기의 계약형 `GET /api/notes/:id` 허용(소유자 일치는 API에서 별도 확인) | 판정기에서 `GET /api/notes` 목록, 공지 POST/PUT/PATCH/DELETE, 강사 자료, 알 수 없는 경로 거부 | 서비스·메서드·route·path가 명시된 가상 판정 요청과 API 직접 호출을 별도 비교 | **미실행** |
| 9단계 사건 탐지/제안 | 정상 GET 30건, 정확히 120건, 서로 다른 사용자 각 100건 → `observe` | 동일 가명 사용자의 **10분 내 121건 이상 GET** → `propose_revocation/burst_read`; 실제 권한 회수와 동일시 금지 | `npm run detect:test` (가상 사건 6종); 기기 ID·네트워크는 현재 사건 계약에 없어 단일 기기 회수 여부 **미검증** | **미실행** |

### 복구 성공 판정 전 최종 대조 (모두 미실행)

- **자료:** 복원된 B 시험 메모 **한 건**의 ID·검증된 소유자·내용 SHA-256이 비공개 사본과 일치해야 합니다. 다른 메모의 ID 집합과 내용 해시, 감사 기록은 복원 전후 동일해야 합니다. **미실행**
- **정책:** `allowedRoutes`·`policyRules` 등 승인된 시험 정책 범위가 안전 사본과 일치하고, 다른 서비스 규칙·감사 이력은 유지되어야 합니다. **미실행**
- **차단 재확인:** B의 A 메모 직접 조회·수정·삭제가 거부되고, A의 정상 메모 조회는 성공해야 합니다. 등록/미등록 기기·구역별 금지 경로·폭주 탐지 시험이 기대대로 구분되어야 합니다. **미실행**
- **알려진 차이:** 실제 `GET /api/notes` 목록 API와 8단계 판정기의 목록 거부 정책은 현재 서로 다릅니다. `GET /api/notices`에 대한 판정기 허용만 존재하고 실제 공지 API는 없습니다. 복구 재시험에서 해결됐다고 주장하지 않습니다.
- **기록 원칙:** 재실행한 테스트마다 `시험 ID / 실행 UTC / 대상(시험 전용) / 기대 코드 / 실제 코드 / 결과(통과·실패·미실행)`만 남깁니다. 실패 또는 미실행을 통과로 바꾸지 않습니다. API 응답의 메모 본문·JWT·Supabase 비밀키·실명은 기록하지 않습니다.

## 9단계 저장점 (2026-10-14)
- `src/detect.mjs`에서 검증된 가상 사건 계약의 `identity.sub`, `method`, `at`만 사용하고 그 외의 토큰·메모 내용·실명은 저장하거나 출력하지 않습니다.
- 같은 가명 사용자의 GET 요청이 임의의 연속 10분 구간에 **120건 초과**하면 `{ action: 'propose_revocation', reasonCode: 'burst_read', subject }`를 반환하고, 그 밖에는 `{ action: 'observe' }`를 반환합니다. 여러 사용자의 사건은 합산하지 않습니다.
- **제약:** 현재 `docs/DETECT_EVENTS.md` 계약에는 네트워크 출처·기기 ID가 없으므로 '낯선 네트워크 + 폭주 조회' 복합 탐지나 **기기 한 대 지정 회수 제안**은 미구현입니다. 사용자 단위 제안을 기기 단위 실제 회수로 표시하지 않습니다.
- `src/decider.mjs`의 `device_registered`·`step_up_required`와 8단계 구역 규칙, `api/notes.js`의 사용자별 자료 격리, 로그인과 화면은 변경하지 않았습니다.
- **검증 상태:** GitHub 코드 내용만 확인했습니다. `npm run detect:test` 통과, 실제 반 엔진 사건 연동, 접속·기기 권한 회수, 회수 시각, Vercel Production 배포, 심판 판정은 **미실행/미검증**입니다.
- **재실행:** 최신 저장소와 Node.js 22 이상에서 `npm run detect:test`로 여섯 가상 사건을 검증합니다. `npm run bundle`에는 깨끗한 Git 작업 폴더와 Git에서 제외한 `bundle-notes.json`, 9단계 실제 공격 점검이 필요합니다.
- `aleph.config.json`은 `step: 9`로만 조정하며 `judgeIssuer`, `identityProvider`, `allowedRoutes`, `originalApiUrl`, `publicAppUrl`은 유지합니다. 비밀값·메모 본문·제출 JSON을 Git에 포함하지 않습니다.

## 8단계 저장점 (2026-10-14)
- **자원 구분:** `src/resource-ids.mjs`에서 내 메모(`personal_notes`)와 강사 공지(`instructor_notices`)의 논리 ID를 나눴습니다. 이 식별 함수는 기존 API에 연결되지 않았으며 공지 API는 아직 없습니다.
- **판정기 구역 규칙:** `src/decider.mjs`에서 `service`, `method`, `route`, `path`를 함께 확인합니다. 메모 단건 `GET /api/notes/:id` 및 반 공지 `GET /api/notices`만 허용 대상이며, 메모 목록·공지 쓰기·강사 자료·알 수 없는 경로는 거부합니다. 메모 ID를 UUID로 제한하지 않으며 기존 `device_registered`와 `step_up_required` 규칙을 유지합니다.
- **API 확인:** `api/notes.js`는 서버에서 검증된 로그인 사용자 ID와 저장된 메모의 `owner_id`를 함께 조건에 넣습니다. 화면 메뉴, 클라이언트의 `role`·`owner_id`는 믿지 않습니다. 강사 역할을 검증할 별도 서버 저장소가 없으므로 강사 권한을 부여하지 않았습니다.
- **서버 API와 판정기 경계:** 메모 화면은 기존 `GET /api/notes`를 계속 사용하며, 판정기는 전체 목록을 거부합니다. 판정기의 반 공지 읽기 허용 경로는 별도 서버 API가 없으므로 실제 운영 조회를 보장하지 않습니다. 이 차이를 해결했다고 주장하지 않습니다.
- **검증 상태:** GitHub 코드·정적 경로 검토만 수행했습니다. 8단계 판정기 가상 시험, 직접 API 우회 요청, 타인 메모 거부 실측, Vercel 배포, 심판 판정 및 `npm run bundle` 성공은 아직 확인하지 않았습니다.
- **재실행:** Node.js 22 이상 환경의 최신 Git 저장소에서 `npm run decider:test`로 로컬 판정기 연습을 실행하고 메모 목록 거부·단건 허용은 계약에 맞는 별도 가상 요청으로 검증해야 합니다. `npm run bundle`에는 깨끗한 Git 작업 폴더와 Git에 포함하지 않는 `bundle-notes.json`, 현재 단계에 맞는 실제 `src/attack-check.mjs` 점검이 필요합니다.
- **설정:** `aleph.config.json`은 `step: 8`이며 `allowedRoutes`는 `GET /api/notes/:id`, `GET /api/notices`입니다. `judgeIssuer`, `identityProvider`, `originalApiUrl`, 배포 주소는 변경하지 않았습니다. 토큰·비밀번호·서버 키·메모 본문은 기록하지 않습니다.

## 7단계 저장점 (2026-10-14)
- `src/decider.mjs`에는 기존 `device_registered` 규칙과 새 `step_up_required` 규칙이 구현되어 있습니다. 엔진 계약의 `signals`와 `recentEvents` 형식만 검사하고, 출처 없는 지역·네트워크·시각·행동값을 정상값으로 임의 보정하지 않습니다.
- `judge_fixture` 출처의 가상 복합 사건에서 낯선 네트워크, 심야 시각, 최근 대량 읽기 의심이 모두 확인되면 `step_up / step_up_required`를 반환합니다. 지역 하나만으로 영구 차단하지 않습니다. 정상 등록 기기는 `allow / approved`, 미등록 기기는 `deny / device_not_registered`입니다.
- `stepUp.verified`와 `stepUp.authAgeSeconds`는 계약에 있지만, 같은 사용자의 실제 재로그인 시각·원래 요청과의 연동은 확인되지 않았습니다. 가상 추가 확인 완료 요청에 대한 `allow`를 실제 재로그인 검증으로 주장하지 않습니다.
- 이전 가상 시험에서 `npm run decider:test`의 등록 기기, 미등록 기기, 복합 이상 접속, 가상 추가 확인 완료 네 사례와 `npm run fixture:7`의 정상 `allow`/이상 `step_up`을 확인한 것으로 보고됐습니다. 심판의 실제 공격 및 운영 자료 차단·새 로그인 후 해제는 **미실행/미검증**입니다.
- 재실행: 저장소 폴더에서 Node.js 22 이상을 준비하고 `npm run decider:test`, `npm run fixture:7`을 순서대로 실행합니다. 실제 운영 접속은 Vercel 배포와 엔진 계약이 확보된 후 별도로 확인해야 합니다.
- 설정: `aleph.config.json`은 `step: 7`로 기록하고 로그인 발급자, `judgeIssuer`, 허용 경로, 원본 API HTTPS 주소는 유지합니다. `src/attack-check.mjs`는 여전히 1단계 전용이며 제출 번들 성공을 보장하지 않습니다.
- 비밀값·토큰 원문·메모 본문·인증서·서명 키를 저장소 또는 제출 묶음에 넣지 않습니다. `bundle-notes.json` 및 `artifacts/submission.json`은 커밋하지 않습니다.

## 6단계 저장점 (2026-10-14)
- 등록 기기의 메모 읽기 요청을 허용하고 미등록 또는 미설정 기기를 `device_not_registered`로 거부하는 `device_registered` 규칙을 `src/decider.mjs`에 구현했습니다. 기존 요청·응답 계약과 로그인·메모 API는 유지합니다.
- `npm run decider:test`의 가상 요청 두 건(등록 기기 정상 요청, 미등록 기기 거부)을 이전 작업에서 확인해 README에 기록했습니다. 이 결과는 실제 심판 판정이 아닙니다.
- `aleph.config.json`은 `step: 6`으로 기록합니다. `judgeIssuer`, `identityProvider`, `allowedRoutes`, `originalApiUrl` 등 다른 설정은 유지합니다. Vercel Production URL 및 실제 배포 여부는 미검증입니다.
- 실행 방법: Node.js 22 이상, 저장소 작업 폴더에서 `npm run decider:test`를 실행하고 `통과 · 등록 기기의 정상 요청`, `통과 · 미등록 기기의 가상 요청` 두 줄을 확인합니다. 별도 접속 프로그램 설치는 필요하지 않습니다.
- 주의: `src/attack-check.mjs`는 아직 1단계 전용입니다. `npm run bundle`에는 로컬 전용 `bundle-notes.json`, 깨끗한 Git 작업 트리와 현재 단계의 실제 점검 기록이 필요하며 생성 성공 여부는 따로 확인해야 합니다.
- 이번 저장점에는 비밀번호, 토큰, 인증서·서명 키, 개인 자료를 추가하지 않습니다. `bundle-notes.json`과 `artifacts/submission.json`은 Git에 포함하지 않습니다.

## 6단계 등록 기기 판정 로컬 확인 (2026-10-14)

- 현재 `src/decider.mjs`는 엔진이 전달한 `request.deviceRegistered === true` 및 메모 GET 경로일 때 `allow / approved`를 반환하고, 미등록 또는 누락 기기는 `deny / device_not_registered`로 거부합니다.
- 확인 순서: (1) 저장소 폴더에서 `node --version`으로 Node.js 22 이상인지 확인 → (2) `npm run decider:test` 실행 → (3) 두 시험 이름이 모두 `통과`로 표시되는지 확인합니다.
- 2026-10-14: GitHub에서 확인한 `src/decider.mjs`, `scripts/decider-test.mjs`, `scripts/fixture-7.mjs`를 별도 로컬 폴더에 재현하여 `npm run decider:test` 실행 **통과**. 이는 GitHub 작업 폴더나 Vercel에서의 실행이 아닙니다.
- 실제 출력:
  ```text
  통과 · 등록 기기의 정상 요청
  통과 · 미등록 기기의 가상 요청
  이 명령은 가상 요청으로 연습하며 심판 통과 증거가 아닙니다.
  ```
- 별도로 판정 응답을 확인한 결과, 등록 기기는 `allow / approved`, 미등록 기기는 `deny / device_not_registered`였습니다.
- 이 단계에는 별도로 설치할 접속 프로그램이 없습니다. 미등록 기기의 실제 공격·릴레이 차단 검증은 **심판 담당**이며, 로컬 가상 시험을 실제 공격 증거로 취급하지 않습니다. 인증서·서명 키·비밀값은 생성하거나 저장하지 않았습니다.

## 5단계 저장점 (2026-10-14)
- 브라우저 메모 목록·추가·수정·삭제는 이미 `/api/notes` 서버 함수를 사용하며, Supabase Auth 로그인·로그아웃 호출은 별도로 유지합니다.
- `api/notes.js`의 Bearer 로그인 검증, 소유자 ID 필터, 서버 환경변수 `SUPABASE_URL` 및 `SUPABASE_SECRET_KEY` 사용은 변경하지 않았습니다.
- `aleph.config.json`의 `step`은 5이며 `originalApiUrl`은 쿼리가 없는 `https://nfhfbhignmrgutjlxpvw.supabase.co/rest/v1/learning_notes`입니다. `judgeIssuer`와 `identityProvider`, 메서드별 `allowedRoutes`는 유지합니다.
- `public.learning_notes`의 PUBLIC·anon·authenticated 직접 테이블 권한 회수 SQL은 **제안만 했으며 실행·적용 여부는 확인하지 않았습니다**. 원본 REST API의 anon 키 차단과 서버 경유 A/B CRUD 테스트도 **미검증**입니다.
- 재검사: Vercel **Deployments**에서 최신 `main`이 Production에 배포됐는지 확인하고, 익명 원본 REST 접근 거부 및 A/B 계정 서버 API 정상 작동을 직접 확인합니다. `npm run build -- --local`로 정적 빌드를 점검할 수 있습니다.
- 제출: `npm run bundle`은 깨끗한 Git 작업 트리, Git origin, Git에 포함하지 않는 `bundle-notes.json`, 단계에 맞는 실제 공격 점검을 요구합니다. `src/attack-check.mjs`는 현재 1단계 전용이므로 5단계 점검과 제출 JSON 생성 성공은 아직 확인하지 않았습니다.
- 보안: 비밀번호·토큰·서버 키·실명·메모 본문은 제출 JSON 및 저장소에 넣지 않습니다. `artifacts/submission.json`은 커밋하지 않습니다.

---
## 이전 단계 기록 (역사적 기록 · 현재 동작 아님)

## 2단계 공개 노출 검증 절차 (2026-10-14)

### A. GitHub 최신 파일에서 가상 메모 문장 검색
1. [GitHub 저장소](https://github.com/hwangyunjeong72/choi-bujang-secret-vault)의 `main`으로 이동합니다.
2. 저장소 검색에서 `실습용 가상`을 검색합니다. 제목뿐 아니라 **메모 본문**을 기준으로 확인합니다. 구체적인 과거 노출 문구는 이 문서에 다시 복사하지 않습니다.
3. `data.json`에서 `notes: []`를 확인합니다. `public/data.json`은 최신 브랜치에서 존재하지 않아야 합니다.
4. `public/index.html`에는 메모 본문이 없어야 하며 `/api/notes`를 요청해야 합니다. `scripts/build-public.mjs`에는 `public/data.json`을 복사하는 코드가 없고 빌드 시 기존 파일을 제거하는 처리만 있어야 합니다.
5. GitHub 최신 커밋 해시와 검색 일시, 검색어, 검색 결과 건수를 아래 검증 기록에 적습니다.

### B. 새 Vercel 배포 파일 검색
1. [Vercel 프로젝트](https://vercel.com/hwangyunjeong72/choi-bujang-secret-vault) → **Deployments**에서 Production의 최신 **Ready** 배포를 선택하고 커밋 해시가 GitHub 최신 `main`과 같은지 대조합니다.
2. 해당 Production 주소의 `/`을 열고 메모 네 카드가 표시되는지 확인합니다. 브라우저 개발자 도구(F12) → Network에서 화면이 `/api/notes`를 호출하는지 확인합니다.
3. 같은 배포 주소에 `/data.json`을 붙여 열고 **404** 또는 메모가 없는 응답인지 확인합니다. 200 응답인 경우에도 본문에 예전 가상 메모 문장이 없어야 합니다.
4. `/aleph.json`에서 `step: 2`인지 확인하고, **현재 배포 커밋**을 기록합니다.
5. 배포 화면의 파일 목록 또는 내려받을 수 있는 **정적 산출물 전체**를 대상으로 가상 메모 본문을 검색합니다. 로컬로 빌드 산출물을 받았다면 `grep -R -n -E '실습용 가상 (과제|포트폴리오|리추얼|행정) 기록' public` 명령으로 확인할 수 있습니다. 검색이 0건이어야 하고, 검색 대상과 누락된 파일이 있으면 함께 기록합니다. Windows PowerShell에서는 `Get-ChildItem public -Recurse -File | Select-String -Pattern '실습용 가상 (과제|포트폴리오|리추얼|행정) 기록'`을 사용합니다.
6. **2단계 당시** `/api/notes`는 인증 없는 공개 API였습니다. **현재 3단계 API는 로그인 토큰을 요구하도록 구현되었습니다.** 키 문자열은 기록하거나 붙여넣지 않습니다.

### C. 오래된 커밋·배포 노출 조사
1. GitHub **History**에서 1단계 이전/초기 커밋의 `data.json`, `public/data.json`을 열고 공개된 메모 본문이 있었는지 기록합니다.
2. Vercel **Deployments**에서 과거 Production/Preview 주소를 순서대로 열어 `/data.json` 및 화면 응답을 확인합니다. 공개 URL 접근 여부와 검색 결과를 기록하되, 실제 개인 자료 또는 비밀키 값은 기록하지 않습니다.
3. 이전 커밋이나 기존 배포 URL이 남아 있는 한 **'과거 노출 해소'라고 판정하지 않습니다.** 최신 배포에서 문장이 발견되지 않는 것은 **현재 배포 노출 감소**만 의미합니다. 접근 가능한 옛 배포의 처리 여부는 별도 이슈입니다.

### D. 검색 결과 및 남은 약점 기록

| 대상 | 2026-10-14 확인 내용 | 판정 |
| --- | --- | --- |
| GitHub 최신 `main` 코드 검색 (`실습용 가상`) | 검색 결과 0건 | 확인됨 (현재 브랜치 한정) |
| GitHub 최신 `data.json` | `notes: []` | 확인됨 |
| GitHub 최신 `public/data.json` | 파일 없음 (404) | 확인됨 |
| GitHub 최신 `scripts/build-public.mjs` | 빌드 시 `public/data.json` 제거, 공개 복사 없음 | 확인됨 |
| 현재 Vercel 배포 및 정적 산출물 | Vercel 연결 권한 오류(403)로 조회 불가 | **미검증** |
| Vercel 과거 배포 및 접근 가능한 공개 URL | 동일한 권한 문제로 조사 불가 | **미검증** |
| GitHub 과거 커밋의 노출 여부 | 과거 파일이 남아 있을 수 있어 전체 이력 조사가 필요 | **해소되지 않음 / 조사 필요** |
| `/api/notes` 공개 호출 (2단계 당시) | 당시 인증 없이 가상 메모를 조회할 수 있었음. 현재 3단계는 인증 검사 코드가 있으나 실제 배포 미검증 | **과거 기록 / 현재 배포 미검증** |

**종합 판단:** 최신 GitHub 정적 파일에 예전 가상 메모 본문이 없다는 점만 확인했습니다. Vercel의 실제 배포/과거 배포는 검증하지 못했으며 과거 공개 이력은 남을 수 있습니다. 따라서 과거 자료 노출 문제가 완전히 해소되었다고 주장하지 않습니다.

## 2단계 저장점 (2026-10-14)
- 단계 설정: `aleph.config.json`의 `step: 2`; `repoUrl`은 실제 GitHub 저장소와 일치시킵니다. `judgeIssuer`, `identityProvider`, `allowedRoutes`, `originalApiUrl` 등 다른 단계 설정은 보존합니다.
- 동작하는 구현: 브라우저는 `/api/notes`를 요청하고 서버 함수는 환경변수로 학습용 Supabase를 조회합니다. 공개 `data.json`의 메모 본문은 제거했고 `public/data.json`은 GitHub에서 삭제했습니다. `npm run build`는 공개 자료 복사를 하지 않으며 `/aleph.json` 생성을 유지하도록 작성되었습니다.
- 재실행: Vercel에서 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 Production 환경변수로 설정한 뒤 최신 `main`을 배포합니다. 로컬에서는 `npm run build -- --local`로 정적 출력만 검사합니다. `npm run bundle`에는 Git 원격·깨끗한 작업 트리·비공개 `bundle-notes.json` 및 직접 실행한 공격 점검 결과가 필요합니다.
- 현재 검증 한계: Vercel 조회는 연결 권한 오류 403으로 미검증이며 Production 주소도 검증되지 않아 `publicAppUrl` 자리표시자를 유지했습니다. `src/attack-check.mjs`는 아직 1단계 전용이므로 **2단계 번들 제출이 성공했다고 주장하지 않습니다.**
- 위험 기록: `/api/notes`에는 아직 인증이 없어 누구나 가상 메모를 요청할 수 있고, 과거 공개 커밋과 옛 배포의 노출도 해소되지 않았습니다. 로그인 보호 전에는 실제 개인정보를 저장하지 않습니다.
- 보안: GitHub에 비밀키 값, 토큰, 메모 본문을 새로 넣지 않습니다. `bundle-notes.json`과 `artifacts/submission.json`은 커밋하지 않습니다.


## 3단계 저장점 (2026-10-14)
- 구현: Supabase Auth 이메일·비밀번호 로그인과 로그아웃 UI, 검증된 Authorization Bearer 토큰을 요구하는 자료 API, 가상 메모 생성·목록·단건 조회·수정·삭제 화면을 추가했습니다.
- 서버: `src/verify-login.mjs`는 변경하지 않고 호출합니다. 클라이언트가 전송한 사용자 ID나 역할을 믿지 않으며, 생성 시 검증된 `userId`를 `owner_id`에 저장합니다. 목록은 소유자 기준으로 조회합니다.
- API: `GET /api/notes`, `POST /api/notes`, `GET /api/notes/:id`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`. 외부 응답 필드는 `id,title,body`, DB의 본문 열은 `content`입니다.
- 설정: `aleph.config.json`의 `step: 3`, Supabase Auth issuer·audience·JWKS, 허용 경로 다섯 개를 기록했습니다. `judgeIssuer`와 5단계 이전의 `originalApiUrl` 값은 변경하지 않았습니다. 배포 주소 `https://choi-bujang-secret-vault.vercel.app`는 실제 운영 배포와 재대조가 필요합니다.
- 확인: Production 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 Vercel에서 직접 설정한 뒤 최신 `main` 배포를 확인합니다. A 계정 로그인 후 추가·수정·삭제, 로그아웃 후 HTTP 401을 시험해야 합니다. 이 시험 및 Vercel 배포는 아직 확인되지 않았습니다.
- 남은 약점: 단건 GET·PUT·DELETE의 소유자 검사가 없으므로 메모 ID를 아는 B가 접근할 수 있습니다. 4단계에서 수정해야 하며 그때까지 가상 자료만 사용합니다.
- 다시 실행: `npm run build -- --local`은 정적 빌드 점검입니다. `npm run bundle`은 깨끗한 Git 작업 폴더, 비공개 `bundle-notes.json`, 단계별 `src/attack-check.mjs` 자기 점검이 필요합니다. 현재 `attack-check.mjs`는 1단계용이며 3단계 점검을 아직 구현하지 않았습니다.
- 보안: 비밀번호·JWT·서버 키·실제 메모 내용은 GitHub에 저장하지 않습니다. `bundle-notes.json`과 `artifacts/submission.json`은 커밋하지 않습니다.
