// Same-origin, browser-local recordings. No replay is presented as a live recording.
const DB_NAME='lucky-live-recordings', CHANNEL='lucky-live-recordings';
let database;
function db(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{r.result.createObjectStore('sessions',{keyPath:'key'});r.result.createObjectStore('chunks',{keyPath:['session','index']})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function store(name,mode,fn){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(name,mode),request=fn(tx.objectStore(name));tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('录像保存失败'))})}
export async function listRecordings(activityId){const rows=await store('sessions','readonly',s=>s.getAll());return rows.filter(s=>s.activityId===String(activityId)).sort((a,b)=>b.startedAt-a.startedAt)}
export async function readRecording(key){const meta=await store('sessions','readonly',s=>s.get(key));if(!meta)throw Error('本浏览器没有这份现场录像');const chunks=await store('chunks','readonly',s=>s.getAll(IDBKeyRange.bound([key,0],[key,Number.MAX_SAFE_INTEGER])));if(!chunks.length)throw Error('录像尚未保存任何画面');return {meta,blob:new Blob(chunks.map(c=>c.blob),{type:meta.mimeType})}}
export async function finishRecording(key){const channel=new BroadcastChannel(CHANNEL);channel.postMessage({type:'stop',key});try{const deadline=Date.now()+10000;while(Date.now()<deadline){const meta=await store('sessions','readonly',s=>s.get(key));if(!meta?.active)return;await new Promise(r=>setTimeout(r,150))}throw Error('现场录制尚未结束，请回大屏停止录制后再导出')}finally{channel.close()}}
export function recordingStartSeconds(meta,minutes){if(minutes===null)return 0;if(!Number.isFinite(minutes)||minutes<0)throw Error('开奖前保留分钟数必须大于或等于 0');if(!Number.isFinite(meta.drawAt))throw Error('这份录像没有记录到开奖时间，无法按开奖时间裁剪');return Math.max(0,(meta.drawAt-meta.startedAt)/1000-minutes*60)}

// Call once from overlay.js: attachLiveRecording(stage,music,()=>data,id).
// Starts on page load and keeps recording the post-show until Stop is clicked.
export function attachLiveRecording(stage,music,getData,activityId){
 const button=document.createElement('button');button.id='liveRecording';button.type='button';button.textContent='正在准备现场录制…';(document.querySelector('#controls')||document.body).append(button);
 let recorder,stream,meta,channel,timer,index=0,pending=Promise.resolve(),stopped=false,failure='';
 const persist=()=>store('sessions','readwrite',s=>s.put({...meta}));
 const stop=()=>{if(recorder?.state==='recording'){stopped=true;button.disabled=true;button.textContent='正在保存现场录像…';recorder.stop()}};
 button.onclick=stop;
 const cleanup=()=>{clearInterval(timer);channel?.close();stream?.getTracks().forEach(t=>t.stop())};
 (async()=>{try{
  if(!globalThis.MediaRecorder||!stage.canvas.captureStream||!globalThis.indexedDB||!globalThis.BroadcastChannel)throw Error('浏览器不支持现场录制，请使用 Chrome 或 Edge');
  const mimeType=['video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mimeType)throw Error('没有可用的 WebM 编码器');
  // Prepare the same audio graph StageMusic.enable uses, without starting music.
  if(!music.context){music.context=new AudioContext();music.source=music.context.createMediaElementSource(music.audio);music.gain=music.context.createGain();music.source.connect(music.gain);music.gain.connect(music.context.destination);music.destination=music.context.createMediaStreamDestination();music.gain.connect(music.destination)}
  stream=stage.canvas.captureStream(30);for(const t of music.destination.stream.getAudioTracks())stream.addTrack(t.clone());
  const initial=getData();meta={key:crypto.randomUUID(),activityId:String(activityId),startedAt:Date.now(),endedAt:null,drawAt:null,active:true,mimeType,width:stage.canvas.width,height:stage.canvas.height,preDrawCaptured:initial?initial.status!=='drawn':null};await persist();
  recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000,audioBitsPerSecond:192000});
  recorder.ondataavailable=e=>{if(!e.data.size)return;const chunk={session:meta.key,index:index++,blob:e.data};pending=pending.then(async()=>{await store('chunks','readwrite',s=>s.put(chunk));meta.updatedAt=Date.now();await persist()}).catch(e=>{failure=e.message;stop()})};
  recorder.onerror=e=>{failure=e.error?.message||'录制失败';stop()};
  recorder.onstop=async()=>{clearInterval(timer);await pending;meta.active=false;meta.endedAt=Date.now();meta.error=failure;try{await persist();button.textContent=failure?'现场录制保存失败：'+failure:'现场录像已保存 · 请到结果导出页下载'}catch(e){button.textContent='现场录像保存失败：'+e.message}cleanup()};
  channel=new BroadcastChannel(CHANNEL);channel.onmessage=e=>{if(e.data?.type==='stop'&&e.data.key===meta.key)stop()};
  recorder.start(1000);button.textContent='● 现场录制中 · 点击结束并保存';
  timer=setInterval(()=>{const d=getData();if(!d||stopped)return;if(meta.preDrawCaptured===null)meta.preDrawCaptured=d.status!=='drawn';if(d.status==='drawn'&&meta.drawAt===null){meta.drawAt=Date.parse(d.revealStartedAt)||Date.now();pending=pending.then(persist).catch(e=>{failure=e.message;stop()})}},250);
  addEventListener('pagehide',stop,{once:true});
 }catch(e){failure=e.message;if(meta){meta.active=false;meta.error=failure;await persist().catch(()=>{})}cleanup();button.textContent='现场录制不可用：'+failure;button.disabled=true}})();
 return {stop};
}

// Decode and re-record a selected real segment. WebM chunks cannot be byte-sliced.
export async function trimRecording(blob,startSeconds,endSeconds,{signal,onProgress=()=>{}}={}){
 if(startSeconds<=0)return blob;
 const video=document.createElement('video'),canvas=document.createElement('canvas'),url=URL.createObjectURL(blob);video.src=url;video.playsInline=true;video.preload='auto';video.style.cssText='position:fixed;left:-10000px;width:2px;height:2px';document.body.append(video);
 let context,stream,recorder,frame,abort;
 const wait=event=>new Promise((resolve,reject)=>{const ok=()=>{clean();resolve()},bad=()=>{clean();reject(video.error||Error('录像无法解码'))},cancel=()=>{clean();reject(new DOMException('已取消','AbortError'))},clean=()=>{video.removeEventListener(event,ok);video.removeEventListener('error',bad);signal?.removeEventListener('abort',cancel)};video.addEventListener(event,ok,{once:true});video.addEventListener('error',bad,{once:true});signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel()});
 try{
  await wait('loadedmetadata');canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext('2d');
  // MediaRecorder WebM often has no finite duration; force the demuxer to find it.
  if(!Number.isFinite(video.duration)){const seek=wait('seeked');video.currentTime=1e10;await seek}
  const end=Math.min(Number.isFinite(video.duration)?video.duration:endSeconds,endSeconds);if(!(end>startSeconds))throw Error('所选时间段没有可用录像');
  const seek=wait('seeked');video.currentTime=startSeconds;await seek;ctx.drawImage(video,0,0);
  context=new AudioContext();const source=context.createMediaElementSource(video),destination=context.createMediaStreamDestination();source.connect(destination);await context.resume();
  stream=canvas.captureStream(30);for(const track of destination.stream.getAudioTracks())stream.addTrack(track);
  const mimeType=['video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const done=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||Error('视频裁剪失败'))});
  abort=()=>{if(recorder.state==='recording')recorder.stop()};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)throw new DOMException('已取消','AbortError');
  const draw=()=>{if(recorder.state!=='recording')return;ctx.drawImage(video,0,0);onProgress(Math.min(1,(video.currentTime-startSeconds)/(end-startSeconds)));if(video.ended||video.currentTime>=end){recorder.stop();return}frame=requestAnimationFrame(draw)};
  video.onended=abort;recorder.start(1000);await video.play();draw();await done;if(signal?.aborted)throw new DOMException('已取消','AbortError');const result=new Blob(chunks,{type:mimeType});if(!result.size)throw Error('裁剪视频为空');return result;
 }finally{signal?.removeEventListener('abort',abort);cancelAnimationFrame(frame);if(recorder?.state==='recording')recorder.stop();video.pause();video.remove();stream?.getTracks().forEach(t=>t.stop());await context?.close();URL.revokeObjectURL(url)}
}
