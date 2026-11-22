export function activityLogo(stage,x=69,y=59){
 const c=stage.ctx,skin=stage.skin();
 c.save();
 stage.avatar({avatar:stage.data.presentation?.logoImage||'/default-logo.jpg',name:'瞎'},x,y,24);
 c.font='600 13px "Microsoft YaHei",sans-serif';
 c.textAlign='center';
 c.lineJoin='round';c.strokeStyle='#23151c';c.lineWidth=3;
 c.strokeText('瞎折腾摇奖吧',x,y+42);
 c.fillStyle='#fff5df';c.fillText('瞎折腾摇奖吧',x,y+42);
 c.restore();
}

export function candidateMessage(stage,state,person,fallback){
 const entry=state.entry;
 if(!entry||!['prompt','rejection'].includes(state.phase))return;
 const comment=['youtube','comments'].includes(stage.data.sourceMode);
 const body=comment?String(person?.text||'').trim():fallback;
 const heading=entry.winning
  ? comment?'中奖 · 评论互动展示':'恭喜中奖'
  : comment?'本轮未中奖 · 仅评论互动展示':'本轮未中奖 · 祝福互动';
 if(entry.winning&&!comment)return;
 const c=stage.ctx,skin=stage.skin(),gold=entry.winning?'#ffda80':'#ffe0a1';
 c.save();
 c.fillStyle='#291d26f5';c.strokeStyle=gold;c.lineWidth=3;
 c.beginPath();c.roundRect(460,748,1000,117,17);c.fill();c.stroke();
 c.textAlign='center';c.fillStyle=gold;c.font='700 30px "Microsoft YaHei", sans-serif';
 c.fillText(heading,960,790,946);
 c.fillStyle='#fff8e8';c.font='600 24px "Microsoft YaHei", sans-serif';
 const chars=Array.from(body||'这位参与者没有可展示的评论');
 let line='',lines=[];
 for(const char of chars){
  if(c.measureText(line+char).width>925){lines.push(line);line='';if(lines.length===2)break}
  line+=char;
 }
 if(lines.length<2&&line)lines.push(line);
 if(lines.length===2&&lines.join('').length<chars.join('').length)lines[1]=lines[1].slice(0,-1)+'…';
 lines.forEach((text,index)=>c.fillText(text,960,lines.length===1?835:822+index*26,925));
 c.restore();
}
