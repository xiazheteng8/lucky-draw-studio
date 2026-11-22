// Visual-only choreography. The shared timeline remains the sole result source.
const TAU=Math.PI*2;
export const themeChoreography={deepsea:'sonar',aurora:'polar-ribbons',gala:'spotlight',cyber:'hex-scan',sakura:'petal-vortex',paper:'ink-ripples',caishen:'fortune-coins',festival:'spring-gold'};
export function drawThemeReveal(stage,t,state){
 const skin=stage.skin(),id=skin.id;if(id==='festival'||stage.reduced)return;const c=stage.ctx,locked=state.phase!=='search',intensity=state.confirmed||state.final?1:.45;
 c.save();c.beginPath();c.rect(45,190,1830,775);c.clip();c.globalAlpha=.26*intensity;c.strokeStyle=skin.accent;c.fillStyle=skin.gold;c.lineWidth=2;
 if(id==='deepsea'){
  for(let i=0;i<4;i++){const age=(t*.38+i/4)%1,r=190+age*650;c.globalAlpha=(1-age)*.28*intensity;c.beginPath();c.ellipse(960,565,r,r*.55,0,0,TAU);c.stroke()}
  for(let i=0;i<16;i++){const y=960-(t*24+i*71)%760,x=110+i*113+Math.sin(t*.5+i)*18;c.beginPath();c.arc(x,y,3+i%4,0,TAU);c.stroke()}
 }else if(id==='aurora'){
  for(let i=0;i<4;i++){const x=180+i*440;c.beginPath();c.moveTo(x,950);c.bezierCurveTo(x+210+Math.sin(t*.5+i)*90,740,x-180,390,x+120,205);c.strokeStyle=i%2?skin.gold:skin.accent;c.lineWidth=14+i*8;c.globalAlpha=.07*intensity;c.stroke()}
 }else if(id==='gala'){
  for(let i=0;i<6;i++){const x=110+i*340,tip=960+Math.sin(t*.3+i)*560,g=c.createLinearGradient(x,950,tip,210);g.addColorStop(0,skin.gold+'55');g.addColorStop(1,skin.gold+'00');c.fillStyle=g;c.beginPath();c.moveTo(x-12,950);c.lineTo(tip-100,210);c.lineTo(tip+100,210);c.lineTo(x+12,950);c.closePath();c.fill()}
 }else if(id==='cyber'){
  for(let i=0;i<8;i++){const a=i*TAU/8+t*.12,r=locked?330:390;c.save();c.translate(960+Math.cos(a)*r,565+Math.sin(a)*r*.7);c.rotate(a);c.beginPath();for(let k=0;k<6;k++){const x=Math.cos(k*TAU/6)*22,y=Math.sin(k*TAU/6)*22;k?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.stroke();c.restore()}
  const y=220+(t*85)%710;c.beginPath();c.moveTo(120,y);c.lineTo(1800,y);c.globalAlpha=.12;c.stroke();
 }else if(id==='sakura'){
  for(let i=0;i<26;i++){const a=i*2.4+t*.18,r=300+i%6*58,x=960+Math.cos(a)*r,y=565+Math.sin(a)*r*.57;c.save();c.translate(x,y);c.rotate(a+t*.3);c.fillStyle=i%3?skin.accent:skin.gold;c.beginPath();c.ellipse(0,0,5,11,.4,0,TAU);c.fill();c.restore()}
 }else if(id==='paper'){
  for(let i=0;i<3;i++){c.save();c.translate(960,570);c.rotate(Math.sin(t*.13+i)*.08);c.beginPath();c.ellipse(0,0,330+i*120,155+i*65,0,t*.05+i,t*.05+i+5.4);c.strokeStyle=i%2?skin.line:skin.ink;c.lineWidth=3-i*.6;c.globalAlpha=.1*intensity;c.stroke();c.restore()}
 }else if(id==='caishen'){
  for(let i=0;i<16;i++){const a=i*TAU/16+t*.13,x=960+Math.cos(a)*430,y=610+Math.sin(a)*230;c.save();c.translate(x,y);c.scale(.6+Math.abs(Math.cos(t+i))*.4,1);c.beginPath();c.arc(0,0,10,0,TAU);c.fill();c.fillStyle=skin.bg;c.fillRect(-3,-3,6,6);c.restore()}
 }
 c.restore();
}
