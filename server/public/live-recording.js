// Same-origin, browser-local recordings. No replay is presented as a live recording.
const DB_NAME='lucky-live-recordings', CHANNEL='lucky-live-recordings';
let database;
function db(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{r.result.createObjectStore('sessions',{keyPath:'key'});r.result.createObjectStore('chunks',{keyPath:['session','index']})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function store(name,mode,fn){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(name,mode),request=fn(tx.objectStore(name));tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('录像保存失败'))})}
function chunkRange(key){return IDBKeyRange.bound([key],[key,[]])}
export async function listRecordings(activityId){const rows=(await store('sessions','readonly',s=>s.getAll())).filter(s=>s.activityId===String(activityId)).sort((a,b)=>b.startedAt-a.startedAt);return Promise.all(rows.map(async meta=>{const actual=await store('chunks','readonly',s=>s.count(chunkRange(meta.key)));return {...meta,reportedChunkCount:meta.chunkCount,storedChunkCount:actual,chunkCount:actual}}))}
export async function readRecording(key){const meta=await store('sessions','readonly',s=>s.get(key));if(!meta)throw Error('本浏览器没有这份现场录像');const chunks=(await store('chunks','readonly',s=>s.getAll(chunkRange(key)))).filter(c=>c.blob instanceof Blob&&c.blob.size>0).sort((a,b)=>Number(a.index)-Number(b.index));if(!chunks.length){const error=Error('该片段只有录制记录，没有已保存的视频画面');error.code='EMPTY_RECORDING';throw error}return {meta,blob:new Blob(chunks.map(c=>c.blob),{type:meta.mimeType||chunks[0].blob.type||'video/webm'})}}
export function recordingDuration(meta) {
  return Math.max(0, ((meta.endedAt || meta.updatedAt || meta.startedAt) - meta.startedAt) / 1000);
}

export function mp4MimeType() {
  const types = ['video/mp4;codecs=avc1.42001f,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'];
  const type = types.find(value => globalThis.MediaRecorder?.isTypeSupported(value));
  if (!type) throw Error('当前浏览器不支持 MP4 编码，请更新 Chrome、Edge 或 Safari 后导出');
  return type;
}



export function planRecordingClips(rows,mode,drawAt){
 const clips=[];
 let through=-Infinity;
 for(const meta of [...rows].sort((a,b)=>a.startedAt-b.startedAt)){
  if(!Number.isFinite(meta.startedAt)||(!meta.chunkCount&&meta.chunkCount!==undefined))continue;
  const duration=Number.isFinite(meta.savedSeconds)?meta.savedSeconds:recordingDuration(meta);
  const start=Math.max(0,(through-meta.startedAt)/1000);
  if(duration<=start)continue;
  const legacyDraw=Number.isFinite(meta.drawAt)?meta.drawAt:drawAt;
  const split=meta.recordingVersion===2?(Number.isFinite(meta.drawOffset)?meta.drawOffset:Infinity):
   meta.preDrawCaptured===false?0:Number.isFinite(legacyDraw)?(legacyDraw-meta.startedAt)/1000:Infinity;
  const from=mode==='draw'?Math.max(start,split):start;
  const to=mode==='waiting'?Math.min(duration,split):duration;
  if(to>from){
   clips.push({key:meta.key,from,to});
   through=meta.startedAt+to*1000;
  }
 }
 return clips;
}

function ensureAudioGraph(music){
 if(music.context)return;
 music.context=new AudioContext();
 music.source=music.context.createMediaElementSource(music.audio);
 music.gain=music.context.createGain();
 music.source.connect(music.gain);
 music.gain.connect(music.context.destination);
 music.destination=music.context.createMediaStreamDestination();
 music.gain.connect(music.destination);
}

export function attachLiveRecording(stage,music,getData,activityId){
 const button=document.createElement('button'),hint=document.createElement('span');
 button.id='liveRecording';
 button.type='button';
 button.disabled=true;
 button.textContent='正在准备录制…';
 hint.id='recordingHint';
 const rules='大屏打开时自动录制，关闭时停止，重新打开后继续录制新片段。关屏期间不计入视频，导出时按顺序拼接。关窗时尚未保存的最后一小段可能丢失。音乐关屏时暂停，重开后续播；若浏览器拦截自动播放，点一下大屏即可。请在录制所用的浏览器里下载。';
 function setHint(message=''){
  hint.textContent=(message?message+' ':'')+rules;
  hint.title=hint.textContent;
 }
 setHint();
 button.setAttribute('aria-describedby',hint.id);
 (document.querySelector('#controls')||document.body).append(button);

 let session=null,enabled=true,starting=false,closed=false;
 async function commit(s,chunk){
  const target=await db();
  return new Promise((resolve,reject)=>{
   const tx=target.transaction(['sessions','chunks'],'readwrite');
   if(chunk)tx.objectStore('chunks').put(chunk);
   tx.objectStore('sessions').put({...s.meta});
   tx.oncomplete=resolve;
   tx.onabort=()=>reject(tx.error||Error('现场录像保存失败'));
  });
 }
 function stop(keepRecording=false){
  enabled=keepRecording;
  const s=session;
  if(s?.recorder.state==='recording'){
   s.stopAt=Date.now();
   button.textContent='正在保存片段…';
   s.recorder.stop();
  }
 }
 async function capture(){
  if(closed||!enabled||session)return;
  const canRecord=globalThis.MediaRecorder&&stage.canvas.captureStream&&globalThis.indexedDB&&globalThis.BroadcastChannel;
  if(!canRecord)throw Error('当前浏览器不支持现场录像');
  const mimeType=['video/webm;codecs=vp8,opus','video/webm','video/mp4;codecs=avc1.42001f,mp4a.40.2','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mimeType)throw Error('当前浏览器没有可用的录像编码器');
  ensureAudioGraph(music);
  const stream=stage.canvas.captureStream(30);
  const audio=music.context.state==='running'?music.destination.stream.getAudioTracks()[0]:null;
  if(audio)stream.addTrack(audio.clone());
  let recorder,channel;
  try{
   recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000,audioBitsPerSecond:192000,videoKeyFrameIntervalDuration:1000});
   channel=new BroadcastChannel(CHANNEL);
  }catch(error){stream.getTracks().forEach(track=>track.stop());throw error}
  const startedAt=Date.now(),clock=performance.now();
  const meta={recordingVersion:2,key:crypto.randomUUID(),activityId:String(activityId),startedAt,updatedAt:startedAt,active:true,
   mimeType:recorder.mimeType||mimeType,width:stage.canvas.width,height:stage.canvas.height,
   drawOffset:getData()?.status==='drawn'?0:null,savedSeconds:0,chunkCount:0};
  const s={recorder,meta,clock,stopAt:null,hasAudio:Boolean(audio)};
  let pending=Promise.resolve(),error='',nextIndex=0;
  session=s;
  let resolveStop;
  const done=new Promise(resolve=>{resolveStop=resolve});
  recorder.ondataavailable=event=>{
   if(!event.data.size)return;
   const index=nextIndex++,savedSeconds=Math.max(meta.savedSeconds,Math.min((s.stopAt||Date.now())-startedAt,performance.now()-clock)/1000),updatedAt=Date.now();
   pending=pending.then(async()=>{if(error)return;const snapshot={meta:{...meta,chunkCount:index+1,savedSeconds,updatedAt,bytesSaved:(meta.bytesSaved||0)+event.data.size}};await commit(snapshot,{session:meta.key,index,blob:event.data});Object.assign(meta,{chunkCount:index+1,savedSeconds,updatedAt,bytesSaved:snapshot.meta.bytesSaved})}).catch(problem=>{error=problem.name==='QuotaExceededError'?'浏览器录像空间已满；此前成功保存的片段仍可导出':problem.message;stop()});
  };
  recorder.onerror=event=>{error=event.error?.message||'编码器停止工作';stop()};
  recorder.onstop=async()=>{
   await pending;
   meta.endedAt=s.stopAt||Date.now();
   meta.active=false;
   meta.error=error;
   try{await commit(s)}catch(problem){error=problem.message}
   finally{
    channel.close();
    stream.getTracks().forEach(track=>track.stop());
    session=null;
    button.textContent=error?'录制保存异常':'正在准备录制…';
    if(error)setHint('录制保存异常：'+error);
    resolveStop();
   }
  };
  channel.onmessage=event=>{if(event.data?.type==='stop'&&event.data.key===meta.key)stop()};
  try{
   recorder.start(750);
   pending=commit({meta:{...meta}}).catch(problem=>{error=problem.message;stop()});
   button.textContent='正在录制抽奖全过程';
   setHint();
   await done;
  }catch(error){
   channel.close();stream.getTracks().forEach(track=>track.stop());session=null;throw error;
  }
 }
 function begin(){
  if(starting||closed||document.hidden||session||!enabled||!getData())return;
  starting=true;
  const captureHere=lock=>{
   if(lock===null){enabled=false;button.textContent='另一窗口正在录制';setHint('请使用另一扇大屏，或关闭它后刷新此页。');return}
   return capture();
  };
  const task=navigator.locks?navigator.locks.request('lucky-live:'+activityId,{ifAvailable:true},captureHere):capture();
  task.catch(error=>{enabled=false;button.textContent='录制不可用';setHint(error.message+'。请刷新大屏重试。')}).finally(()=>{starting=false});
 }
 addEventListener('visibilitychange',()=>{
  if(document.hidden&&session?.recorder.state==='recording'){
   stop(true);
  }else if(!document.hidden)begin();
 });
 addEventListener('pagehide',()=>{closed=true;stop()});
 addEventListener('pageshow',event=>{if(event.persisted){closed=false;enabled=true;begin()}});
 return {observe(){
  if(session&&session.meta.drawOffset===null&&getData()?.status==='drawn')session.meta.drawOffset=(performance.now()-session.clock)/1000;
  if(session?.recorder.state==='recording'&&session.hasAudio!==(music.context.state==='running'))stop(true);
  begin();
 }};
}


async function stitchRecordingsRealtime(clips,{signal,includeMusic=true,onProgress=()=>{}}={}){
 const cancelled=()=>new DOMException('已取消','AbortError');
 if(signal?.aborted)throw cancelled();
 if(!clips.length)throw Error('没有可导出的录像片段');
 const mimeType=mp4MimeType();
 const video=document.createElement('video'),canvas=document.createElement('canvas');
 video.playsInline=true;
 video.preload='auto';
 video.style.cssText='position:fixed;left:-10000px;width:2px;height:2px';
 document.body.append(video);
 const context=includeMusic?new AudioContext():null;
 let stream,recorder,done,url,frame=0,failPlayback;
 const chunks=[];
 const total=clips.reduce((sum,clip)=>sum+clip.to-clip.from,0);
 const abort=()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();failPlayback?.(cancelled())};
 signal?.addEventListener('abort',abort);
 const wait=(name)=>new Promise((resolve,reject)=>{
  const clean=()=>{clearTimeout(timer);video.removeEventListener(name,ok);video.removeEventListener('error',bad);signal?.removeEventListener('abort',cancel)};
  const ok=()=>{clean();resolve()},bad=()=>{clean();reject(Error('录像片段无法解码'))},cancel=()=>{clean();reject(cancelled())};
  const timer=setTimeout(()=>{clean();reject(Error('读取录像片段超时'))},20000);
  video.addEventListener(name,ok,{once:true});
  video.addEventListener('error',bad,{once:true});
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)cancel();
 });
 try{
  let destination;
  if(context){
   const source=context.createMediaElementSource(video);
   destination=context.createMediaStreamDestination();
   source.connect(destination);
   const resumeAudio=context.resume();
   let retry;
   try{
    await Promise.race([resumeAudio,new Promise((_,reject)=>{retry=setTimeout(()=>reject(Error('音频处理未启动，请保持页面在前台后重试，或取消「视频包含音乐」')),7000)})]);
   }finally{clearTimeout(retry)}

  }else video.muted=true;
  let completed=0;
  const ctx=canvas.getContext('2d');
  for(const clip of clips){
   if(signal?.aborted)throw cancelled();
   const {blob}=await readRecording(clip.key);
   url=URL.createObjectURL(blob);
   const loaded=wait('loadedmetadata');
   video.src=url;
   await loaded;
   let end=Math.min(clip.to,Number.isFinite(video.duration)?video.duration:clip.to);
   if(end<=clip.from){video.removeAttribute('src');video.load();URL.revokeObjectURL(url);url=null;continue}
   if(clip.from>0){const seek=wait('seeked');video.currentTime=clip.from;await seek}
   if(video.readyState<2)await wait('loadeddata');
   if(!recorder){canvas.width=video.videoWidth;canvas.height=video.videoHeight}
   ctx.drawImage(video,0,0,canvas.width,canvas.height);
   if(!recorder){
    stream=canvas.captureStream(30);
    for(const track of destination?.stream.getAudioTracks()||[])stream.addTrack(track);
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000,audioBitsPerSecond:192000});
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
    done=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=event=>{const error=event.error||Error('MP4 编码失败');failPlayback?.(error);reject(error)}});
    done.catch(()=>{});
   }
   const play=video.play();
   if(recorder.state==='inactive')recorder.start(1000);
   else if(recorder.state==='paused')recorder.resume();
   const playTimeout=new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('录像片段无法开始播放')),12000);play.then(()=>clearTimeout(timer),()=>clearTimeout(timer))});
   await Promise.race([play,playTimeout]);
   await new Promise((resolve,reject)=>{
    const clear=()=>{clearTimeout(timer);cancelAnimationFrame(frame);video.onended=video.onerror=video.ontimeupdate=null;failPlayback=null};
    const finish=()=>{clear();resolve()};
    const fail=error=>{clear();reject(error)};
    const timer=setTimeout(()=>fail(Error('录制片段播放超时，请保持导出页面可见')),Math.max(20000,(end-clip.from+20)*1000));
    failPlayback=fail;
    video.onended=finish;
   video.ontimeupdate=()=>{if(video.currentTime>=end&&document.hidden)fail(Error('请让导出页面保持可见后重试'))};
    video.onerror=()=>fail(Error('拼接时读取录像失败'));
    const draw=()=>{
     if(signal?.aborted){fail(cancelled());return}
     ctx.drawImage(video,0,0,canvas.width,canvas.height);
     onProgress(Math.min(1,(completed+video.currentTime-clip.from)/total));
     if(video.ended||video.currentTime>=end){finish();return}
     frame=requestAnimationFrame(draw);
    };
    draw();
   });
   if(recorder.state==='recording')recorder.pause();
   video.pause();
   completed+=Math.min(end,video.currentTime)-clip.from;
   video.removeAttribute('src');
   video.load();
   URL.revokeObjectURL(url);
   url=null;
  }
  if(!recorder)throw Error('没有可解码的录像画面');
  if(recorder.state!=='inactive')recorder.stop();
  await done;
  if(signal?.aborted)throw cancelled();
  const blob=new Blob(chunks,{type:recorder.mimeType||mimeType});
  if(!blob.size)throw Error('拼接结果为空');
  onProgress(1);
  return blob;
 }finally{
  signal?.removeEventListener('abort',abort);
  cancelAnimationFrame(frame);
  if(recorder&&recorder.state!=='inactive')recorder.stop();
  video.pause();
  video.remove();
  stream?.getTracks().forEach(track=>track.stop());
  if(url)URL.revokeObjectURL(url);
  await context?.close();
 }
}

export async function stitchRecordings(clips,options={}){if(globalThis.VideoEncoder&&(!options.includeMusic||globalThis.AudioEncoder)){const {fastRecordingExport}=await import('./fast-recording-export.js?v=20261122-fix8');return fastRecordingExport(clips,readRecording,options)}return stitchRecordingsRealtime(clips,options)}
