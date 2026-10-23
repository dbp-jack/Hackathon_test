#!/usr/bin/env bash
# Run every test input pack (mock/inputs/<slug>/) through the REAL Launch Kit API, one after another,
# exactly the way the browser does it: sign → PUT video + photos → POST /launches with hints → poll → /kit.
#
#   scripts/run-inputs.sh                               # all packs against http://localhost:3000
#   scripts/run-inputs.sh --only pottery-mug,knit-scarf # a subset (comma-separated or repeated)
#   BASE_URL=https://launch-kit-test-m.vercel.app scripts/run-inputs.sh --only handmade-soap
#   POLL_SECONDS=600 scripts/run-inputs.sh              # per-pack wait for ready|failed (default 600 = 10 min)
#   scripts/run-inputs.sh --dry-run                     # parse args, list packs, make no requests
#
# Each pack costs ONE launch credit and real Claude spend on a live worker — the script runs packs
# sequentially because the Maker plan allows one launch at a time (409 launch_already_running otherwise).
# Needs curl and jq (falls back to python3 -I). Mirrors scripts/smoke.sh; see that file for the API shape.
set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
API="$BASE_URL/api/v1"
POLL_SECONDS="${POLL_SECONDS:-600}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INPUTS="$ROOT/mock/inputs"
ONLY=""
DRY=0

usage() { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --only)
      [ $# -ge 2 ] || { echo "error: --only needs a value" >&2; exit 2; }
      ONLY="${ONLY:+$ONLY,}$2"; shift 2;;
    --only=*) ONLY="${ONLY:+$ONLY,}${1#--only=}"; shift;;
    --dry-run) DRY=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "error: unknown argument '$1'" >&2; usage >&2; exit 2;;
  esac
done

# ---- which packs ----------------------------------------------------------------------------
PACKS=()
if [ -n "$ONLY" ]; then
  IFS=',' read -r -a PACKS <<< "$ONLY"
else
  for d in "$INPUTS"/*/; do
    [ -f "$d/input.mp4" ] && PACKS+=("$(basename "$d")")
  done
fi
if [ ${#PACKS[@]} -eq 0 ]; then
  echo "no packs found under $INPUTS (run: npx tsx scripts/build-inputs.ts)" >&2; exit 2
fi
for slug in "${PACKS[@]}"; do
  if [ ! -f "$INPUTS/$slug/input.mp4" ] || [ ! -f "$INPUTS/$slug/hints.json" ]; then
    echo "error: pack '$slug' is missing input.mp4 or hints.json under $INPUTS/$slug" >&2; exit 2
  fi
done

echo "Launch Kit input packs against $API"
echo "packs: ${PACKS[*]}   poll: ${POLL_SECONDS}s each"
echo

# ---- JSON helper (same as smoke.sh): jget FILE PATH / jlen FILE PATH ---------------------------
if command -v jq >/dev/null 2>&1; then
  jget() { jq -r "$2 // empty" "$1" 2>/dev/null; }
  jlen() { jq -r "$2 | length" "$1" 2>/dev/null; }
  jcount() { jq -r "$2" "$1" 2>/dev/null; }
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
  # jcount is only used with jq expressions; approximate the two we need
  jcount() {
    case "$2" in
      *storage_path*|*url*) python3 -I -c '
import json,sys
d=json.load(open(sys.argv[1])); vs=d.get("videos") or []
print(sum(1 for v in vs if isinstance(v,dict) and (v.get("storage_path") or v.get("url") or v.get("public_url"))))' "$1";;
      *) python3 -I -c '
import json,sys
d=json.load(open(sys.argv[1])); fs=d.get("frames") or []
print(sum(1 for f in fs if isinstance(f,dict) and isinstance(f.get("sec", f.get("timecode_sec")),(int,float))))' "$1";;
    esac
  }
else
  echo "need jq or python3" >&2; exit 2
fi

req() {  # req METHOD URL [JSON] -> CODE, BODY(file)
  local method="$1" url="$2" body="${3:-}"
  BODY="$TMP/body.$RANDOM.json"; : > "$BODY"
  if [ -n "$body" ]; then
    CODE=$(curl -sS -o "$BODY" -w '%{http_code}' -X "$method" -H 'Content-Type: application/json' --data "$body" "$url")
  else
    CODE=$(curl -sS -o "$BODY" -w '%{http_code}' -X "$method" "$url")
  fi
}

if [ "$DRY" = 1 ]; then
  for slug in "${PACKS[@]}"; do
    printf '  %-20s video=%s photos=%s hints=%s\n' "$slug" \
      "$(du -h "$INPUTS/$slug/input.mp4" | cut -f1)" \
      "$(ls "$INPUTS/$slug"/photo-*.jpg 2>/dev/null | wc -l | tr -d ' ')" \
      "$(tr -d '\n' < "$INPUTS/$slug/hints.json" | tr -s ' ')"
  done
  echo; echo "dry run: no requests made"; exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
RESULTS="$TMP/results.tsv"; : > "$RESULTS"

run_pack() {
  local slug="$1" dir="$INPUTS/$1"
  local status="-" secs="-" title="-" price="-" frames="-" videos="-" markets="-" launch_id="-"
  echo "== $slug"

  # hints.json → API hints shape {product_name, materials, price_cents, ships_from:{city,country:"US"}}
  local name materials price_usd city price_cents
  name=$(jget "$dir/hints.json" .product_name); materials=$(jget "$dir/hints.json" .materials)
  price_usd=$(jget "$dir/hints.json" .price_usd); city=$(jget "$dir/hints.json" .ships_from)
  price_cents=$(awk -v p="${price_usd:-0}" 'BEGIN { printf "%d", p * 100 + 0.5 }')

  # files: input.mp4 + photo-*.jpg (sorted)
  local files=("$dir/input.mp4") f
  for f in "$dir"/photo-*.jpg; do [ -f "$f" ] && files+=("$f"); done

  # 1. sign
  local sign_body="" i=0
  for f in "${files[@]}"; do
    local mime="image/jpeg"; case "$f" in *.mp4) mime="video/mp4";; esac
    sign_body="${sign_body:+$sign_body,}{\"name\":\"$(basename "$f")\",\"mime\":\"$mime\",\"bytes\":$(wc -c < "$f" | tr -d ' ')}"
  done
  req POST "$API/uploads/sign" "{\"files\":[$sign_body]}"
  if [ "$CODE" != 200 ]; then
    echo "   sign failed: $CODE $(head -c 200 "$BODY")"; status="sign_failed"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$slug" "$status" "$secs" "$title" "$price" "$frames" "$videos" "$markets" "$launch_id" >> "$RESULTS"; return
  fi
  local SIGN="$BODY" media_ids=""

  # 2. PUT each file to its signed URL (no Authorization header; the token is in the URL)
  i=0
  for f in "${files[@]}"; do
    local put_url token media_id mime="image/jpeg" put_code
    case "$f" in *.mp4) mime="video/mp4";; esac
    put_url=$(jget "$SIGN" ".uploads[$i].put_url"); token=$(jget "$SIGN" ".uploads[$i].token"); media_id=$(jget "$SIGN" ".uploads[$i].media_id")
    case "$put_url" in *token=*) ;; *) put_url="$put_url?token=$token";; esac
    put_code=$(curl -sS -o "$TMP/put.json" -w '%{http_code}' -X PUT -H "Content-Type: $mime" -H 'x-upsert: false' --data-binary @"$f" "$put_url")
    if [ "$put_code" != 200 ]; then
      echo "   PUT $(basename "$f") failed: $put_code $(head -c 200 "$TMP/put.json")"; status="upload_failed"
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$slug" "$status" "$secs" "$title" "$price" "$frames" "$videos" "$markets" "$launch_id" >> "$RESULTS"; return
    fi
    media_ids="${media_ids:+$media_ids,}\"$media_id\""
    i=$((i + 1))
  done
  echo "   uploaded ${#files[@]} files"

  # 3. POST /launches
  local esc_name esc_mat esc_city
  esc_name=$(printf '%s' "$name" | sed 's/\\/\\\\/g; s/"/\\"/g'); esc_mat=$(printf '%s' "$materials" | sed 's/\\/\\\\/g; s/"/\\"/g'); esc_city=$(printf '%s' "$city" | sed 's/\\/\\\\/g; s/"/\\"/g')
  req POST "$API/launches" "{\"media_ids\":[$media_ids],\"hints\":{\"product_name\":\"$esc_name\",\"materials\":\"$esc_mat\",\"price_cents\":$price_cents,\"ships_from\":{\"city\":\"$esc_city\",\"country\":\"US\"}}}"
  launch_id=$(jget "$BODY" .launch_id)
  if [ "$CODE" != 202 ] || [ -z "$launch_id" ]; then
    echo "   POST /launches failed: $CODE $(head -c 200 "$BODY")"; status="create_failed:$(jget "$BODY" .error)"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$slug" "$status" "$secs" "$title" "$price" "$frames" "$videos" "$markets" "$launch_id" >> "$RESULTS"; return
  fi
  echo "   launch $launch_id  ($BASE_URL/launches/$launch_id)"

  # 4. poll
  local start now step pct
  start=$(date +%s)
  while :; do
    req GET "$API/launches/$launch_id"
    status=$(jget "$BODY" .status); step=$(jget "$BODY" .progress.step); pct=$(jget "$BODY" .progress.pct)
    now=$(date +%s)
    printf '\r   status=%-10s step=%-22s pct=%-4s %3ds' "$status" "${step:-"-"}" "${pct:-0}" "$((now - start))"
    case "$status" in ready|published|failed) break;; esac
    [ $((now - start)) -ge "$POLL_SECONDS" ] && { status="timeout($status)"; break; }
    sleep 3
  done
  printf '\n'
  secs=$(jget "$BODY" .build_seconds); [ -n "$secs" ] || secs=$(( $(date +%s) - start ))

  # 5. kit summary
  req GET "$API/launches/$launch_id/kit"
  if [ "$CODE" = 200 ]; then
    title=$(jget "$BODY" .listing.title)
    price=$(jget "$BODY" .listing.price.cents); [ -n "$price" ] && price=$(awk -v c="$price" 'BEGIN { printf "$%.2f", c / 100 }')
    [ -n "$price" ] || price="-"
    local tags; tags=$(jlen "$BODY" .listing.tags); echo "   tags: ${tags:-0}  title chars: ${#title}"
    frames="$(jlen "$BODY" .frames)"
    videos="$(jlen "$BODY" .videos)"
    if command -v jq >/dev/null 2>&1; then
      local with_files; with_files=$(jcount "$BODY" '[.videos[]? | select((.storage_path // .url // .public_url // "") != "")] | length')
      videos="$videos(${with_files:-0} files)"
      local tc; tc=$(jcount "$BODY" '[.frames[]? | select((.sec // .timecode_sec) != null)] | length')
      frames="$frames(${tc:-0} tc)"
    fi
    markets="$(jlen "$BODY" .localizations)"
    [ -n "$title" ] || title="(no listing)"
    echo "   title: ${title:0:80}"
  else
    title="(kit $CODE)"
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$slug" "$status" "$secs" "$title" "$price" "$frames" "$videos" "$markets" "$launch_id" >> "$RESULTS"
  echo
}

for slug in "${PACKS[@]}"; do run_pack "$slug"; done

echo
printf '%-20s %-12s %7s  %-9s %-11s %-12s %-8s %s\n' slug status "build s" price frames videos markets title
printf '%-20s %-12s %7s  %-9s %-11s %-12s %-8s %s\n' -------------------- ------------ ------- --------- ----------- ------------ -------- -----
FAILS=0
while IFS=$'\t' read -r slug status secs title price frames videos markets launch_id; do
  printf '%-20s %-12s %7s  %-9s %-11s %-12s %-8s %s\n' "$slug" "$status" "$secs" "$price" "$frames" "$videos" "$markets" "${title:0:60}"
  case "$status" in ready|published) ;; *) FAILS=$((FAILS + 1));; esac
done < "$RESULTS"
echo
echo "launch ids:"; cut -f1,9 "$RESULTS" | sed 's/^/  /'
[ "$FAILS" -eq 0 ] && { echo "ALL READY"; exit 0; }
echo "$FAILS pack(s) not ready"; exit 1
