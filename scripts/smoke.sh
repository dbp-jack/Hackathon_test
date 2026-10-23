#!/usr/bin/env bash
# Launch Kit end-to-end smoke test.
#   BASE_URL=http://localhost:3000 scripts/smoke.sh
#   SMOKE_FILE=/path/to/clip.mp4 scripts/smoke.sh   # upload a real video instead of a fake jpg
#   POLL_SECONDS=120                                # how long to wait for ready|failed
# Needs curl, plus jq (falls back to python3 -I if jq is missing). The worker must be running
# (MOCK_MODE=true is enough) or the launch never reaches ready.
set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
API="$BASE_URL/api/v1"
POLL_SECONDS="${POLL_SECONDS:-120}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAILS=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAILS=$((FAILS + 1)); }

# ---- JSON helper: jget FILE PATH  (PATH like .uploads[0].media_id) -------------------------
if command -v jq >/dev/null 2>&1; then
  jget() { jq -r "$2 // empty" "$1" 2>/dev/null; }
  jlen() { jq -r "$2 | length" "$1" 2>/dev/null; }
elif command -v python3 >/dev/null 2>&1; then
  echo "note: jq not found, using python3 for JSON"
  _py() {
    python3 -I -c '
import json, re, sys
path, mode = sys.argv[1], sys.argv[2]
try:
    data = json.load(open(sys.argv[3]))
except Exception:
    sys.exit(0)
cur = data
for tok in re.findall(r"\.([A-Za-z0-9_]+)|\[(\d+)\]", path):
    key, idx = tok
    try:
        cur = cur[key] if key else cur[int(idx)]
    except Exception:
        sys.exit(0)
if mode == "len":
    print(len(cur) if isinstance(cur, (list, dict, str)) else 0)
elif cur is None:
    pass
elif isinstance(cur, (dict, list)):
    print(json.dumps(cur))
else:
    print(cur)
' "$@"
  }
  jget() { _py "$2" get "$1"; }
  jlen() { _py "$2" len "$1"; }
else
  echo "need jq or python3"; exit 2
fi

# ---- HTTP helper: req METHOD PATH [JSON_BODY] -> sets CODE, BODY(file) ----------------------
req() {
  local method="$1" url="$2" body="${3:-}"
  BODY="$TMP/body.$RANDOM.json"; : > "$BODY"
  if [ -n "$body" ]; then
    CODE=$(curl -sS -o "$BODY" -w '%{http_code}' -X "$method" -H 'Content-Type: application/json' --data "$body" "$url")
  else
    CODE=$(curl -sS -o "$BODY" -w '%{http_code}' -X "$method" "$url")
  fi
}

echo "Launch Kit smoke against $API"
echo

# 1. GET /plans
req GET "$API/plans"
if [ "$CODE" = 200 ] && [ "$(jlen "$BODY" .)" = 3 ]; then pass "GET /plans -> 200, 3 plans"; else fail "GET /plans -> $CODE"; fi

# 2. GET /me
req GET "$API/me"
if [ "$CODE" = 200 ] && [ -n "$(jget "$BODY" .plan)" ]; then
  pass "GET /me -> 200, plan=$(jget "$BODY" .plan), credits=$(jget "$BODY" .credits_remaining)"
else
  fail "GET /me -> $CODE (seed.sql not run? body: $(head -c 200 "$BODY"))"
fi

# 3. POST /uploads/sign
if [ -n "${SMOKE_FILE:-}" ] && [ -f "$SMOKE_FILE" ]; then
  FILE="$SMOKE_FILE"; NAME="$(basename "$SMOKE_FILE")"; MIME="video/mp4"
else
  FILE="$TMP/smoke.jpg"; NAME="smoke.jpg"; MIME="image/jpeg"
  # smallest valid-looking JPEG: SOI + APP0 + EOI
  printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$FILE"
fi
BYTES=$(wc -c < "$FILE" | tr -d ' ')
req POST "$API/uploads/sign" "{\"files\":[{\"name\":\"$NAME\",\"mime\":\"$MIME\",\"bytes\":$BYTES}]}"
MEDIA_ID=$(jget "$BODY" '.uploads[0].media_id')
PUT_URL=$(jget "$BODY" '.uploads[0].put_url')
TOKEN=$(jget "$BODY" '.uploads[0].token')
if [ "$CODE" = 200 ] && [ -n "$MEDIA_ID" ] && [ -n "$PUT_URL" ] && [ -n "$TOKEN" ]; then
  pass "POST /uploads/sign -> 200, media_id=$MEDIA_ID"
else
  fail "POST /uploads/sign -> $CODE $(head -c 200 "$BODY")"; echo; echo "cannot continue"; exit 1
fi

# 4. PUT bytes to the signed URL.
# Mirrors @supabase/storage-js uploadToSignedUrl: PUT {storage}/object/upload/sign/{bucket}/{path}?token=...
# The token is already in put_url's query string; no Authorization header is needed.
case "$PUT_URL" in *token=*) ;; *) PUT_URL="$PUT_URL?token=$TOKEN";; esac
PUT_CODE=$(curl -sS -o "$TMP/put.json" -w '%{http_code}' -X PUT \
  -H "Content-Type: $MIME" -H 'x-upsert: false' -H 'cache-control: max-age=3600' \
  --data-binary @"$FILE" "$PUT_URL")
if [ "$PUT_CODE" = 200 ]; then pass "PUT signed upload -> 200 ($BYTES bytes)"; else fail "PUT signed upload -> $PUT_CODE $(head -c 200 "$TMP/put.json")"; fi

# 5. POST /launches
req POST "$API/launches" "{\"media_ids\":[\"$MEDIA_ID\"],\"hints\":{\"product_name\":\"Smoke test mug\"}}"
LAUNCH_ID=$(jget "$BODY" .launch_id)
if [ "$CODE" = 202 ] && [ -n "$LAUNCH_ID" ]; then
  pass "POST /launches -> 202, launch_id=$LAUNCH_ID, credits_remaining=$(jget "$BODY" .credits_remaining)"
else
  fail "POST /launches -> $CODE $(head -c 200 "$BODY")"
  [ "$(jget "$BODY" .error)" = "launch_already_running" ] && echo "      hint: a launch is still analyzing/writing/rendering; wait or mark it failed"
  echo; echo "cannot continue"; exit 1
fi

# 6. poll GET /launches/{id}
STATUS=""; START=$(date +%s)
while :; do
  req GET "$API/launches/$LAUNCH_ID"
  STATUS=$(jget "$BODY" .status)
  STEP=$(jget "$BODY" .progress.step); PCT=$(jget "$BODY" .progress.pct)
  printf '\r      status=%-10s step=%-22s pct=%-4s %3ds' "$STATUS" "${STEP:-"-"}" "${PCT:-0}" "$(( $(date +%s) - START ))"
  case "$STATUS" in ready|published|failed) break;; esac
  [ $(( $(date +%s) - START )) -ge "$POLL_SECONDS" ] && break
  sleep 2
done
printf '\n'
ELAPSED=$(( $(date +%s) - START ))
case "$STATUS" in
  ready|published) pass "launch reached $STATUS in ${ELAPSED}s";;
  failed) fail "launch failed (is the worker in MOCK_MODE, or did you pass SMOKE_FILE=<video>?)";;
  *) fail "launch still '$STATUS' after ${POLL_SECONDS}s (is the worker running?)";;
esac

# 7. GET /kit
req GET "$API/launches/$LAUNCH_ID/kit"
LISTING_TITLE=$(jget "$BODY" .listing.title)
if [ "$CODE" = 200 ] && [ -n "$LISTING_TITLE" ]; then
  pass "GET /kit -> 200, listing.title=\"${LISTING_TITLE:0:60}\" frames=$(jlen "$BODY" .frames) videos=$(jlen "$BODY" .videos) localizations=$(jlen "$BODY" .localizations)"
else
  fail "GET /kit -> $CODE, listing is null"
fi

# 8. GET /export/etsy.csv
CSV_CODE=$(curl -sS -o "$TMP/etsy.csv" -w '%{http_code}' "$API/launches/$LAUNCH_ID/export/etsy.csv")
if [ "$CSV_CODE" = 200 ] && [ "$(wc -l < "$TMP/etsy.csv" | tr -d ' ')" -ge 2 ]; then
  pass "GET /export/etsy.csv -> 200, $(wc -l < "$TMP/etsy.csv" | tr -d ' ') lines"
else
  fail "GET /export/etsy.csv -> $CSV_CODE"
fi

# 9. PATCH /listing with a 141-char title -> 422 title_too_long
LONG=$(printf 'x%.0s' $(seq 1 141))
req PATCH "$API/launches/$LAUNCH_ID/listing" "{\"title\":\"$LONG\"}"
if [ "$CODE" = 422 ] && [ "$(jget "$BODY" .error)" = "title_too_long" ] && [ "$(jget "$BODY" .max)" = 140 ]; then
  pass "PATCH /listing 141-char title -> 422 title_too_long max=140"
else
  fail "PATCH /listing 141-char title -> $CODE $(head -c 200 "$BODY")"
fi

# 10. GET /download (only meaningful once ready)
if [ "$STATUS" = ready ] || [ "$STATUS" = published ]; then
  ZIP_CODE=$(curl -sS -o "$TMP/kit.zip" -w '%{http_code}' "$API/launches/$LAUNCH_ID/download")
  if [ "$ZIP_CODE" = 200 ] && [ "$(wc -c < "$TMP/kit.zip" | tr -d ' ')" -gt 100 ]; then
    pass "GET /download -> 200, $(wc -c < "$TMP/kit.zip" | tr -d ' ') bytes"
  else
    fail "GET /download -> $ZIP_CODE"
  fi
fi

echo
if [ "$FAILS" -eq 0 ]; then echo "ALL PASS  (launch $LAUNCH_ID)"; exit 0; fi
echo "$FAILS FAILED  (launch $LAUNCH_ID)"; exit 1
