// Volatile guest relay: no activity/roster/result files or SQL writes.
import crypto from 'node:crypto';
import fs from 'node:fs';import path from 'node:path';
export const miniappGuestLookup={find:()=>null};
export function guestRelayRoutes(app,{csrf,QRCode,importComments,rateLimit,owner,dataDir}){
 const policyFile=path.join(dataDir,'guest-policy.json');const policy=()=>{try{return {allowGuestActivities:JSON.parse(fs.readFileSync(policyFile,'utf8')).allowGuestActivities!==false}}catch{return {allowGuestActivities:true}}};app.get('/api/guest-policy',(req,res)=>res.set('Cache-Control','no-store').json(policy()));app.get('/api/owner/guest-policy',owner,(req,res)=>res.set('Cache-Control','no-store').json(policy()));app.post('/api/owner/guest-policy',owner,csrf,(req,res)=>{if(typeof req.body?.allowGuestActivities!=='boolean')return res.status(400).json({error:'开关值必须为布尔值'});const value={allowGuestActivities:req.body.allowGuestActivities};fs.writeFileSync(policyFile+'.tmp',JSON.stringify(value),{mode:0o600});fs.renameSync(policyFile+'.tmp',policyFile);res.json(value)});
 const rooms=new Map(),TTL=8*60*60*1000,valid=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
 const sweep=()=>{for(const [id,r]of rooms)if(r.expires<=Date.now())rooms.delete(id)};setInterval(sweep,60000).unref();
 app.use('/api/guest-relay',rateLimit({windowMs:60000,limit:90,standardHeaders:true,legacyHeaders:false}));
 app.post('/api/guest-relay',csrf,(req,res)=>{if(!policy().allowGuestActivities)return res.status(403).json({error:'站长已关闭免登录创建活动，请先登录'});sweep();if(rooms.size>=300||[...rooms.values()].filter(r=>r.ip===req.ip).length>=5)return res.status(429).json({error:'临时活动数量已达上限，请结束旧活动后重试'});const id=crypto.randomUUID(),r={id,ip:req.ip,secret:crypto.randomBytes(32).toString('base64url'),join:crypto.randomBytes(24).toString('base64url'),title:String(req.body?.title||'幸运抽奖').slice(0,200),rows:new Map(),allowSignup:req.body?.allowSignup!==false,open:true,expires:Date.now()+TTL};rooms.set(id,r);res.status(201).json({id,secret:r.secret,join:r.join,expires:r.expires})});
 const managed=(req,res,next)=>{sweep();const r=rooms.get(req.params.id);if(!r||!valid(r.secret,req.get('x-guest-secret')))return res.status(404).json({error:'临时中转已结束或访问凭证无效'});req.relay=r;next()};
 app.get('/api/guest-relay/:id',managed,(req,res)=>res.json({rows:[...req.relay.rows.values()],events:req.relay.events||[],likes:req.relay.likes||0,expires:req.relay.expires,open:req.relay.open}));
 app.delete('/api/guest-relay/:id',csrf,managed,(req,res)=>{rooms.delete(req.params.id);res.json({deleted:true})});
 app.post('/api/guest-relay/:id/close',csrf,managed,(req,res)=>{req.relay.open=false;res.json({ok:true})});
 app.post('/api/guest-relay/:id/import',csrf,managed,async(req,res)=>{const r=req.relay;if(!r.open)return res.status(409).json({error:'报名已结束'});if(r.importing)return res.status(409).json({error:'正在抓取评论，请稍候'});if(r.lastImport&&Date.now()-r.lastImport<60000)return res.status(429).json({error:'请间隔一分钟后再抓取'});r.importing=true;r.lastImport=Date.now();try{const result=await importComments(String(req.body?.url||'').slice(0,2000),req.body?.mode);if(!rooms.has(r.id))throw Error('临时中转已结束');for(const c of result.rows.slice(0,10000)){const id=String(c.id);r.rows.set(id,{id,author_channel_id:String(c.authorChannelId||id),author_name:String(c.authorName||''),name:String(c.authorName||''),handle:String(c.raw?.handle||c.handle||''),text:String(c.text||''),published_at:c.publishedAt||'',avatar:''})}res.json({rows:[...r.rows.values()],imported:result.rows.length,title:result.video?.title||'',videoAuthorChannelId:result.video?.channelId||''})}catch(e){res.status(400).json({error:e.message})}finally{r.importing=false}});
 // Local activities share one production Mini Program entry across all themes.
 function miniConfig(){
   let saved={};try{saved=JSON.parse(fs.readFileSync(path.join(dataDir,'signin-config.json'),'utf8')).wechat||{}}catch{}
   return {appId:saved.appId||process.env.WECHAT_APP_ID,appSecret:saved.appSecret||process.env.WECHAT_APP_SECRET};
 }
 function miniRoom(id){sweep();return [...rooms.values()].find(r=>r.miniId===String(id))}
 miniappGuestLookup.find=miniRoom;
 function ensureMiniId(r){
   if(!r.miniId){do{r.miniId='8'+crypto.randomInt(10000000000000,100000000000000)}while([...rooms.values()].some(other=>other!==r&&other.miniId===r.miniId));}
   return r.miniId;
 }
 let miniToken;
 async function solarCode(r,site){if(r.allowSignup===false)throw Error('此活动未开启自主报名');
   const cfg=miniConfig();if(!cfg.appId||!cfg.appSecret)throw Error('请先在站长设置中配置正式版小程序 AppID 和 AppSecret');
   if(r.solar?.appId===cfg.appId&&r.solar.site===site)return r.solar.qr;
   if(!miniToken||miniToken.appId!==cfg.appId||miniToken.expires<Date.now()){
     const q=new URLSearchParams({grant_type:'client_credential',appid:cfg.appId,secret:cfg.appSecret});
     const data=await(await fetch('https://api.weixin.qq.com/cgi-bin/token?'+q,{signal:AbortSignal.timeout(8000)})).json();
     if(!data.access_token)throw Error('微信授权失败，请检查小程序配置');
     miniToken={appId:cfg.appId,value:data.access_token,expires:Date.now()+Math.max(60,Number(data.expires_in||7200)-300)*1000};
   }
   const response=await fetch('https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token='+encodeURIComponent(miniToken.value),{
     method:'POST',headers:{'content-type':'application/json'},
     body:JSON.stringify({scene:'id='+ensureMiniId(r)+'&site='+site,page:'pages/checkin/checkin',check_path:true,env_version:'release',width:430}),signal:AbortSignal.timeout(12000)
   });
   if(!response.ok||!(response.headers.get('content-type')||'').startsWith('image/'))throw Error('正式版小程序码生成失败，请检查已发布页面与小程序配置');
   const qr='data:image/jpeg;base64,'+Buffer.from(await response.arrayBuffer()).toString('base64');
   if(!rooms.has(r.id))throw Error('活动中转已结束，请刷新大屏');
   r.solar={appId:cfg.appId,site,qr};return qr;
 }
 app.get('/api/miniapp/campaign/:id',(req,res,next)=>{
   const r=miniRoom(req.params.id);if(!r)return next();
   if(req.query.token&&!valid(r.join,req.query.token))return res.status(403).json({error:'签到凭据无效，请重新扫码'});
   res.set('Cache-Control','no-store').json({id:r.miniId,title:r.title,open:r.open&&r.allowSignup!==false,status:r.open?'ready':'drawn',isDrawn:!r.open,winners:r.winners||[],checkinCount:r.rows.size,winnerCount:r.winnerCount||1,theme:r.theme||'deepsea',logo:r.logo||'',likes:r.likes||0,signupToken:r.join,token:r.join});
 });
 app.post('/api/miniapp/checkin/:id',async(req,res,next)=>{
   const r=miniRoom(req.params.id);if(!r)return next();
   if(!valid(r.join,req.body?.token))return res.status(403).json({error:'签到凭据无效，请重新扫码'});
   if(!r.open||r.allowSignup===false)return res.status(409).json({error:'本场报名已结束'});
   const name=String(req.body?.name||'').trim(),avatar=String(req.body?.avatar||''),code=String(req.body?.loginCode||'');
   if(!name||name.length>50||!code||code.length>128||avatar.length>64100||!/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar))return res.status(400).json({error:'请提供有效的微信昵称、头像和登录凭据'});
   try{
     const cfg=miniConfig();if(!cfg.appId||!cfg.appSecret)throw Error('小程序尚未配置');
     const q=new URLSearchParams({appid:cfg.appId,secret:cfg.appSecret,js_code:code,grant_type:'authorization_code'});
     const data=await(await fetch('https://api.weixin.qq.com/sns/jscode2session?'+q,{signal:AbortSignal.timeout(8000)})).json();
     if(typeof data.openid!=='string')return res.status(401).json({error:'微信登录失败，请重试'});
     if(!rooms.has(r.id)||r.expires<=Date.now()||!r.open||r.allowSignup===false)return res.status(409).json({error:'本场报名已结束'});
     const id='wechat:'+data.openid;if(!r.rows.has(id)&&r.rows.size>=10000)return res.status(409).json({error:'报名人数已满'});
     r.rows.set(id,{id,author_channel_id:id,author_name:name,name,avatar,handle:'',text:'',published_at:new Date().toISOString()});
     res.json({ok:true,success:true,count:r.rows.size,name});
   }catch{res.status(503).json({error:'微信登录暂时不可用，请稍后重试'});}
 });
 function miniInteraction(req,res,next){
   const r=miniRoom(req.params.id);if(!r)return next();
   if(!valid(r.join,req.body?.token||req.query?.token))return res.status(403).json({error:'互动凭据无效，请重新扫码'});
   if(!r.open||r.allowSignup===false)return res.status(409).json({error:'本场互动已结束'});
   const kind=req.body?.kind==='like'?'like':'message',text=String(req.body?.text||req.body?.message||'').trim(),name=String(req.body?.name||'微信观众').slice(0,50);
   if(kind==='message'&&(!text||text.length>120))return res.status(400).json({error:'请输入 1–120 字留言'});
   const viewer=String(req.body?.viewer||req.ip).slice(0,100);r.limits||=new Map();
   const k=kind+':'+viewer,now=Date.now();if(now-(r.limits.get(k)||0)<(kind==='like'?1000:3000))return res.status(429).json({error:'请稍后再发送'});
   if(r.limits.size>10000)r.limits.clear();r.limits.set(k,now);
   if(kind==='like')r.likes=(r.likes||0)+1;
   r.events||=[];r.events.push({id:crypto.randomInt(1000000000),kind,name,text,created:now});r.events=r.events.slice(-80);
   res.status(201).json({ok:true,likes:r.likes||0});
 }
 app.post('/api/miniapp/blessing/:id',miniInteraction);
 app.post('/api/interact/:id',miniInteraction);
 app.post('/api/guest-relay/:id/presentation',csrf,managed,(req,res)=>{
   const r=req.relay,p=req.body||{};if(typeof p.allowSignup==='boolean')r.allowSignup=p.allowSignup;r.theme=/^[a-z0-9-]{1,32}$/.test(p.theme||'')?p.theme:'deepsea';
   r.winnerCount=Math.max(1,Math.min(100,Number(p.winnerCount)||1));
   r.logo=typeof p.logo==='string'&&p.logo.length<200000?p.logo:'';
   if(Array.isArray(p.winners))r.winners=p.winners.slice(0,100).map((w,i)=>({name:String(w.name||'').slice(0,50),rank:i+1,prize:String(w.prize||'').slice(0,100)}));
   res.json({ok:true});
 });

 app.get('/api/guest-relay/:id/qr',managed,async(req,res)=>{try{const r=req.relay,qr=await solarCode(r,req.hostname==='lucky.xiazheteng.fun'?'legacy':'cn');res.set('Cache-Control','no-store').json({url:req.protocol+'://'+req.get('host')+'/guest-join.html?id='+r.id+'&token='+r.join,qr,qrType:'miniapp',envVersion:'release',miniId:r.miniId})}catch(e){res.status(503).json({error:e.message})}});
 app.get('/api/guest-relay/:id/join',(req,res)=>{sweep();const r=rooms.get(req.params.id);if(!r||!valid(r.join,req.query.token))return res.status(404).json({error:'报名链接已失效'});res.json({title:r.title,open:r.open&&r.allowSignup!==false,expires:r.expires})});
 app.get('/api/guest-relay/:id/wechat',(req,res)=>{sweep();const r=rooms.get(req.params.id);if(!r||!valid(r.join,req.query.token)||!r.open||r.allowSignup===false)return res.status(410).send('报名已结束或链接失效');if(!process.env.WECHAT_APP_ID||!process.env.WECHAT_APP_SECRET)return res.status(503).send('本站尚未配置微信网页授权，请联系站长');const state='guest_'+crypto.randomBytes(24).toString('base64url');req.session.guestWechat={state,id:r.id,expires:Date.now()+600000};const callback=req.protocol+'://'+req.get('host')+'/api/wechat/callback';const u=new URL('https://open.weixin.qq.com/connect/oauth2/authorize');u.search=new URLSearchParams({appid:process.env.WECHAT_APP_ID,redirect_uri:callback,response_type:'code',scope:'snsapi_userinfo',state});req.session.save(error=>error?res.status(500).send('无法建立授权会话，请重新扫码'):res.redirect(u+'#wechat_redirect'))});
 app.get('/api/wechat/callback',async(req,res,next)=>{if(!String(req.query.state||'').startsWith('guest_'))return next();const flow=req.session.guestWechat;delete req.session.guestWechat;if(!flow||!valid(flow.state,req.query.state)||flow.expires<Date.now()||!req.query.code)return res.status(403).send('微信授权状态无效或已过期，请重新扫码');try{sweep();const r=rooms.get(flow.id);if(!r||!r.open||r.allowSignup===false)throw Error('活动报名已结束');const tokenURL=new URL('https://api.weixin.qq.com/sns/oauth2/access_token');tokenURL.search=new URLSearchParams({appid:process.env.WECHAT_APP_ID,secret:process.env.WECHAT_APP_SECRET,code:String(req.query.code),grant_type:'authorization_code'});const response=await fetch(tokenURL,{redirect:'error',signal:AbortSignal.timeout(15000)}),token=await response.json();if(!token.access_token||!token.openid)throw Error('微信授权失败，请检查公众号权限和授权域名');const profileURL=new URL('https://api.weixin.qq.com/sns/userinfo');profileURL.search=new URLSearchParams({access_token:token.access_token,openid:token.openid,lang:'zh_CN'});const profile=await(await fetch(profileURL,{redirect:'error',signal:AbortSignal.timeout(15000)})).json();if(profile.openid!==token.openid||!profile.nickname)throw Error('微信未返回昵称，请检查用户信息授权权限');if(!rooms.has(r.id)||!r.open)throw Error('活动报名已结束');const id='wechat:'+profile.openid;if(!r.rows.has(id)&&r.rows.size>=10000)throw Error('活动报名人数已满');let avatar='';try{const u=new URL(profile.headimgurl);if(['wx.qlogo.cn','thirdwx.qlogo.cn'].includes(u.hostname)){u.protocol='https:';avatar=u.href}}catch{}r.rows.set(id,{id,author_channel_id:id,author_name:String(profile.nickname).slice(0,100),name:String(profile.nickname).slice(0,100),avatar,handle:'',text:'',published_at:new Date().toISOString()});res.redirect('/guest-join.html?id='+r.id+'&token='+r.join+'&done=1')}catch(e){res.status(400).type('text').send(e.message)}});
 return {findMiniRoom:miniRoom};
}
