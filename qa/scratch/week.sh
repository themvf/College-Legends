#!/bin/bash
# one week: advance, then snapshot the things brief A tracks
cd /home/user/College-Legends/qa/scratch
bash send.sh /tmp/cl3 <<'EOF' | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d['results']:
    if r['line'].startswith('advance'): print('LATENCY_MS', r.get('ms'), '|', (r.get('header') or '').replace(chr(10),' '))
    elif r.get('value') is not None: print(json.dumps(r['value'])[:1400])
    elif r.get('text'): print(r['text'].replace(chr(10),' | ')[:600])
    elif not r['ok']: print('FAIL', r['line'], str(r.get('error'))[:300])
print('ERRORS', d['errorCount'])
"
nav Dashboard
wait 600
advance
wait 1200
eval (()=>{const bb=document.querySelector('.booster-backdrop');if(!bb)return 'no-modal';return 'MODAL: '+bb.innerText.slice(0,300).replace(/\n/g,' | ')})()
EOF
