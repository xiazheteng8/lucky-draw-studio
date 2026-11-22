// Mirror the exact canvas being recorded instead of rendering a different fullscreen layout.
let display;
export function renderFullscreenStage(source){
 if(!document.fullscreenElement){if(display)display.hidden=true;return}
 if(!display){
  display=document.createElement('canvas');display.className='responsive-stage';display.setAttribute('aria-label','全屏抽奖舞台');document.body.append(display);
 }
 display.hidden=false;
 const ratio=Math.min(devicePixelRatio||1,1.5),scale=Math.min(ratio,3840/innerWidth,2160/innerHeight);
 const width=Math.round(innerWidth*scale),height=Math.round(innerHeight*scale);
 if(display.width!==width||display.height!==height){display.width=width;display.height=height}
 const c=display.getContext('2d'),fit=Math.min(width/source.canvas.width,height/source.canvas.height);
 const w=source.canvas.width*fit,h=source.canvas.height*fit;
 c.fillStyle=source.skin().deep;c.fillRect(0,0,width,height);
 c.drawImage(source.canvas,(width-w)/2,(height-h)/2,w,h);
}
