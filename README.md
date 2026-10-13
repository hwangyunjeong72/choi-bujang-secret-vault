# BYTE BACK 방어전 자료실 · 2단계

## 현재 동작
- 화면 `public/index.html`은 `/api/notes`를 호출해 Supabase `public.learning_notes`의 가상 메모 최대 네 건을 카드로 표시합니다.
- `api/notes.js`에서만 서버 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 읽습니다. 브라우저 코드, 응답, 로그에 키를 포함하지 않습니다.
- Supabase의 `learning_notes`는 `owner_id uuid`를 가진 연습용 테이블이며 RLS가 켜져 있고 `anon`·`authenticated` 테이블 읽기 권한은 없습니다. 서버 전용 secret 키를 쓰는 서버 함수만 읽습니다.
- `public/data.json`은 배포하지 않습니다. `/data.json`에 메모 본문이 있어서는 안 됩니다.
- `aleph.config.json`의 `step`은 2이며 `npm run build`는 단계 2에서도 `public/aleph.json`을 생성합니다.

## 반드시 알고 있어야 할 약점
**`/api/notes`는 현재 로그인 인증 없이 누구나 호출할 수 있는 공개 주소입니다.** Supabase의 RLS와 읽기 권한을 잠갔어도 서버 함수가 관리자 성격의 비밀키로 자료를 읽어 결과를 돌려주므로, 이 함수가 공개되면 응답의 가상 메모는 공개됩니다. 실명, 개인정보, 실제 과제 기록 등 비공개 자료를 이 테이블에 넣지 마세요. 요청 인증 및 소유권 검증은 뒤 단계에서 구현합니다.

## 학생이 설정하는 단계
1. 이전 단계의 `step2_learning_notes.sql`을 **학습용 Supabase SQL Editor**에서 실행해 가상 메모 네 건을 삽입합니다. SQL 파일 자체는 공개 저장소에 올리지 않습니다.
2. Vercel 프로젝트 **Settings → Environment Variables**에 다음 두 이름을 등록합니다. 값은 Vercel 설정 화면에만 직접 입력하고 채팅이나 GitHub에 보내지 않습니다.
   - `SUPABASE_URL`: 학습용 프로젝트 URL
   - `SUPABASE_SECRET_KEY`: 서버 전용 Supabase Secret API Key (`sb_secret_...`)
3. 두 값의 적용 환경에 **Production**을 포함하고 최신 GitHub `main`으로 재배포합니다.
4. `/`에는 메모 카드 네 건, `/api/notes`에는 `notes` 배열 네 건이 보이는지 확인합니다. **이 응답은 공개된 가상 데이터**임을 기억하세요.
5. `/data.json`은 404 또는 메모가 없는 응답이어야 합니다. `/aleph.json`에는 `step: 2`가 있어야 합니다.

## 문제 해결 및 빌드
- `NOTES_SERVER_NOT_CONFIGURED`: 환경변수 두 개가 누락되었거나 URL이 잘못되었습니다.
- `NOTES_READ_FAILED`: 테이블 생성·메모 이관·Supabase Data API 설정 또는 서버의 데이터 접근에 문제가 있을 수 있습니다. 비밀키 자체를 로그로 출력하지 마세요.
- 로컬 정적 빌드 검사: `npm run build -- --local` (Vercel 환경변수 없이 정적 파일만 검사, API 요청은 실행하지 않음)
- Vercel 빌드: `npm run build`. 배포 식별을 위한 Vercel 시스템 환경변수가 필요하고 `public/aleph.json`을 생성합니다.

## 보존되는 시작 틀
`api/ai.js`, `api/threat-intel.js`, `src/decider.mjs`, `src/detect.mjs`, XDR 연습 자료와 검사 도구는 수정하지 않았습니다. `judgeIssuer`는 변경하지 않았습니다.

[AGENTS.md](AGENTS.md)의 보안 및 저장점 규칙을 따릅니다.

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
6. `/api/notes`의 결과는 가상 메모만 반환되는지 확인합니다. **여기는 공개 API이므로 네 건이 나타나더라도 이는 비공개 보호 성공이 아닙니다.** 키 문자열은 기록하거나 붙여넣지 않습니다.

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
| `/api/notes` 공개 호출 | 서버 전용 키를 숨겨도 인증 없이 가상 메모를 조회할 수 있음 | **남은 약점 (인증 없음)** |

**종합 판단:** 최신 GitHub 정적 파일에 예전 가상 메모 본문이 없다는 점만 확인했습니다. Vercel의 실제 배포/과거 배포는 검증하지 못했으며 과거 공개 이력은 남을 수 있습니다. 따라서 과거 자료 노출 문제가 완전히 해소되었다고 주장하지 않습니다.

## 2단계 저장점 (2026-10-14)
- 단계 설정: `aleph.config.json`의 `step: 2`; `repoUrl`은 실제 GitHub 저장소와 일치시킵니다. `judgeIssuer`, `identityProvider`, `allowedRoutes`, `originalApiUrl` 등 다른 단계 설정은 보존합니다.
- 동작하는 구현: 브라우저는 `/api/notes`를 요청하고 서버 함수는 환경변수로 학습용 Supabase를 조회합니다. 공개 `data.json`의 메모 본문은 제거했고 `public/data.json`은 GitHub에서 삭제했습니다. `npm run build`는 공개 자료 복사를 하지 않으며 `/aleph.json` 생성을 유지하도록 작성되었습니다.
- 재실행: Vercel에서 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 Production 환경변수로 설정한 뒤 최신 `main`을 배포합니다. 로컬에서는 `npm run build -- --local`로 정적 출력만 검사합니다. `npm run bundle`에는 Git 원격·깨끗한 작업 트리·비공개 `bundle-notes.json` 및 직접 실행한 공격 점검 결과가 필요합니다.
- 현재 검증 한계: Vercel 조회는 연결 권한 오류 403으로 미검증이며 Production 주소도 검증되지 않아 `publicAppUrl` 자리표시자를 유지했습니다. `src/attack-check.mjs`는 아직 1단계 전용이므로 **2단계 번들 제출이 성공했다고 주장하지 않습니다.**
- 위험 기록: `/api/notes`에는 아직 인증이 없어 누구나 가상 메모를 요청할 수 있고, 과거 공개 커밋과 옛 배포의 노출도 해소되지 않았습니다. 로그인 보호 전에는 실제 개인정보를 저장하지 않습니다.
- 보안: GitHub에 비밀키 값, 토큰, 메모 본문을 새로 넣지 않습니다. `bundle-notes.json`과 `artifacts/submission.json`은 커밋하지 않습니다.
