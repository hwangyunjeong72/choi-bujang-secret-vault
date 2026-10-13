# BYTE BACK 방어전 자료실 · 3단계

> 현재 기준: **3단계 저장점 (2026-10-14)**. 아래의 2단계 검증 기록은 당시 이력이며 현재 동작 설명이 아닙니다.

## 현재 구현 (GitHub `main` 코드 기준)
- `public/index.html`에서 Supabase Auth 이메일·비밀번호 로그인과 로그아웃 화면을 제공하고 로그인 상태에 따라 가상 메모 목록·추가·수정·삭제 UI를 표시합니다.
- `api/notes.js`는 기존 `src/verify-login.mjs`로 Bearer 토큰을 검사합니다. 토큰이 없거나 유효하지 않으면 메모를 반환하지 않도록 구현했습니다.
- `GET /api/notes`는 서버가 검증한 사용자 ID의 `owner_id`에 해당하는 메모 목록을 반환합니다. `POST /api/notes`는 같은 ID를 새 메모의 `owner_id`에 저장합니다.
- `GET /api/notes/:id`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`를 구현했습니다. 외부 필드 `body`는 DB `learning_notes.content`에 대응합니다.
- 서버 함수는 Vercel 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 사용합니다. 공개 `public/data.json`은 배포하지 않습니다.
- `aleph.config.json`의 `step`은 **3**이며 `identityProvider`와 허용된 CRUD 경로 다섯 개가 등록되어 있습니다.

## 현재 남은 보안 약점 (4단계 수정 대상)
**로그인 검사는 있지만 단건 GET·PUT·DELETE 요청에 소유자 검사가 없습니다.** 다른 정상 로그인 사용자 B가 A의 메모 ID를 알면 접근할 가능성이 있습니다. 학습용 가상 자료만 사용하고 실제 개인정보를 저장하지 마세요. 4단계에서 서버의 `owner_id` 검증을 추가해야 합니다.

## 현재 검증 상태 (2026-10-14)
| 항목 | 상태 |
| --- | --- |
| GitHub `main`의 3단계 로그인·CRUD 구현 | 코드 확인 |
| `aleph.config.json`의 `step: 3`·발급자·허용 경로 | 코드 확인 |
| Vercel Production 최신 배포 및 실제 주소 일치 | **미검증** (연결 권한 오류 이력) |
| A 계정 로그인·메모 추가·수정·삭제 | **미실행 / 미검증** |
| 로그아웃·비로그인 API 요청 HTTP 401 | **미실행 / 미검증** |
| B 계정의 타인 메모 접근 | **미실행** (4단계에서 확인 예정) |
| `npm run bundle` 제출 묶음 JSON 생성 | **미완료** (`src/attack-check.mjs`는 1단계용) |
| 과거 커밋·이전 배포의 공개 자료 노출 | **조사 필요** |

## 다시 실행 및 점검
1. Vercel 프로젝트 **Settings → Environment Variables**에서 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`가 Production에 설정됐는지 확인합니다. **값을 GitHub·로그·채팅에 기록하지 마세요.**
2. **Deployments**에서 최신 GitHub `main` 커밋이 Production에 배포됐는지 확인하고 실제 배포 주소를 `aleph.config.json`의 `publicAppUrl`과 대조합니다.
3. 시크릿 창에서 로그인 없이 `/api/notes`에 접근하면 HTTP 401 및 메모 없음이 예상됩니다. A 계정 로그인 후 메모 추가·수정·삭제, 로그아웃 후 접근 거부를 직접 시험해야 합니다.
4. 정적 빌드 점검은 `npm run build -- --local`입니다. `npm run bundle`에는 깨끗한 Git 작업 폴더, 로컬 전용 `bundle-notes.json`, 해당 단계의 실제 공격 점검 구현이 필요합니다.

## 보존되는 시작 틀
`api/ai.js`, `api/threat-intel.js`, `src/decider.mjs`, `src/detect.mjs`, XDR 연습 자료와 검사 도구는 이번 README 정리에서 수정하지 않습니다. `judgeIssuer`도 변경하지 않습니다.

[AGENTS.md](AGENTS.md)의 보안 및 저장점 규칙을 따릅니다.

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
