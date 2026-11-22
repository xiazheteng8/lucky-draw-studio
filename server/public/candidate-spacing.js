// Presentation only: eligibility, focus selection and timing are never changed.
export function spaceCandidates(stage,nodes,state,t){
 const focus=nodes.find(n=>n.tracked);if(!focus)return nodes;
 const limit=72,stride=Math.max(1,Math.ceil(nodes.length/limit));
 const visible=nodes.filter((n,i)=>i%stride===0||n===focus).map(n=>({...n}));
 let cache=stage.candidateSpacing;
 if(!cache||t<cache.time||t-cache.time>1)cache=stage.candidateSpacing={time:t,positions:new Map(),lock:null};
 const dt=Math.max(.001,Math.min(.05,t-cache.time)),key=n=>n.p.author_channel_id||n.p.id||n.p.name;
 const active=visible.find(n=>n.tracked&&n.active),entryKey=state.entry?.startMs;
 if(active&&cache.lock?.entry!==entryKey){const prior=cache.positions.get(key(active));cache.lock={entry:entryKey,dx:prior?prior.x-active.x:0,dy:prior?prior.y-active.y:0}}
 if(active&&cache.lock){const p=Math.max(0,Math.min(1,(t*1000-state.entry.scanEndMs)/3000)),fade=1-p*p*(3-2*p);active.x+=cache.lock.dx*fade;active.y+=cache.lock.dy*fade}
 if(active){active.x=Math.max(85+active.r,Math.min(1835-active.r,active.x));active.y=Math.max(215+active.r,Math.min(940-active.r,active.y))}
 for(const n of visible){if(n===active)continue;const old=cache.positions.get(key(n));n.r=Math.max(18,Math.min(30,n.r));if(old){const amount=Math.min(1-Math.exp(-dt*7),dt*700/Math.max(1,Math.hypot(n.x-old.x,n.y-old.y)));n.x=old.x+(n.x-old.x)*amount;n.y=old.y+(n.y-old.y)*amount}}
 // Project the moving portrait discs apart; the locked portrait is immovable.
 for(let pass=0;pass<48;pass++){
  let collision=false;
  for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
   const a=visible[i],b=visible[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r+(a===active||b===active?14+16*Math.max(0,Math.min(1,(t*1000-state.entry.scanEndMs)/3000)):14);if(d>=min-.05)continue;collision=true;
   const ux=d>.001?dx/d:Math.cos((i+j)*2.4),uy=d>.001?dy/d:Math.sin((i+j)*2.4),push=min-d+.05;
   if(a===active){b.x+=ux*push;b.y+=uy*push}else if(b===active){a.x-=ux*push;a.y-=uy*push}else{a.x-=ux*push/2;a.y-=uy*push/2;b.x+=ux*push/2;b.y+=uy*push/2}
  }
  for(let i=0;i<visible.length;i++){const n=visible[i];if(n===active)continue;const stagger=(i%7)*2;n.x=Math.max(85+n.r,Math.min(1835-n.r,n.x));n.y=Math.max(215+n.r+stagger,Math.min(940-n.r-stagger,n.y))}
  if(!collision)break;
 }
 cache.time=t;for(const n of visible)cache.positions.set(key(n),{x:n.x,y:n.y});return visible;
}
