import {prepareTinyAvatarParticles} from './spring-avatar-particles.js?v=20261122-replay10';
import {avatarSprite,prepareStageAvatars} from './avatar-cache.js?v=20261122-fix9';
import {prepareRocketExhaust} from './rocket-exhaust.js?v=20261121-rocket6';
import {drawWinnerCelebration,prepareWinnerCelebration} from './winner-celebration.js?v=20261122-fix8';
import {themeMusicSettings} from './theme-music.js?v=20261121-music3';
import {effectiveActivityMusic,activityTrackUrl} from './activity-music-model.js';
import {drawGiftEffects} from './gift-effects.js?v=20261121-rocket6';
import {drawPrizeCover} from './prize-cover.js?v=20261120-prize-cover1';
import {activityLogo,candidateMessage} from './stage-ui.js?v=20261120-stage-finale';
import {analyzeMusic,bindMusicBounds} from './music-bounds.js?v=20261120-stage-finale';
import {portraitNodes} from './portrait-motion.js?v=20261122-replay10';
import {drawThemeReveal} from './theme-reveal.js?v=20261120-stage3';
import {drawStageBackdrop} from './stage-ornaments.js?v=20261120-stage3';
import {registerThemeFrame,drawThemeFrame} from './theme-frames.js?v=20261120-stage3';
import {drawAward,drawPodium} from './ceremony.js?v=20261122-replay10';
import {drawThemeFocus} from './theme-focus.js?v=20261120-stage3';
import {renderThemedWaiting} from './themed-waiting.js?v=20261122-replay10';
import {renderSeasonal} from './seasonal-stage.js?v=20261122-replay10';
import {playWinnerSound,prepareWinnerSound} from './winner-sound.js';
import {getTheme} from './themes.js';
import {buildDrawTimeline,timelineState} from './draw-timeline.js?v=20261122-replay10';
import {pickQuip,pickRejectionQuip} from './stage-quips.js';
const TAU=Math.PI*2;const palette=['#f6d58f','#89f1ed','#e9f7ff','#c8b9f8','#e6b86f'];
function hash(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
export class LuckyStage{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');registerThemeFrame(this.ctx,this);this.images=new Map();this.loading=new Map();this.data=null;this.page=0;this.fixedPage=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches}
 async setData(d,{deferPresentation=false}={}){prepareRocketExhaust();if(!deferPresentation)this.data=d;const urls=[...new Set([...(d.eligibleComments||[]),...(d.winners||[])].map(c=>c.avatar).filter(Boolean))];if(this.skin().id!=='festival')urls.push('/themes/frame-'+this.skin().id+'.svg','/themes/ornaments-'+this.skin().id+'-v2.png','/themes/stage-scene-'+this.skin().id+'-v3.png');urls.push('/themes/gifts-'+this.skin().id+'-premium.png','/themes/rocket-exhaust-v6.png');urls.push(d.presentation?.logoImage||'/default-logo.jpg','/themes/module-'+this.skin().id+'-panel.svg');if(this.skin().id==='caishen')urls.push('/themes/character-caishen-v1.webp');if(this.skin().id==='festival')urls.push('/themes/theme-art-festival-snow.png','/themes/theme-art-festival-gala.png');for(const prize of d.presentation?.prizes||[])if(prize.image)urls.push(prize.image);if(d.presentation?.prizeImage)urls.push(d.presentation.prizeImage);if(d.presentation?.awardImage)urls.push(d.presentation.awardImage);let next=0;await Promise.all(Array.from({length:Math.min(12,urls.length)},async()=>{while(next<urls.length)await this.image(urls[next++])}));prepareWinnerCelebration(this);await prepareStageAvatars(this,d.eligibleComments||[],d.winners||[]);prepareTinyAvatarParticles(this,d.eligibleComments||[]);await this.warmDrawFrames(d);if(deferPresentation)this.data=d}
 image(url){if(this.images.has(url))return Promise.resolve(this.images.get(url));if(this.loading.has(url))return this.loading.get(url);let work;if(/^https:\/\//.test(url)){work=this.image('/api/avatar?url='+encodeURIComponent(url)).then(img=>{this.images.set(url,img);return img})}else if(!/^(data:image\/(png|jpeg|webp);base64,|\/)/.test(url)){this.images.set(url,null);return Promise.resolve(null)}else{work=new Promise(resolve=>{const img=new Image();img.onload=async()=>{try{await img.decode()}catch{}this.images.set(url,img);resolve(img)};img.onerror=()=>{this.images.set(url,null);resolve(null)};img.src=url})}this.loading.set(url,work);return work.finally(()=>this.loading.delete(url))}
 async warmDrawFrames(d){const key=this.skin().id+':'+(d.presentation?.animation||'');if(this.warmedDrawKey===key)return this.drawWarmup;this.warmedDrawKey=key;this.drawWarmup=(async()=>{await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=this.canvas.width;canvas.height=this.canvas.height;const warm=new LuckyStage(canvas);warm.images=this.images;warm.avatarSprites=this.avatarSprites;warm.avatarImageSprites=this.avatarImageSprites;const person=d.eligibleComments?.[0]||{id:'warmup',name:'准备中'};warm.data={...d,status:'drawn',winners:[person],presentation:{...d.presentation,maxFeints:0},revealStartedAt:'2026-01-01T00:00:00Z'};const entry=buildDrawTimeline(warm.data).entries[0];for(const elapsed of [0,entry.scanEndMs+100,entry.moveEndMs+1800,buildDrawTimeline(warm.data).durationMs+2000]){await new Promise(resolve=>typeof requestIdleCallback==='function'?requestIdleCallback(resolve,{timeout:1000}):setTimeout(resolve,16));warm.render(elapsed);warm.ctx.getImageData(0,0,1,1)}this.podiumBlur=warm.podiumBlur})();return this.drawWarmup}
 fitImage(image,x,y,w,h){if(!image)return;const ratio=Math.min(w/image.width,h/image.height);this.ctx.drawImage(image,x+(w-image.width*ratio)/2,y+(h-image.height*ratio)/2,image.width*ratio,image.height*ratio)}
 skin(){return getTheme(document.documentElement.dataset.theme)}
 themeColor(color,role='text'){if(typeof color==='string'&&/^#[0-9a-f]{3}$/i.test(color))color='#'+[...color.slice(1)].map(c=>c+c).join('');if(typeof color!=='string'||!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color))return color;const t=this.skin(),r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16),alpha=color.length===9?color.slice(7):'',gold=r>b*1.2&&g>b*1.1;let result;if(role==='fill')result=t.panel;else if(role==='stroke')result=gold?t.gold:Math.max(r,g,b)>180?t.accent:t.line;else if(gold)result=t.gold;else if(Math.max(r,g,b)<185)result=t.muted;else if(g>r*1.08&&b>r*1.04)result=t.accent;else result=t.ink;return result+alpha}
 themeDecor(t){const c=this.ctx,skin=this.skin();c.save();c.globalAlpha=.15;c.fillStyle=skin.accent;c.strokeStyle=skin.accent;if(skin.effect==='petals'){for(let i=0;i<30;i++){const x=hash(i*7)*1920+Math.sin(t*.3+i)*35,y=(hash(i*11)*1200+t*22)%1200-60;c.save();c.translate(x,y);c.rotate(t*.2+i);c.beginPath();c.ellipse(0,0,5,11,0,0,TAU);c.fill();c.restore()}}else if(skin.effect==='bokeh'){for(let i=0;i<35;i++){c.beginPath();c.arc(hash(i*7)*1920,hash(i*11)*1080,2+hash(i)*5,0,TAU);c.fill()}}else if(skin.effect==='aurora'){for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,320+i*70);c.bezierCurveTo(600,70+Math.sin(t*.2+i)*100,1100,850,1920,220+i*90);c.lineWidth=15-i*3;c.stroke()}}else if(skin.effect==='neon'){for(let i=0;i<14;i++){const x=i*170;c.beginPath();c.moveTo(x,-30);c.lineTo(x+520,1110);c.lineWidth=1;c.stroke()}}else if(skin.effect==='lanterns'){c.globalAlpha=.6;for(const x of [190,1730]){c.fillStyle='#b82d37';c.beginPath();c.ellipse(x,230,36,47,0,0,TAU);c.fill();c.strokeStyle=skin.gold;c.lineWidth=2;c.stroke();c.beginPath();c.moveTo(x,150);c.lineTo(x,184);c.moveTo(x,277);c.lineTo(x,312);c.stroke()}}c.restore()}
 text(s,x,y,size=24,color='#ecf6ff',align='left',max=1600){const c=this.ctx;c.font=`${size>=40?600:400} ${size}px ${size>=40?this.skin().heading:'"Segoe UI","Microsoft YaHei",sans-serif'}`;c.fillStyle=this.themeColor(color);c.textAlign=align;const str=String(s??'');let out=str;if(c.measureText(out).width>max){let lo=0,hi=out.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(c.measureText(out.slice(0,mid)+'…').width<=max)lo=mid;else hi=mid-1}out=out.slice(0,lo)+'…'}c.fillText(out,x,y);return out}
 box(x,y,w,h,fill='#0e2134',stroke='#24485e',r=15){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=this.themeColor(fill,'fill');c.fill();if(stroke){c.strokeStyle=this.themeColor(stroke,'stroke');c.lineWidth=1;c.stroke()}}
 avatar(person,x,y,r=40,glow=false){const c=this.ctx;c.save();if(glow){const g=c.createRadialGradient(x,y,r*.75,x,y,r*1.4);g.addColorStop(0,'#93f4ed44');g.addColorStop(1,'#93f4ed00');c.fillStyle=g;c.fillRect(x-r*1.4,y-r*1.4,r*2.8,r*2.8)}const sprite=avatarSprite(this,person,r>45?256:96);c.drawImage(sprite,x-r,y-r,r*2,r*2);if(this.skin().id==='festival'&&this.scarfActive&&r>40&&(this.data?.winners||[]).some(w=>(w.id||w.author_channel_id||w.name)===(person?.id||person?.author_channel_id||person?.name))){c.fillStyle='#d21c2d';c.fillRect(x-r*.95,y+r*.64,r*1.9,r*.24);c.fillRect(x+r*.5,y+r*.78,r*.28,r*.65)}c.restore()}
 label(person){if(this.isComment)return [person.handle,person.author_handle,person.authorHandle,person.author_name,person.name].find(v=>typeof v==='string'&&/^@[^\s]+$/.test(v))||'@账号未提供';return person.name||person.author_name||'幸运参与者'}
 award(x,y,size=64){const state=this.timing(this.currentElapsed||0);drawAward(this,state.index||0,x,y,size)}
 renderFestival(elapsed=0,forceFinal=false){
 const c=this.ctx,d=this.data,t=elapsed/1000,wealth=this.skin().id==='caishen';this.isComment=!['custom','wechat'].includes(d.sourceMode);
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#470d18';c.fillRect(0,0,this.canvas.width,this.canvas.height);
 const scale=Math.min(this.canvas.width/1920,this.canvas.height/1080);c.setTransform(scale,0,0,scale,(this.canvas.width-1920*scale)/2,(this.canvas.height-1080*scale)/2);
 const url=wealth?'/themes/caishen-stage-bg.jpg':'/themes/cny-stage-bg.jpg',bg=this.images.get(url);
 if(bg)c.drawImage(bg,0,0,1920,1080);c.fillStyle='#38091855';c.fillRect(0,0,1920,1080);
 this.box(0,0,1920,82,'#9a111c','#e5b465',0);this.text('🎁 Lucky 抽奖大屏',45,53,30,'#fff0cf','left');this.text(d.title,960,53,28,'#fff0cf','center',1000);
 if(!wealth&&d.presentation?.animation==='festival-gala'){this.box(30,100,140,880,'#a51a24','#eac176',20);this.box(1750,100,140,880,'#a51a24','#eac176',20);for(const [i,ch]of [...'迎新春千仓纳福'].entries())this.text(ch,100,260+i*78,48,'#ffe3a0','center');for(const [i,ch]of [...'庆盛典万象生辉'].entries())this.text(ch,1820,260+i*78,48,'#ffe3a0','center')}this.text(wealth?'财神送福 · 红包纳财':'新春幸运抽奖',960,200,76,'#ffe3a0','center');
 const state=d.status==='drawn'?this.timing(elapsed):{phase:'waiting',final:false};if(forceFinal)state.final=true;this.scarfActive=state.final||state.confirmed;
 const people=buildDrawTimeline(d).people,entry=state.entry,focus=entry?people[entry.focusIndex]:null;
 const prize=d.presentation?.prizes?.[state.index||0]||{name:d.presentation?.prizeName,image:d.presentation?.prizeImage};
 for(const x of [90,1420])this.box(x,330,410,440,'#fff0d8ee','#e6ad59',28);
 this.text('🎁 本轮奖品',295,385,31,'#9f1821','center');const image=this.images.get(prize.image);drawPrizeCover(c,image,175,420,240,200);this.text(prize.name||'幸运好礼',295,690,28,'#9f1821','center',350);
 this.text('本轮参与',1625,405,30,'#9f1821','center');this.text(String(d.stats?.eligible??people.length),1625,485,64,'#9f1821','center');this.text('本轮奖项',1625,590,30,'#9f1821','center');this.text(String(d.plannedWinnerCount||d.winners?.length||1),1625,680,56,'#9f1821','center');
 if(state.final){const progress=forceFinal?1:Math.max(0,Math.min(1,(elapsed-buildDrawTimeline(d).durationMs)/650));c.save();c.globalAlpha=progress*progress*(3-2*progress);this.final(t);c.restore();return {...state,phase:'winner',final:true}}
 if(wealth){
 const amount=Math.min(45,Math.max(12,people.length));for(let i=0;i<amount;i++){const x=570+hash(i*17)*780,y=310+((hash(i*31)*540+t*(this.reduced?0:95))%540);this.box(x-35,y-44,70,88,'#ce2530','#f3c468',8);this.text('福',x,y+25,25,'#ffdc91','center');if(people.length)this.avatar(people[i%people.length],x,y-15,20)}
 }else{
 const gradient=c.createRadialGradient(880,420,10,960,560,310);gradient.addColorStop(0,'#fff8ef99');gradient.addColorStop(.7,'#f9c6ac22');gradient.addColorStop(1,'#ffdfb966');c.fillStyle=gradient;c.beginPath();c.arc(960,565,300,0,TAU);c.fill();c.strokeStyle='#ffe7b8';c.lineWidth=7;c.stroke();
 for(let i=0;i<Math.min(24,Math.max(8,people.length));i++){const speed=state.phase==='search'||state.phase==='waiting'?1:.12,angle=hash(i*13)*TAU+t*speed,x=960+Math.cos(angle)*(100+hash(i)*145),y=565+Math.sin(angle)*(80+hash(i*7)*150);c.fillStyle='#d62a29';c.beginPath();c.arc(x,y,32,0,TAU);c.fill();c.strokeStyle='#ffd48b';c.lineWidth=2;c.stroke();if(people.length)this.avatar(people[i%people.length],x,y,24)}
 this.box(620,860,680,90,'#ac1820','#ffd18a',30);
 }
 if(focus&&state.phase!=='search'){
 const progress=Math.min(1,Math.max(0,(elapsed-entry.scanEndMs)/3000)),ease=progress*progress*(3-2*progress);c.save();c.globalAlpha=ease;this.box(750,370,420,385,'#fff1dcee','#e6b35e',24);
 if(wealth&&state.phase==='prompt'){this.text(entry.winning?'🪙 大元宝':'新春快乐 · 万事如意',960,465,entry.winning?54:28,'#a71420','center',370)}
 this.avatar(focus,960,570,90);
 if(entry.winning&&state.phase==='prompt'&&!wealth){c.fillStyle='#cb1d2b';c.fillRect(878,627,164,24);c.fillRect(1008,638,25,60)}
 this.text(this.label(focus),960,705,30,'#a71420','center',360);c.restore();
 }
 const message=state.phase==='waiting'?'准备抽奖':state.phase==='search'?(wealth?'红包满天飞 · 正在抓取':'正在摇奖…'):entry?.winning?(state.phase==='prompt'?'恭喜中奖 · 鸿运当头':'幸运即将揭晓'):(state.phase==='prompt'||state.phase==='rejection'?(wealth?'福气已送达 · 再接再厉':'头奖祝福送给您 · 新岁皆如愿'):'正在揭晓');
 this.text(message,960,920,32,'#ffe0a0','center',650);return {...state,phase:state.confirmed?'winner':'drawing',final:false};
 }
 rankName(index){const names=this.data.presentation?.awardNames||[],type=this.data.presentation?.rankStyle||'rank',n=index+1,zh=['一','二','三','四','五','六','七','八','九','十'][index]||String(n);if(names[index])return names[index];if(type==='prize')return `${zh}等奖`;if(type==='grand')return index===0?'特等奖':`${['一','二','三','四','五','六','七','八','九','十'][index-1]||index}等奖`;if(type==='medal')return ['金奖','银奖','铜奖'][index]||`荣誉奖 · ${n}`;if(type==='podium')return ['冠军','亚军','季军'][index]||`优胜奖 · ${n}`;if(type==='lucky')return ['天选之星','锦鲤之星','幸运之星'][index]||`闪耀之星 · ${n}`;return `第${zh}名`}
 timing(elapsed){return timelineState(this.data,elapsed)}
 render(elapsed=0,forceFinal=false){this.giftQrBounds=null;const state=this.renderScene(elapsed,forceFinal);if(state){drawWinnerCelebration(this,elapsed,state);drawGiftEffects(this,this.replayClock??Date.now());}return state}
 renderScene(elapsed=0,forceFinal=false){if(!this.data)return;this.ctx.globalAlpha=1;this.currentElapsed=elapsed;this.forceFinalCeremony=forceFinal;const artId=this.skin().id==='festival'?(document.documentElement.dataset.themeAnimation||'festival-snow'):this.skin().id;if(this.artTheme!==artId){this.artTheme=artId;if(this.skin().id==='festival')void this.image('/themes/theme-art-'+artId+'.png');if(this.skin().id!=='festival')void this.image('/themes/frame-'+this.skin().id+'.svg');if(this.skin().id!=='festival')void this.image('/themes/ornaments-'+this.skin().id+'-v2.png');if(this.skin().id!=='festival')void this.image('/themes/stage-scene-'+this.skin().id+'-v3.png')}if(['festival','caishen'].includes(this.skin().id))return renderSeasonal(this,elapsed,forceFinal);const d=this.data,c=this.ctx,W=this.canvas.width,H=this.canvas.height,t=elapsed/1000;this.isComment=!['custom','wechat'].includes(d.sourceMode);c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.fillStyle=this.skin().deep;c.fillRect(0,0,W,H);const scale=Math.min(W/1920,H/1080);c.setTransform(scale,0,0,scale,(W-1920*scale)/2,(H-1080*scale)/2);const bg=c.createRadialGradient(960,300,10,960,500,1200);bg.addColorStop(0,this.skin().glow);bg.addColorStop(.5,this.skin().bg);bg.addColorStop(1,this.skin().deep);c.fillStyle=bg;c.fillRect(0,0,1920,1080);drawStageBackdrop(this);this.themeDecor(t);c.strokeStyle=this.skin().accent+'44';c.strokeRect(35,35,1850,1010);for(const [x,y,dx,dy] of [[35,35,1,1],[1885,35,-1,1],[35,1045,1,-1],[1885,1045,-1,-1]]){c.beginPath();c.moveTo(x,y+dy*35);c.lineTo(x,y);c.lineTo(x+dx*35,y);c.strokeStyle=this.skin().accent;c.lineWidth=3;c.stroke()}activityLogo(this);const resultStage=forceFinal||d.status==='drawn'&&this.timing(elapsed).final;if(!resultStage){if(d.status!=='drawn'&&d.presentation?.organizer)this.text(d.presentation.organizer,960,97,48,this.skin().ink,'center',1300);this.text((d.title||'抽奖活动')+' · 现场抽奖',960,165,33,this.skin().ink,'center',1440);if(d.status==='drawn')this.drawPrizeModule(t);}
 if(d.status!=='drawn'){this.waiting(t);return {phase:'waiting',final:false}}const state=this.timing(elapsed);if(forceFinal){state.final=true;state.shown=d.winners.length}if(!state.final)drawThemeReveal(this,t,state);if(state.final){const duration=buildDrawTimeline(d).durationMs,progress=forceFinal?1:Math.max(0,Math.min(1,(elapsed-duration)/650)),fade=progress*progress*(3-2*progress);c.save();c.globalAlpha=fade;this.final(t);c.restore()}else if(state.flying)this.candidates(t,state);else this.reveal(t,state);if(!this.reduced){if(state.final)this.effects((elapsed-buildDrawTimeline(d).durationMs)/1000,9);}return {...state,phase:state.final||state.confirmed?'winner':'drawing',final:state.final}}

 waiting(t){renderThemedWaiting(this,t);return;const d=this.data,c=this.ctx;for(const n of this.scanNodes(t,0)){c.globalAlpha=.2;this.avatar(n.p,n.x,n.y,Math.min(30,n.r))}c.globalAlpha=1;this.text('锦鲤正在排队上岗',740,235,59,'#f1faff','center');this.text(d.scheduledAt?`倒计时 · ${(()=>{const seconds=Math.max(0,Math.ceil((Date.parse(d.scheduledAt)-Date.now())/1000));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':')})()}`:(d.sourceMode==='wechat'?'扫码完成签到，加入本场抽奖':(d.sourceMode==='custom'?'扫码报名抽奖 · 弹幕互动':'扫码送上祝福，一起等待幸运降临')),740,284,25,'#88bccd','center');const values=[[d.sourceMode==='wechat'||d.sourceMode==='custom'?'报名人数':'参与记录',d.stats.comments],['欧气候选人',d.stats.eligible],['锦鲤坑位',d.plannedWinnerCount]];values.forEach(([label,n],i)=>{const x=320+i*420;this.text(n,x,355,43,'#96ece8','center');this.text(label,x,392,19,'#83a8bc','center')});if(d.presentation?.prizeName){this.text('🎁 本轮专属奖品：'+d.presentation.prizeName,740,470,26,'#ffd700','center');}if(d.presentation?.interactionEnabled===false&&d.sourceMode!=='wechat'&&d.sourceMode!=='custom'){this.text('期待每一个幸运瞬间',960,650,40,'#9cd7db','center');return}this.waitingInteraction(t)}
 waitingInteraction(t){const c=this.ctx,d=this.interaction;this.box(1460,295,360,600,'#0a2137ed','#458696',24);const logo=d?.logo||this.data.presentation?.logoImage||'/default-logo.jpg';this.avatar({avatar:logo,name:'瞎'},1640,366,44);this.text(this.data.sourceMode==='wechat'?((d?.providerLabel||'')+'扫码签到'):(this.data.sourceMode==='custom'?'扫码报名抽奖':'扫码参与互动'),1640,451,31,'#d6fff4','center',330);const qr=this.images.get(d?.qr);if(qr){c.save();c.fillStyle='#fff';c.fillRect(1500,480,280,280);c.drawImage(qr,1500,480,280,280);c.restore()}else this.text(this.interactionError||'互动入口准备中…',1640,600,20,'#8fb6c5','center',320);this.text(this.data.sourceMode==='wechat'?'完成签到后获抽奖资格':(this.data.sourceMode==='custom'?'填写姓名工号 · 发字幕':'发留言 · 送爱心'),1640,808,24,'#afceda','center',320);this.text(`♥ ${(d?.likes||0).toLocaleString()} 份心意`,1640,851,23,'#ffb5ce','center',320);if(d?.localOnly)this.text('请设置手机可访问的局域网地址',960,965,22,'#f4c58e','center');
const messages=(d?.events||[]).filter(e=>e.kind==='message');if(!messages.length){this.text('第一句祝福，会是谁的？',750,675,34,'#91c5d0','center');this.text('扫描右侧二维码，让你的留言飘上大屏',750,730,22,'#7399ad','center')}else{const spacing=24/Math.min(4,messages.length),slot=Math.floor(t/spacing),offset=t%spacing;for(let j=0;j<Math.min(4,messages.length);j++){const age=offset+j*spacing,e=messages[((slot-j)%messages.length+messages.length)%messages.length],x=(slot-j)%2===0?95:755,y=970-age*28,alpha=Math.max(0,Math.min(1,age, (24-age)/6));c.save();c.globalAlpha=alpha;this.box(x,y,600,104,'#13354de8','#427587',18);this.text(e.name||'现场观众',x+22,y+31,20,'#8ff1df','left',550);this.messageLines(e.text,x+22,y+64,550);c.restore()}}
const now=d?d.clock+(performance.now()-d.receivedAt):Date.now(),likes=(d?.events||[]).filter(e=>e.kind==='like'),hearts=[];for(const e of likes.slice(-25))for(let k=0;k<3;k++){const age=(now-e.created)/1000-k*.35;if(age>=0&&age<12)hearts.push({age,seed:e.id*7+k})}if(d?.likes>0)for(let i=0;i<8;i++)hearts.push({age:(t+i*1.5)%12,seed:i+71});for(const h of hearts.slice(-70)){const x=130+hash(h.seed)*1280+Math.sin(h.age*.8+h.seed)*30,y=1070-h.age*82;c.save();c.globalAlpha=Math.min(1,h.age*2,Math.max(0,(12-h.age)/3))*.8;this.text('♥',x,y,25+hash(h.seed*3)*26,['#ff82b0','#ffc0cf','#f5a7e1'][h.seed%3],'center',100);c.restore()}}
 messageLines(value,x,y,width){const c=this.ctx,chars=Array.from(String(value||''));c.font='400 23px "Segoe UI","Microsoft YaHei",sans-serif';let line='';for(let i=0;i<chars.length;i++){if(c.measureText(line+chars[i]).width>width){this.text(line,x,y,23,'#d6e8f0','left',width);this.text(chars.slice(i).join(''),x,y+29,23,'#d6e8f0','left',width);return}line+=chars[i]}this.text(line,x,y,23,'#d6e8f0','left',width)}
 candidates(t,s){this.scan(t,s,false)}
 scan(t,s,locked){const c=this.ctx,state=timelineState(this.data,t*1000),entry=state.entry;if(!entry)return;const nodes=portraitNodes(buildDrawTimeline(this.data),state,t,this.skin().id,this.reduced),focus=nodes.find(n=>n.active);const confirmed=state.confirmed,active=Boolean(focus),rank=this.rankName(entry.rankIndex);for(const n of nodes){if(active&&n===focus||n.x < -150||n.x > 2070||n.y < -150||n.y > 1230)continue;c.globalAlpha=n.alpha*(active?.40:.86);this.avatar(n.p,n.x,n.y,n.r)}c.globalAlpha=1;if(active){this.avatar(focus.p,focus.x,focus.y,focus.r,true);this.radar(focus.x,focus.y,focus.r+24,t)}else{
 const radarX=960+Math.sin(t*2.7)*700,radarY=565+Math.cos(t*2.15)*310;
 this.radar(radarX,radarY,65,t);
}
this.box(490,35,940,88,'#071724dd',confirmed?'#d8bd7b':'#39758a');this.text(this.data.presentation?.organizer|| (confirmed?`${rank} · 欧皇抓到了`:state.phase==='rejection'?`${rank} · 本次未中奖`:`${rank} · 幸运正在揭晓`),960,92,36,confirmed?'#f3dfac':'#effbff','center',900);
const elapsed=t*1000,showInfo=['prompt','rejection'].includes(state.phase)||(state.phase==='move'&&elapsed>entry.lockEndMs+entry.moveMs*.8);if(showInfo&&focus){this.box(545,760,830,122,this.skin().panel,confirmed?'#d8bd7b':'#39758a');const person=focus.p,name=this.label(person);this.text((confirmed?'欧皇本皇 · ':state.phase==='rejection'?'本次未中奖 · ':'欧气检测中 · ')+name,570,805,27,confirmed?'#f3dfac':'#b9f3ef','left',780);this.text(['youtube','comments'].includes(this.data.sourceMode)?'评论互动展示':confirmed?'幸运揭晓':'本轮未中奖',570,855,23,'#adc8d7','left',780)}
const seed=`${this.data.title||''}:${entry.cycle}`;
if(focus)candidateMessage(this,state,focus.p,pickRejectionQuip(seed,entry.attempt));}


 quipBanner(quip,locked,rejected=false){const c=this.ctx,emoji=/黑幕|充钱|后台/.test(quip)?'🤔':/狗屎|运气|锦鲤|欧皇|左眼皮/.test(quip)?'🍀':/脚滑|手抖/.test(quip)?'😅':/优秀|龙凤|实力/.test(quip)?'😎':locked?'🎉':'👀';c.save();const gradient=c.createLinearGradient(350,0,1570,0);gradient.addColorStop(0,this.skin().panel);gradient.addColorStop(.5,this.skin().glow);gradient.addColorStop(1,this.skin().panel);this.box(350,300,1220,116,gradient,locked?'#e0bc74':'#63bfc7',22);c.shadowColor=(locked?this.skin().gold:this.skin().accent)+'55';c.shadowBlur=14;this.text(`${rejected?'🙈':emoji}  ${quip}`,960,377,60,locked?'#ffe2a3':'#d2fff9','center',1120);if(rejected)this.text('本次未中奖 · 好运先欠着，下回再来抓它',960,405,20,'#adc8d7','center',1120);c.restore()}
 
 radar(x,y,r,t){drawThemeFocus(this,x,y,r,t);return;const c=this.ctx,animation=this.data.presentation?.animation||'radar';c.save();c.translate(x,y);if(animation==='float'){for(let j=0;j<3;j++){c.beginPath();c.ellipse(0,0,r+12+j*16,(r+12+j*16)*.65,Math.sin(t*.5+j)*.5,0,TAU);c.strokeStyle=this.skin().accent+(j?'66':'dd');c.lineWidth=2;c.stroke()}this.text('✦',Math.cos(t)*r,Math.sin(t)*r,22,this.skin().gold,'center',80);c.restore();return}for(let j=0;j<3;j++){c.beginPath();c.arc(0,0,r+j*23,t*(j%2?-.4:.5)+j,t*(j%2?-.4:.5)+j+4.8);c.strokeStyle=j===0?this.skin().accent:this.skin().accent+'66';c.lineWidth=j===0?3:1;c.stroke()}c.setLineDash([4,10]);c.beginPath();c.arc(0,0,r-30,0,TAU);c.stroke();c.setLineDash([]);for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){c.beginPath();c.moveTo(Math.cos(a)*(r-12),Math.sin(a)*(r-12));c.lineTo(Math.cos(a)*(r+38),Math.sin(a)*(r+38));c.strokeStyle=this.skin().accent;c.stroke()}c.restore()}
 reveal(t,s){this.scan(t,s,true)}
 final(t){drawPodium(this,t,this.forceFinalCeremony)}
 effects(age,seed){if(age<0||age>4)return;const c=this.ctx;for(let i=0;i<150;i++){const delay=hash(i+seed)*.8,tt=age-delay;if(tt<0)continue;const x=hash(i*9+seed)*1920+(hash(i*3)-.5)*tt*120,y=-50+hash(i*4)*80+tt*(110+hash(i*7)*150)+tt*tt*42;if(y>1050)continue;c.save();c.globalAlpha=Math.min(1,(4-age)*1.5);c.translate(x,y);c.rotate(tt*(hash(i*8)-.5)*9);c.fillStyle=[this.skin().gold,this.skin().accent,this.skin().ink][i%3];const w=4+hash(i*5)*8;c.fillRect(-w/2,-3,w,3+hash(i)*10);c.restore()}for(let j=0;j<6;j++){const a=age-j*.38;if(a<0||a>1.7)continue;const x=j%2?1650+hash(j+seed)*80:180+hash(j+seed)*80,y=230+hash(j*6+seed)*330;for(let k=0;k<48;k++){const angle=k/48*TAU,speed=85+hash(k+j*40)*100,r=speed*(1-Math.exp(-a*2));c.beginPath();c.strokeStyle=[this.skin().gold,this.skin().accent,this.skin().ink][j%3];c.globalAlpha=Math.max(0,1-a/1.7);c.lineWidth=1.8;c.moveTo(x+Math.cos(angle)*r*.84,y+Math.sin(angle)*r*.84+a*a*23);c.lineTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r+a*a*23);c.stroke()}c.globalAlpha=1}}
  drawPrizeModule(t) {
    const d = this.data;
    if (!d) return;
    const settings=d.presentation||{},selected=settings.prizes?.[d.status==='drawn'?(timelineState(d,t*1000).index||0):0],pres=selected?{...settings,prizeName:selected.name,prizeImage:selected.image}:settings;
    const pName = (pres.prizeName || '').trim();
    const pImgSrc = (pres.prizeImage || '').trim();

    if (!pName && !pImgSrc) {
      const rank=timelineState(d,t*1000).entry?.rankIndex??0;
      this.ctx.save();
      this.box(810,191,300,76,this.skin().panel,this.skin().line,12);
      drawAward(this,rank,850,229,42);
      this.text(this.rankName(rank),892,240,23,this.skin().ink,'left',195);
      this.ctx.restore();
      return;
    }

    const c = this.ctx;
    c.save();

    // 确保图片预加载
    let img = null;
    if (pImgSrc) {
      img = this.images.get(pImgSrc);
      if (!img && !this.loading.has(pImgSrc)) {
        this.image(pImgSrc);
      }
    }

    const cx = 960;
    const cy = 230;

    // 优先级 1: 图片 + 名称
    if (pImgSrc && pName) {
      const cardW = Math.min(560, Math.max(360, pName.length * 22 + 150));
      const cardH = 76;
      const x = cx - cardW / 2;
      const y = cy - cardH / 2;

      c.fillStyle = this.skin().panel;
      c.strokeStyle = this.skin().accent || '#6ae3ef';
      c.lineWidth = 1.5;
      c.shadowColor = this.skin().glow || 'rgba(106, 227, 239, 0.35)';
      c.shadowBlur = 16;
      c.beginPath();
      c.roundRect(x, y, cardW, cardH, 12);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      const imgSize = 54;
      const imgX = x + 12;
      const imgY = y + (cardH - imgSize) / 2;

      c.fillStyle = '#ffffff';
      c.beginPath();
      c.roundRect(imgX, imgY, imgSize, imgSize, 6);
      c.fill();

      if (img && img.complete && img.naturalWidth > 0) {
        c.save();
        c.beginPath();
        c.roundRect(imgX, imgY, imgSize, imgSize, 6);
        c.clip();
        drawPrizeCover(c,img,imgX,imgY,imgSize,imgSize);
        c.restore();
      } else {
        c.fillStyle = '#ff9800';
        c.font = '24px sans-serif';
        c.textAlign = 'center';
        c.fillText('🎁', imgX + imgSize/2, imgY + 36);
      }

      const textStartX = imgX + imgSize + 14;
      c.textAlign = 'left';
      c.fillStyle = this.skin().muted;
      c.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.fillText('本次奖品', textStartX, y + 26);

      c.fillStyle = this.skin().ink;
      c.font = 'bold 22px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.fillText(pName, textStartX, y + 55, cardW - imgSize - 36);
    }
    // 优先级 2: 纯图片
    else if (pImgSrc && !pName) {
      const cardW = 150;
      const cardH = 92;
      const x = cx - cardW / 2;
      const y = cy - cardH / 2;

      c.fillStyle = this.skin().panel;
      c.strokeStyle = this.skin().accent || '#6ae3ef';
      c.lineWidth = 1.5;
      c.shadowColor = this.skin().glow || 'rgba(106, 227, 239, 0.35)';
      c.shadowBlur = 16;
      c.beginPath();
      c.roundRect(x, y, cardW, cardH, 12);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      c.fillStyle = this.skin().muted;
      c.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.textAlign = 'center';
      c.fillText('本次奖品', cx, y + 22);

      const imgSize = 54;
      const imgX = cx - imgSize / 2;
      const imgY = y + 28;

      c.fillStyle = '#ffffff';
      c.beginPath();
      c.roundRect(imgX, imgY, imgSize, imgSize, 6);
      c.fill();

      if (img && img.complete && img.naturalWidth > 0) {
        c.save();
        c.beginPath();
        c.roundRect(imgX, imgY, imgSize, imgSize, 6);
        c.clip();
        drawPrizeCover(c,img,imgX,imgY,imgSize,imgSize);
        c.restore();
      } else {
        c.fillStyle = '#ff9800';
        c.font = '24px sans-serif';
        c.textAlign = 'center';
        c.fillText('🎁', cx, imgY + 36);
      }
    }
    // 优先级 3: 纯名称
    else if (pName && !pImgSrc) {
      const cardW = Math.min(580, Math.max(260, pName.length * 22 + 90));
      const cardH = 54;
      const x = cx - cardW / 2;
      const y = cy - cardH / 2;

      c.fillStyle = this.skin().panel;
      c.strokeStyle = this.skin().accent || '#6ae3ef';
      c.lineWidth = 1.5;
      c.shadowColor = this.skin().glow || 'rgba(106, 227, 239, 0.35)';
      c.shadowBlur = 16;
      c.beginPath();
      c.roundRect(x, y, cardW, cardH, 27);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      c.fillStyle = this.skin().gold || '#ffd700';
      c.font = 'bold 20px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.textAlign = 'center';
      c.fillText('🎁 本次奖品：' + pName, cx, cy + 7, cardW - 30);
    }

    c.restore();
  }


}
export class StageMusic{
 constructor(){this.lastVolumeRefresh=0;this.refreshingVolume=false;addEventListener('storage',e=>{if(e.key==='lucky-music-settings-revision')void this.refreshVolume()});this.audio=new Audio();this.audio.preload='auto';this.audio.loop=true;this.phase='';this.config=null;this.enabled=false;this.preloaded=new Map();this.preloadTasks=new Map();this.musicBounds=new Map();this.ready=this.init().catch(error=>{console.warn('Music preload unavailable',error);this.ready=null})}
 async init(){this.config=await(await fetch('/api/music')).json();this.config.settings=themeMusicSettings(this.config.settings,document.documentElement.dataset.theme,this.config.tracks,this.config.themeDefaults);this.globalSettings={...this.config.settings};this.preloaded=this.preloaded||new Map();this.preloadTasks=this.preloadTasks||new Map();for(const phase of ['waiting','drawing','winner'])this.preloadTrack(this.config.settings?.[phase]);}
 preloadTrack(id){if(!id||id==='off'||this.preloadTasks.has(id))return;const url=activityTrackUrl(id)+'?v=20261120-localmusic1';const task=fetch(url).then(async response=>{if(!response.ok)throw Error('Music HTTP '+response.status);const blob=await response.blob();if(!blob.size)throw Error('Empty music');this.preloaded.set(id,URL.createObjectURL(blob));await analyzeMusic(id,blob).then(bounds=>{if(bounds){this.musicBounds.set(id,bounds);if(this.trackId===id&&this.audio.readyState>=1)bindMusicBounds(this.audio,bounds)}})}).catch(error=>{console.warn('Music preload failed',id,error);this.preloadTasks.delete(id)});this.preloadTasks.set(id,task);}

 setVolume(value){const volume=Math.max(0,Math.min(1,Number.isFinite(Number(value))?Number(value):.6));if(this.gain&&this.context){this.gain.gain.cancelScheduledValues(this.context.currentTime);this.gain.gain.setTargetAtTime(this.enabled?volume:0,this.context.currentTime,.04)}return volume}
 async refreshVolume(){if(this.refreshingVolume)return;this.refreshingVolume=true;this.lastVolumeRefresh=Date.now();try{const response=await fetch('/api/music',{cache:'no-store'});if(response.ok){const data=await response.json(),before=JSON.stringify(this.settings());this.globalSettings={...themeMusicSettings(data.settings,this.dataTheme||document.documentElement.dataset.theme,data.tracks,data.themeDefaults),volume:data.settings?.volume,effectsEnabled:data.settings?.effectsEnabled!==false};if(before!==JSON.stringify(this.settings())){this.phase='';for(const phase of ['waiting','drawing','winner'])this.preloadTrack(this.settings()[phase])}this.setVolume(this.settings().volume);if(this.settings().effectsEnabled===false){this.cancelWinnerSound?.();try{this.themeCueSource?.stop()}catch{}}}}catch{}finally{this.refreshingVolume=false}}
 async enable(){if(!this.context){this.context=new AudioContext();this.source=this.context.createMediaElementSource(this.audio);this.gain=this.context.createGain();this.source.connect(this.gain);this.gain.connect(this.context.destination);this.destination=this.context.createMediaStreamDestination();this.gain.connect(this.destination)}const resumed=this.context.resume();await resumed;if(this.ready)await this.ready;if(!this.config)await this.init();await prepareWinnerSound(this.context).catch(error=>console.warn('Winner sound preload unavailable',error));this.prepareThemeCue();this.enabled=true;this.phase=''}
 async setPhase(phase){if(!this.enabled||!this.config||phase===this.phase)return;this.phase=phase;const id=this.settings()[phase],volume=this.setVolume(this.settings().volume);this.gain.gain.setTargetAtTime(volume,this.context.currentTime,.1);if(!id||id==='off'){this.audio.pause();return}if(this.trackId!==id){await this.preloadTasks.get(id);if(!this.enabled||this.phase!==phase)return;this.onBeforeTrackChange?.();this.trackId=id;this.audio.src=this.preloaded?.get(id)||activityTrackUrl(id)+'?v=20261120-localmusic1';const time=Number(this.trackPositions?.[id]);try{this.audio.currentTime=Number.isFinite(time)&&time>0?time:(this.musicBounds.get(id)?.start||0)}catch{}}await this.audio.play()}
 settings(){return effectiveActivityMusic(this.globalSettings||this.config?.settings||{},this.activitySettings)}
 applyActivityMusic(data){const value=data?.presentation?.music||null,key=JSON.stringify(value);if(key===this.activityMusicKey||!this.config)return;this.activityMusicKey=key;this.activitySettings=value;this.phase='';for(const phase of ['waiting','drawing','winner'])this.preloadTrack(this.settings()[phase]);if(this.enabled)this.setVolume(this.settings().volume)}
 update(state,data){
  this.applyActivityMusic(data);
  if(this.enabled&&this.audio.readyState>=1)bindMusicBounds(this.audio,this.musicBounds.get(this.trackId));
  if(this.enabled&&Date.now()-this.lastVolumeRefresh>5000)void this.refreshVolume();
  // Consume each persisted reveal even while muted: enabling later must not replay it.
  if(state?.confirmed&&!state.final){const winner=data.winners?.[state.index??0],key=JSON.stringify([data.revealStartedAt,data.title,state.cycle,winner?.author_channel_id||winner?.authorChannelId||winner?.id||winner?.handle]);if(!this.winnerCues)this.winnerCues=new Set();if(!this.winnerCues.has(key)){this.winnerCues.add(key);if(this.enabled&&this.settings().effectsEnabled!==false&&this.context?.state==='running'){this.gain.gain.setValueAtTime(this.settings().volume??.6,this.context.currentTime);this.cancelWinnerSound?.();this.cancelWinnerSound=playWinnerSound(this.context,this.gain)}}}
  return this.setPhase(state?.phase);
 }
 prepareThemeCue(){
 const names=['deepsea','aurora','gala','cyber','sakura','paper','festival','caishen'],index=Math.max(0,names.indexOf(document.documentElement.dataset.theme)),base=[261.63,293.66,329.63,369.99,392,440,523.25,587.33][index];
 if(!this.themeBuffers)this.themeBuffers=new Map();let buffer=this.themeBuffers.get(index);
 if(!buffer){buffer=this.context.createBuffer(1,this.context.sampleRate*1.3,this.context.sampleRate);const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++){const t=i/this.context.sampleRate,note=Math.min(3,Math.floor(t/.25)),age=t-note*.25,f=base*[1,1.25,1.5,2][note];samples[i]=Math.sin(TAU*f*t)*Math.exp(-age*12)*.18*Math.min(1,age*200)}this.themeBuffers.set(index,buffer)}
 return buffer;
 }
 playThemeCue(){if(this.settings().effectsEnabled===false)return;const buffer=this.prepareThemeCue();const source=this.context.createBufferSource();this.themeCueSource=source;source.buffer=buffer;source.connect(this.gain);source.onended=()=>source.disconnect();source.start();
 }
 stop(){this.audio.pause();this.cancelWinnerSound?.();if(this.gain){this.gain.gain.cancelScheduledValues(this.context.currentTime);this.gain.gain.setValueAtTime(0,this.context.currentTime)}this.phase='';this.enabled=false}


}
