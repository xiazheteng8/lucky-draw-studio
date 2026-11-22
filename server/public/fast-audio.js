import {canEncodeAudio} from './vendor/mediabunny-1.66.2.mjs';
let ready;
export function prepareFastAudio(){return ready??=(async()=>{const {registerAacEncoder}=await import('./vendor/mediabunny-aac-encoder-1.66.2.mjs');registerAacEncoder()})()}
