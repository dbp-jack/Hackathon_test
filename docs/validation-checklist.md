# Launch Kit 검증 체크리스트

기준 코드: `src/app/api/v1/**`, `src/components/Dropzone.tsx`, `src/components/KitView.tsx`, `worker/index.ts`.
모든 요청은 `DEMO_SELLER_ID` 로 동작한다(인증 없음). `BASE=http://localhost:3000/api/v1` 기준으로 적는다.
오류 본문 형식: `{ "error": "snake_case", "message"?, "hint"? }` (`src/lib/api.ts#apiError`). 예외: `/events` 의 404 는 plain text `not found`, `PATCH /listing` 의 422 는 `{ "error", "max" }`.

자동화 가능한 부분은 `scripts/smoke.sh` 가 대신 돌려준다. 여기 표는 사람이 눈으로 확인할 때 쓴다.

---

## 1. 최소 6개 엔드포인트

### 1.1 `POST /uploads/sign`

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 정상 (영상 1 + 사진 1) | `{"files":[{"name":"a.mov","mime":"video/quicktime","bytes":1000},{"name":"b.jpg","mime":"image/jpeg","bytes":100}]}` | 200 `{ uploads: [{ media_id(uuid), put_url, token, path: "<seller>/uploads/<media_id>.mov", expires_in: 900 }, …] }`, `staged_media` 에 2행 생성 | [ ] |
| put_url 로 실제 업로드 | `PUT <put_url>` + `Content-Type`, body=파일 (storage-js `uploadToSignedUrl` 과 동일, 토큰은 URL `?token=` 에 이미 포함) | 200 `{ Key: "launches/<path>" }`, 버킷에 객체 생성 | [ ] |
| 본문 누락 / files 빈 배열 | `{}` 또는 `{"files":[]}` | 400 `invalid_body` | [ ] |
| files 22개 이상 | 길이 22 배열 | 400 `invalid_body` (zod `max(21)`) | [ ] |
| 영상 2개 | `video/*` 2건 | 400 `too_many_videos`, message `One video per launch` | [ ] |
| 사진 21장 | `image/*` 21건 (영상 0) | 400 `too_many_photos`, message `Up to 20 photos` | [ ] |
| 영상 2 GB 초과 | `bytes: 2147483649` | 413 `media_too_large`, hint `10 min / 2 GB` (주의: 길이 10분 제한은 sign 단계에서 검사하지 않음, bytes 만 검사) | [ ] |
| Storage 설정 오류 | 버킷 없음 / 잘못된 service key | 500 `sign_failed` + message | [ ] |

### 1.2 `POST /launches`

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 정상 | `{"media_ids":["<media_id>"],"hints":{"product_name":"Mug"}}` | 202 `{ launch_id, status: "analyzing", credits_remaining: n-1, eta_seconds: 300 }`; `launches.status = uploaded`, `source_media` 생성, `staged_media` 삭제, `launch_markets` 4행(GB/DE/AU/CA), `credit_ledger` delta -1 | [ ] |
| 본문 오류 | `{}` / `media_ids: []` / uuid 아님 / `markets: ["GBR"]` | 400 `invalid_body` + zod message | [ ] |
| 모르는 media_id | 존재하지 않는 uuid 또는 다른 seller 의 uuid | 400 `unknown_media` | [ ] |
| 셀러 행 없음 | `sellers` 에 DEMO_SELLER_ID 없음 (seed 미실행) | 401 `no_seller`, message `Run supabase/seed.sql` | [ ] |
| 크레딧 0 | `update sellers set credits_remaining=0` | 402 `insufficient_credits` | [ ] |
| 동시 실행 (free/maker) | analyzing/writing/rendering 상태 런칭이 있을 때 재요청 | 409 `launch_already_running`, message `One launch at a time on this plan` | [ ] |
| studio 플랜은 동시 허용 | `plan='studio'` 로 바꾼 뒤 재요청 | 202 | [ ] |
| 실패 시 환불 | worker 가 `failed` 처리 | `credit_ledger` delta +1 `refund:failed`, `credits_remaining` 복구 | [ ] |

### 1.3 `GET /launches/{id}/events` (SSE)

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 정상 | `curl -N $BASE/launches/<id>/events` | `Content-Type: text/event-stream`; `claude_actions` 행마다 `event: step` + `{ step, summary, metrics, pct, partial:{listing,frames,videos,localizations,social} }`; 1초마다 `: keepalive` | [ ] |
| pct 매핑 | 각 step | `PIPELINE_STEPS` 값 (watch_footage 10 … format_for_channel 100) | [ ] |
| 완료 | status 가 ready/published | `event: done` `{ status, build_seconds, minutes_saved_est }` 후 스트림 종료 | [ ] |
| 실패 | status 가 failed | `event: error` `{ message }` 후 종료 | [ ] |
| 없는 id | 임의 uuid | 404, 본문 plain text `not found` (JSON 아님) | [ ] |
| 재접속 | 진행 중 새로 연결 | 과거 action 을 처음부터 다시 받음 (lastActionId=0) → 카드가 즉시 채워짐 | [ ] |

### 1.4 `GET /launches/{id}/kit`

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 정상 (ready) | `GET` | 200, `listing != null`, `frames` 5, `videos` 4, `localizations` 4, `publications`, `what_claude_did`, `progress`, `build_seconds` | [ ] |
| 진행 중 | 빌드 중 `GET` | 200, 아직 안 나온 필드는 `null`/`[]`, `progress.step/pct` 반영 | [ ] |
| 없는 id | 임의 uuid | 404 `not_found` | [ ] |
| 상태만 보기 | `GET /launches/{id}` | 200 `{ id, status, product_title, started_at, finished_at, progress }` / 404 `not_found` | [ ] |

### 1.5 `PATCH /launches/{id}/listing`

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 정상 | `{"title":"New title","price_cents":4500}` | 200 listing 객체 (`title_chars`, `price.cents` 갱신), `listings.updated_at` 변경 | [ ] |
| 제목 141자 | `{"title":"<141 chars>"}` | 422 `{ "error": "title_too_long", "max": 140 }` | [ ] |
| 태그 14개 | `{"tags":["a",…14]}` | 422 `{ "error": "too_many_tags", "max": 13 }` | [ ] |
| 기타 zod 오류 | `{"title":""}` / `{"price_cents":-1}` / 태그 21자 | 422, `error` 에 zod 기본 메시지 (코드 아님) | [ ] |
| 없는 id | 임의 uuid | 404 `not_found` | [ ] |
| DB 오류 | listings 행 없음 등 | 500 `update_failed` | [ ] |

### 1.6 `GET /launches/{id}/download`

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 정상 | `curl -o kit.zip` | 200 `application/zip`, `Content-Disposition: attachment; filename="launch-kit-<8자>.zip"`; `unzip -l` 에 `listing.txt`, `etsy.csv`, `localizations/GB-en-GB.txt`…, `photos/01-hero.jpg`…, `videos/<platform>-<kind>.mp4`, `social/*` | [ ] |
| listing 없을 때 | 빌드 초기 | 200 zip 이지만 `listing.txt`/`etsy.csv` 없음 (오류 아님) | [ ] |
| 없는 id | 임의 uuid | 404 `not_found` | [ ] |
| 소요 시간 | 영상 4개 포함 | 60초 이내 (`maxDuration = 60`) | [ ] |

---

## 2. 나머지 엔드포인트

### 2.1 `POST /launches/{id}/publish`

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 정상 | `{"channels":["shopify","tiktok"]}` (status ready) | 202 `{ publications: [{channel, status:"queued"}, …] }`, `publications` upsert (launch_id,channel) | [ ] |
| video_ids 포함 | `{"channels":["tiktok"],"video_ids":["<uuid>"]}` | 202, `publications.payload.video_ids` 저장 | [ ] |
| 아직 안 끝남 | status 가 ready/published 외 | 409 `kit_not_ready` (본문 검사보다 먼저) | [ ] |
| 본문 오류 | `{}` / `channels: []` / 모르는 채널 / uuid 아닌 video_id | 400 `invalid_body` | [ ] |
| etsy 포함 | `{"channels":["etsy"]}` | 409 `channel_not_available`, hint `Use /export/etsy.csv` | [ ] |
| 없는 id | 임의 uuid | 404 `not_found` | [ ] |

### 2.2 `GET /launches/{id}/export/etsy.csv`

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 정상 | `GET` | 200 `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="etsy-<8자>.csv"`; `publications(etsy).status = exported_csv` | [ ] |
| listing 없음 | 빌드 초기 | 409 `kit_not_ready` | [ ] |
| 없는 id | 임의 uuid | 404 `not_found` | [ ] |

### 2.3 프레임 교체

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 후보 조회 | `POST /launches/{id}/frames/{frameId}/swap` | 200 `{ candidates: [{ frame_id, timecode_sec, score, thumb_url }] }` 최대 3개 (같은 role, `selected=false`, score 내림차순). MOCK 에서는 빈 배열일 수 있음 | [ ] |
| 없는 frame | 임의 frameId | 404 `frame_not_found` | [ ] |
| 없는 launch | 임의 launch id | 404 `not_found` | [ ] |
| 확정 | `PUT /launches/{id}/frames/{frameId}` `{"frame_id":"<candidate uuid>"}` | 200 `{ ok: true }`; 기존 frame `selected=false`, 후보 `selected=true` + sort_order 승계; `/kit` 의 frames 에 반영 | [ ] |
| 확정 본문 오류 | `{}` / uuid 아님 | 400 `invalid_body` | [ ] |

### 2.4 기타

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 플랜 | `GET /plans` | 200 배열 3개 (free/maker/studio), `PLANS` 와 동일 | [ ] |
| 내 정보 | `GET /me` | 200 `{ shop_name, plan, credits_remaining, credits_reset_at, channels: [] }`; seed 전이면 `{ channels: [] }` 만 | [ ] |
| 목록 | `GET /launches?limit=2` | 200 `{ items (≤2), next_cursor }`; `?cursor=<created_at>` 으로 다음 페이지; `?status=ready` 필터 | [ ] |
| 현지화 수정 | `PATCH /launches/{id}/localizations/de` `{"enabled":false}` | 200 갱신된 행 (market 대문자 매칭) / 없는 market 이면 `null` | [ ] |
| 현지화 본문 오류 | `{"price_cents":"abc"}` | 400 `invalid_body` | [ ] |

---

## 3. UI 확인

### 3.1 `/` (업로드)

| 항목 | 조작 | 기대 결과 | 확인란 |
|---|---|---|---|
| 빈 상태 | 첫 진입 | 드롭존 제목/부제, 버튼 라벨 `Choose…`(t.choose) | [ ] |
| 파일 선택 | 영상 1 + 사진 n 드롭 | 영상 이름 + MB + `n photos`, 힌트 입력 4칸(Product name / Materials / Price / Ships from) 노출, 버튼 `Build my launch kit` | [ ] |
| 영상 2개 | 영상 2개 드롭 | 빨간 alert (t.oneVideo), 진행 안 함 | [ ] |
| 지원 안 하는 파일 | pdf 드롭 | alert (t.unsupported) | [ ] |
| 진행 단계 | Build 클릭 | 버튼이 `Preparing…` → `Uploading NN%` → `Starting…` 순으로 바뀌고 비활성 | [ ] |
| 성공 | 업로드 완료 | `/launches/{id}` 로 이동 | [ ] |
| 크레딧 0 | credits_remaining=0 | alert (t.outOfLaunches) | [ ] |
| 서버 다운 | API 500 | alert (t.generic), 콘솔에 `Launch Kit: couldn't start the kit` | [ ] |
| 가격 힌트 | `$42` 입력 | 요청 body 에 `price_cents: 4200` | [ ] |

### 3.2 `/launches/[id]` (결과 화면)

| 항목 | 조작 | 기대 결과 | 확인란 |
|---|---|---|---|
| 빌드 중 상단 | 진입 직후 | 노란 Pill: 스피너 · `Starting` 또는 step 라벨 · `m:ss` 타이머 · `NN%`; 타이머가 1초마다 증가 | [ ] |
| 진행 레일 | step 이벤트 수신 | 10개 step 라벨 중 완료된 것에 `✓` + 굵게 | [ ] |
| SSE 채움 | write_listing 이후 | Etsy listing 타일 skeleton → 제목/태그 13/설명/가격 카드로 교체 | [ ] |
| 사진 채움 | score_frames 이후 | 파란 타일에 5장 이미지 + 라벨 (`Hero · 07:48` 식) | [ ] |
| 영상 채움 | cut_points 이후 | 4개 세로 영상, 호버 시 재생, 플랫폼 배지(Etsy/TikTok/Reels/Shorts · n s), 훅 문구 | [ ] |
| 마켓 채움 | localize 이후 | 민트 타일에 4개 마켓 + 환산 가격 | [ ] |
| What Claude did | 매 step | 요약 문장 누적, 같은 step 은 덮어씀 | [ ] |
| 완료 상단 | done 이벤트 | 초록 Pill `Ready in m:ss · about X h Y min saved`; 타이머 정지; `/kit` 재조회로 전체 갱신 | [ ] |
| 실패 상단 | error 이벤트 | 빨간 Pill `Something went wrong while building this kit.` + `Upload again` 링크; skeleton 애니메이션 정지 | [ ] |
| Copy all | listing 있을 때 클릭 | 클립보드에 `title\n\ntags\n\ndescription`, 토스트 `Listing copied`; listing 없으면 비활성(opacity 40) | [ ] |
| Download everything | 빌드 중/실패 | `aria-disabled`, 클릭 불가 (opacity 50) | [ ] |
| Download everything | ready | zip 다운로드 시작 | [ ] |
| Etsy CSV | listing 없음 | 비활성 | [ ] |
| Etsy CSV | listing 있음 | csv 다운로드, 이후 `/kit` 의 publications(etsy) = exported_csv | [ ] |
| Publish 버튼 | 빌드 중/실패 | disabled | [ ] |
| Publish 버튼 | ready, 클릭 | 요청 중 disabled → 토스트 `Queued for Shopify and TikTok` → 라벨 `Queued` (shopify publication status != draft) | [ ] |
| Publish 실패 | API 409/500 | 토스트 `Couldn't publish yet`, 라벨 유지 | [ ] |
| 새로고침 | 빌드 중 F5 | 서버 렌더로 현재 partial 상태 복원, SSE 재연결, 타이머는 0부터 (알려진 한계) | [ ] |

### 3.3 기타 화면

| 항목 | 조작 | 기대 결과 | 확인란 |
|---|---|---|---|
| `/launches` | 진입 | `My launches` 제목, `New launch` 버튼; 카드마다 status 배지(ready/published 민트, failed 블러시, 그 외 버터), 제목 또는 `Building…`, 날짜 · `built in m:ss` | [ ] |
| `/launches` 빈 상태 | launches 0건 | 점선 타일 `Nothing here yet` | [ ] |
| `/example` | 진입 | 샘플(뜨개) 키트 랜딩, 외부 요청 없이 렌더 | [ ] |
| `/preview` | 진입 | 4개 링크 카드 (Upload/Building/Ready/Failed) | [ ] |
| `/preview/building` | 진입 | 빌드 중 화면, 타이머 `2:41` 고정, SSE 연결 없음 | [ ] |
| `/preview/ready` | Download/Etsy CSV/Publish 클릭 | 이동 없이 토스트 `Preview only — …` | [ ] |
| `/preview/failed` | 진입 | 실패 Pill + `Upload again` | [ ] |
| `/preview/xyz` | 진입 | 404 | [ ] |
| 언어 스위처 | 헤더 지구본 클릭 | 14개 언어 2열 목록, 현재 언어 버터색 + 체크; 바깥 클릭/Esc 로 닫힘 | [ ] |
| 언어 변경 | `한국어` 선택 | 쿠키 `lk_locale=ko`, `<html lang="ko">`, `router.refresh()` 후 `/` 와 헤더 문구 번역 (`/launches/[id]` 의 KitView 는 영어 고정) | [ ] |
| RTL | `العربية` 선택 | `<html dir="rtl">`, 헤더/드롭존 정렬 반전 | [ ] |
| 모바일 | 375px 폭 | 헤더 2줄(로고+언어 / 링크), 드롭존 터치 문구(t.titleTouch), 타일 1열 | [ ] |

---

## 4. 데모 리허설

### 4.1 MOCK 런 (키 없이, ~40초)

| 항목 | 조작 | 기대 결과 | 확인란 |
|---|---|---|---|
| 워커 | `MOCK_MODE=true npm run worker` | `▶ launch <id> (mock)` 로그 | [ ] |
| 흐름 | `/` 에서 아무 영상이나 업로드 | 결과 화면 타일이 순서대로 채워지고 `✓ ready in ~40 s` | [ ] |
| 스모크 | `BASE_URL=http://localhost:3000 scripts/smoke.sh` | 전부 PASS | [ ] |

### 4.2 라이브 런 (Claude + ffmpeg)

| 항목 | 조작 | 기대 결과 | 확인란 |
|---|---|---|---|
| 사전 | `ffmpeg -version`, `ls "$CAPTION_FONT"`, `ANTHROPIC_API_KEY` 설정, `.env` 와 `.env.local` 동기화 | 모두 정상 | [ ] |
| 캡션 1개 테스트 | 짧은 영상으로 라이브 1회 | `videos/*.mp4` 에 자막이 보임 (drawtext 실패 시 worker 가 failed 처리) | [ ] |
| 데모 영상 | 실제 발표용 영상(≤10분)으로 1회 | ready, 제목 ≤140자, 태그 13, 설명 180–260 단어, 영상 4개 재생 | [ ] |
| 크레딧 여유 | `select credits_remaining from sellers` | 발표 횟수 + 2 이상 | [ ] |
| 진행 중 런칭 없음 | `select id from launches where status in ('analyzing','writing','rendering')` | 0건 (아니면 409 `launch_already_running`) | [ ] |

### 4.3 기록할 숫자

| 항목 | 어디서 | 값 | 확인란 |
|---|---|---|---|
| build_seconds | 결과 화면 Pill / `launches.build_seconds` | ____ s | [ ] |
| 업로드 → 첫 step 이벤트까지 | 스톱워치 | ____ s | [ ] |
| 첫 프레임 표시 시점 / 리스팅 표시 시점 | 스톱워치 | ____ s / ____ s | [ ] |
| minutes_saved_est | done 이벤트 | ____ min | [ ] |
| 런칭당 비용 | `scripts/cost-report.sql` 의 `cost_cents` | ____ ¢ (입력 ____ / 출력 ____ 토큰) | [ ] |
| Claude 호출 횟수 | 같은 쿼리 `actions` | ____ | [ ] |

비용 쿼리 (단일 런칭):

```sql
select launch_id, count(*) as actions,
       sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens,
       round(sum(cost_cents), 2) as cost_cents
from claude_actions where launch_id = '<launch_id>' group by launch_id;
```

### 4.4 API 키 실패 시 대안

| 순서 | 조치 | 확인란 |
|---|---|---|
| 1 | 워커를 `MOCK_MODE=true` 로 재시작 (같은 이벤트 흐름, ~40초) — 발표 멘트는 "라이브 런은 녹화본으로" | [ ] |
| 2 | 미리 완성해 둔 ready 런칭의 `/launches/<id>` 를 북마크 (Download/Etsy CSV/Publish 모두 실제 동작) | [ ] |
| 3 | 네트워크까지 죽으면 `/preview/building` → `/preview/ready` 로 화면 흐름만 시연 | [ ] |
| 4 | 라이브 런 화면 녹화본(mp4) 을 로컬에 보관 | [ ] |

---

## 5. 배포 스모크

| 항목 | 요청 | 기대 결과 | 확인란 |
|---|---|---|---|
| 웹 기동 | `GET https://<vercel-domain>/api/v1/plans` | 200 배열 | [ ] |
| 환경 변수 | `GET /api/v1/me` | `shop_name` 포함 (service role key + seed 정상) | [ ] |
| 스모크 전체 | `BASE_URL=https://<vercel-domain> scripts/smoke.sh` | 전부 PASS (워커가 떠 있어야 ready 까지 감) | [ ] |
| SSE 지속 | `curl -N /api/v1/launches/<id>/events` 를 5분 유지 | 중간에 끊기지 않음 (`vercel.json` 의 events `maxDuration: 300`) | [ ] |
| 다운로드 시간 | `/download` | 60초 이내 응답 | [ ] |
| 워커 로그 | `fly logs` / Railway Logs | `▶ launch` … `✓ ready` 주기적으로 보임, 재시작 루프 없음 | [ ] |
| 워커 ffmpeg/폰트 | 컨테이너 안에서 `ffmpeg -version && ls $CAPTION_FONT` | 정상 | [ ] |
| Storage 공개 | `/kit` 의 `url_raw`, `videos[].url` 을 시크릿 창에서 열기 | 200 (버킷 public) | [ ] |
| 이미지 도메인 | 결과 화면 이미지 | `next.config.ts` remotePatterns `**.supabase.co` 와 일치해 깨지지 않음 | [ ] |
| 동시 접속 | 발표장 네트워크에서 `/` 로딩 | 3초 이내 | [ ] |
