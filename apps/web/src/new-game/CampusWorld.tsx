import type { CSSProperties } from 'react';
import type { Enterprise } from './enterprise.js';
export function CampusWorld({game,paused,onInspect}:{game:Enterprise;paused:boolean;onInspect:(place:string)=>void}){
 const busy=['match','match-report','partner'].includes(game.stage),dusk=game.stage==='match-report',wet=dusk&&game.report.body.includes('rain');
 const crowd=busy?Math.min(76,Math.max(16,Math.round((game.attendance||game.tickets+1200)/50))):0;
 return <section className={`campus-world ${paused?'paused':''} ${dusk?'dusk':''}`} aria-label="Gateway campus">
  <svg viewBox="0 0 1536 1024" role="img" aria-label={`${busy?'Supporters gather around':'Students move through'} Gateway campus. ${game.sponsor?'Partner signage is installed.':''} ${game.premium?'The hospitality terrace is open.':''}`}>
   <defs><symbol id="campus-person" viewBox="0 0 14 26"><ellipse cx="7" cy="25" rx="7" ry="2" fill="#18281f" opacity=".3"/><path d="M4 17v7M9 17v7" stroke="#253337" strokeWidth="3"/><path d="M3 9h8v10H3z" fill="currentColor"/><path d="M2 10v8M12 10v8" stroke="#ca9970" strokeWidth="2"/><path d="M4 2h6v6H4z" fill="#d0a17a"/><path d="M4 1h6v3H4z" fill="#483d31"/></symbol></defs>
   <image href={`${import.meta.env.BASE_URL}new-art/campus.webp`} width="1536" height="1024"/>
   <rect className="evening-wash" width="1536" height="1024" fill="#192c59" opacity={dusk?.27:0}/>
   {dusk&&<g fill="#ffde87" className="ground-lights"><ellipse cx="1010" cy="268" rx="270" ry="145" opacity=".12"/><circle cx="1400" cy="148" r="25" opacity=".5"/><circle cx="720" cy="20" r="26" opacity=".5"/></g>}
   <g aria-hidden="true">{Array.from({length:crowd},(_,i)=><use key={`crowd${i}`} href="#campus-person" x={965+(i%15)*27+Math.floor(i/15)*22} y={83+Math.floor(i/15)*21+(i%15)*5.7} width="12" height="23" style={{color:['#e6d1a0','#345f45','#c27b3a','#ede9d9'][i%4]}}/>)}
   {Array.from({length:busy?14:game.tickets?8:5},(_,i)=><g key={`walk${i}`} className="campus-walker" style={{'--dx':`${i%2?80:-90}px`,'--dy':`${i%2?-47:53}px`,animationDelay:`-${i*1.9}s`,animationDuration:`${12+i%4*3}s`} as CSSProperties}><use href="#campus-person" x={i<7?260+i*39:1180+(i-7)*18} y={i<7?694+i*22:520-(i-7)*12} width="19" height="35" style={{color:['#345d4a','#eee0b6','#a06942'][i%3]}}/></g>)}
   {[0,1,2].map(i=><g key={`run${i}`} className="campus-runner" style={{animationDelay:`-${i*2}s`} as CSSProperties}><use href="#campus-person" x={860+i*26} y={312+i*9} width="17" height="30" style={{color:'#b6632b'}}/></g>)}
   {Array.from({length:10},(_,i)=><rect key={`leaf${i}`} className="campus-leaf" x={160+i*125} y={150+i%3*240} width="7" height="4" fill={i%2?'#c68735':'#e4bb66'} style={{animationDelay:`-${i*2}s`,animationDuration:`${9+i}s`} as CSSProperties}/>)}
   <g className="campus-flag"><path d="M578 210l60 21v30l-60-22z" fill="#d1a850"/><path d="M587 224l22 8" stroke="#34563e" strokeWidth="5"/></g>
   {game.sponsor&&<g><path d="M1100 423l116 30v25l-116-30z" fill="#eee3b9"/><text x="1109" y="439" transform="rotate(14 1109 439)" fill="#274b3c" fontSize="12" fontWeight="bold">NORTHBANK</text></g>}
   {busy&&<g><path d="M240 670l52 16v36l-52-16z" fill="#d4b369"/><path d="M226 672l39-22 48 16-23 20z" fill="#315942"/><path d="M233 675l65 19" stroke="#eedcab" strokeWidth="7"/><circle cx="250" cy="715" r="6" fill="#283835"/><circle cx="286" cy="726" r="6" fill="#283835"/></g>}
   {game.premium&&<g><path d="M1175 487l91-53 124 35-93 56z" fill="#91795b"/><path d="M1193 453v41m69-86v46m105-12v42m-70-20v58" stroke="#d6c797" strokeWidth="5"/><path d="M1180 455l82-65 120 48-88 42z" fill="#e9d9aa"/><path d="M1262 390l32 90-114-25z" fill="#f5e8c7"/>{[0,1,2,3].map(i=><use key={i} href="#campus-person" x={1220+i*25} y={466+i%2*10} width="15" height="27" style={{color:'#294f3f'}}/>)}</g>}
   {wet&&<g className="campus-rain" stroke="#d5e0e1" strokeWidth="2" opacity=".4">{Array.from({length:60},(_,i)=><path key={i} d={`M${i%12*135} ${Math.floor(i/12)*200}l-20 40`}/>)}</g>}
   </g>
  </svg>
  <div className="world-caption"><span className="live-dot"/> {game.stage==='renewals'?'PRESEASON · MONDAY MORNING':dusk?'SATURDAY · AFTER THE WHISTLE':busy?'SATURDAY · THE TOWN IS ARRIVING':'MIDWEEK · BACK TO WORK'}</div>
  <button className="world-pin office-pin" onClick={()=>onInspect('Ticket office')}><span>✉</span> Ticket office</button>
  <button className="world-pin field-pin" onClick={()=>onInspect('Football grounds')}><span>⚑</span> The grounds</button>
  {game.premium&&<button className="world-pin terrace-pin" onClick={()=>onInspect('Hospitality terrace')}>Terrace ↗</button>}
  <div className="world-bottom"><span>GATEWAY STATE <b>THE ARCHERS</b></span><span>{busy?'Game-day activity':'Practice & preparations'}</span></div>
 </section>;
}
