#!/bin/bash
# usage: send.sh <root> <<'EOF' ... commands ... EOF
ROOT=${1:-/tmp/cl2}
N=$(ls "$ROOT/cmds" 2>/dev/null | wc -l)
ID=$(printf "%04d" $((N+1)))
TMP=$(mktemp)
cat > "$TMP"
mv "$TMP" "$ROOT/cmds/$ID.txt"
for i in $(seq 1 4000); do
  if [ -f "$ROOT/out/$ID.json" ]; then cat "$ROOT/out/$ID.json"; exit 0; fi
  sleep 0.25
done
echo "TIMEOUT waiting for $ID"
