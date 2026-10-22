-- Launch Kit — MVP schema (Postgres / Supabase)
-- 결과 화면(Kit) 한 장이 그대로 조회되도록 launches 1건 아래에 모든 산출물을 매단다.
-- 돈은 전부 cents(integer) + currency(ISO 4217). 파일은 Supabase Storage 경로만 저장.

create extension if not exists "pgcrypto";

-- ───────────────────────── enums
create type plan_tier        as enum ('free', 'maker', 'studio');
create type launch_status    as enum ('uploaded', 'analyzing', 'writing', 'rendering', 'ready', 'published', 'failed');
create type media_kind       as enum ('video', 'photo');
create type frame_role       as enum ('hero', 'in_hand', 'detail', 'process', 'scale', 'alt');
create type video_kind       as enum ('listing', 'short');
create type video_platform   as enum ('etsy', 'tiktok', 'reels', 'shorts');
create type social_kind      as enum ('pinterest_pin', 'instagram_carousel');
create type channel          as enum ('etsy', 'shopify', 'tiktok', 'pinterest', 'instagram', 'youtube');
create type publish_status   as enum ('draft', 'queued', 'published', 'exported_csv', 'failed');
create type claude_step      as enum ('watch_footage', 'score_frames', 'extract_attributes', 'research_comparables', 'write_listing', 'price', 'write_hooks', 'cut_points', 'localize', 'format_for_channel');

-- ───────────────────────── sellers (auth.users 1:1)
create table sellers (
  id                uuid primary key references auth.users(id) on delete cascade,
  shop_name         text,
  ships_from_city   text,                       -- "Portland, OR"
  ships_from_country char(2) not null default 'US',
  default_currency  char(3) not null default 'USD',
  plan              plan_tier not null default 'free',
  credits_remaining int not null default 2,     -- Free 2 / Maker 15 / Studio unlimited(null 처리 대신 큰 수)
  credits_reset_at  timestamptz,
  created_at        timestamptz not null default now()
);

-- 연결된 판매 채널 (OAuth 토큰은 vault/secret에, 여기엔 메타만)
create table seller_channels (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references sellers(id) on delete cascade,
  channel       channel not null,
  external_shop_id text,
  display_name  text,
  connected_at  timestamptz not null default now(),
  unique (seller_id, channel)
);

-- ───────────────────────── launches = 런칭 1건 (= 상품 1점)
create table launches (
  id                uuid primary key default gen_random_uuid(),
  seller_id         uuid not null references sellers(id) on delete cascade,
  status            launch_status not null default 'uploaded',
  -- 셀러가 선택 입력한 힌트 (전부 nullable: Claude가 채움)
  product_name_hint text,
  materials_hint    text,
  price_hint_cents  int,
  target_channels   channel[] not null default '{etsy,shopify,tiktok}',
  -- 결과 요약 (결과 화면 상단)
  product_title     text,                       -- "Hand-thrown Speckled Stoneware Mug"
  started_at        timestamptz,
  finished_at       timestamptz,
  build_seconds     int generated always as (extract(epoch from (finished_at - started_at))::int) stored,
  minutes_saved_est int,                        -- 170 ("about 2 h 50 min")
  credits_used      int not null default 1,
  error_message     text,
  created_at        timestamptz not null default now()
);
create index on launches (seller_id, created_at desc);

-- 업로드 원본
create table source_media (
  id            uuid primary key default gen_random_uuid(),
  launch_id     uuid not null references launches(id) on delete cascade,
  kind          media_kind not null,
  storage_path  text not null,
  original_name text,                           -- "mug_making_oct21.mov"
  duration_sec  numeric(8,2),                   -- video only
  fps           numeric(6,2),
  frame_count   int,                            -- 14760
  width_px int, height_px int,
  created_at    timestamptz not null default now()
);

-- Claude가 뽑은 상품 속성 (리스팅·가격·현지화의 공통 입력)
create table product_attributes (
  launch_id     uuid primary key references launches(id) on delete cascade,
  category      text,                           -- "ceramic mug"
  materials     text[],                         -- {"stoneware clay","food-safe glaze"}
  colors        text[],
  dimensions    jsonb,                          -- {"height_in":3.6,"width_in":3.2,"capacity_oz":12}
  care          text[],                         -- {"microwave safe","dishwasher safe"}
  production_hours numeric(5,2),               -- 2.5
  made_to_order boolean,
  lead_time_days_min int, lead_time_days_max int,
  raw           jsonb                           -- Claude 원본 응답 보관
);

-- ───────────────────────── 산출물 1: 사진 (영상 프레임 or 업로드 사진)
create table frames (
  id            uuid primary key default gen_random_uuid(),
  launch_id     uuid not null references launches(id) on delete cascade,
  source_id     uuid references source_media(id) on delete set null,
  role          frame_role not null,
  timecode_sec  numeric(8,2),                   -- 468.0 (= 07:48); 업로드 사진이면 null
  score         numeric(4,3),                   -- Claude 점수 0~1
  score_reason  text,                           -- "sharp focus, glaze visible, neutral bg"
  storage_path_raw   text not null,
  storage_path_clean text,                      -- 배경 정리본
  sort_order    int not null default 0,
  selected      boolean not null default true,  -- "Swap a frame"로 교체 가능
  created_at    timestamptz not null default now()
);
create index on frames (launch_id, selected, sort_order);

-- ───────────────────────── 산출물 2: 리스팅 (기본 = en-US)
create table listings (
  launch_id       uuid primary key references launches(id) on delete cascade,
  title           text not null check (char_length(title) <= 140),
  tags            text[] not null check (cardinality(tags) <= 13),
  description     text not null,
  description_words int generated always as (array_length(regexp_split_to_array(description, '\s+'), 1)) stored,
  price_cents     int not null,                 -- 4200
  currency        char(3) not null default 'USD',
  price_low_cents  int,                         -- 유사 리스팅 범위 $34
  price_high_cents int,                         -- $58
  cost_basis_cents int,                         -- 재료+노동 ≈ $31
  comparables_read int,                         -- 40
  price_reasoning text,
  updated_at      timestamptz not null default now()
);

-- 산출물 6: 현지화 (UK/DE/AU/CA …)
create table listing_localizations (
  id            uuid primary key default gen_random_uuid(),
  launch_id     uuid not null references launches(id) on delete cascade,
  market        char(2) not null,               -- GB, DE, AU, CA
  locale        text not null,                  -- en-GB, de-DE, en-AU, fr-CA
  title         text not null check (char_length(title) <= 140),
  tags          text[] not null,
  description   text not null,
  price_cents   int not null,                   -- 3350
  currency      char(3) not null,               -- GBP
  fx_rate       numeric(12,6),
  shipping_cents_included int,
  enabled       boolean not null default true,
  unique (launch_id, market, locale)
);

-- ───────────────────────── 산출물 3·4: 영상 (리스팅 비디오 1 + 숏폼 3)
create table videos (
  id            uuid primary key default gen_random_uuid(),
  launch_id     uuid not null references launches(id) on delete cascade,
  kind          video_kind not null,
  platform      video_platform not null,
  hook_text     text,                           -- "3 hours at the wheel. 30 seconds."
  hook_rationale text,                          -- Claude가 이 훅을 고른 이유
  cut_points    jsonb not null,                 -- [{"in":134.0,"out":138.5,"caption":"centering"}, …]
  duration_sec  numeric(6,2),
  aspect        text not null default '9:16',
  has_captions  boolean not null default true,
  storage_path  text,                           -- 렌더 완료 후
  sort_order    int not null default 0
);
create index on videos (launch_id, kind);

-- ───────────────────────── 산출물 5: 핀 / 캐러셀
create table social_assets (
  id            uuid primary key default gen_random_uuid(),
  launch_id     uuid not null references launches(id) on delete cascade,
  kind          social_kind not null,
  title         text,                           -- 핀 제목
  caption       text,
  frame_ids     uuid[] not null,                -- 사용한 frames.id 순서대로
  storage_paths text[],                         -- 렌더 결과
  sort_order    int not null default 0
);

-- ───────────────────────── 산출물 7: 발행
create table publications (
  id            uuid primary key default gen_random_uuid(),
  launch_id     uuid not null references launches(id) on delete cascade,
  channel       channel not null,
  status        publish_status not null default 'draft',
  external_id   text,                           -- shopify product id 등
  external_url  text,
  csv_storage_path text,                        -- Etsy CSV export
  payload       jsonb,                          -- 채널 포맷으로 변환된 최종 본문
  error_message text,
  published_at  timestamptz,
  unique (launch_id, channel)
);

-- ───────────────────────── "What Claude did" — 결과 화면 하단 띠 + 비용 추적
create table claude_actions (
  id            bigserial primary key,
  launch_id     uuid not null references launches(id) on delete cascade,
  step          claude_step not null,
  summary       text not null,                  -- "scored 14,760 frames, kept 5"
  metrics       jsonb,                          -- {"frames_scored":14760,"frames_kept":5}
  model         text,                           -- "claude-…"
  input_tokens  int, output_tokens int,
  cost_cents    numeric(8,3),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index on claude_actions (launch_id, started_at);

-- 크레딧 원장
create table credit_ledger (
  id          bigserial primary key,
  seller_id   uuid not null references sellers(id) on delete cascade,
  launch_id   uuid references launches(id) on delete set null,
  delta       int not null,                     -- -1 사용, +15 월 충전, +1 환불
  reason      text not null,
  created_at  timestamptz not null default now()
);

-- ───────────────────────── 결과 화면용 뷰: launch 1건 → Kit JSON 한 덩어리
create view launch_kit_view as
select
  l.id, l.seller_id, l.status, l.product_title, l.build_seconds, l.minutes_saved_est,
  (select jsonb_agg(jsonb_build_object('name', original_name, 'kind', kind, 'duration_sec', duration_sec, 'frame_count', frame_count))
     from source_media s where s.launch_id = l.id)                                  as sources,
  (select to_jsonb(li) from listings li where li.launch_id = l.id)                   as listing,
  (select jsonb_agg(to_jsonb(f) order by f.sort_order)
     from frames f where f.launch_id = l.id and f.selected)                          as frames,
  (select jsonb_agg(to_jsonb(v) order by v.sort_order)
     from videos v where v.launch_id = l.id)                                         as videos,
  (select jsonb_agg(to_jsonb(sa) order by sa.sort_order)
     from social_assets sa where sa.launch_id = l.id)                                as social,
  (select jsonb_agg(to_jsonb(ll) order by ll.market)
     from listing_localizations ll where ll.launch_id = l.id and ll.enabled)         as localizations,
  (select jsonb_agg(to_jsonb(p) order by p.channel)
     from publications p where p.launch_id = l.id)                                   as publications,
  (select jsonb_agg(jsonb_build_object('step', step, 'summary', summary) order by started_at)
     from claude_actions ca where ca.launch_id = l.id)                               as what_claude_did
from launches l;

-- ───────────────────────── RLS (셀러는 자기 것만)
alter table sellers enable row level security;
alter table launches enable row level security;
create policy "own seller"   on sellers  for all using (id = auth.uid());
create policy "own launches" on launches for all using (seller_id = auth.uid());
-- 자식 테이블들은 launch_id → launches.seller_id = auth.uid() 패턴으로 동일하게 추가

-- ───────────────────────── MVP additions
-- Realtime on the two tables the result screen listens to
alter publication supabase_realtime add table launches;
alter publication supabase_realtime add table claude_actions;

-- Worker claims one queued launch atomically
create or replace function claim_next_launch() returns launches as $$
  update launches set status = 'analyzing', started_at = now()
  where id = (select id from launches where status = 'uploaded' order by created_at limit 1 for update skip locked)
  returning *;
$$ language sql;

-- Uploads signed before a launch exists; POST /launches moves them into source_media
create table staged_media (
  id            uuid primary key,
  seller_id     uuid not null references sellers(id) on delete cascade,
  kind          media_kind not null,
  storage_path  text not null,
  original_name text,
  bytes         bigint,
  created_at    timestamptz not null default now()
);

-- Markets requested per launch (worker localizes into these)
create table launch_markets (
  launch_id uuid not null references launches(id) on delete cascade,
  market    char(2) not null,
  primary key (launch_id, market)
);

create or replace function refund_credit(p_seller uuid) returns void as $$
  update sellers set credits_remaining = credits_remaining + 1 where id = p_seller;
$$ language sql;
