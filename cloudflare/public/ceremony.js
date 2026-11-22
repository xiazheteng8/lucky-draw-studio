import {floatingHeart} from './floating-hearts.js?v=20261121-gifts4';
import {drawPrizeCover} from './prize-cover.js?v=20261120-prize-cover1';
// Canvas-native artwork is shared by the live screen, previews and video exports.
import {buildDrawTimeline} from './draw-timeline.js?v=20261122-replay10';
const TAU=Math.PI*2;
function text(c,value,x,y,size,color,align='center',max=900){c.font=`600 ${size}px "Microsoft YaHei",sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(String(value??''),x,y,max)}
function fit(c,img,x,y,w,h){if(!img)return;const r=Math.min(w/img.width,h/img.height);c.drawImage(img,x+(w-img.width*r)/2,y+(h-img.height*r)/2,img.width*r,img.height*r)}
function metal(c,x,y,size,index){const colors=index===1?['#fff','#d5e0eb','#64768f','#e3edf5']:index===2?['#ffe0bf','#d89c68','#815337','#efbe91']:['#fff5ca','#e7bd59','#97611e','#ffe7a0'];const g=c.createLinearGradient(x-size,y-size,x+size,y+size);colors.forEach((v,i)=>g.addColorStop(i/3,v));return g}
export function drawAward(stage,index,x,y,size=110){
 const c=stage.ctx,p=stage.data.presentation||{},image=stage.images.get(p.prizes?.[index]?.image||(index===0?p.prizeImage:''));
 c.save();if(image){drawPrizeCover(c,image,x-size*.64,y-size*.64,size*1.28,size*1.28);c.restore();return}
 const name=stage.rankName(index),kind=/金|银|铜/.test(name)?'trophy':/冠军|亚军|季军/.test(name)?'medal':/第.+名/.test(name)?'number':p.rankStyle==='medal'?'trophy':p.rankStyle==='podium'?'medal':p.rankStyle==='rank'?'number':'star';
 c.translate(x,y);c.scale(size/110,size/110);c.shadowColor=index===0?'#ffd57b88':'#fff4';c.shadowBlur=20;c.fillStyle=metal(c,0,0,75,index);c.strokeStyle='#fff0c1';c.lineWidth=1.5;
 if(kind==='trophy'){
  c.beginPath();c.moveTo(-34,-48);c.bezierCurveTo(-35,5,-19,18,0,20);c.bezierCurveTo(19,18,35,5,34,-48);c.closePath();c.fill();c.stroke();
  for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*34,-37);c.bezierCurveTo(sign*78,-53,sign*69,10,sign*25,2);c.lineWidth=9;c.strokeStyle=metal(c,0,0,75,index);c.stroke()}
  c.fillRect(-7,16,14,25);c.beginPath();c.roundRect(-32,39,64,12,4);c.fill();c.shadowBlur=0;text(c,index+1,0,-12,27,'#80541f');
 }else if(kind==='medal'){
  c.shadowBlur=0;c.fillStyle='#973446';c.beginPath();c.moveTo(-30,-65);c.lineTo(-4,-65);c.lineTo(24,-4);c.lineTo(-5,8);c.closePath();c.fill();c.fillStyle='#dc5360';c.beginPath();c.moveTo(30,-65);c.lineTo(4,-65);c.lineTo(-24,-4);c.lineTo(5,8);c.closePath();c.fill();c.fillStyle=metal(c,0,0,60,index);c.beginPath();c.arc(0,12,43,0,TAU);c.fill();c.strokeStyle='#fff2bb';c.stroke();c.beginPath();c.arc(0,12,34,0,TAU);c.strokeStyle='#91602e';c.stroke();text(c,index+1,0,27,39,'#80541f');
 }else if(kind==='number'){
  c.font='900 112px Georgia,serif';c.textAlign='center';c.strokeStyle='#764920';c.lineWidth=7;c.strokeText(index+1,0,39);c.fillStyle=metal(c,0,0,80,index);c.fillText(index+1,0,36);c.shadowBlur=0;c.lineWidth=1;c.strokeStyle='#fff3bc';c.strokeText(index+1,-1,35);
 }else{
  c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?24:55;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath();c.fill();c.stroke();c.shadowBlur=0;text(c,index+1,0,13,30,'#80541f');
 }
 // Engraved laurel branches, rather than platform-dependent emoji glyphs.
 c.shadowBlur=0;c.strokeStyle=metal(c,0,0,70,index);c.lineWidth=2;for(const sign of [-1,1]){c.beginPath();c.ellipse(0,10,62,58,0,sign===1?-.2:Math.PI-.2,sign===1?1.45:Math.PI+1.45);c.stroke();for(let i=0;i<5;i++){const a=.1+i*.24,xx=sign*Math.cos(a)*60,yy=10+Math.sin(a)*58;c.save();c.translate(xx,yy);c.rotate(sign*(a+.6));c.fillStyle=metal(c,0,0,18,index);c.beginPath();c.ellipse(0,0,4,10,0,0,TAU);c.fill();c.restore()}}c.restore();
}
export function drawPodium(stage,t,forced=false){
 const c=stage.ctx,d=stage.data,skin=stage.skin(),list=d.winners||[],pages=Math.max(1,Math.ceil(list.length/8)),page=stage.fixedPage?Math.min(stage.page,pages-1):Math.floor(t/14)%pages,start=page*8,items=list.slice(start,start+8);
 const elapsed=Math.max(0,t-buildDrawTimeline(d).durationMs/1000),intro=forced||stage.reduced?1:Math.min(1,elapsed/1.4+.15);
 c.save();
 if(!stage.podiumBlur||stage.podiumBlur.key!==(stage.artTheme||skin.id)){
  const panel=document.createElement('canvas');panel.width=640;panel.height=360;
  const brush=panel.getContext('2d');brush.filter='blur(11px)';
  brush.drawImage(stage.canvas,-8,-8,656,376);brush.filter='none';
  brush.globalCompositeOperation='destination-in';
  const mask=brush.createRadialGradient(320,188,55,320,188,320);
  mask.addColorStop(0,'#fff');mask.addColorStop(.53,'#ffffffdd');mask.addColorStop(1,'#fff0');
  brush.fillStyle=mask;brush.fillRect(0,0,640,360);
  stage.podiumBlur={key:stage.artTheme||skin.id,panel};
 }
 c.drawImage(stage.podiumBlur.panel,0,0,1920,1080);
 c.save();c.strokeStyle='#201019';c.lineWidth=7;c.lineJoin='round';c.textAlign='center';
 c.font='700 51px "Microsoft YaHei",sans-serif';c.strokeText(d.presentation?.organizer||'荣耀加冕 · 幸运此刻',960,245);
 text(c,d.presentation?.organizer||'荣耀加冕 · 幸运此刻',960,245,51,'#fff0c8');c.restore();
 text(c,d.presentation?.prize||'掌声送给每一位闪耀的幸运者',960,292,23,skin.ink);
 c.save();c.globalAlpha=intro;const widths=items.length===1?450:380,positions=items.length>=3?[960,525,1395]:items.length===2?[735,1185]:[960];
 items.slice(0,3).forEach((person,i)=>{const x=positions[i],h=[205,160,125][i],rise=stage.reduced?1:Math.min(1,Math.max(0,intro*1.4-i*.12)),y=800-h*rise,paint=metal(c,x,y,350,i);c.save();c.shadowColor=skin.gold+'55';c.shadowBlur=i===0?32:12;c.fillStyle=paint;c.beginPath();c.moveTo(x-widths/2,y+24);c.lineTo(x-widths/2+22,y);c.lineTo(x+widths/2-22,y);c.lineTo(x+widths/2,y+24);c.lineTo(x+widths/2,800);c.lineTo(x-widths/2,800);c.closePath();c.fill();c.shadowBlur=0;c.strokeStyle='#fff7d5';c.lineWidth=2;c.stroke();c.fillStyle='#36271922';c.fillRect(x-widths/2+15,y+30,widths-30,770-y);stage.avatar(person,x,y-132,64,i===0);drawAward(stage,start+i,x,(y+800)/2-14,56);text(c,stage.rankName(start+i),x,(y+800)/2+39,25,'#553d25','center',widths-30);text(c,stage.label(person),x,y-40,29,skin.ink,'center',widths-32);c.restore()});c.restore();
 items.slice(3).forEach((person,i)=>{const x=275+i*345,y=864;stage.avatar(person,x,y,27);drawAward(stage,start+i+3,x+68,y,40);text(c,stage.label(person),x+110,y-3,20,skin.ink,'left',190);text(c,stage.rankName(start+i+3),x+110,y+25,17,skin.gold,'left',190)});
 text(c,d.finalAnnouncement||'恭喜获奖，愿每一份好运都如约而至',960,966,24,skin.gold);if(pages>1)text(c,`第 ${page+1} / ${pages} 页 · 共 ${list.length} 位`,1790,1005,17,skin.muted,'right');
 if(!stage.reduced){
  for(let i=0;i<76;i++){
   const x=(i*137.51+elapsed*(18+i%7))%1870+25,y=110+((i*93+elapsed*(54+i%23))%880);
   c.save();c.globalAlpha=.35+.4*Math.abs(Math.sin(i*.71+elapsed));c.fillStyle=['#ffd261','#fff2bc','#ff688b','#68e2df','#a590ff'][i%5];
   c.translate(x,y);c.rotate(elapsed*2.1+i);c.fillRect(-4,-8,8,16);c.restore();
  }
  for(const [i,x] of [210,1680,360,1540].entries()){
   const age=(elapsed+i*.74)%3.4;if(age>1.65)continue;
   c.save();c.globalAlpha=(1-age/1.65)*.8;c.strokeStyle=['#ffcb58','#f384ba','#6ff0e0','#d1b9ff'][i];c.lineWidth=3;
   for(let j=0;j<20;j++){const angle=j*Math.PI/10,r=28+age*(88+j%3*11);c.beginPath();c.moveTo(x+Math.cos(angle)*r*.72,335+Math.sin(angle)*r*.72);c.lineTo(x+Math.cos(angle)*r,335+Math.sin(angle)*r);c.stroke()}
   c.restore();
  }
 }
 c.restore();
}
function waitingSkin(stage){const skin=stage.skin();return ['festival','caishen'].includes(skin.id)?{...skin,ink:'#851b23',muted:'#a15d49',accent:'#ae1928',gold:'#a26821',panel:'#fff2d8',line:'#e8bc8c'}:skin}
export function drawWaitingCenter(stage,t,box){const c=stage.ctx,skin=waitingSkin(stage),{x,y,w,h}=box,cx=x+w/2,qr=stage.images.get(stage.interaction?.qr),side=Math.min(310,w*.43,h*.49),qrTop=y+Math.max(112,(h-side-150)/2);if(qr){stage.giftQrBounds={x:cx-side/2-28,y:qrTop-16,w:side+56,h:side+56};c.save();c.shadowColor=skin.accent+'44';c.shadowBlur=25;c.fillStyle='#fff';c.beginPath();c.roundRect(cx-side/2-12,qrTop,side+24,side+24,20);c.fill();c.shadowBlur=0;fit(c,qr,cx-side/2,qrTop+12,side,side);c.restore();text(c,'微信扫码 · 签到参与',cx,qrTop+side+60,25,skin.muted)}else{text(c,stage.interaction?.qrError||stage.interactionError||'签到入口正在准备…',cx,y+250,25,skin.muted,'center',w-60)}text(c,'幸运即将揭晓',cx,y+h-105,44,skin.ink);text(c,'等待主持人开始抽奖',cx,y+h-48,27,skin.accent)}
export function drawAttendance(stage,t,box){
 const c=stage.ctx,skin=waitingSkin(stage),d=stage.interaction||{},now=(d.clock||Date.now())+(d.receivedAt?performance.now()-d.receivedAt:0),people=stage.data.eligibleComments||[],events=(d.events||[]).filter(e=>['like','checkin','signin','join'].includes(e.kind));
 const state=stage.attendanceState||(stage.attendanceState={seen:new Set(),queue:[],head:0,eventSeen:new Set(),events:[],eventHead:0,active:[],lastSpawn:null,lastKey:'',serial:0});
 const personKey=person=>String(person.author_channel_id||person.id||person.name||person.author_name||'');
 if(state.people!==people){const ordered=people.map((person,index)=>({person,index,time:Date.parse(person.published_at||person.publishedAt||person.signedAt||'')}));if(ordered.every(item=>Number.isFinite(item.time)))ordered.sort((a,b)=>a.time-b.time||a.index-b.index);
 for(const {person} of ordered){const key=personKey(person);if(!state.seen.has(key)){state.seen.add(key);state.queue.push(person)}}state.people=people}
 state.heartGroups=state.heartGroups||[];
 for(const event of events){const key=String(event.id||event.created+':'+event.name);if(event.kind!=='like'||now-event.created>=10000||state.eventSeen.has(key))continue;state.eventSeen.add(key);const actor=String(event.viewer||event.userId||event.name||'现场观众'),count=Math.max(1,Math.min(1000,Number(event.count)||1));let group=state.heartActive?.actor===actor&&event.created-state.heartActive.lastCreated<2000?state.heartActive:[...state.heartGroups].reverse().find(item=>item.actor===actor&&event.created-item.lastCreated<2000);if(group){group.count+=count;group.lastCreated=event.created;if(group===state.heartActive)group.started=now}else state.heartGroups.push({actor,name:event.name||'现场观众',count,lastCreated:event.created})}
 state.heartGroups=state.heartGroups.filter(group=>now-group.lastCreated<15000).slice(-30);

 if(state.head>1024){state.queue=state.queue.slice(state.head);state.head=0}if(state.eventHead>128){state.events=state.events.slice(state.eventHead);state.eventHead=0}if(state.eventSeen.size>2000)state.eventSeen=new Set(events.map(event=>String(event.id||event.created+':'+event.name)));

 const {x,y,w,h}=box,split=w*.61,offset=x+split,feedWidth=w-split;const spring=['festival','caishen'].includes(skin.id);text(c,'欢迎参与本次活动',x+28,y+113,w>550?27:23,skin.ink,'left',split-40);text(c,'扫码签到，爱心和留言上大屏',x+28,y+150,w>550?23:19,skin.muted,'left',split-40);text(c,spring?'祝您好运，新岁皆如愿':'祝您好运，幸运即将揭晓',x+28,y+187,w>550?23:19,skin.muted,'left',split-40);text(c,'♥ '+(d.likes||0),x+28,y+h-27,22,'#f52255','left',split-40);c.save();c.beginPath();c.rect(offset,y+84,feedWidth-12,h-96);c.clip();
 // A shared lane keeps the full 36px portrait and 20px name clear of the next item.
 const interval=900,rowGap=44,speed=rowGap/(interval/1000),lifetime=Math.max(0,(h-80)/speed);
 state.retention=Math.min(90,Math.max(lifetime,state.retention||0));state.active=state.active.filter(item=>now-item.created<state.retention*1000);
 if(state.lastSpawn===null||now-state.lastSpawn>=interval){let person;if(state.head<state.queue.length)person=state.queue[state.head++];else if(people.length){const pool=people.length>1?people.filter(person=>personKey(person)!==state.lastKey):people;person=pool[Math.floor(Math.random()*pool.length)]}if(person){state.active.push({person,created:now,seed:++state.serial*17+5});state.lastKey=personKey(person);state.lastSpawn=now}}

 const feed=state.active.map(item=>({...item,age:(now-item.created)/1000}));
 if(!feed.length)text(c,'静候签到',offset+feedWidth/2,y+h*.64,20,skin.muted,'center',feedWidth-20);
 function nameLabel(value,x,y,width,color){c.font='600 20px "Microsoft YaHei",sans-serif';c.fillStyle=color;c.textAlign='left';const chars=Array.from(String(value||''));let label=chars.join('');if(c.measureText(label).width>width){while(chars.length&&c.measureText(chars.join('')+'…').width>width)chars.pop();label=chars.join('')+'…'}c.fillText(label,x,y)}
 feed.forEach(item=>{const age=item.age,yy=y+h-20-age*speed,hash=Math.sin(item.seed*127.1)*43758.5453,jitter=hash-Math.floor(hash),xx=offset+12+jitter*Math.max(12,Math.min(55,feedWidth-195))+Math.sin(age*.7+item.seed)*5;c.save();c.globalAlpha=Math.min(1,age*3,Math.max(0,(yy-y-82)/32));c.font='700 22px KaiTi,STKaiti,"Kaiti SC",serif';c.textAlign='left';c.fillStyle=skin.accent;c.fillText('签到',xx,yy);stage.avatar(item.person,xx+65,yy-8,18);nameLabel(stage.label(item.person),xx+93,yy,Math.max(20,offset+feedWidth-15-xx-93),skin.ink);c.restore()});c.restore();
 const duration=3200;if(state.heartActive&&now-state.heartActive.started>=duration)state.heartActive=null;if(!state.heartActive&&state.heartGroups.length)state.heartActive={...state.heartGroups.shift(),started:now};
 if(state.heartActive){const group=state.heartActive,progress=Math.max(0,Math.min(1,(now-group.started)/duration)),origin=y+h-37,stop=y+225,yy=origin-(origin-stop)*progress;c.save();c.beginPath();c.rect(x+20,y+200,split-35,h-218);c.clip();const fade=Math.min(1,progress*8,Math.max(0,(1-progress)/.35));for(let i=0;i<Math.min(5,group.count+1);i++){const phase=Math.max(0,progress-i*.085);if(phase<=0)continue;const heartY=origin-(origin-stop)*phase,heartX=x+46+Math.sin(phase*5+i*1.7)*(16+phase*18)+i*10;floatingHeart(c,heartX,heartY,14+(1-phase)*8,fade*(1-i*.1))}c.globalAlpha=fade;c.font='600 20px "Microsoft YaHei",sans-serif';const suffix=' ♥ ×'+group.count,xx=x+85+Math.sin(progress*4)*8,width=Math.max(20,x+split-15-xx),suffixWidth=c.measureText(suffix).width;let name=String(group.name);while(name.length&&c.measureText(name+'…').width>width-suffixWidth)name=name.slice(0,-1);if(name!==String(group.name))name+='…';c.fillStyle=skin.ink;c.textAlign='left';c.fillText(name,xx,yy);c.fillStyle='#f52255';c.fillText(suffix,xx+c.measureText(name).width,yy);c.restore()}


}
export function allowsSignup(data){return data.sourceMode==='wechat'||data.sourceMode==='custom'&&data.presentation?.allowSignup===true}
export function drawWaitingPrizes(stage,t,box){const c=stage.ctx,skin=waitingSkin(stage),d=stage.data,{x,y,w,h}=box,people=d.eligibleComments||[],cx=x+w/2,cy=y+h*.46,hash=n=>{const f=Math.sin(n*127.1+311.7)*43758.5453;return f-Math.floor(f)},slot=Math.floor(t/7);c.save();c.beginPath();c.rect(x+18,y+85,w-36,h-228);c.clip();for(let i=0;i<Math.min(18,people.length);i++){const index=(i+Math.floor(t/18)*7)%people.length,person=people[index],phase=hash(i+4)*Math.PI*2,xx=cx+Math.sin(t*(.16+hash(i)*.13)+phase)*(w*.36),yy=cy+Math.cos(t*.21+phase)*(h*.18),r=22+hash(i+9)*15;c.save();c.globalAlpha=.5+hash(i+16)*.35;stage.avatar(person,xx,yy,r);if(d.sourceMode==='youtube')text(c,stage.label(person),xx,yy+r+22,17,skin.ink,'center',150);c.restore()}c.restore();const person=people[slot%Math.max(1,people.length)],spring=skin.id==='festival'||skin.id==='caishen',wishes=spring?['新春快乐，愿好运常伴！','新岁启封，万事如意！','愿你阖家安康，福气满满！','新年胜旧年，好运皆如愿！','龙马精神，喜乐安康！']:['愿每一份期待都开出好运！','愿幸运与你不期而遇！','把掌声送给闪闪发光的你！','愿美好如期而至，好运常在！','今天的幸运，也许就是你！'],comment=['youtube','comments'].includes(d.sourceMode)&&person?.text?String(person.text):wishes[slot%wishes.length],line=(person?stage.label(person)+'：':'')+comment;const alpha=d.sourceMode==='youtube'?0:stage.reduced?1:Math.min(1,(t%7)*2,(7-t%7)*2);c.save();c.globalAlpha=alpha;c.fillStyle=skin.panel;c.strokeStyle=skin.line;c.lineWidth=1;c.beginPath();c.roundRect(x+44,y+h-208,w-88,63,18);c.fill();c.stroke();text(c,line,cx,y+h-168,23,skin.ink,'center',w-120);c.restore();text(c,'幸运即将揭晓',cx,y+h-85,39,skin.ink);text(c,'等待主持人开始抽奖',cx,y+h-38,24,skin.muted)}

export function drawCountdown(stage,box){const c=stage.ctx,skin=waitingSkin(stage),d=stage.data,{x,y,w,h}=box,target=Date.parse(d.scheduledAt||''),timed=Number.isFinite(target),seconds=Math.max(0,Math.ceil((target-Date.now())/1000)),value=timed?[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(' : '):'静候幸运';text(c,value,x+w/2,y+h*.62,timed?43:38,skin.gold,'center',w-50);text(c,timed?'距离预定开奖时间':'准备就绪 · 等待主持人开奖',x+w/2,y+h*.82,22,skin.muted,'center',w-45)}
export function drawDrawPlan(stage,box){const c=stage.ctx,skin=waitingSkin(stage),d=stage.data,p=d.presentation||{},{x,y,w,h}=box,index=Math.floor((stage.currentElapsed||0)/7000)%Math.max(1,d.plannedWinnerCount||1),prize=p.prizes?.[index]||(index===0?{name:p.prizeName}:{});drawAward(stage,index,x+105,y+h*.59,83);text(c,stage.rankName(index),x+190,y+135,27,skin.gold,'left',w-220);text(c,prize.name||'幸运专属荣誉',x+190,y+180,23,skin.ink,'left',w-220);if(h>280)text(c,`${d.plannedWinnerCount||1} 个幸运席位 · ${p.drawMode==='auto'?'自动连续揭晓':'逐位揭晓'}`,x+w/2,y+h-30,21,skin.muted,'center',w-40)}

export function drawBlessings(stage){const c=stage.ctx,skin=waitingSkin(stage),events=(stage.interaction?.events||[]).filter(e=>e.kind==='message'),now=Date.now();for(const event of events.slice(-12)){const age=(now-event.created)/1000;if(age<0||age>9)continue;const x=1920-age*260,y=210+(Number(event.id)%3)*63;const label=(event.name||'现场观众')+'：'+event.text;c.save();c.globalAlpha=Math.min(1,(9-age)/2);c.font='600 24px "Microsoft YaHei",sans-serif';const width=Math.min(760,c.measureText(label).width);c.fillStyle=skin.panel;c.strokeStyle=skin.line;c.beginPath();c.roundRect(x-20,y-30,width+40,52,24);c.fill();c.stroke();text(c,label,x,y+5,24,skin.ink,'left',760);c.restore()}}
