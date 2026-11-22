import {buildDrawTimeline} from './draw-timeline.js?v=20261122-replay10';
import {mp4MimeType} from './live-recording.js?v=20261122-fix8';
import {StageMusic} from './stage.js?v=20261122-replay10';

export function replayPlan(data,waitingSeconds=30){
 const timeline=buildDrawTimeline(data);
 if(!timeline.rounds.length)throw Error('活动暂无开奖记录');
 const manual=data.presentation?.drawMode!=='auto';
 const savedRound=Math.max(0,Math.floor(Number(data.revealControl?.round)||0));
 const last=manual?Math.min(savedRound,timeline.rounds.length-1):timeline.rounds.length-1;
 const finished=last===timeline.rounds.length-1;
 const drawEnd=timeline.rounds[last].endMs;
 const pages=finished?Math.ceil((data.winners?.length||0)/8):0;
 const duration=drawEnd+pages*6500;
 const waitingMs=Math.max(0,Number(waitingSeconds)||0)*1000;return {drawEnd,pages,waitingMs,duration:duration+waitingMs};
}

export async function recordReplay(stage,data,plan,options){if(globalThis.VideoEncoder&&(!options.includeMusic||globalThis.AudioEncoder)){const {fastReplay}=await import('./fast-replay-export.js?v=20261122-replay10');return fastReplay(stage,data,plan,options)}return recordReplayRealtime(stage,data,plan,options)}
async function recordReplayRealtime(stage,data,plan,{signal,includeMusic,onProgress,onPhase=()=>{},onFrame=()=>{},file}){
 const cancelled=()=>signal.reason||new DOMException('已取消','AbortError');
 if(signal.aborted)throw cancelled();
 const codec=mp4MimeType();
 const chunks=[];
 let music,stream,recorder,handle,ticket,output,writeFailure,renderFailure,completion;
 let writes=Promise.resolve();
 const stop=()=>{if(recorder&&recorder.state!=='inactive')recorder.stop()};
 const abort=()=>stop();
 signal.addEventListener('abort',abort);
 const previousFixed=stage.fixedPage,previousPage=stage.page,previousData=stage.data,previousInteraction=stage.interaction,previousClock=stage.replayClock,waitingData={...data,status:'ready',winners:[],stats:{...data.stats,winners:0}};
 try{
  if(file)output=await file.createWritable();
  if(includeMusic){
   music=new StageMusic();
   let timeout,interrupted;
   try{
    await Promise.race([
     music.enable(),
     new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('音频启动超时，可取消「视频包含音乐」后重试')),12000)}),
     new Promise((_,reject)=>{interrupted=()=>reject(cancelled());signal.addEventListener('abort',interrupted,{once:true});if(signal.aborted)interrupted()})
    ]);
   }finally{clearTimeout(timeout);signal.removeEventListener('abort',interrupted)}
  }
  if(signal.aborted)throw cancelled();
  ticket=await navigator.wakeLock?.request('screen').catch(()=>null);
  if(signal.aborted)throw cancelled();
  stage.fixedPage=false;
  stage.render(0);
  stream=stage.canvas.captureStream(30);
  if(music?.destination){
   const track=music.destination.stream.getAudioTracks()[0];
   if(track)stream.addTrack(track.clone());
  }
  recorder=new MediaRecorder(stream,{mimeType:codec,videoBitsPerSecond:stage.canvas.width>=3840?18000000:8000000,audioBitsPerSecond:160000});
  completion=new Promise((resolve,reject)=>{
   recorder.onstop=resolve;
   recorder.onerror=event=>reject(event.error||Error('回放编码失败'));
  });
  completion.catch(()=>{});
  recorder.ondataavailable=event=>{
   if(!event.data.size)return;
   if(output)writes=writes.then(()=>output.write(event.data)).catch(error=>{writeFailure=error;stop()});
   else chunks.push(event.data);
  };
  onPhase('replay');let start;
  function frame(now){
   if(recorder.state!=='recording')return;
   if(start===undefined)start=now;
   const elapsed=Math.min(plan.duration,now-start);
   const waiting=elapsed<plan.waitingMs,drawElapsed=Math.max(0,elapsed-plan.waitingMs),sampled=plan.sampleAt?.(elapsed);stage.data=sampled?.data||(waiting?waitingData:data);stage.interaction=sampled?.interaction;stage.replayClock=sampled?.clock;
   if(!sampled&&!waiting&&drawElapsed>=plan.drawEnd&&plan.pages){
    stage.fixedPage=true;
    stage.page=Math.min(plan.pages-1,Math.floor((drawElapsed-plan.drawEnd)/6500));
   }
   const state=stage.render(sampled?sampled.elapsed:waiting?elapsed:drawElapsed);onFrame({time:elapsed/1000,duration:plan.duration/1000,speed:1});
   if(music)void music.update(state,stage.data).catch(()=>{});
   onProgress(elapsed/plan.duration);
   if(elapsed>=plan.duration)stop();
   else handle=requestAnimationFrame(render);
  }
  function render(now){
   try{frame(now)}catch(error){renderFailure=error;stop()}
  }
  recorder.start(1000);
  handle=requestAnimationFrame(render);
  await completion;
  onPhase('mux');await new Promise(requestAnimationFrame);await writes;
  if(writeFailure)throw writeFailure;
  if(renderFailure)throw renderFailure;
  if(signal.aborted)throw cancelled();
  if(output){onPhase('saving');await output.close();output=null;return null}
  const blob=new Blob(chunks,{type:recorder.mimeType||codec});
  if(!blob.size)throw Error('回放视频为空');
  return blob;
 }finally{
  signal.removeEventListener('abort',abort);
  cancelAnimationFrame(handle);
  stop();
  await writes.catch(()=>{});
  await output?.abort().catch(()=>{});
  await ticket?.release().catch(()=>{});
  stream?.getTracks().forEach(track=>track.stop());
  if(music){
   music.stop();
   music.audio.removeAttribute('src');
   for(const url of music.preloaded.values())URL.revokeObjectURL(url);
   await music.context?.close().catch(()=>{});
  }
  stage.data=previousData;stage.fixedPage=previousFixed;
  stage.page=previousPage;stage.interaction=previousInteraction;stage.replayClock=previousClock;
 }
}
