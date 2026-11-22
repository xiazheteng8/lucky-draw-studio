const width=1920,height=1080;
const streamThemes=new Set(['aurora','cyber']);
const unit=(seed)=>{
 let x=seed|0;
 x=Math.imul(x^(x>>>16),0x45d9f3b);
 x=Math.imul(x^(x>>>16),0x45d9f3b);
 return ((x^(x>>>16))>>>0)/4294967296;
};
const mod=(value,period)=>((value%period)+period)%period;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const ease=(value)=>{
 const x=clamp(value,0,1);
 return x*x*(3-2*x);
};
const orderCache=new WeakMap();

function getOrder(timeline,indices){
 const cacheKey=indices||timeline;
 if(!orderCache.has(cacheKey)){
  const order=indices?[...indices]:timeline.people.map((_,index)=>index);
  for(let i=order.length-1;i>0;i--){
   const j=Math.floor(unit(timeline.seed+i*389)* (i+1));
   [order[i],order[j]]=[order[j],order[i]];
  }
  orderCache.set(cacheKey,order);
 }
 return orderCache.get(cacheKey);
}

function streamPose(seed,time,radius){
 const period=2.45+unit(seed+63)*1.65;
 const step=time/period+unit(seed+27);
 const flight=Math.floor(step);
 const salt=seed+Math.imul(flight,3167);
 const angle=(unit(salt+17)*2)*Math.PI;
 const dx=Math.cos(angle),dy=Math.sin(angle);
 const cx=460+unit(salt+28)*1000,cy=300+unit(salt+39)*510;
 function distance(x,y){
  return Math.min((x>0?width+radius-cx:cx+radius)/Math.max(Math.abs(x),.00001),
                  (y>0?height+radius-cy:cy+radius)/Math.max(Math.abs(y),.00001));
 }
 const back=distance(-dx,-dy),forward=distance(dx,dy);
 const offset=(step-flight)*(forward+back+40)-back-20;
 return {x:cx+dx*offset,y:cy+dy*offset};
}
function bouncePose(seed,time,radius){
 const margin=42+radius;
 const reflect=(value,span)=>span-Math.abs(mod(value,span*2)-span);
 const x=margin+reflect(unit(seed+5)*3200+time*(360+unit(seed+33)*550),width-2*margin);
 const y=margin+reflect(unit(seed+9)*1700+time*(260+unit(seed+59)*460),height-2*margin);
 return {x,y};
}

export function portraitNodes(timeline,state,t,theme,reduced){
 const entry=state.entry,order=getOrder(timeline,entry?.candidateIndices);
 const count=Math.min(order.length,56);
 if(!entry||!count)return [];
 const stream=streamThemes.has(theme)&&!reduced;
 const pose=stream?streamPose:bouncePose;
 const clock=reduced?0:t;
 const radius=order.length<=12?34:25;
 const locked=state.phase!=='search',lockTime=entry.scanEndMs/1000;
 const focusSlot=Math.floor(unit(timeline.seed+entry.startMs+6187)*count);
 const arrange=(slot,at,forceFocus)=>{
  const salt=timeline.seed+slot*7919;
  const refresh=at/.84+slot/count;
  const batch=Math.floor(refresh),progress=refresh-batch;
  const index=order[mod(batch*count+slot,order.length)];
  return {index:forceFocus?entry.focusIndex:index,alpha:order.length>count
   ? .25+.75*Math.min(1,progress*9,(1-progress)*9):1,salt};
 };
 let nodes=Array.from({length:count},(_,slot)=>{
  const row=arrange(slot,clock,false);
  const depth=(Math.sin(clock*.6+row.salt*.001)+1)/2;
  return {...row,...pose(row.salt,clock,radius),r:radius*(.65+depth*.85),alpha:row.alpha*(.45+depth*.55)};
 });
 // Reserve the portrait only as the lock starts; the scanning radar never targets it early.
 if(locked){
  const existing=nodes.findIndex(node=>node.index===entry.focusIndex);
  const slot=existing<0?focusSlot:existing;
  const salt=timeline.seed+slot*7919;
  // Derive the lock location from the roster at the transition, independently of frame rate.
  const atLock=Array.from({length:count},(_,i)=>arrange(i,reduced?0:lockTime,false));
  const atLockSlot=atLock.findIndex(row=>row.index===entry.focusIndex);
  const anchor=pose(atLock[atLockSlot<0?focusSlot:atLockSlot].salt,reduced?0:lockTime,radius);
  const x=clamp(anchor.x,125,1795),y=clamp(anchor.y,235,935);
  const progress=state.phase==='lock'?0:ease((t*1000-entry.lockEndMs)/entry.moveMs);
  nodes[slot]={index:entry.focusIndex,salt,alpha:1,active:true,x:x+(960-x)*progress,y:y+(565-y)*progress,
   r:radius+(118-radius)*ease((t-lockTime)/2.3)};
  nodes=nodes.filter((node,i)=>i===slot||node.index!==entry.focusIndex);
 }
 return nodes.sort((a,b)=>a.r-b.r).map(node=>({...node,p:timeline.people[node.index]}));
}
