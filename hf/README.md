---
title: Launch Kit Worker
emoji: 🧶
colorFrom: yellow
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

Background worker for Launch Kit: polls Supabase for uploaded launches and runs the Claude + ffmpeg pipeline.
`GET /` returns a JSON health status. Secrets (set in Space settings): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, DEMO_SELLER_ID.
