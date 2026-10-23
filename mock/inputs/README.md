# 테스트 입력 팩 (mock/inputs)

팀원 각자가 **서로 다른 수공예 상품**으로 실제 파이프라인을 돌려볼 수 있도록 만든 6개의 입력 세트입니다.
각 팩은 업로드 창에 실제로 떨어뜨리는 것들로만 구성되어 있습니다.

```
mock/inputs/<slug>/
  input.mp4        제작 과정 영상 (H.264, ≤1080p, 60–180초, 무음)
  photo-1..3.jpg   완성품 사진 3장 (긴 변 1600px)
  hints.json       업로드 창의 힌트 4칸에 넣을 값 {product_name, materials, price_usd, ships_from}
  SOURCE.md        모든 파일의 출처(페이지 URL, 작성자, 라이선스)
```

> **영상/사진은 git에 커밋하지 않습니다.** 파일은 Supabase Storage(`launches` 버킷, `mock/inputs/<slug>/…`)에 올라가 있으니
> 아래 다운로드 URL로 받거나, `npx tsx scripts/build-inputs.ts`로 다시 만들면 됩니다 (Commons/Openverse에서 재수집 + ffmpeg 인코딩 + Claude 사진 선별, 팩당 약 2–3¢).
> 로컬에 `mock/inputs/.cache/`가 생기는데 이건 재실행용 캐시이니 지워도 됩니다.

다운로드 URL 공통 접두사: `https://ooqrmzzmunnvsqvcovcl.supabase.co/storage/v1/object/public/launches/mock/inputs/<slug>/`
(파일명 `input.mp4`, `photo-1.jpg`, `photo-2.jpg`, `photo-3.jpg`, `hints.json`, `SOURCE.md`)

한 번에 받기:

```bash
BASE=https://ooqrmzzmunnvsqvcovcl.supabase.co/storage/v1/object/public/launches/mock/inputs
for s in pottery-mug knit-scarf hand-poured-candle woven-wall-hanging leather-wallet handmade-soap; do
  mkdir -p mock/inputs/$s
  for f in input.mp4 photo-1.jpg photo-2.jpg photo-3.jpg hints.json SOURCE.md; do curl -sSfL -o mock/inputs/$s/$f "$BASE/$s/$f"; done
done
```

---

## 팩 목록

### 1. pottery-mug — 물레 성형 머그

| 항목 | 값 |
|---|---|
| 상품 | 물레로 빚는 석기(stoneware) 머그 |
| 영상 길이 | 111.7초 · 720×1192 (세로 폰 촬영) · 23.2 MB · 실제 제작 영상 |
| 사진 수 | 3장 (Openverse, CC BY 2.0 / CC BY-SA 2.0) |
| Product name | `Speckled stoneware mug` |
| Materials | `Stoneware clay, food-safe glaze` |
| Price (USD) | `42` |
| Ships from | `Portland, OR` |
| 다운로드 | https://ooqrmzzmunnvsqvcovcl.supabase.co/storage/v1/object/public/launches/mock/inputs/pottery-mug/input.mp4 |
| 출처/라이선스 | 영상: Wikimedia Commons "Pottery on porters wheel.webm", Alvinategyeka, **CC BY-SA 4.0** (전체 구간, 재인코딩) · 사진: Featherstone Pottery / Tony Barnes Moonshine Pottery 등, 상세는 `SOURCE.md` |

### 2. knit-scarf — 손뜨개 목도리

| 항목 | 값 |
|---|---|
| 상품 | 케이블 무늬 손뜨개 목도리 |
| 영상 길이 | 118.4초 · 1920×1080 · 42.2 MB · 실제 제작 영상 |
| 사진 수 | 3장 (`public/example/knit`의 데모 자산 재사용: hero / closeup / cables) |
| Product name | `Chunky hand-knit cable scarf` |
| Materials | `100% merino wool` |
| Price (USD) | `68` |
| Ships from | `Burlington, VT` |
| 다운로드 | https://ooqrmzzmunnvsqvcovcl.supabase.co/storage/v1/object/public/launches/mock/inputs/knit-scarf/input.mp4 |
| 출처/라이선스 | 영상: Wikimedia Commons "Knitting (close-up).webm", Clément Bucco-Lechat (Pleclown), **CC BY-SA 3.0** · 사진: 팀 데모 자산. 기존 10초 예제 클립은 60초 규칙에 못 미쳐 `input-short.mp4`로 같이 넣어둠 |

### 3. hand-poured-candle — 수제 양초

| 항목 | 값 |
|---|---|
| 상품 | 밀랍 캔들 (영상은 **디핑** 방식의 테이퍼 캔들 제작 — Commons에 60초 이상의 포어링 영상이 없음) |
| 영상 길이 | 85.6초 · 640×480 (원본 해상도가 낮음) · 8.4 MB · 실제 제작 영상 3개 이어붙임 (담그기 → 걸이 뒤집기 → 밑단 다듬기) |
| 사진 수 | 3장 (Openverse, CC BY 2.0) |
| Product name | `Hand-dipped beeswax taper candles (pair)` |
| Materials | `Pure beeswax, cotton wick` |
| Price (USD) | `28` |
| Ships from | `Asheville, NC` |
| 다운로드 | https://ooqrmzzmunnvsqvcovcl.supabase.co/storage/v1/object/public/launches/mock/inputs/hand-poured-candle/input.mp4 |
| 출처/라이선스 | 영상: Wikimedia Commons "Ljusstöpning-dopp.ogv" + "Ljusstöpning-dopp och vändning.ogv" + "Ljusstöpning-droppklipp.ogv", Haxpett, **CC BY-SA 3.0** · 사진: `SOURCE.md` |

### 4. woven-wall-hanging — 직조 월행잉

| 항목 | 값 |
|---|---|
| 상품 | 베틀로 짠 직물 월행잉 |
| 영상 길이 | 76.0초 · 1920×1080 · 49.2 MB · 실제 제작 영상 (원본 타임스탬프가 깨져 있어 30fps로 재타이밍) |
| 사진 수 | 3장 (Openverse, CC BY 2.0 / CC BY-SA 2.0) |
| Product name | `Handwoven wall hanging` |
| Materials | `Cotton warp, wool and linen weft, driftwood dowel` |
| Price (USD) | `145` |
| Ships from | `Santa Fe, NM` |
| 다운로드 | https://ooqrmzzmunnvsqvcovcl.supabase.co/storage/v1/object/public/launches/mock/inputs/woven-wall-hanging/input.mp4 |
| 출처/라이선스 | 영상: Wikimedia Commons "Weaving demonstrated on a historic loom in Leiden.webm", Shani Evenstein (Esh77), **CC BY-SA 4.0** · 사진: `SOURCE.md` |

### 5. leather-wallet — 가죽 지갑 (슬라이드쇼 대체)

| 항목 | 값 |
|---|---|
| 상품 | 풀그레인 가죽 반지갑 |
| 영상 길이 | 70.0초 · 1920×1080 · 7.3 MB · **실제 영상 아님** — Openverse 사진 10장(제작 과정 7 + 완성품 3)으로 만든 줌팬 슬라이드쇼 |
| 사진 수 | 3장 (Openverse, CC BY 2.0) |
| Product name | `Minimalist full-grain leather bifold wallet` |
| Materials | `Full-grain vegetable-tanned leather, waxed linen thread` |
| Price (USD) | `85` |
| Ships from | `Austin, TX` |
| 다운로드 | https://ooqrmzzmunnvsqvcovcl.supabase.co/storage/v1/object/public/launches/mock/inputs/leather-wallet/input.mp4 |
| 출처/라이선스 | Commons에는 쓸 만한 가죽 지갑 제작 영상이 없음 ("Tangraig Evans the Saddler"는 인터뷰, 유일한 제작 클립은 16초). 슬라이드 사진 전부 Openverse CC BY/BY-SA, 각 장의 출처는 `SOURCE.md` |

### 6. handmade-soap — 수제 비누 (슬라이드쇼 대체)

| 항목 | 값 |
|---|---|
| 상품 | 콜드프로세스 오트밀 허니 비누 |
| 영상 길이 | 66.0초 · 1920×1080 · 4.7 MB · **실제 영상 아님** — Openverse 사진 6장(제작 과정 3 + 완성품 3) 슬라이드쇼 |
| 사진 수 | 3장 (Openverse, CC BY 2.0 / 2.5 / BY-SA 4.0) |
| Product name | `Cold process oatmeal honey soap bar` |
| Materials | `Olive oil, coconut oil, shea butter, oatmeal, honey` |
| Price (USD) | `9` |
| Ships from | `Madison, WI` |
| 다운로드 | https://ooqrmzzmunnvsqvcovcl.supabase.co/storage/v1/object/public/launches/mock/inputs/handmade-soap/input.mp4 |
| 출처/라이선스 | Commons의 유일한 비누 영상("Nigeria Liquid Soap Making")은 이름 자막이 박힌 인터뷰 위주의 액상 비누 영상이라 제외. 슬라이드 사진 전부 Openverse CC BY/BY-SA, 각 장의 출처는 `SOURCE.md` |

> 슬라이드쇼 팩(5, 6)은 프레임이 6–7초마다 바뀌는 정지 이미지이므로 `watch_footage`/`score_frames`가 뽑는 프레임이 사진과 거의 같고, 숏폼 영상도 사진이 천천히 줌되는 형태가 됩니다. 파이프라인의 **동작 확인**에는 충분하지만 데모용 결과물로는 1–4번 팩을 쓰세요.

---

## 테스트 순서

1. https://launch-kit-test-m.vercel.app 접속.
2. 팩 폴더의 `input.mp4` + `photo-1.jpg`, `photo-2.jpg`, `photo-3.jpg` 4개 파일을 업로드 창에 한꺼번에 드롭 (영상은 반드시 1개).
3. 힌트 4칸에 위 표의 값을 그대로 입력: Product name / Materials / Price (숫자만) / Ships from.
4. **Build my launch kit** 클릭 → `/launches/{id}`로 이동, 타일이 차오르는 걸 지켜봄. 보통 2–5분.
5. Maker 플랜은 **한 번에 하나의 런치만** 돌아감 — 이전 런치가 `analyzing/writing/rendering`이면 409(`launch_already_running`)가 나므로 끝날 때까지 기다렸다가 다음 팩을 올리세요.
6. 팀 전체가 같은 데모 셀러를 쓰므로 크레딧(`GET /api/v1/me`의 `credits_remaining`)을 확인하고, 한 사람이 한 팩씩 맡는 걸 권장.

API로 자동 실행하려면 (크레딧과 Claude 비용이 실제로 듭니다):

```bash
scripts/run-inputs.sh --dry-run                                   # 인자/팩 확인만
BASE_URL=http://localhost:3000 scripts/run-inputs.sh --only pottery-mug
BASE_URL=https://launch-kit-test-m.vercel.app scripts/run-inputs.sh   # 6개 순차, 팩당 최대 10분 대기
```

## 예상 결과 체크 항목

| 확인할 것 | 기대값 |
|---|---|
| Listing title | 140자 이하, 힌트의 상품명/재료가 반영됨 |
| Tags | 정확히 13개 |
| Price | `hints.price_usd` 근처 (예: 42 → 대략 $35–55 범위; `price.comparables`에 low/high가 채워짐) |
| Description | 180–260 단어 |
| Frames (사진 5장) | 5개, 각 타임코드가 **영상 길이 안**에 있음 (예: pottery-mug는 0–111초), 역할 라벨(hero/detail/…)이 붙어 있음 |
| Videos | 4개(reels/shorts/tiktok + 1), 각각 1080×1920 mp4 파일이 Storage에 있고 재생됨 |
| Localizations | 4개 마켓 GB / DE / AU / CA, 각자 현지 통화 가격 |
| Social | 핀 제목 + 캐러셀 캡션 |
| 상태 | `ready`, `build_seconds` 기록, 실패 시 크레딧 환불 |
| Etsy CSV | `/api/v1/launches/{id}/export/etsy.csv` 2줄 이상 |

팩별로 특히 볼 것:
- **pottery-mug**: 세로 영상(720×1192)이라 프레임 추출과 세로 숏폼 크롭이 자연스러운지.
- **knit-scarf**: 영상(회색 실)과 사진(연파랑 케이블 니트) 색이 다름 — Claude가 사진 쪽 속성을 우선하는지, 설명에 모순이 없는지.
- **hand-poured-candle**: 480p 저해상도 + 사람 얼굴이 나오는 장면 — hero 프레임으로 얼굴 컷을 피하는지.
- **woven-wall-hanging**: 영상 속 직물(무지개 줄무늬)과 사진이 다른 작품 — 속성 추출이 뒤섞이지 않는지.
- **leather-wallet / handmade-soap**: 슬라이드쇼라 "장면"이 6–7초 단위 — scenes timeline이 그럴듯하게 나오는지, 숏폼 컷 포인트가 이미지 경계와 맞는지.

## 다시 만들기

```bash
npx tsx scripts/build-inputs.ts                      # 6개 전부 (다운로드 → 인코딩 → Claude 사진 선별 → 검증 → Storage 업로드)
npx tsx scripts/build-inputs.ts --only handmade-soap --no-upload
npx tsx scripts/build-inputs.ts --force              # 캐시 무시하고 영상 재인코딩 + 사진 재선별
```

`.env`의 `ANTHROPIC_API_KEY`(사진 선별, 팩당 Sonnet 1회)와 Supabase 서비스 키(업로드)가 필요하고, ffmpeg/ffprobe가 PATH에 있어야 합니다.
결과 요약은 `mock/inputs/manifest.json`에 남습니다.
