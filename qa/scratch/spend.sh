#!/bin/bash
cd /home/user/College-Legends/qa/scratch
bash send.sh /tmp/cl3 <<'EOF' > /tmp/cl3/s.json
nav Recruiting
wait 1600
eval (async()=>{const out=[];for(let i=0;i<8;i++){const rows=[...document.querySelectorAll('.prospect-summary')].filter(x=>{const s=x.querySelector('.prospect-status').innerText;return s==='Offer out';});if(!rows.length)break;const r=rows[i%rows.length];r.click();await new Promise(z=>setTimeout(z,260));const b=[...document.querySelectorAll('.pursuit-actions button')].find(x=>x.innerText==='Invest 20 RP'&&!x.disabled);if(!b)break;b.click();out.push(r.innerText.split('\n')[1]);await new Promise(z=>setTimeout(z,260));}return out})()
eval document.querySelector('.war-room-ledger').innerText.replace(/\n/g,' | ')
EOF
python3 - <<'PY'
import json
d=json.load(open('/tmp/cl3/s.json'))
for r in d['results']:
    if r.get('value') is not None: print(json.dumps(r['value'])[:600])
print('ERRORS',d['errorCount'])
PY
