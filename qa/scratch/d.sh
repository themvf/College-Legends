#!/bin/bash
# d.sh <<'EOF' ... DSL lines ... EOF   — sends a batch to the driver, prints the result
ROOT=/tmp/cl-driver
N=$(printf "%04d" $(( $(ls $ROOT/cmds 2>/dev/null | wc -l) + 1 )))
cat > "$ROOT/cmds/$N.txt"
for i in $(seq 1 2400); do
  [ -f "$ROOT/out/$N.json" ] && break
  sleep 0.25
done
if [ -f "$ROOT/out/$N.json" ]; then cat "$ROOT/out/$N.json"; else echo "TIMEOUT batch $N"; fi
