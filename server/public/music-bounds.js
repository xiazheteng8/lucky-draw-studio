export function audibleBounds(buffer){
 const stride=Math.max(1,Math.floor(buffer.sampleRate*.012));
 const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 const threshold=.0025;
 let start=-1,end=0;
 for(let offset=0;offset<buffer.length;offset+=stride){
  let power=0,peak=0,n=0;
  for(let i=offset;i<Math.min(buffer.length,offset+stride);i+=4){
   for(const data of channels){const value=Math.abs(data[i]);power+=value*value;peak=Math.max(peak,value);n++}
  }
  if(Math.sqrt(power/Math.max(1,n))>=threshold||peak>.015){
   if(start<0)start=offset;
   end=offset+stride;
  }
 }
 if(start<0)return null;
 const inset=.035;
 return {start:Math.max(0,start/buffer.sampleRate-inset),end:Math.min(buffer.duration,end/buffer.sampleRate+inset)};
}

const analyses=new Map();
export function analyzeMusic(id,blob){
 if(!analyses.has(id)){
  const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
  if(!Offline)return Promise.resolve(null);
  const pending=blob.arrayBuffer().then(bytes=>new Offline(1,1,44100).decodeAudioData(bytes)).then(audibleBounds).catch(()=>null);
  analyses.set(id,pending);
 }
 return analyses.get(id);
}
export function bindMusicBounds(audio,bounds){
 if(!bounds)return;
 const position=audio.currentTime;
 if(position>=bounds.end||position<bounds.start-.01)audio.currentTime=bounds.start;
}
