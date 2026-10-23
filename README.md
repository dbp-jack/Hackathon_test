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

## Deploy

Two deployables: the Next.js app (Vercel) and the worker (a long-running Node process — Fly.io or Railway). Both talk to the same Supabase project.

**Web → Vercel.** Import the repo; `vercel.json` sets `framework: nextjs` and raises `maxDuration` to 300 s for `/api/v1/launches/[id]/events` (the SSE route polls for up to five minutes) and 60 s for `/download`. Environment variables:

| Var | Note |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser upload via `uploadToSignedUrl` |
| `SUPABASE_SERVICE_ROLE_KEY` | all API routes use the service role (`src/lib/supabase/admin.ts`) |
| `SUPABASE_BUCKET` (`launches`), `NEXT_PUBLIC_SUPABASE_BUCKET` (`launches`) | server / browser bucket name |
| `DEMO_SELLER_ID` | the seeded seller; no auth in the MVP |

**Worker → Fly.io or Railway.** `worker/Dockerfile` (node:24-slim + ffmpeg + DejaVu fonts, `CAPTION_FONT` preset) is built from the repo root because the worker imports `src/lib/types.ts`. The worker must run continuously — it loops on `claim_next_launch()`; if it is down, launches sit at `uploaded` forever and the result screen never fills in. Keep exactly one instance unless the plan allows parallel launches.

- Fly: `fly launch --no-deploy --copy-config` (uses `fly.toml`: app `launch-kit-worker`, one `shared-cpu-1x` 1 GB machine, no HTTP service), then `fly secrets set …`, then `fly deploy`.
- Railway: new service from the repo; `railway.json` points at the Dockerfile. Set variables in the dashboard.

| Var | Note |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` | `worker/lib/db.ts` |
| `ANTHROPIC_API_KEY` | read by the Anthropic SDK |
| `CLAUDE_VISION_MODEL`, `CLAUDE_WRITER_MODEL` | defaults in `worker/lib/claude.ts` |
| `MOCK_MODE` | `true` for a keyless demo run |
| `FFMPEG_PATH`, `CAPTION_FONT`, `WORK_DIR` | preset in the Dockerfile |

The Supabase Storage bucket `launches` is **public** (`supabase/seed.sql`); frame, video, and social URLs in the kit are plain public URLs, so no signed-read logic exists. Do not flip the bucket to private without also changing `publicUrl()` in `src/lib/supabase/admin.ts`.

## Testing

- `scripts/smoke.sh` runs the whole flow with curl: `/plans`, `/me`, `/uploads/sign`, a real `PUT` to the signed URL, `/launches`, polling to `ready|failed` (120 s default), `/kit` listing check, `/export/etsy.csv`, a 141-char `PATCH /listing` expecting 422, and `/download`. Needs `jq` or `python3`, a running web app, and a running worker (`MOCK_MODE=true npm run worker` is enough).

  ```bash
  scripts/smoke.sh                                   # against http://localhost:3000
  BASE_URL=https://your-app.vercel.app scripts/smoke.sh
  SMOKE_FILE=./clip.mp4 scripts/smoke.sh             # upload a real video for a live-worker run
  ```

- `docs/validation-checklist.md` is the manual checklist: every endpoint with its happy path and each error code the routes actually return, the UI states on `/`, `/launches/[id]`, `/launches`, `/example`, `/preview/*`, the demo-day rehearsal (mock run, live run, numbers to record, fallback plan), and deployment smoke checks.
- `scripts/cost-report.sql` sums `claude_actions.cost_cents`, tokens, and `build_seconds` per launch — the "cents per launch" number for the pitch.
