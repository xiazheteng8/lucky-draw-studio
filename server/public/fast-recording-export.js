import {prepareFastAudio} from './fast-audio.js';
import {Input,ALL_FORMATS,BlobSource,Output,Mp4OutputFormat,BufferTarget,StreamTarget,VideoSampleSource,AudioSampleSource,VideoSampleSink,AudioSampleSink} from './vendor/mediabunny-1.66.2.mjs';
export async function fastRecordingExport(clips,read,{signal,file,includeMusic=true,onProgress=()=>{}}={}){
 const check=()=>{if(signal?.aborted)throw signal.reason||new DOMException('已取消','AbortError')};check();
 if(!globalThis.VideoEncoder||!globalThis.AudioEncoder&&includeMusic)throw Error('当前浏览器不支持快速编码，请使用最新版 Chrome 或 Edge');
 if(includeMusic)await prepareFastAudio();
 let writable;const target=file?(writable=await file.createWritable(),new StreamTarget(new WritableStream({write:chunk=>writable.write({type:'write',position:chunk.position,data:chunk.data})}))):new BufferTarget(),output=new Output({format:new Mp4OutputFormat({fastStart:file?false:'in-memory'}),target});
 const video=new VideoSampleSource({codec:'avc',bitrate:8000000}),audio=includeMusic?new AudioSampleSource({codec:'aac',bitrate:192000}):null;
 output.addVideoTrack(video);if(audio)output.addAudioTrack(audio);
 const total=clips.reduce((n,c)=>n+c.to-c.from,0);let offset=0;
 let frames=0;try{await output.start();for(const requested of clips){check();let recording;try{recording=await read(requested.key)}catch(error){if(error.code==='EMPTY_RECORDING')continue;throw error}const {blob}=recording,input=new Input({source:new BlobSource(blob),formats:ALL_FORMATS});try{
 const track=await input.getPrimaryVideoTrack();if(!track)throw Error('录像缺少视频轨道');const actual=await input.computeDuration(),clip={...requested,to:Number.isFinite(actual)?Math.min(requested.to,actual):requested.to};if(clip.to<=clip.from)continue;const audioTrack=audio?await input.getPrimaryAudioTrack():null;const base=offset,duration=clip.to-clip.from;
 const videoTask=(async()=>{for await(const sample of new VideoSampleSink(track).samples(clip.from,clip.to)){try{check();const start=Math.max(clip.from,sample.timestamp),end=Math.min(clip.to,sample.timestamp+sample.duration);if(end<=start)continue;sample.setTimestamp(base+start-clip.from);sample.setDuration(end-start);await video.add(sample);frames++;onProgress(Math.min(.99,(base+end-clip.from)/total))}finally{sample.close()}}})();
 const audioTask=(async()=>{if(!audioTrack)return;for await(const sample of new AudioSampleSink(audioTrack).samples(clip.from,clip.to)){let trimmed;try{check();const first=Math.max(0,Math.ceil((clip.from-sample.timestamp)*sample.sampleRate)),last=Math.min(sample.numberOfFrames,Math.floor((clip.to-sample.timestamp)*sample.sampleRate));if(last<=first)continue;trimmed=sample.trim(first,last);trimmed.setTimestamp(base+Math.max(clip.from,trimmed.timestamp)-clip.from);await audio.add(trimmed)}finally{trimmed?.close();sample.close()}}})();
 await Promise.all([videoTask,audioTask]);offset+=duration;
 }finally{input.dispose()}}
 if(!frames)throw Error('所选时段没有实际保存的视频画面，可使用回放全过程重新生成');video.close();audio?.close();check();await output.finalize();if(writable){await writable.close();writable=null}onProgress(1);return file?null:new Blob([target.buffer],{type:'video/mp4'});
 }catch(error){await output.cancel().catch(()=>{});await writable?.abort().catch(()=>{});throw error}
}
