
import {renderFullscreenStage} from './responsive-live.js?v=20261120-stage-finale';
import './local-activities.js?v=20261122-replay10';
import {attachActivityJournal} from './activity-replay-journal.js?v=20261122-replay10';
import {revealProgress} from './draw-timeline.js?v=20261122-replay10';
import {WaitingInteraction} from './waiting-interaction.js?v=20261122-replay10';
import {LuckyStage,StageMusic} from './stage.js?v=20261122-replay10';
const params=new URLSearchParams(location.search),id=params.get('id')||location.pathname.split('/').pop(),token=params.get('token'),stage=new LuckyStage(document.querySelector('#stage')),music=new StageMusic();let data,start=null,lastSignature='',busy=false,controlCsrf='',controlBusy=false;
const viewport=document.createElement('main');viewport.className='stage-viewport';viewport.setAttribute('aria-label','抽奖舞台');stage.canvas.before(viewport);viewport.append(stage.canvas);document.body.prepend(document.querySelector('#controls'));document.body.append(document.querySelector('#socialLinks'));
async function load(){if(busy)return;busy=true;try{const r=await fetch(`/api/overlay/${id}?token=${encodeURIComponent(token||'')}`,{cache:'no-store'});if([403,404].includes(r.status))await recording?.discard();if(!r.ok)throw Error(`接口 ${r.status}`);const d=await r.json();const signature=JSON.stringify(d);if(signature!==lastSignature){window.__themeFrozen=true;if(d.presentation?.theme)window.LuckyTheme?.commit(d.presentation?.theme||'deepsea',d.presentation?.animation);stage.preloadReady=stage.setData(d,{deferPresentation:true});await stage.preloadReady;lastSignature=signature;data=d}document.title=(d.title||'欧皇出没')+' · 现场大屏';if(d.status==='drawn'&&start===null)start=params.get('replay')==='1'?Date.now():Date.parse(d.revealStartedAt)||Date.now();document.querySelector('#error').textContent=''}catch(e){document.querySelector('#error').textContent='大屏连接失败：'+e.message}finally{busy=false}}
function frame(){requestAnimationFrame(frame);try{if(data&&!document.hidden){const manual=data.presentation?.drawMode!=='auto',progress=revealProgress(data),elapsed=data.status==='drawn'?(manual?progress.elapsedMs:Math.max(0,Date.now()-start)):performance.now(),s=stage.render(elapsed);renderFullscreenStage(stage);recording?.observe();document.querySelector('#lucky-loading')?.remove();music.update(s,data).catch(()=>{});const canControl=Boolean(controlCsrf),next=document.querySelector('#nextDraw'),begin=document.querySelector('#startDraw');begin.hidden=!canControl||data.status==='drawn';begin.disabled=controlBusy;begin.textContent=controlBusy?'正在准备开奖…':'✦ 开始抽奖';next.hidden=!canControl||!manual||data.status!=='drawn'||progress.finished||progress.round>=data.winners.length-1;next.disabled=controlBusy||!progress.canAdvance;next.textContent=controlBusy?'财神正在翻名单…':progress.canAdvance?'✦ 下一位锦鲤请就位':'欧气检测中，别催财神…';document.querySelector('#controls').classList.toggle('has-action',!begin.hidden||!next.hidden)}}catch(error){console.error('Stage render failed',error);document.querySelector('#error').textContent='舞台绘制异常：'+error.message}}
async function control(operation,body={}){if(controlBusy||!controlCsrf)return;controlBusy=true;try{if(operation==='draw'){await stage.preloadReady;await stage.drawWarmup}const r=await fetch(`/api/giveaways/${id}/${operation}`,{method:'POST',headers:{'content-type':'application/json','x-csrf-token':controlCsrf},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.error||'操作未完成');await load()}catch(e){document.querySelector('#error').textContent=e.message}finally{controlBusy=false}}
document.querySelector('#startDraw').onclick=()=>control('draw');document.querySelector('#nextDraw').onclick=()=>control('next',{expectedRound:revealProgress(data).round});fetch('/api/csrf').then(r=>r.ok?r.json():null).then(d=>controlCsrf=d?.token||'').catch(()=>{});
const musicKey='lucky-stage-music:'+id;
const resuming=params.get('replay')!=='1';
if(resuming){
 try{music.trackPositions=JSON.parse(localStorage.getItem(musicKey)||'{}')||{}}catch{music.trackPositions={}}
}
function rememberMusic(){
 if(!resuming||!music.trackId||!Number.isFinite(music.audio.currentTime)||music.audio.readyState<1)return;
 music.trackPositions[music.trackId]=music.audio.currentTime;
 try{localStorage.setItem(musicKey,JSON.stringify(music.trackPositions))}catch{}
}
music.audio.addEventListener('playing',()=>{document.querySelector('#sound').textContent='♫ 暂停音乐'});
setInterval(()=>{if(!music.audio.paused)rememberMusic()},750);
addEventListener('visibilitychange',()=>{if(document.hidden)rememberMusic()});
addEventListener('pagehide',()=>{rememberMusic();music.stop()});
addEventListener('pageshow',event=>{if(event.persisted)void startDefaultMusic()});

let wantsDefaultMusic=true,autoMusicBusy=false,noticeAccepted=!resuming;
music.onBeforeTrackChange=rememberMusic;
async function startDefaultMusic(){if(!noticeAccepted||!wantsDefaultMusic||music.enabled||autoMusicBusy)return;autoMusicBusy=true;try{await music.enable();if(wantsDefaultMusic)document.querySelector('#sound').textContent='♫ 暂停音乐';else music.stop()}catch{document.querySelector('#sound').textContent='♫ 点击开启音乐'}finally{autoMusicBusy=false}}
function resumeDefaultMusic(event){if(event.target?.closest?.('#sound')||!wantsDefaultMusic)return;music.context?.resume().catch(()=>{});if(music.enabled&&music.audio.paused&&data)music.phase='';else void startDefaultMusic()}
addEventListener('pointerdown',resumeDefaultMusic);addEventListener('keydown',resumeDefaultMusic);void startDefaultMusic();
document.querySelector('#sound').onclick=async()=>{const b=document.querySelector('#sound');if(music.enabled){wantsDefaultMusic=false;rememberMusic();music.stop();b.textContent='♫ 继续音乐'}else try{wantsDefaultMusic=true;await music.enable();b.textContent='♫ 暂停音乐'}catch(e){document.querySelector('#error').textContent=e.message}};document.querySelector('#fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
const interaction=new WaitingInteraction(stage,id,token);interaction.start();addEventListener('pagehide',()=>interaction.stop());
const recording=params.get('replay')==='1'?null:attachActivityJournal({id,token,getData:()=>data,getInteraction:()=>stage.interaction,openedAt:performance.timeOrigin});
await load();
frame();setInterval(load,500);
noticeAccepted=true;void startDefaultMusic();