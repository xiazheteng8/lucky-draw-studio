import {drawStagePanelOrnament} from './stage-ornaments.js?v=20261120-stage3';
const owners=new WeakMap();
export function registerThemeFrame(context,stage){owners.set(context,stage)}
export function drawThemeFrame(context,x,y,width,height){
 const stage=owners.get(context);if(!stage||stage.skin().id==='festival'||width<100||height<45)return;const url='/themes/frame-'+stage.skin().id+'.svg',image=stage.images.get(url);if(!image){if(!stage.loading.has(url))void stage.image(url);return}
 drawStagePanelOrnament(stage,x,y,width,height);
 const edge=Math.min(height<140?12:27,width/5,height/5),sx=[0,80,520,600],sy=[0,80,320,400],dx=[x,x+edge,x+width-edge,x+width],dy=[y,y+edge,y+height-edge,y+height];context.save();context.shadowBlur=0;context.shadowColor='transparent';context.shadowOffsetX=0;context.shadowOffsetY=0;for(let row=0;row<3;row++)for(let col=0;col<3;col++){if(row===1&&col===1)continue;if(stage.skin().id==='caishen'&&row===1&&(col===0||col===2)){const length=dy[row+1]-dy[row],count=Math.max(1,Math.round(length/(240*edge/80))),tile=length/count;for(let i=0;i<count;i++)context.drawImage(image,sx[col],80,80,240,dx[col],dy[row]+i*tile,edge,tile);continue}context.drawImage(image,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row])}context.restore();
}
