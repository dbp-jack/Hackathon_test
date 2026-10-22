# Launch Kit — API 명세 (MVP)

Base URL `/api/v1` · 인증: Supabase JWT (`Authorization: Bearer <token>`) · 모든 금액은 `cents` + `currency` · 시간은 ISO 8601.
런칭 1건은 `launches` 리소스 하나로 시작해서 끝난다. 결과 화면은 `GET /launches/{id}/kit` 한 번이면 그려진다.

---

## 0. 흐름 한눈에

```
POST /uploads/sign ──▶ (클라이언트가 Storage에 직접 PUT)
POST /launches  { media_ids, hints } ──▶ 202 { launch_id, status: "analyzing" }
GET  /launches/{id}/events  (SSE)  ──▶ analyzing → writing → rendering → ready
GET  /launches/{id}/kit            ──▶ 결과 화면 JSON 한 덩어리
PATCH /launches/{id}/listing       ──▶ 셀러가 수정
POST /launches/{id}/frames/{frame_id}/swap
POST /launches/{id}/publish  { channels }
GET  /launches/{id}/export/etsy.csv
```

---

## 1. 업로드

### `POST /uploads/sign`
Storage 직접 업로드용 서명 URL. 서버를 거치지 않으니 10분짜리 영상도 괜찮다.

```json
// req
{ "files": [ { "name": "mug_making_oct21.mov", "mime": "video/quicktime", "bytes": 812345678 },
             { "name": "mug_01.jpg", "mime": "image/jpeg", "bytes": 2345678 } ] }
// 200
{ "uploads": [ { "media_id": "med_01J…", "put_url": "https://…", "expires_in": 900 } ] }
```
제한: 영상 1개 ≤ 10 min / 2 GB, 사진 ≤ 20장. 초과 시 `413 { "error": "media_too_large", "limit": "10 min" }`.

---

## 2. 런칭

### `POST /launches`
크레딧 1 차감 후 파이프라인 시작. 즉시 202.

```json
// req
{
  "media_ids": ["med_01J…", "med_01K…"],
  "hints": {                                  // 전부 optional
    "product_name": "Speckled stoneware mug",
    "materials": "Stoneware clay, food-safe glaze",
    "price_cents": 4200,
    "ships_from": { "city": "Portland, OR", "country": "US" }
  },
  "target_channels": ["etsy", "shopify", "tiktok"],
  "markets": ["GB", "DE", "AU", "CA"]          // 현지화 대상, 기본값 플랜에 따라
}
// 202
{ "launch_id": "lch_01J…", "status": "analyzing", "credits_remaining": 11,
  "eta_seconds": 300 }
```
오류: `402 insufficient_credits` · `409 launch_already_running` (동시 1건 제한, Free/Maker)

### `GET /launches/{id}`
```json
{ "id": "lch_01J…", "status": "rendering", "product_title": "Hand-thrown Speckled Stoneware Mug",
  "started_at": "…", "finished_at": null, "progress": { "step": "cut_points", "pct": 72 } }
```

### `GET /launches/{id}/events` — SSE
클라이언트가 타이머 돌리면서 단계별로 결과를 미리 보여주는 용도. 데모의 핵심.

```
event: step
data: {"step":"watch_footage","summary":"Watching 8 min 12 s of footage…","pct":5}

event: step
data: {"step":"score_frames","summary":"Scored 14,760 frames, kept 5","pct":30,
       "partial":{"frames":[{"id":"frm_…","role":"hero","timecode_sec":468.0,"thumb_url":"…"}]}}

event: step
data: {"step":"write_listing","summary":"Wrote title, 13 tags, 212-word description","pct":55,
       "partial":{"listing":{"title":"Handmade Speckled Stoneware Mug 12 oz | …"}}}

event: done
data: {"status":"ready","build_seconds":272,"minutes_saved_est":170}
```
`partial`이 올 때마다 결과 화면의 해당 카드를 채운다 → 5분 동안 화면이 비어 있지 않다.

### `GET /launches`
`?status=ready&limit=20&cursor=…` — My launches 목록.

---

## 3. 결과 키트 (결과 화면 = 이 응답 1개)

### `GET /launches/{id}/kit`
```json
{
  "id": "lch_01J…",
  "status": "ready",
  "product_title": "Hand-thrown Speckled Stoneware Mug",
  "build_seconds": 272,
  "minutes_saved_est": 170,
  "sources": [ { "name": "mug_making_oct21.mov", "kind": "video", "duration_sec": 492, "frame_count": 14760 },
               { "name": "mug_01.jpg", "kind": "photo" } ],

  "listing": {
    "title": "Handmade Speckled Stoneware Mug 12 oz | Wheel-Thrown Ceramic Coffee Cup | Minimalist Pottery Gift for Her | Microwave Safe",
    "title_chars": 128,
    "tags": ["speckled mug", "handmade ceramic mug", "…13개"],
    "description": "Thrown on the wheel in my Portland studio…",
    "description_words": 212,
    "price": { "cents": 4200, "currency": "USD",
               "comparables": { "low_cents": 3400, "high_cents": 5800, "count": 40 },
               "cost_basis_cents": 3100,
               "reasoning": "Mid-range of 40 comparable 12 oz speckled mugs; 35% margin over material + 2.5 h labor." }
  },

  "frames": [
    { "id": "frm_01", "role": "hero",     "timecode_sec": 468.0, "label": "Hero · 07:48",
      "score": 0.93, "score_reason": "sharp focus, glaze visible, neutral background",
      "url_raw": "…", "url_clean": "…" },
    { "id": "frm_02", "role": "in_hand",  "timecode_sec": 482.0, "label": "In hand · 08:02", "…": "…" },
    { "id": "frm_03", "role": "detail",   "timecode_sec": 375.0, "label": "Glaze detail · 06:15" },
    { "id": "frm_04", "role": "process",  "timecode_sec": 134.0, "label": "On the wheel · 02:14" },
    { "id": "frm_05", "role": "scale",    "timecode_sec": null,  "label": "Scale · photo 2" }
  ],

  "videos": [
    { "id": "vid_01", "kind": "listing", "platform": "etsy",   "duration_sec": 15, "hook_text": null,
      "cut_points": [ { "in": 134.0, "out": 139.0, "caption": null }, { "in": 375.0, "out": 380.0 }, { "in": 480.0, "out": 485.0 } ],
      "url": "…" },
    { "id": "vid_02", "kind": "short", "platform": "tiktok", "duration_sec": 28,
      "hook_text": "3 hours at the wheel. 30 seconds.",
      "hook_rationale": "Time-compression hook; strongest for process-heavy crafts on TikTok.",
      "cut_points": [ "…" ], "url": "…" },
    { "id": "vid_03", "kind": "short", "platform": "reels",  "duration_sec": 22, "hook_text": "What goes into one $42 mug" },
    { "id": "vid_04", "kind": "short", "platform": "shorts", "duration_sec": 19, "hook_text": "No talking. Just clay." }
  ],

  "social": [
    { "id": "soc_01", "kind": "pinterest_pin", "title": "Handmade speckled mug — slow mornings start here", "frame_ids": ["frm_01"], "url": "…" },
    { "id": "soc_02", "kind": "instagram_carousel", "frame_ids": ["frm_01","frm_03","frm_04"], "urls": ["…"] }
  ],

  "localizations": [
    { "market": "GB", "locale": "en-GB", "price": { "cents": 3350, "currency": "GBP" }, "title": "…", "enabled": true },
    { "market": "DE", "locale": "de-DE", "price": { "cents": 3900, "currency": "EUR" }, "title": "Handgefertigte Steinzeugtasse …" },
    { "market": "AU", "locale": "en-AU", "price": { "cents": 6400, "currency": "AUD" } },
    { "market": "CA", "locale": "fr-CA", "price": { "cents": 5700, "currency": "CAD" } }
  ],

  "publications": [
    { "channel": "shopify", "status": "draft" },
    { "channel": "tiktok",  "status": "draft" },
    { "channel": "etsy",    "status": "draft", "note": "CSV export until API approval" }
  ],

  "what_claude_did": [
    { "step": "watch_footage",        "summary": "watched 8 min 12 s of footage" },
    { "step": "score_frames",         "summary": "scored 14,760 frames, kept 5" },
    { "step": "research_comparables", "summary": "read 40 comparable listings for price + tags" },
    { "step": "write_listing",        "summary": "wrote 1,240 words in 5 languages" },
    { "step": "cut_points",           "summary": "cut 4 videos, 3 hooks" }
  ]
}
```

---

## 4. 편집

### `PATCH /launches/{id}/listing`
부분 수정. 서버가 140자 / 13태그 검증.
```json
{ "title": "…", "tags": ["…"], "description": "…", "price_cents": 4500 }
// 200 → listing 객체    // 422 { "error": "title_too_long", "max": 140 }
```

### `POST /launches/{id}/frames/{frame_id}/swap`
"Swap a frame". Claude가 같은 role로 다음 후보 3개를 제안.
```json
// 200
{ "candidates": [ { "timecode_sec": 471.5, "score": 0.89, "thumb_url": "…" }, "…" ] }
```
### `PUT /launches/{id}/frames/{frame_id}`
`{ "timecode_sec": 471.5 }` → 선택 확정, 배경 정리 재실행.

### `POST /launches/{id}/videos/{video_id}/regenerate`
`{ "hook_style": "asmr" | "time_compression" | "cost_breakdown" | "custom", "custom_hook": "…" }` → 202, SSE로 완료 통보.

### `PATCH /launches/{id}/localizations/{market}`
`{ "enabled": false }` 또는 `{ "price_cents": 3500 }`.

---

## 5. 발행 / 내보내기

### `POST /launches/{id}/publish`
```json
// req
{ "channels": ["shopify", "tiktok"], "video_ids": ["vid_02"] }
// 202
{ "publications": [ { "channel": "shopify", "status": "queued" }, { "channel": "tiktok", "status": "queued" } ] }
```
완료 시 SSE `event: published` `{ "channel": "shopify", "external_url": "https://…" }`.
Etsy 요청 시 `409 { "error": "channel_not_available", "hint": "Use /export/etsy.csv" }`.

### `GET /launches/{id}/export/etsy.csv`
Etsy 대량 업로드 포맷 CSV (title, description, price, quantity, tags, materials, image_1…image_5).

### `GET /launches/{id}/download`
`.zip` 서명 URL — 사진 5장(원본·배경정리), 영상 4개, 핀/캐러셀, listing.txt, localizations/*.txt.

---

## 6. 계정

### `GET /me`
```json
{ "shop_name": "…", "plan": "maker", "credits_remaining": 11, "credits_reset_at": "2026-11-01T00:00:00Z",
  "channels": [ { "channel": "shopify", "display_name": "maya-ceramics.myshopify.com" } ] }
```
### `POST /channels/{channel}/connect` → `{ "oauth_url": "…" }` · `DELETE /channels/{channel}`
### `GET /plans`
```json
[ { "tier": "free",   "price_cents": 0,    "launches_per_month": 2,  "features": ["watermark"] },
  { "tier": "maker",  "price_cents": 1900, "launches_per_month": 15 },
  { "tier": "studio", "price_cents": 4900, "launches_per_month": null, "features": ["auto_publish","localization","analytics"] } ]
```
### `POST /billing/checkout` `{ "tier": "maker" }` → Stripe Checkout URL (MVP 제외 가능)

---

## 7. 내부 파이프라인 (서버 → Claude) — 공개 API 아님

| 단계 (`claude_step`) | Claude 호출 | 입력 | 출력 → 저장 |
|---|---|---|---|
| `watch_footage` | 비전, 영상 샘플 프레임 1 fps | 프레임 ~500장 + hints | 장면 타임라인(센터링/성형/유약/완성), `product_attributes` |
| `score_frames` | 비전 | 후보 프레임 ~60장 (장면당 균등 샘플) | role별 top-1 + 점수·이유 → `frames` |
| `research_comparables` | 웹 검색 + 텍스트 | attributes | 유사 리스팅 40개 요약, 가격 범위, 자주 쓰인 태그 |
| `write_listing` | 텍스트 | attributes + comparables | title/tags/description → `listings` |
| `price` | 텍스트 | comparables + production_hours + materials | price_cents + reasoning |
| `write_hooks` / `cut_points` | 텍스트 (타임라인 참조) | 장면 타임라인 | 숏폼 3개 훅·컷·자막 → `videos.cut_points` |
| `localize` | 텍스트 | listing + markets + fx | `listing_localizations` |
| `format_for_channel` | 텍스트 | listing + channel schema | `publications.payload` |

보조 도구: ffmpeg(프레임 추출·컷·자막 렌더), 배경 제거 모델, 환율 API, Shopify/TikTok/Pinterest SDK.
각 호출은 `claude_actions`에 summary·metrics·토큰·비용을 남긴다 → 결과 화면 "What Claude did" + 건당 원가 추적.

---

## 8. 공통

- 오류 형식: `{ "error": "snake_case_code", "message": "…", "hint": "…" }`
- 페이지네이션: `?limit=&cursor=` → `{ "items": [], "next_cursor": "…" }`
- Rate limit: 플랜별, `429` + `Retry-After`
- 웹훅(Studio): `POST <seller_url>` `{ "event": "launch.ready" | "publication.published", "launch_id": "…" }`

## 해커톤 당일 최소 구현 (6개)
`POST /uploads/sign` · `POST /launches` · `GET /launches/{id}/events` · `GET /launches/{id}/kit` · `PATCH /launches/{id}/listing` · `GET /launches/{id}/download`
나머지는 버튼만 두고 목업. 발행은 Shopify 개발 스토어 1개만 실제 연결하면 데모에 충분하다.
