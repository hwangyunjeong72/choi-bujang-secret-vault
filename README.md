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
