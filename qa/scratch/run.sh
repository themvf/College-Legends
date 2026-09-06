#!/bin/bash
# advance N weeks, handling the booster modal, recording latency + Theo's row
N=${1:-1}
for i in $(seq 1 $N); do
  bash /home/user/College-Legends/qa/scratch/wk.sh
  # dismiss any modal by taking the local business (safe) then closing
  cd /home/user/College-Legends/qa/scratch
  bash send.sh /tmp/cl3 <<'EOF' > /tmp/cl3/m.json
eval (()=>{const bb=document.querySelector('.booster-backdrop');if(!bb)return 'none';const b=[...bb.querySelectorAll('button')].find(x=>x.innerText.includes('LOCAL BUSINESS'))||[...bb.querySelectorAll('button')][0];b.click();return 'took '+b.innerText.split('\n')[0]})()
wait 2500
eval (()=>{const bb=document.querySelector('.booster-backdrop');if(!bb)return 'none';const t=bb.innerText.split('\n').slice(0,6).join(' | ');const c=[...bb.querySelectorAll('button')].find(x=>/Close/.test(x.innerText));if(c)c.click();return t})()
wait 800
EOF
  python3 - <<'PY'
import json
d=json.load(open('/tmp/cl3/m.json'))
for r in d['results']:
    if r.get('value') and r['value']!='none': print('  BOOSTER',json.dumps(r['value'])[:200])
PY
  bash /home/user/College-Legends/qa/scratch/probe.sh | head -1
done
