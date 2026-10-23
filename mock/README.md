# mock/ — 해커톤 데모 데이터셋

`kits.json`은 Launch Kit 데모 화면·시드 스크립트가 쓰는 완성 런칭 키트 8개다. 각 항목의 형태는 `types.ts`(`MockKit`)를 따른다.
`scripts/seed-mock.ts`, `worker/steps/mock.ts`, `src/lib/demoKit.ts`가 이 파일을 읽는다.

## 생성 방법

```bash
npx tsx scripts/gen-mock.ts                 # 8개 전부 (약 $3, 8~9분)
npx tsx scripts/gen-mock.ts --count 3       # 앞의 N개만
npx tsx scripts/gen-mock.ts --only soy-candle-amber,linen-tote-bag   # 지정 slug만 다시 만들어 kits.json에 병합
npx tsx scripts/gen-mock.ts --out /tmp/kits.json
```

`.env`의 `ANTHROPIC_API_KEY`를 쓰고, 모델은 `claude-opus-5-5`(`worker/lib/claude.ts`의 `structured()` 사용). 상품당 Claude 호출 1회, 3개씩 병렬.
끝나면 상품별 한 줄 요약(slug, 제목 글자수, 가격, build_seconds)과 총 토큰·비용을 출력한다.

## 프롬프트 설계

- **시스템 프롬프트**는 라이브 파이프라인(`worker/steps/write.ts`, `video.ts`, `localize.ts`)이 강제하는 규칙을 그대로 적는다: 제목 ≤140자 + `" | "` 구분, 소문자 태그 정확히 13개(≤20자), 180–260단어 4문단 1인칭 설명(과장어 금지), 비교 리스팅 범위 안의 가격과 `재료 + 시간×$12` 원가, 플랫폼별 4개 영상과 컷 규칙, GB/DE/AU/CA 현지화(ml·cm, en-GB/en-AU 철자, 독일어·캐나다 프랑스어).
- **심사 기준 반영**: "같은 자원으로 N배 가치"가 보이도록 `what_claude_did` 10단계 요약마다 구체적 숫자(프레임 수, 비교 리스팅 수, 단어 수, 영상 수, 언어 수)를 넣게 하고, 문체는 `logAction` 로그와 같은 소문자 한 줄로 맞춘다.
- **정직한 주장**: 제작 영상에 실제로 보이는 속성만 쓰고, 안 보이는 것(섬유 성분, 금속 각인 등)은 "판매자가 확인"으로 남긴다.
- **고정값(GIVEN 블록)**: 머그(Maya, $42, 비교 $34–58×40, 원가 $31, 훅 3개, 프레임 타임코드, 492 s@30fps)와 니트 스카프(`src/lib/exampleKnit.ts`의 제목·태그·$80·훅·시장별 제목)는 기획안/예시 페이지와 글자 단위로 일치하도록 프롬프트에 주고, 생성 후 코드에서 한 번 더 덮어쓴다. 나머지 6개는 판매자 이름·도시만 고정하고 Claude가 창작한다.
- **현지화 가격**은 모델 출력 대신 코드에서 계산한다: `round((USD + 시장별 배송비) × 환율)`을 50센트 단위로 반올림, 환율 GBP 0.79 / EUR 0.92 / AUD 1.52 / CAD 1.36, 배송비 GB 1800 / DE 2200 / AU 2600 / CA 1500센트(`localize.ts`의 폴백 값과 동일). 단, 머그와 스카프는 기획안·예시 페이지의 표시 가격(£33.50·€39.00·A$64.00·C$57.00 / £60·€71·A$114·C$112)을 그대로 쓴다 — 이 둘은 배송비 없이 당시 실제 환율로 계산된 값이라 공식과 다르다.
- **검증 후 재시도**: 생성 결과를 `types.ts` 제약(제목 길이, 태그 13개, 단어 수, 역할별 프레임 5장, 플랫폼별 영상 4개와 컷 범위, 시장 4개, what_claude_did 10개, build_seconds 150–330 등)에 대해 코드로 검사하고, 위반 목록을 프롬프트에 붙여 1회 재시도한다. 그래도 실패하면 위반 내용을 출력하고 종료 코드 1.

## 이미지

`image_queries`는 slug 폴더용 CC 사진 검색어(3–5개, 구체적인 것부터). 사진 자체는 별도 스크립트가 가져온다.
