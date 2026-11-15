// User-provided human "Wow" recording. Source details: ./sfx/README.md
// Use StageMusic's shared gain: never bypass mute, volume or recording routing.
const soundUrl=new URL('./sfx/wow.wav',import.meta.url);
const decoded=new WeakMap();
let encoded;
function loadBytes(){
 if(!encoded)encoded=fetch(soundUrl).then(response=>{
  if(!response.ok)throw new Error(`Winner sound HTTP ${response.status}`);
  return response.arrayBuffer();
 }).catch(error=>{encoded=undefined;throw error});
 return encoded;
}
// Speculatively fetch on import; prepareWinnerSound exposes failures and retries.
void loadBytes().catch(()=>{});
export function prepareWinnerSound(context){
 let entry=decoded.get(context);
 if(!entry){
  entry={buffer:null,promise:null};
  entry.promise=loadBytes().then(bytes=>context.decodeAudioData(bytes.slice(0))).then(buffer=>{
   entry.buffer=buffer;return buffer;
  }).catch(error=>{decoded.delete(context);throw error});
  decoded.set(context,entry);
 }
 return entry.promise;
}
// Keep the synchronous API: return cancellation immediately, even during load.
export function playWinnerSound(context,output){
 let cancelled=false,source;
 const requestedAt=context.currentTime;
 const start=buffer=>{
  // Do not emit a stale reveal after a slow first download.
  if(cancelled||context.state==='closed'||context.currentTime-requestedAt>1)return;
  source=context.createBufferSource();source.buffer=buffer;source.connect(output);
  source.onended=()=>source.disconnect();source.start(context.currentTime+.01);
 };
 const cached=decoded.get(context)?.buffer;
 if(cached)start(cached);
 else void prepareWinnerSound(context).then(start).catch(error=>console.warn('Winner sound unavailable',error));
 return ()=>{cancelled=true;if(source){try{source.stop()}catch{}source.disconnect()}};
}
