const TAU=Math.PI*2;
export function drawThemeFocus(stage,x,y,r,t){
 const c=stage.ctx,s=stage.skin(),id=s.id,clock=stage.reduced?0:t;c.save();c.translate(x,y);c.lineCap='round';c.strokeStyle=s.accent;c.fillStyle=s.gold;
 const halo=c.createRadialGradient(0,0,r*.78,0,0,r+40);halo.addColorStop(0,s.accent+'00');halo.addColorStop(.7,s.accent+'18');halo.addColorStop(1,s.accent+'00');c.fillStyle=halo;c.beginPath();c.arc(0,0,r+40,0,TAU);c.fill();
 if(id==='deepsea'){
  for(let i=0;i<3;i++){c.strokeStyle=i===0?s.accent:s.line;c.lineWidth=i===0?3:1;c.beginPath();c.arc(0,0,r+i*17,0,TAU);c.stroke()}
  c.save();c.rotate(clock*.48);const light=c.createLinearGradient(r-5,0,r+36,0);light.addColorStop(0,s.accent);light.addColorStop(1,s.gold);c.strokeStyle=light;c.lineWidth=6;c.shadowColor=s.accent;c.shadowBlur=13;c.beginPath();c.arc(0,0,r+18,-.23,.23);c.stroke();c.restore();for(let i=0;i<12;i++){const a=i*TAU/12;c.beginPath();c.moveTo(Math.cos(a)*(r+34),Math.sin(a)*(r+34));c.lineTo(Math.cos(a)*(r+40),Math.sin(a)*(r+40));c.strokeStyle=s.accent+'88';c.lineWidth=1;c.stroke()}
 }else if(id==='cyber'){
  for(let i=0;i<6;i++){const a=i*TAU/6-Math.PI/2;c.strokeStyle=i%2?s.accent:s.gold;c.lineWidth=4;c.beginPath();c.arc(0,0,r+13,a+.08,a+.75);c.stroke();c.save();c.rotate(a);c.strokeStyle=s.accent+'88';c.lineWidth=1;c.strokeRect(r+26,-3,12,6);c.restore()}
  c.save();c.rotate(clock*.18);c.setLineDash([3,10]);c.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6,xx=Math.cos(a)*(r+32),yy=Math.sin(a)*(r+32);i?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.closePath();c.strokeStyle=s.gold;c.lineWidth=1;c.stroke();c.restore();
 }else if(id==='gala'){
  const gold=c.createLinearGradient(-r,-r,r,r);gold.addColorStop(0,'#fff5ce');gold.addColorStop(.48,s.gold);gold.addColorStop(1,'#9d6d2c');c.strokeStyle=gold;c.fillStyle=gold;c.lineWidth=2;
  for(const sign of [-1,1]){c.beginPath();c.ellipse(0,0,r+5,r+14,0,sign<0?Math.PI*.58:-Math.PI*.42,sign<0?Math.PI*1.42:Math.PI*.42,sign<0);c.stroke();for(let i=0;i<8;i++){const a=(sign<0?Math.PI:0)+(i-3.5)*.19;c.save();c.translate(Math.cos(a)*(r+6),Math.sin(a)*(r+14));c.rotate(a+.7);c.beginPath();c.ellipse(0,0,5,11,0,0,TAU);c.fill();c.restore()}}
  c.save();c.rotate(clock*.12);for(let i=0;i<3;i++){c.globalAlpha=.5+Math.sin(clock+i)*.25;const a=i*TAU/3;c.fillRect(Math.cos(a)*(r+29)-2,Math.sin(a)*(r+29)-5,4,10)}c.restore();
 }else if(id==='sakura'){
  for(let i=0;i<7;i++){c.save();c.rotate(i*TAU/7+clock*.1);c.translate(0,-r-7);const petal=c.createLinearGradient(-10,-19,10,13);petal.addColorStop(0,'#fff5f8');petal.addColorStop(.5,'#efabc8');petal.addColorStop(1,s.accent);c.fillStyle=petal;c.beginPath();c.moveTo(0,13);c.bezierCurveTo(-21,-2,-13,-25,0,-16);c.bezierCurveTo(13,-25,21,-2,0,13);c.fill();c.restore()}
  c.beginPath();c.arc(0,0,r-7,0,TAU);c.strokeStyle=s.gold+'aa';c.lineWidth=1;c.stroke();
 }else if(id==='paper'){
  for(let i=0;i<22;i++){const a=i*TAU/22,rr=r+5+Math.sin(i*3.7)*5;c.beginPath();c.ellipse(0,0,rr,rr*.94,Math.sin(clock*.09)*.06,a,a+.23);c.strokeStyle=i%3?s.ink+'bb':s.ink+'55';c.lineWidth=2+(Math.sin(i*1.7)+1)*2;c.stroke()}
  c.fillStyle='#a54436';c.save();c.translate(r*.76,-r*.78);c.rotate(-.08);c.fillRect(-10,-12,20,24);c.strokeStyle='#fff1db';c.lineWidth=1;c.strokeRect(-6,-8,12,16);c.restore();
 }else if(id==='aurora'){
  for(let i=0;i<3;i++){c.save();c.rotate(Math.sin(clock*.25+i)*.3+i*.6);const aurora=c.createLinearGradient(-r,0,r,0);aurora.addColorStop(0,s.accent+'00');aurora.addColorStop(.35,s.accent);aurora.addColorStop(.65,s.gold);aurora.addColorStop(1,s.accent+'00');c.strokeStyle=aurora;c.lineWidth=3+i;c.beginPath();c.ellipse(0,0,r+14+i*8,r*.88+i*10,0,0,TAU);c.stroke();c.restore()}
  for(let i=0;i<6;i++){const a=i*TAU/6+clock*.12;c.save();c.translate(Math.cos(a)*(r+30),Math.sin(a)*(r+30));c.strokeStyle=s.gold;c.lineWidth=1;for(let j=0;j<3;j++){c.rotate(Math.PI/3);c.beginPath();c.moveTo(0,-4);c.lineTo(0,4);c.stroke()}c.restore()}
 }
 c.restore();
}
