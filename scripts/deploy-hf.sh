#!/usr/bin/env bash
# Deploy the worker to a Hugging Face Space (Docker SDK).
#   HF_TOKEN=hf_xxx HF_USER=<user> bash scripts/deploy-hf.sh [space-name]
# Creates the Space if missing, sets secrets from .env, assembles a minimal repo and pushes it.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${HF_TOKEN:?set HF_TOKEN (write token)}"; : "${HF_USER:?set HF_USER}"
SPACE="${1:-launch-kit-worker}"; REPO="$HF_USER/$SPACE"
api() { curl -sS -H "Authorization: Bearer $HF_TOKEN" -H "Content-Type: application/json" "$@"; }

echo "▶ ensure space $REPO"
code=$(api -o /dev/null -w '%{http_code}' "https://huggingface.co/api/spaces/$REPO")
if [ "$code" = "404" ]; then
  api -X POST https://huggingface.co/api/repos/create -d "{\"type\":\"space\",\"name\":\"$SPACE\",\"sdk\":\"docker\",\"private\":false,\"hardware\":\"cpu-basic\"}" >/dev/null && echo "  created"
else echo "  exists ($code)"; fi

echo "▶ secrets from .env"
# read KEY=value lines without sourcing (values may contain spaces); strip optional surrounding quotes
envval() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- | sed -E "s/^['\"]//; s/['\"]\$//"; }
for k in NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY ANTHROPIC_API_KEY DEMO_SELLER_ID; do
  v="$(envval "$k")"; [ -n "$v" ] || { echo "  skip $k (empty)"; continue; }
  api -X POST "https://huggingface.co/api/spaces/$REPO/secrets" -d "$(python3 -I -c 'import json,sys;print(json.dumps({"key":sys.argv[1],"value":sys.argv[2]}))' "$k" "$v")" >/dev/null && echo "  set $k"
done
for kv in MOCK_MODE=false SUPABASE_BUCKET=launches; do
  api -X POST "https://huggingface.co/api/spaces/$REPO/variables" -d "{\"key\":\"${kv%%=*}\",\"value\":\"${kv#*=}\"}" >/dev/null && echo "  var $kv"
done

echo "▶ assemble + push"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
cp hf/Dockerfile hf/README.md package.json package-lock.json tsconfig.json "$TMP"/
mkdir -p "$TMP/src" && cp -R src/lib "$TMP/src/lib" && cp -R worker "$TMP/worker" && rm -f "$TMP/worker/Dockerfile"
printf 'node_modules\n.work\n' > "$TMP/.gitignore"
( cd "$TMP" && git init -q -b main && git add -A && git -c user.name=launch-kit -c user.email=noreply@launchkit.app commit -qm "deploy worker $(date -u +%FT%TZ)" \
  && git push -q -f "https://$HF_USER:$HF_TOKEN@huggingface.co/spaces/$REPO" main )
echo "✓ pushed → https://huggingface.co/spaces/$REPO  (health: https://${HF_USER}-${SPACE//_/-}.hf.space/)"
