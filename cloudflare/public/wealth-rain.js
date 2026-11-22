const hash=n=>{const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value)};
const clamp=x=>Math.max(0,Math.min(1,x));
export function wealthRainPose(index,t,reduced=false){
 const lane=index%9,layer=Math.floor(index/9);
 const speed=215+hash(lane+33)*115,span=1270;
 const phase=(hash(lane*23+19)*span+layer*span/2+(reduced?0:t*speed))%span;
 const w=58+hash(index*13+2)*23;
 const clock=reduced?0:t;
 return {x:500+lane*115+Math.sin(clock*.72+index)*13,y:-100+phase,w,h:w*1.38,
   angle:Math.sin(clock*.92+index)*.075,alpha:.85,speed,pass:Math.floor((hash(lane*23+19)*span+layer*span/2+clock*speed)/span)};
}
export function selectRainPacket(entry,reduced=false){
 let chosen=0,best=Infinity;
 for(let i=0;i<18;i++){
  const p=wealthRainPose(i,entry.scanEndMs/1000,reduced),score=Math.hypot(p.x-960,p.y-565);
  if(score<best){best=score;chosen=i}
 }
 return chosen;
}
export function selectedRainPose(entry,t,reduced=false){
 const slot=selectRainPacket(entry,reduced),start=entry.scanEndMs/1000;
 const anchor=wealthRainPose(slot,start,reduced),age=Math.max(0,t-start);
 const p=clamp(age/2.7),focus=p*p*(3-2*p);
 return {slot,focus,x:anchor.x+(960-anchor.x)*focus,
  y:anchor.y+(600-anchor.y)*focus+(reduced?0:anchor.speed*.12*(1-Math.exp(-age*7))*(1-focus)),
  w:anchor.w+(293-anchor.w)*focus,angle:anchor.angle*(1-focus)};
}
