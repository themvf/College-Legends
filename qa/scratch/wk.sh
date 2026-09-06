#!/bin/bash
cd /home/user/College-Legends/qa/scratch
bash send.sh /tmp/cl3 <<'EOF' > /tmp/cl3/last.json
nav Dashboard
wait 600
advance
wait 1500
eval (()=>{const bb=document.querySelector('.booster-backdrop');if(!bb)return 'no-modal';const b=[...bb.querySelectorAll('button')];return 'MODAL:'+b.map(x=>x.innerText.split('\n')[0]).join(',')})()
EOF
python3 - <<'PY'
import json
d=json.load(open('/tmp/cl3/last.json'))
for r in d['results']:
    if r['line']=='advance': print('LATENCY_MS',r.get('ms'),'|',(r.get('header') or '').replace('\n',' '))
    elif r.get('value') is not None: print('MODAL?',r['value'])
    elif not r['ok']: print('FAIL',r['line'],str(r.get('error'))[:200])
print('ERRORS',d['errorCount'], d.get('newErrors'))
PY
