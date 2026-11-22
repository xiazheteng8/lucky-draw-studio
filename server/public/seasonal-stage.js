import {drawPrizeCover} from './prize-cover.js?v=20261120-prize-cover1';
import {activityLogo,candidateMessage} from './stage-ui.js?v=20261120-stage-finale';
import {drawTinyAvatarParticle} from './spring-avatar-particles.js?v=20261122-replay10';
import {wealthRainPose,selectRainPacket,selectedRainPose} from './wealth-rain.js?v=20261120-stage-finale';
import {pickQuip} from './stage-quips.js';
import {drawThemeReveal} from './theme-reveal.js?v=20261120-stage3';
import {drawStageBackdrop} from './stage-ornaments.js?v=20261120-stage3';
import {drawThemeFrame} from './theme-frames.js?v=20261120-stage3';
import {drawAward,drawPodium,drawWaitingCenter,drawAttendance,allowsSignup,drawWaitingPrizes,drawCountdown,drawDrawPlan} from './ceremony.js?v=20261122-replay10';
import {buildDrawTimeline,candidatePeople} from './draw-timeline.js?v=20261122-replay10';
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const hash=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
function text(c,value,x,y,size=28,color='#8c111e',align='center',max=1600){c.font=`${size>=44?'700':'600'} ${size}px ${size===39?'KaiTi,STKaiti,serif':'"Microsoft YaHei",sans-serif'}`;c.fillStyle=color;c.textAlign=align;c.fillText(String(value??''),x,y,max)}
function panel(c,x,y,w,h,title){c.save();c.shadowColor='#77152244';c.shadowBlur=18;c.shadowOffsetY=5;const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#fffdf1');g.addColorStop(1,'#ffe3bf');c.fillStyle=g;c.beginPath();c.roundRect(x,y,w,h,28);c.fill();c.shadowBlur=0;c.strokeStyle='#fff9df';c.lineWidth=7;c.stroke();c.strokeStyle='#eeb779';c.lineWidth=2;c.stroke();c.fillStyle='#be1724';c.beginPath();c.roundRect(x+9,y+10,w-18,68,[23,23,0,0]);c.fill();text(c,title,x+w/2,y+53,25,'#fff4d8','center',w-92);c.beginPath();c.roundRect(x,y,w,h,28);c.clip();c.strokeStyle='#e5b77a';for(let i=0;i<3;i++){c.beginPath();c.arc(x+w-15,y+h+9,32+i*14,Math.PI,TAU);c.stroke()}drawThemeFrame(c,x,y,w,h);c.restore()}
function imageFit(c,image,x,y,w,h){if(!image)return;const ratio=Math.min(w/image.width,h/image.height);c.drawImage(image,x+(w-image.width*ratio)/2,y+(h-image.height*ratio)/2,image.width*ratio,image.height*ratio)}
function prizeFor(stage,index=0){const p=stage.data.presentation||{};return p.prizes?.[index]||{name:p.prizeName||'',image:p.prizeImage||''}}
function eventOverlay(stage){if(!allowsSignup(stage.data))return;const c=stage.ctx,events=(stage.interaction?.events||[]).filter(event=>event.kind==='message'),now=stage.replayClock??Date.now();for(const event of events.slice(-18)){const age=(now-event.created)/1000;if(age<0||age>9)continue;c.save();c.globalAlpha=clamp((9-age)/2);if(event.kind==='like'){const x=150+hash(Number(event.id)||0)*1620+Math.sin(age*2)*25,y=1030-age*90;text(c,'♥',x,y,34,'#f54867')}else{const x=1920-age*260,y=290+(Number(event.id)%3)*65;const label=(event.name||'现场观众')+'：'+event.text;
    c.font='700 24px "Microsoft YaHei","PingFang SC",sans-serif';
    c.textAlign='left';
    c.textBaseline='middle';
    const width=Math.min(760,Math.ceil(c.measureText(label).width));
    c.fillStyle='#fff6df';
    c.beginPath();
    c.roundRect(x-20,y-26,width+40,52,26);
    c.fill();
    c.fillStyle='#941524';
    c.fillText(label,x,y,760)}c.restore()}}
function winners(stage,x,y,w,h){const c=stage.ctx,list=stage.data.winners||[];panel(c,x,y,w,h,'🏆 幸运名单');if(!list.length){text(c,'幸运即将揭晓',x+w/2,y+160,28,'#ad7e60');return}const page=Math.floor(performance.now()/10000)%Math.max(1,Math.ceil(list.length/5));list.slice(page*5,page*5+5).forEach((person,i)=>{const yy=y+116+i*66;stage.avatar(person,x+52,yy-8,23);text(c,stage.label(person),x+91,yy,23,'#8c111e','left',w-180);text(c,stage.rankName(page*5+i),x+w-28,yy,22,'#a16a28','right',160)})}
function waiting(stage){const c=stage.ctx,d=stage.data,p=prizeFor(stage),participants=d.stats?.eligible??0;panel(c,40,330,430,590,'▦ 活动概览');[['奖项数量',d.plannedWinnerCount||1],['参与人数',participants],['已抽取',0],['剩余轮次',d.plannedWinnerCount||1]].forEach(([label,value],i)=>{const y=480+i*100;text(c,label,90,y,28,'#6e2726','left');text(c,value,420,y,40,'#ad101c','right');c.strokeStyle='#e5bba0';c.beginPath();c.moveTo(80,y+28);c.lineTo(430,y+28);c.stroke()});panel(c,495,330,720,650,'准备迎接幸运');(allowsSignup(d)?drawWaitingCenter:drawWaitingPrizes)(stage,(stage.currentElapsed||0)/1000,{x:495,y:330,w:720,h:650});if(!allowsSignup(d)){panel(c,1250,330,630,330,'奖品详情');drawDrawPlan(stage,{x:1250,y:330,w:630,h:330});panel(c,1250,690,630,290,d.scheduledAt?'开奖倒计时':'等待开奖');drawCountdown(stage,{x:1250,y:690,w:630,h:290});return}winners(stage,1250,330,630,330);panel(c,1250,690,630,290,'活动说明 · 扫码互动');drawAttendance(stage,(stage.currentElapsed||0)/1000,{x:1250,y:690,w:630,h:290})}

function winnerAvatar(stage, person, x, y, radius) {
  const c = stage.ctx;
  stage.avatar(person, x, y, radius, false);
  const gold = c.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  gold.addColorStop(0, '#fff3c8');
  gold.addColorStop(.52, '#d6a34f');
  gold.addColorStop(1, '#875421');

  c.save();
  c.strokeStyle = gold;
  c.lineWidth = Math.max(3, radius * .07);
  c.beginPath();
  c.arc(x, y, radius + c.lineWidth, 0, TAU);
  c.stroke();
  c.restore();
}

function springReveal(stage,state,people,elapsed,cy,candidates=people){
 const c=stage.ctx,entry=state.entry,cx=960,t=elapsed/1000;
 const focused=Boolean(entry&&state.phase!=='search');
 const focus=focused?ease((elapsed-entry.scanEndMs)/3000):0;
 const reveal=focused&&entry.winning&&(state.phase==='prompt'||state.confirmed);
 const burst=reveal?clamp((elapsed-entry.moveEndMs)/950):0;
 c.save();
 const particles=Array.from({length:56},(_,i)=>{const seed=(entry?.cycle||0)*101+i,theta=hash(seed*13+5)*TAU+(stage.reduced?0:t*(.95+hash(seed)*1.35));return {i,seed,theta,depth:(Math.sin(theta+seed*.13)+1)/2}}).sort((a,b)=>a.depth-b.depth);
 for(const particle of particles){const {i,seed,theta,depth}=particle;
   const base=80+hash(seed*29+7)*240;
   const radius=base*(1-focus*.72)+burst*(90+hash(seed*5)*245);
   const x=cx+Math.cos(theta)*radius,y=cy+Math.sin(theta)*radius*.58;
   const size=2+Math.pow(depth,3)*22;
   c.globalAlpha=(.3+depth*.66)*(1-burst*.6);
   c.fillStyle=i%3===0?'#fff4ca':i%3===1?'#ffc467':'#ff8b42';
   if(candidates.length)drawTinyAvatarParticle(stage,candidates[(i+Math.floor(t*1.8)*31)%candidates.length],x,y,size);else{c.beginPath();c.moveTo(x,y-size);c.lineTo(x+size*.6,y);c.lineTo(x,y+size);c.lineTo(x-size*.6,y);c.closePath();c.fill()}
 }
 c.restore();
 if(!focused){
   text(c,'✦',cx,cy+27,76,'#ffe6a5');
   text(c,'好运正在聚集',cx,cy+95,27,'#ffe4a5');
   return;
 }
 const person=people[entry.focusIndex];
 if(!person)return;
 const x=cx+(1-focus)*210,y=cy-(1-focus)*72,r=32+focus*65;
 if (reveal) winnerAvatar(stage, person, x, y, r);
 else stage.avatar(person, x, y, r, true);
 if(focus>.78){
   const caption=reveal?stage.rankName(entry.rankIndex):state.phase==='rejection'?'新春祝福 · 感谢参与':'好运即将揭晓';
   c.fillStyle='#760f20';c.beginPath();c.roundRect(cx-275,cy+120,550,105,20);c.fill();
   c.strokeStyle='#f0bf77';c.lineWidth=2;c.stroke();
   text(c,stage.label(person),cx,cy+159,32,'#fff6df','center',500);
   text(c,caption,cx,cy+199,26,'#ffe3a0','center',500);
 }
}

// Original canvas artwork: lacquer envelope, embossed rim, cloud scrolls and coin seal.
function wealthPacket(c,x,y,w,h,{angle=0,open=0,alpha=1,seal='福',glow=false,stage=null,person=null}={}){
 c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;
 if(glow){c.shadowColor='#ffc35b';c.shadowBlur=30}
 const red=c.createLinearGradient(-w/2,-h/2,w/2,h/2);red.addColorStop(0,'#f35a3a');red.addColorStop(.28,'#d92929');red.addColorStop(.7,'#ac1425');red.addColorStop(1,'#6e1021');
 c.fillStyle=red;c.beginPath();c.roundRect(-w/2,-h/2,w,h,w*.085);c.fill();c.shadowBlur=0;const sheen=c.createLinearGradient(-w/2,0,w/2,0);sheen.addColorStop(0,'#fff3d836');sheen.addColorStop(.1,'#fff3d80a');sheen.addColorStop(.55,'#ffffff00');sheen.addColorStop(1,'#31051144');c.fillStyle=sheen;c.fill();
 c.save();c.beginPath();c.roundRect(-w/2,-h/2,w,h,w*.085);c.clip();c.strokeStyle='#ffdc8d22';c.lineWidth=Math.max(1,w*.007);
 for(let j=0;j<5;j++){const yy=h*.02+j*h*.17;c.beginPath();c.arc(-w*.48,yy,w*.31,Math.PI,TAU);c.arc(-w*.05,yy,w*.17,Math.PI,TAU);c.arc(w*.33,yy,w*.22,Math.PI,TAU);c.stroke()}c.restore();
 const gold=c.createLinearGradient(-w/2,-h/2,w/2,h/2);gold.addColorStop(0,'#fff2ba');gold.addColorStop(.4,'#d9993a');gold.addColorStop(.7,'#ffe7a0');gold.addColorStop(1,'#bd7227');c.strokeStyle=gold;c.lineWidth=w*.022;c.beginPath();c.roundRect(-w*.46,-h*.47,w*.92,h*.94,w*.065);c.stroke();
 c.lineWidth=w*.006;c.beginPath();c.roundRect(-w*.42,-h*.44,w*.84,h*.88,w*.045);c.stroke();
 // Gold inner card rises out of the envelope when the seal opens.
 if(open>0){c.save();c.translate(0,-h*.08-open*h*.15);const inner=c.createLinearGradient(0,-h*.4,0,h*.3);inner.addColorStop(0,'#fff7d7');inner.addColorStop(.55,'#ffe9a8');inner.addColorStop(1,'#dfae5c');c.fillStyle=inner;c.beginPath();c.roundRect(-w*.37,-h*.27,w*.74,h*.62,w*.05);c.fill();c.strokeStyle='#b77c32';c.lineWidth=w*.008;c.stroke();c.restore()}
 c.fillStyle='#a91324';c.beginPath();c.moveTo(-w*.46,-h*.44);c.lineTo(0,-h*.05-open*h*.36);c.lineTo(w*.46,-h*.44);c.closePath();c.fill();c.strokeStyle=gold;c.lineWidth=w*.012;c.stroke();
 c.fillStyle=red;c.beginPath();c.moveTo(-w*.46,-h*.08);c.quadraticCurveTo(0,h*.15,w*.46,-h*.08);c.lineTo(w*.46,h*.43);c.quadraticCurveTo(0,h*.51,-w*.46,h*.43);c.closePath();c.fill();c.strokeStyle=gold;c.lineWidth=w*.012;c.stroke();
 if(open<.8&&!(stage&&person)){c.save();c.globalAlpha*=1-open;const r=w*.16;c.fillStyle=gold;c.beginPath();c.arc(0,-h*.02,r,0,TAU);c.fill();c.strokeStyle='#8d231c';c.lineWidth=w*.012;c.beginPath();c.arc(0,-h*.02,r*.78,0,TAU);c.stroke();c.fillStyle='#971b22';c.font='700 '+w*.21+'px KaiTi,STKaiti,serif';c.textAlign='center';c.textBaseline='middle';c.fillText(seal,0,-h*.01);c.restore()}
 if(stage&&person&&open<.8){c.save();c.globalAlpha*=1-open;stage.avatar(person,0,h*.08,w*.24);c.strokeStyle=gold;c.lineWidth=w*.025;c.beginPath();c.arc(0,h*.08,w*.25,0,TAU);c.stroke();c.restore()}
 c.fillStyle='#f7d58c';c.font='600 '+w*.075+'px "Microsoft YaHei",sans-serif';c.textAlign='center';c.fillText('招 财 纳 福',0,h*.35);c.restore()
}
function wealthBlessing(stage,value){const c=stage.ctx;c.save();c.shadowBlur=0;c.fillStyle='#58101f';c.strokeStyle='#eec782';c.lineWidth=2;c.beginPath();c.roundRect(490,797,940,57,18);c.fill();c.stroke();text(c,value,960,834,25,'#fff6db','center',895);c.restore()}
let rainArtwork;
function drawRain(stage,t,people,focusSlot=-1,focus=0){
 const c=stage.ctx;
 if(!rainArtwork){
  rainArtwork=document.createElement('canvas');rainArtwork.width=120;rainArtwork.height=155;
  const brush=rainArtwork.getContext('2d');brush.translate(60,77);
  wealthPacket(brush,0,0,101,136);
 }
 for(let i=0;i<18;i++){
  if(i===focusSlot)continue;
  const p=wealthRainPose(i,t,stage.reduced);
  c.save();c.globalAlpha=p.alpha*(1-focus*.72);c.translate(p.x,p.y);c.rotate(p.angle);
  c.drawImage(rainArtwork,-p.w*.595,-p.h*.57,p.w*1.19,p.h*1.14);
  if(people.length)stage.avatar(people[(i+p.pass*19)%people.length],0,p.h*.06,p.w*.22);
  c.restore();
 }
}
function wealthReveal(stage,state,people,elapsed,candidates=people){
 const c=stage.ctx,entry=state.entry,t=elapsed/1000,cx=960,cy=565,focused=entry&&state.phase!=='search',focus=focused?ease((elapsed-entry.scanEndMs)/2700):0;
 const opening=focused&&['prompt','rejection'].includes(state.phase)?ease((elapsed-entry.moveEndMs)/800):0,winning=Boolean(entry?.winning&&opening>0);
 c.save();const aura=c.createRadialGradient(cx,cy,20,cx,cy,430);aura.addColorStop(0,'#ffcb6738');aura.addColorStop(.65,'#ffb84b10');aura.addColorStop(1,'#ffcc6600');c.fillStyle=aura;c.fillRect(500,320,920,580);
 // Broad, staggered curtains instead of a dense wall of tiny rectangles.
 drawRain(stage,t,candidates,focused?selectRainPacket(entry,stage.reduced):-1,focus);
 // Fine gold dust follows a slow spiral, then fans outward with the opening.
 for(let i=0;i<38;i++){const theta=hash(i*31)*TAU+(stage.reduced?0:t*.16),r=110+hash(i*29)*235+opening*90,x=cx+Math.cos(theta)*r,y=cy+Math.sin(theta)*r*.65,s=1+hash(i*41)*3;c.globalAlpha=(.25+hash(i)*.6)*(focused?.7:1);c.fillStyle=i%3?'#ffd179':'#fff5cf';c.beginPath();c.arc(x,y,s,0,TAU);c.fill()}c.globalAlpha=1;
 if(!focused){c.restore();return}
 const person=people[entry.focusIndex];if(!person){c.restore();return}
 const selected=selectedRainPose(entry,t,stage.reduced),packetX=selected.x,y=selected.y-opening*15,w=selected.w,h=w*1.34;
 // The revealed portrait is framed above the open pocket, with a single readable nameplate.
 wealthPacket(c,packetX,y,w,h,{angle:selected.angle,open:opening,seal:'财',glow:true,stage,person});
 if(opening>.08){c.save();c.globalAlpha=opening;const py=y-76-opening*38,r=56+opening*13;winnerAvatar(stage,person,cx,py,r);c.restore()}
 if(focus>.7){
  const caption=opening>.35?stage.label(person):'好运即将揭晓';
  c.save();c.fillStyle='#64101bea';c.strokeStyle='#ffe5a2';c.lineWidth=2;
  c.beginPath();c.roundRect(760,690,400,50,14);c.fill();c.stroke();
  text(c,caption,960,724,29,'#fff7e0','center',375);c.restore();
 }
 if(winning){c.save();c.globalAlpha=opening*.8;for(let i=0;i<12;i++){const a=i*TAU/12,r=130+opening*115;c.strokeStyle='#ffda8c';c.lineWidth=2;c.beginPath();c.moveTo(cx+Math.cos(a)*r,cy-55+Math.sin(a)*r*.7);c.lineTo(cx+Math.cos(a)*(r+15),cy-55+Math.sin(a)*(r+15)*.7);c.stroke()}c.restore()}
 c.restore()
}

export function renderSeasonal(stage,elapsed=0,forceFinal=false){
 const c=stage.ctx,d=stage.data,wealth=stage.skin().id==='caishen',animation=document.documentElement.dataset.themeAnimation||d.presentation?.animation||'festival-snow',gala=animation==='festival-gala',t=elapsed/1000;
 c.globalAlpha=1;stage.isComment=!['custom','wechat'].includes(d.sourceMode);c.setTransform(1,0,0,1,0,0);c.fillStyle='#5c0a17';c.fillRect(0,0,stage.canvas.width,stage.canvas.height);const scale=Math.min(stage.canvas.width/1920,stage.canvas.height/1080);c.setTransform(scale,0,0,scale,(stage.canvas.width-1920*scale)/2,(stage.canvas.height-1080*scale)/2);
 const artwork=stage.images.get('/themes/theme-art-'+(wealth?'caishen':gala?'festival-gala':'festival-snow')+'.png');if(wealth)drawStageBackdrop(stage);else if(artwork)c.drawImage(artwork,0,0,1920,1080);
 const state=d.status==='drawn'?stage.timing(elapsed):{phase:'waiting',final:false,confirmed:false};if(forceFinal)state.final=true;
 activityLogo(stage);
 if(!wealth&&d.status==='drawn'&&!state.final){
   const curtain=c.createLinearGradient(0,320,0,950);
   curtain.addColorStop(0,'#720d2244');curtain.addColorStop(.12,'#710d21');curtain.addColorStop(.85,'#570b1b');curtain.addColorStop(1,'#570b1b00');
   c.fillStyle=curtain;c.fillRect(0,320,1920,630);
 }
 if(!state.final){
  const heading=d.presentation?.organizer||(wealth?'财神送福 · 红包纳财':'新春幸运抽奖');
  text(c,heading,960,wealth?210:180,58,'#ffe4a2','center',1300);
  const y=wealth?258:220;
  c.fillStyle='#851626';c.beginPath();c.roundRect(605,y,710,57,14);c.fill();
  c.strokeStyle='#f3c773';c.lineWidth=2;c.stroke();
  text(c,(d.title||'抽奖活动')+' · 现场抽奖',960,y+38,27,'#fff7e6','center',670);
 }
 if(wealth){const character='/themes/character-caishen-v1.webp';if(!stage.images.has(character))void stage.image(character);imageFit(c,stage.images.get(character),1680,825,170,205)}
 if(d.status!=='drawn'){if(wealth)drawRain(stage,t,d.eligibleComments||[]);waiting(stage);eventOverlay(stage);return {...state,phase:'waiting',final:false}}
 if(wealth&&!state.final)drawThemeReveal(stage,t,state);if(state.final){drawPodium(stage,t,forceFinal);eventOverlay(stage);return {...state,phase:'winner',final:true}}

 const rank=state.entry?.rankIndex??state.index??0,p=prizeFor(stage,rank),left=gala?430:70,right=gala?1200:1450,panelW=gala?290:400,panelH=gala?330:wealth?360:400,top=gala?390:wealth?410:350;panel(c,left,top,panelW,panelH,'🎁 本轮奖品');drawPrizeCover(c,stage.images.get(p.image),left+45,top+90,panelW-90,gala?135:195);if(p.name)text(c,p.name,left+panelW/2,top+(p.image?panelH-45:panelH*.6),gala?23:27,'#9b1420','center',panelW-36);else if(!p.image){drawAward(stage,rank,left+panelW/2,top+panelH*.52,84);text(c,stage.rankName(rank),left+panelW/2,top+panelH-44,27,'#9b1420','center',panelW-36)}panel(c,right,top,panelW,panelH,'本轮参与');text(c,state.entry?.candidateIndices?.length??d.stats?.eligible??0,right+panelW/2,top+155,gala?48:62);text(c,'本轮奖项',right+panelW/2,top+225,27);text(c,d.plannedWinnerCount||1,right+panelW/2,top+panelH-35,gala?42:54);
 const timeline=buildDrawTimeline(d),people=timeline.people,entry=state.entry,candidates=candidatePeople(timeline,entry),cx=960,cy=wealth?600:gala?582:500,radius=gala?220:265;
 if(!wealth)springReveal(stage,state,people,elapsed,gala?574:540,candidates);
 else wealthReveal(stage,state,people,elapsed,candidates);
 if(entry){
  const blessings=['愿您阖家幸福，万事如意！','愿您新岁平安，喜乐常伴！','愿您福气满满，好运连连！'];
  candidateMessage(stage,state,people[entry.focusIndex],blessings[entry.focusIndex%blessings.length]);
 }
 const waitingText=state.phase==='search'?(wealth?'财神赐福 · 红包正在落下':'金光聚拢 · 好运将至'):state.confirmed?'恭喜中奖':state.phase==='rejection'||state.phase==='prompt'?'本轮未中奖 · 继续寻找好运':'好运正在揭晓';
 c.fillStyle='#971324';c.beginPath();c.roundRect(680,884,560,60,26);c.fill();c.strokeStyle='#efc17c';c.lineWidth=3;c.stroke();text(c,waitingText,960,923,27,'#fff4dc','center',525);
 c.fillStyle='#fff0d6e8';c.beginPath();c.roundRect(555,975,810,64,32);c.fill();text(c,'✓ 准备抽奖     ›     '+(state.confirmed?'✓ 幸运揭晓':'◉ 正在抽奖')+'     ›     公布结果',960,1017,27,'#ad1420');eventOverlay(stage);return {...state,phase:state.confirmed?'winner':'drawing',final:false};
}
