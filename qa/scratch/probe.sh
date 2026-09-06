#!/bin/bash
cd /home/user/College-Legends/qa/scratch
bash send.sh /tmp/cl3 <<'EOF' > /tmp/cl3/p.json
nav Recruiting
wait 1800
eval (()=>{const r=[...document.querySelectorAll('.prospect-summary')].find(x=>x.innerText.includes('Theo Wright'));return r?r.innerText.replace(/\n/g,' | '):'NOT ON BOARD'})()
eval document.querySelector('.war-room-ledger').innerText.replace(/\n/g,' | ')
eval document.querySelector('.dashboard-header')?.innerText.replace(/\n/g,' ').slice(0,140)
EOF
python3 - <<'PY'
import json
d=json.load(open('/tmp/cl3/p.json'))
for r in d['results']:
    if r.get('value') is not None: print(r['value'])
    elif not r['ok']: print('FAIL',r['line'],str(r.get('error'))[:200])
print('ERRORS',d['errorCount'])
PY
