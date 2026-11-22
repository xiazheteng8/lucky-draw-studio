export function drawPrizeCover(context,image,x,y,width,height){
 if(!image||!(width>0&&height>0))return;
 const sourceWidth=image.naturalWidth??image.width;
 const sourceHeight=image.naturalHeight??image.height;
 if(!(sourceWidth>0&&sourceHeight>0))return;
 const scale=Math.max(width/sourceWidth,height/sourceHeight);
 const cropWidth=Math.min(sourceWidth,width/scale);
 const cropHeight=Math.min(sourceHeight,height/scale);
 const cropX=(sourceWidth-cropWidth)/2;
 const cropY=(sourceHeight-cropHeight)/2;
 context.drawImage(image,cropX,cropY,cropWidth,cropHeight,x,y,width,height);
}
