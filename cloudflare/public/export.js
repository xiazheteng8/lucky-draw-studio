import {loadActivityJournal,journalReplayPlan} from './activity-replay-journal.js?v=20261122-replay10';
import {replayPlan,recordReplay} from './replay-export.js?v=20261122-replay10';
import './local-activities.js?v=20261122-replay10';
import {buildDrawTimeline} from './draw-timeline.js?v=20261122-replay10';
import {LuckyStage} from './stage.js?v=20261122-replay10';

const $=selector=>document.querySelector(selector);
const query=new URLSearchParams(location.search),id=query.get('id'),token=query.get('token');
const canvas=$('#preview'),stage=new LuckyStage(canvas);
const downloadTypes={waiting:'候场视频',draw:'摇奖视频',full:'完整视频'};
let data,pages=1,available=[],controller,journal=null,requestedMode="full";
const results=new Map();
function save(blob,name){
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');
 anchor.href=url;anchor.download=name;anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function preview(){
 if(!data)return;
 const [width,height]=$('#resolution').value.split(',').map(Number);
 canvas.width=width;canvas.height=height;
 stage.fixedPage=true;
 stage.render(buildDrawTimeline(data).durationMs+6000,data.status==='drawn');
 $('#pageLabel').textContent='第 '+(stage.page+1)+' / '+pages+' 页';
}
function formatTime(seconds){const n=Math.max(0,Math.round(seconds));return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(':')}
function plan(mode){if(!journal?.intervals?.length)return [];const p=journalReplayPlan(data,journal,mode);return p.duration>0?[{from:0,to:p.duration/1000}]:[]}
function updateControls(){
 for(const button of document.querySelectorAll('[data-video]'))button.disabled=Boolean(controller)||!data||(button.dataset.video==='draw'&&data.status!=='drawn');
 for(const id of ['#resolution','#image','#prev','#next','#includeMusic','#refreshRecordings','#replayWaiting','#fps'])$(id).disabled=Boolean(controller);
 $('#replayVideo').disabled=Boolean(controller)||data?.status!=='drawn'||!data?.winners?.length;
 $('#cancel').hidden=!controller;
}
async function refresh(){
 try{journal=await loadActivityJournal(id,token);const seconds=plan('full').reduce((n,c)=>n+c.to-c.from,0);document.querySelector('#recordingStatus').textContent=seconds>0?'本场开屏累计 '+formatTime(seconds)+'（'+Math.round(seconds)+' 秒），'+journal.intervals.length+' 个开屏区间。关闭期间不计入，最小化继续计时。':'本场暂无可信的开屏计时。可手动设置候场时长重绘；旧编号录像不会计入本场。'}catch(error){document.querySelector('#recordingStatus').textContent='读取本场回放数据失败：'+error.message}updateControls();
}
function openReplayOptions(mode='full'){requestedMode=mode;const seconds=plan('waiting').reduce((n,c)=>n+c.to-c.from,0);document.querySelector('#replayWaiting').value=String(Math.round(seconds*10)/10);document.querySelector('#replayWaitingInfo').textContent=seconds>0?'已记录本场完整候场 '+formatTime(seconds)+'，默认全部保留，可修改。':'尚无可信开屏记录，请填写实际需要重绘的候场时长。旧录像统计未采用。';document.querySelector('#replayOptions').showModal()}
function syntheticPlan(mode,seconds){if(mode==='waiting')return {duration:seconds*1000,waitingMs:seconds*1000,pages:0,drawEnd:0};return replayPlan(data,mode==='draw'?0:seconds)}
async function download(mode){if(controller)return;if(!journal?.intervals?.length&&mode!=='draw'){openReplayOptions(mode);return}const p=journal?.intervals?.length?journalReplayPlan(data,journal,mode):syntheticPlan(mode,0);await exportReplay(p,mode,document.querySelector('[data-video="'+mode+'"]'))}
async function generateReplay(waitingSeconds){const p=journal?.intervals?.length?journalReplayPlan(data,journal,requestedMode,waitingSeconds):syntheticPlan(requestedMode,waitingSeconds);return exportReplay(p,requestedMode,document.querySelector('#replayVideo'))}
async function exportReplay(p,mode,button){if(controller)return;if(!p.duration){document.querySelector('#exportStatus').textContent='所选时段没有可导出的画面，请填写候场时长或等待开奖。';return}controller=new AbortController();const active=controller,title=button.textContent,filename='瞎折腾摇奖吧-'+id+'-'+downloadTypes[mode]+'-活动回放.mp4';let phase='replay',percent='0%';const phases={replay:'正在回放，请勿关闭页面',audio:'正在合成音频，请勿关闭页面',mux:'正在合成 MP4 视频，请勿关闭页面',saving:'正在保存 MP4 视频'};updateControls();button.classList.add('assembling');
 const setPhase=value=>{phase=value;button.textContent=phases[value];document.querySelector('#exportStatus').textContent=phases[value]};
 try{let file;if(typeof showSaveFilePicker==='function'&&window.top===window){try{file=await showSaveFilePicker({suggestedName:filename,types:[{description:'MP4 视频',accept:{'video/mp4':['.mp4']}}]})}catch(error){if(!['SecurityError','NotSupportedError'].includes(error.name))throw error}}setPhase('replay');stage.giftFx=null;stage.attendanceState=null;if(journal?.qr)await stage.image(journal.qr);const blob=await recordReplay(stage,data,p,{signal:active.signal,file,fps:Number(document.querySelector('#fps').value),includeMusic:document.querySelector('#includeMusic').checked,onPhase:setPhase,onFrame:frame=>{if(phase!=='replay')return;document.querySelector('#exportStatus').textContent=phases.replay+' · 预览 '+formatTime(frame.time)+' / '+formatTime(frame.duration)+' · 生成速度 '+Math.max(0,frame.speed).toFixed(1)+'×，成片正常速度'},onProgress:value=>{percent=Math.floor(value*100)+'%';button.style.setProperty('--video-progress',percent);button.textContent=phases[phase]+(phase==='replay'||phase==='audio'?' · '+percent:'')}});if(blob)save(blob,filename);document.querySelector('#exportStatus').textContent='MP4 已生成并保存 · '+(file?file.name:filename)}catch(error){document.querySelector('#exportStatus').textContent=error.name==='AbortError'?'已取消导出':'回放视频导出失败：'+error.message}finally{button.classList.remove('assembling');button.textContent=title;controller=null;preview();await refresh()}
}
for(const button of document.querySelectorAll('[data-video]'))button.onclick=()=>download(button.dataset.video);
$('#refreshRecordings').onclick=refresh;
setInterval(()=>{if(data&&!controller&&!document.hidden)void refresh()},2500);
$('#cancel').onclick=()=>controller?.abort();
$('#sheet').onclick=async()=>{
 const button=$('#sheet');
 if(!data?.winners?.length||button.disabled)return;
 button.disabled=true;
 try{
  if(String(id).startsWith('local-')){await LocalActivities.exportRows(id,'xlsx');return}
  const response=await fetch('/api/giveaways/'+encodeURIComponent(id)+'/export.xlsx');
  if(response.ok&&response.headers.get('content-type')?.includes('spreadsheetml')){
   LocalActivities.downloadWorkbook(await response.blob(),'完整中奖名单.xlsx');
   return;
  }
  if(![401,403,404].includes(response.status))throw Error('Excel 下载失败（'+response.status+'）');
  const rows=data.winners.map((person,index)=>({
   '名次':index+1,
   '账号':person.handle||'',
   '姓名':person.name||person.author_name||'',
   '完整评论':person.text||'',
   '获奖名称':stage.rankName(index)
  }));
  LocalActivities.downloadWorkbook(await LocalActivities.exportWorkbook(rows),'完整中奖名单.xlsx');
 }catch(error){$('#exportStatus').textContent=error.message}
 finally{button.disabled=false}
};
$('#resolution').onchange=preview;
$('#prev').onclick=()=>{stage.page=(stage.page-1+pages)%pages;preview()};
$('#next').onclick=()=>{stage.page=(stage.page+1)%pages;preview()};
$('#image').onclick=()=>canvas.toBlob(blob=>{if(blob)save(blob,'瞎折腾摇奖吧-'+id+'-第'+(stage.page+1)+'页.png')},'image/png');
addEventListener('lucky-theme-change',()=>{if(data)preview()});
try{
 const response=await fetch('/api/overlay/'+encodeURIComponent(id)+'?token='+encodeURIComponent(token||''));
 if(!response.ok)throw Error('活动链接无效');
 data=await response.json();
 document.title=(data.title||'抽奖活动')+' · 导出';
 window.__themeFrozen=true;
 if(data.presentation?.theme)window.LuckyTheme?.commit(data.presentation.theme,data.presentation.animation);
 const drawn=data.status==='drawn'&&data.winners?.length;
 for(const id of ['#image','#sheet','#prev','#next','#pageLabel'])$(id).hidden=!drawn;

 pages=Math.max(1,Math.ceil((data.winners?.length||0)/8));
 await stage.setData(data);
 preview();
 $('#exportStatus').textContent='';
 await refresh();
}catch(error){$('#exportStatus').textContent=error.message;updateControls()}


$('#replayVideo').onclick=()=>{if(!controller)openReplayOptions('full')};
$('#cancelReplayOptions').onclick=()=>$('#replayOptions').close();
$('#replayOptionsForm').onsubmit=event=>{event.preventDefault();const seconds=Number($('#replayWaiting').value);if(!Number.isFinite(seconds)||seconds<0)return;$('#replayOptions').close();void generateReplay(seconds)};
