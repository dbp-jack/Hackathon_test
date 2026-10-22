# Launch Kit

*Make it once. Launch it everywhere.*
One phone video of a maker making their product → Etsy listing, 5 photos, 4 videos, pin + carousel, 4 localized listings, one-click publish. Claude does the core work; ffmpeg only cuts.

Stack: Next.js 16 (App Router, TS, Tailwind v4) · Supabase (Postgres, Storage) · Node worker (Anthropic SDK + ffmpeg + sharp).
Design: Direction B "Sticker Sheet" — one output = one color, pill buttons, 22px tiles.

## Run it

```bash
# 1. deps
npm install
brew install ffmpeg          # or apt install ffmpeg

# 2. Supabase
#   create a project → SQL editor → run supabase/migrations/0001_init.sql, then supabase/seed.sql
#   (seed creates the demo seller + public 'launches' bucket)

# 3. env
cp .env.example .env.local   # fill Supabase URL/keys and ANTHROPIC_API_KEY
cp .env.local .env           # the worker reads .env via dotenv

# 4. run — two terminals
npm run dev                  # http://localhost:3000
npm run worker               # pipeline; MOCK_MODE=true npm run worker for a keyless demo
```

Open `/`, drop a making-of video (MP4/MOV ≤10 min) and optionally photos → **Build my launch kit** → you land on `/launches/{id}` and watch the tiles fill in.

## How the pieces fit

```
Browser ──POST /uploads/sign──▶ API ──createSignedUploadUrl──▶ Storage
Browser ──PUT (signed)────────────────────────────────────────▶ Storage
Browser ──POST /launches──▶ API: -1 credit, launches.status=uploaded
Worker  ──claim_next_launch()──▶ status=analyzing … ready
Worker  ──insert claude_actions──▶ API /events (SSE) ──▶ result tiles fill in
Browser ──GET /launches/{id}/kit──▶ one JSON = the whole screen
```

| Step (`claude_actions.step`) | Who | What |
|---|---|---|
| watch_footage | ffmpeg + sharp | 1 fps frames → Laplacian blur filter → ~60 candidates |
| score_frames, extract_attributes | **Claude** (vision, `CLAUDE_VISION_MODEL`) | scenes timeline, product attributes, 1 frame per role + runners-up |
| research_comparables | **Claude** + web search | ~40 comparable listings → price range, common tags |
| write_listing, price | **Claude** (`CLAUDE_WRITER_MODEL`) | title ≤140, 13 tags, 180–260 word description, price + reasoning |
| write_hooks, cut_points | **Claude** → ffmpeg | 4 vertical videos: hooks, cut list, captions; ffmpeg renders 1080×1920 |
| localize | **Claude** + frankfurter.app | GB/DE/AU/CA listings + FX-converted prices |
| format_for_channel | **Claude** | pin title, carousel caption, draft publications |

Every Claude call goes through `worker/lib/claude.ts#structured()` — a forced tool call with a JSON schema, so outputs are validated, never free text. Each call logs model/tokens/cost into `claude_actions`, which powers the "What Claude did" strip and per-launch cost tracking.

## Layout

```
src/app/page.tsx                 Upload screen (hero, dropzone, output tiles, plans)
src/app/launches/[id]/page.tsx   Result screen (server) → components/KitView.tsx (client, SSE)
src/app/api/v1/**                13 routes — see launch-kit-api.md
src/lib/kit.ts                   buildKit(): DB → Kit JSON (mirrors launch_kit_view); Etsy CSV
src/lib/types.ts                 shared types, OUTPUTS, PLANS, PIPELINE_STEPS
worker/index.ts                  claim loop, step orchestration, failure → refund
worker/steps/*.ts                analyze · write · video · localize · mock
supabase/migrations/0001_init.sql, supabase/seed.sql
```

## Hackathon-day notes

- **Auth is out of scope.** Every request acts as `DEMO_SELLER_ID`. Swap `currentSellerId()` for `auth.getUser()` later; RLS policies are already in the migration.
- **Etsy publish is CSV** (`/export/etsy.csv`) until the Etsy app is approved. `/publish` queues Shopify/TikTok rows; wiring the Shopify Admin API is `worker/steps/publish.ts` (not yet written — one dev-store call).
- **Background removal** is not wired (`frames.storage_path_clean` stays null, UI falls back to the raw frame). Add `rembg` as a sidecar if time allows.
- **Captions**: `CAPTION_FONT` must point to a real .ttf or drawtext fails — test one caption before the demo.
- **Rehearse with `MOCK_MODE=true`** — same event cadence, ~40 s, no keys. Then switch to live for the real take.
- The `/events` route polls Supabase every second; on Vercel keep the function `maxDuration` ≥ 300 s or move the client to Supabase Realtime (`claude_actions` is already in the publication).
