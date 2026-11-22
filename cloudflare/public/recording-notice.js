export function showRecordingNotice(){
 const dialog=document.createElement('dialog');
 dialog.id='recordingNotice';
 dialog.setAttribute('closedby','none');
 dialog.setAttribute('aria-labelledby','recordingNoticeTitle');
 dialog.innerHTML=`<h2 id="recordingNoticeTitle"><span aria-hidden="true">⚠</span> 录屏须知</h2>
 <p>大屏打开时自动录制。候场结束或两轮之间开会，可以直接关闭大屏。重新打开会录制新片段，关屏期间不计入视频。</p>
 <p>在录制所用的浏览器里，从活动的「视频 / 结果导出」下载候场、摇奖或完整视频。系统按录制顺序拼接；直接关窗时，最后尚未写入的画面可能丢失。</p>
 <p class="recording-warning"><strong>录制时请勿最小化窗口。</strong> 最小化窗口或切到其他标签页后，浏览器可能暂停绘制动画，大屏会停止当前录制。恢复可见后只会录制新画面，期间发生的摇奖不会录进去，也无法补录。请等本轮开奖画面播放完再关大屏，会议结束后重新打开。</p>
 <p>关屏会暂停音乐。再次打开后，若浏览器拦截自动播放，点击大屏即可恢复。</p>
 <button type="button" class="primary">我已知晓</button>`;
 document.body.append(dialog);
 let confirmed=false;
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation()}});
 dialog.addEventListener('cancel',event=>event.preventDefault());
 dialog.addEventListener('close',()=>{if(!confirmed&&dialog.isConnected)dialog.showModal()});
 const accepted=new Promise(resolve=>{dialog.querySelector('button').onclick=()=>{confirmed=true;dialog.close();dialog.remove();resolve()}});
 dialog.showModal();
 return accepted;
}
