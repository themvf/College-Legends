import { useState } from 'react';
import { cash, draftPayout } from './model.js';
export type DraftEntry = {id:string;name:string;position:string;pick:number|null};
export function DraftNight({entries,finish,followUp}:{entries:DraftEntry[];finish:()=>void;followUp?:(id:string)=>void}) {
  const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false);
  const p=entries[index]!;
  return <section className={`as-draft-night ${revealed&&p.pick?'as-draft-selected':''}`} aria-live="polite">
    <p className="as-eyebrow">DRAFT NIGHT · CLIENT {index+1} OF {entries.length}</p>
    <h2>{p.name}</h2><p>{p.position} · From your agency to the next chapter</p>
    {!revealed?<><div className="as-draft-emblem">ON THE CLOCK</div><p>The evaluation is over. A season of waiting comes down to this call.</p><button className="as-primary" onClick={()=>setRevealed(true)}>Reveal {p.name.split(' ')[0]}’s draft result</button></>:<>
      <div className="as-draft-emblem">{p.pick?'DRAFTED':'THE CALL HASN’T COME'}</div>
      {p.pick?<><strong className="as-draft-pick">Round {Math.ceil(p.pick/32)} · Pick {p.pick} overall</strong><p>“We did it. I’m going pro.”</p><div className="as-draft-payout">+{cash(draftPayout(p.pick))}<small>Agency draft payout · already deposited</small></div></>:<><h3>No selection this time</h3><p>“I still want my shot. What’s our next move?”</p></>}
      <p>{p.pick?'Next: follow contract and roster decisions. The professional career is just starting.':'Next: open Pro Preparation to arrange team outreach before offers arrive.'}</p>
      {!p.pick&&followUp&&<button className="as-primary" onClick={()=>followUp(p.id)}>Arrange team outreach</button>}
      <button className="as-primary" onClick={()=>{if(index+1<entries.length){setIndex(index+1);setRevealed(false);}else finish();}}>{index+1<entries.length?'Next client’s draft result':'See the night’s full results'}</button>
    </>}
  </section>;
}
