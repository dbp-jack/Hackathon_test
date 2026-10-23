# 계정·키 셋업 순서 (사람이 해야 하는 것만)

로그인/결제/권한이 필요한 단계만 모았다. 각 단계가 끝나면 Claude가 바로 이어서 진행한다.
순서는 데모에 필요한 순. 1·2만 끝나도 라이브 데모와 코드 공유가 된다.

## 1. Anthropic API 키 (라이브 런칭용) — 5분

1. https://console.anthropic.com → 로그인 → 좌측 **API Keys** → **Create Key** → 이름 `launch-kit-hackathon` → 복사.
   - 키는 `sk-ant-api03-…` 로 시작하는 **영문·숫자·`-`·`_`만 있는 100자 안팎** 문자열이다. 한글이나 공백이 들어가면 안 된다.
   - 크레딧이 0이면 **Billing**에서 $5 이상 충전해야 호출된다.
2. 터미널에서 (저장소 루트에서) 아래 한 줄만 실행하면 `.env.local`과 `.env` 두 파일에 동시에 들어간다:
   ```bash
   KEY='sk-ant-여기에_붙여넣기'; for f in .env.local .env; do sed -i '' "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$KEY|" $f; done; grep -c "ANTHROPIC_API_KEY=sk-ant" .env.local .env
   ```
   마지막 줄이 `.env.local:1` `.env:1` 로 나오면 성공.
3. 검증: `node -e "require('dotenv/config');console.log(process.env.ANTHROPIC_API_KEY.length, /^[\x20-\x7e]+$/.test(process.env.ANTHROPIC_API_KEY))"` → `100 안팎 true`.

> "Invalid X-Api-Key header value … contains a non-ASCII character at character 1 (10 characters)" 오류는
> 어떤 도구의 ANTHROPIC_API_KEY 칸에 **한글 10글자짜리 안내 문구**가 그대로 들어간 상태라는 뜻이다.
> 이 저장소의 `.env*`와 셸 rc 파일에는 없으니 그 오류를 띄운 앱(Paseo 등)의 Provider/API key 설정 화면을 열어 지우고 진짜 키로 바꾸면 된다.

## 2. GitHub push 권한 — 2분

- 현재 이 Mac의 `gh`는 **planner-one** 계정으로 로그인돼 있고, 이 계정은 `dbp-jack/Hackathon_test`에 push 권한이 없다.
- 둘 중 하나:
  - (a) GitHub 웹 → 저장소 **Settings → Collaborators → Add people → `planner-one`** → Write. 초대 메일 수락.
  - (b) 이 Mac에서 `gh auth login` 을 dbp-jack 계정으로 다시 하기 (브라우저 인증).
- 끝나면 Claude가 `git push -u origin feat/backend-mvp` 후 PR을 연다.

## 3. Supabase 클라우드 (배포·팀 노트북 테스트용) — 10분

1. https://supabase.com/dashboard → GitHub로 로그인 → **New project**: 이름 `launch-kit`, 리전 **Northeast Asia (Seoul)** 또는 **US West**, DB 비밀번호 생성(메모).
2. 터미널에서 `supabase login` (브라우저가 열리고 토큰이 저장된다). 여기까지만 하면 **나머지는 Claude가 CLI로 한다**: `supabase link`, `supabase db push`(마이그레이션), 시드 실행, Storage 버킷 공개 확인, env 교체.
3. **MCP 연결(선택, 권장)**: Supabase 대시보드 우상단 아바타 → **Account → Access Tokens → Generate new token** (`claude-mcp`) → 토큰을 Claude에게 전달. Claude가 아래를 실행해 Claude Code에 Supabase MCP를 붙인다:
   ```bash
   claude mcp add supabase -e SUPABASE_ACCESS_TOKEN=<토큰> -- npx -y @supabase/mcp-server-supabase@latest --project-ref=<프로젝트ref>
   ```

## 4. 배포 로그인 — 5분

- 웹(Next.js): `vercel login` → 브라우저 인증. 이후 Claude가 `vercel link`, env 등록, `vercel --prod`.
- worker(상시 프로세스): `flyctl auth login` → 브라우저 인증(신용카드 등록 요구될 수 있음, 무료 범위). 이후 Claude가 `fly launch --copy-config`, secrets 설정, `fly deploy`.
  - Fly 대신 Railway를 원하면 `brew install railway && railway login`.

## 5. Shopify 개발 스토어 (실제 발행 데모용, 선택) — 15분

1. https://partners.shopify.com → Partner 계정 생성(무료) → **Stores → Add store → Create development store** (이름 `launch-kit-demo`).
2. 스토어 관리자 → **Settings → Apps and sales channels → Develop apps → Allow custom app development → Create an app** (`Launch Kit`).
3. **Configuration → Admin API integration** → scopes에서 `write_products`, `read_products` 체크 → Save → **Install app** → **API credentials → Admin API access token** 복사(한 번만 보인다).
4. `.env.local`과 `.env`에 추가:
   ```
   SHOPIFY_STORE_DOMAIN=launch-kit-demo.myshopify.com
   SHOPIFY_ADMIN_TOKEN=shpat_…
   ```
   없으면 발행은 목(가짜 URL)으로 동작한다. 있으면 `worker/steps/publish.ts`가 진짜 상품을 만든다.

## 끝나면 Claude에게 알려줄 것
"1번 넣었어", "2번 (a)로 했어", "supabase login 했어, ref는 xxxx", "vercel/fly 로그인 했어", "shopify 토큰 넣었어" 처럼 번호만 말하면 된다.
