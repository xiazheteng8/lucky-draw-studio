// The same illustration family as the workspace, arranged for the stage layout.
import {ornamentRegion} from './ornament-regions.js?v=20261120-stage3';
const colors={deepsea:['#07131f','#102c3e'],gala:['#100d09','#302517'],aurora:['#081c18','#204538'],cyber:['#130c21','#2b1742'],sakura:['#fff3f7','#f0dce7'],paper:['#f8f2e5','#e7ddc8'],caishen:['#4b131b','#8a3034']};
export function drawStageOrnament(stage,role,x,y,w,h,alpha=1){
 const id=stage.skin().id;if(id==='festival')return;const url='/themes/ornaments-'+id+'-v2.png',img=stage.images.get(url);if(!img){if(!stage.loading.has(url))void stage.image(url);return}
 const r=ornamentRegion(id,role),scale=Math.min(w/r[2],h/r[3]),c=stage.ctx;c.save();c.globalAlpha*=alpha;c.shadowBlur=0;c.drawImage(img,...r,x+(w-r[2]*scale)/2,y+(h-r[3]*scale)/2,r[2]*scale,r[3]*scale);c.restore();
}
export function drawStageBackdrop(stage,w=1920,h=1080){
 if(stage.skin().id==='festival')return false;const c=stage.ctx,p=colors[stage.skin().id]||colors.deepsea,g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,p[0]);g.addColorStop(1,p[1]);c.save();c.fillStyle=g;c.fillRect(0,0,w,h);
 // Purpose-composed panoramic scenery, independent of the workspace ornaments.
 const url='/themes/stage-scene-'+stage.skin().id+'-v3.png',scene=stage.images.get(url);
 if(scene){const scale=Math.max(w/scene.width,h/scene.height);c.drawImage(scene,(w-scene.width*scale)/2,(h-scene.height*scale)/2,scene.width*scale,scene.height*scale)}else if(!stage.loading.has(url))void stage.image(url);
 c.restore();return true;
}
export function drawStagePanelOrnament(stage,x,y,w,h){
 if(stage.skin().id==='festival')return;const role=x<490?'stat1':x<1300?'stat2':'stat3',size=Math.min(105,h*.21,w*.22);
 drawStageOrnament(stage,role,x+w-size-18,y+h-size-15,size,size,.23);
}
