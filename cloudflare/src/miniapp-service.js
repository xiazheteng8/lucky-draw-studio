import {commentService} from './comment-service.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const DAY=86400000,types=['flower','rocket','car'];
const defaults={flower:{enabled:true,limit:0},rocket:{enabled:true,limit:1},car:{enabled:true,limit:1}};
const digest=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const same=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&crypto.timingSafeEqual(x,y)};
const problem=(status,message)=>Object.assign(new Error(message),{status});
export function miniappService(app,{one,all,run,transaction,owner,csrf,dataDir,fetchImpl=globalThis.fetch}){
 run('CREATE TABLE IF NOT EXISTS miniapp_sessions(token_hash TEXT PRIMARY KEY,openid TEXT NOT NULL,app_id TEXT NOT NULL,expires INTEGER NOT NULL)');
 run('CREATE TABLE IF NOT EXISTS miniapp_gift_usage(activity TEXT NOT NULL,openid TEXT NOT NULL,gift TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(activity,openid,gift))');
 run('CREATE TABLE IF NOT EXISTS miniapp_gift_receipts(activity TEXT NOT NULL,openid TEXT NOT NULL,request_id TEXT NOT NULL,gift TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(activity,openid,request_id))');
 let findGuest=()=>null;const policyPath=path.join(dataDir,'gift-policy.json'),rates=new Map(),generations=new Set();
 const generation=row=>{const key='activity:'+row.id+':'+digest(row.signup_token).slice(0,20);if(!generations.has(key)){const value=String(row.created_at||''),since=Date.parse(value.includes('T')?value:value.replace(' ','T')+'Z');transaction(()=>{const old=all('SELECT * FROM miniapp_gift_receipts WHERE activity=? AND created>=?',['activity:'+row.id,Number.isFinite(since)?since:Date.now()]);for(const receipt of old)run('INSERT OR IGNORE INTO miniapp_gift_receipts VALUES(?,?,?,?,?)',[key,receipt.openid,receipt.request_id,receipt.gift,receipt.created]);for(const item of all('SELECT openid,gift,COUNT(*) AS used FROM miniapp_gift_receipts WHERE activity=? GROUP BY openid,gift',[key]))run('INSERT OR IGNORE INTO miniapp_gift_usage VALUES(?,?,?,?)',[key,item.openid,item.gift,item.used])});generations.add(key)}return key};
 const config=()=>{let saved={};try{saved=JSON.parse(fs.readFileSync(path.join(dataDir,'signin-config.json'),'utf8')).wechat||{}}catch{}return {appId:saved.appId||process.env.WECHAT_APP_ID||'',appSecret:saved.appSecret||process.env.WECHAT_APP_SECRET||''}};
 const policy=()=>{let saved={};try{saved=JSON.parse(fs.readFileSync(policyPath,'utf8'))}catch{}return Object.fromEntries(types.map(type=>[type,{enabled:saved[type]?.enabled??defaults[type].enabled,limit:Number.isInteger(saved[type]?.limit)&&saved[type].limit>=0&&saved[type].limit<=1000?saved[type].limit:defaults[type].limit}]))};
 const rate=(key,max,period)=>{const now=Date.now(),old=rates.get(key);if(old&&old.until>now&&old.count>=max)throw problem(429,'操作过于频繁，请稍后再试');if(rates.size>10000)for(const [k,v]of rates)if(v.until<now)rates.delete(k);rates.set(key,{count:old&&old.until>now?old.count+1:1,until:old&&old.until>now?old.until:now+period})};
 const wrap=fn=>(req,res)=>Promise.resolve().then(()=>fn(req,res)).catch(error=>res.status(error.status||500).json({error:error.status?error.message:'互动服务暂不可用，请稍后重试',...(req.giftQuota?{gifts:req.giftQuota()}: {})}));
 app.post('/api/miniapp/login',wrap(async(req,res)=>{
  res.set('Cache-Control','no-store');rate('login:'+req.ip,30,60000);const code=typeof req.body?.code==='string'?req.body.code.trim():'';
  if(!code||code.length>128)throw problem(400,'请提供有效的微信登录 code');const c=config();if(!c.appId||!c.appSecret)throw problem(503,'小程序登录尚未配置，请联系站长');
  let data,response;try{const query=new URLSearchParams({appid:c.appId,secret:c.appSecret,js_code:code,grant_type:'authorization_code'});response=await fetchImpl('https://api.weixin.qq.com/sns/jscode2session?'+query,{signal:AbortSignal.timeout(8000),redirect:'error'});data=await response.json()}catch{throw problem(502,'微信登录服务暂不可用，请重试')}
  if(!response.ok||data.errcode||typeof data.openid!=='string'||!data.openid||data.openid.length>128)throw problem(401,'微信登录凭据无效或已过期，请重新登录');
  // session_key is deliberately neither persisted nor returned to the client.
  const token=crypto.randomBytes(32).toString('base64url'),expires=Date.now()+8*3600000;
  transaction(()=>{run('DELETE FROM miniapp_sessions WHERE expires<?',[Date.now()]);run('INSERT INTO miniapp_sessions VALUES(?,?,?,?)',[digest(token),data.openid,c.appId,expires])});
  res.json({openid:data.openid,loginToken:token,expiresAt:expires});
 }));
 const identity=req=>{const token=String(req.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!/^[\w-]{40,64}$/.test(token))throw problem(401,'请先完成微信登录');const s=one('SELECT openid,app_id,expires FROM miniapp_sessions WHERE token_hash=?',[digest(token)]);if(!s||s.expires<=Date.now()||s.app_id!==config().appId)throw problem(401,'微信登录已过期，请重新登录');return s.openid};
 const target=req=>{const id=String(req.params.id),token=req.body?.token||req.query.token,g=findGuest(id);if(g){if(!same(g.join,token))throw problem(403,'活动凭据无效，请重新扫码');if(!g.open||g.allowSignup===false)throw problem(409,'活动互动已结束');return {key:'guest:'+g.id,guest:g}}
  const row=/^\d{1,15}$/.test(id)?one('SELECT * FROM giveaways WHERE id=?',[Number(id)]):null;if(!row||!same(row.signup_token,token))throw problem(403,'活动凭据无效，请重新扫码');if(row.status==='drawn')throw problem(409,'活动互动已结束');return {key:generation(row),row};};
 const quotas=(key,openid)=>{const rules=policy(),used=Object.fromEntries(all('SELECT gift,used FROM miniapp_gift_usage WHERE activity=? AND openid=?',[key,openid]).map(r=>[r.gift,r.used]));return Object.fromEntries(types.map(type=>[type,{...rules[type],used:used[type]||0,remaining:rules[type].limit===0?null:Math.max(0,rules[type].limit-(used[type]||0))}]))};
 const comment=commentService(app,{one,all,run,transaction,owner,csrf,dataDir,identity,target});
 app.get('/api/miniapp/gift-policy',(req,res)=>res.set('Cache-Control','no-store').json({gifts:policy(),commentPolicy:comment.policy(),free:true}));
 app.get('/api/miniapp/gifts/:id',wrap((req,res)=>{const openid=identity(req),t=target(req);res.set('Cache-Control','no-store').json({gifts:quotas(t.key,openid),commentPolicy:comment.policy(),commentRetryAfterSeconds:comment.wait(t.key,openid),free:true})}));
 app.post('/api/miniapp/gifts/:id',wrap((req,res)=>{
  const openid=identity(req),t=target(req),gift=String(req.body?.gift||''),requestId=String(req.body?.requestId||'');if(!types.includes(gift))throw problem(400,'不支持的互动礼物');if(!/^[A-Za-z0-9_-]{16,96}$/.test(requestId))throw problem(400,'发送凭据无效，请重试');
  req.giftQuota=()=>quotas(t.key,openid);rate('gift:'+t.key+':'+openid,30,60000);const rule=policy()[gift];if(!rule.enabled)throw problem(403,'站长已关闭该互动礼物');
  let name=String(req.body?.name||'微信观众').trim().slice(0,24)||'微信观众';if(t.guest){name=t.guest.rows?.get('wechat:'+openid)?.name||name}else{name=one('SELECT author_name FROM comments WHERE giveaway_id=? AND id=?',[t.row.id,'wechat:'+openid])?.author_name||name}
  const now=Date.now(),event={id:crypto.randomUUID(),kind:'gift',gift,name,text:JSON.stringify({gift}),created:now};let duplicate=false;
  transaction(()=>{if(one('SELECT gift FROM miniapp_gift_receipts WHERE activity=? AND openid=? AND request_id=?',[t.key,openid,requestId])){duplicate=true;return}const used=one('SELECT used FROM miniapp_gift_usage WHERE activity=? AND openid=? AND gift=?',[t.key,openid,gift])?.used||0;if(rule.limit>0&&used>=rule.limit)throw problem(409,'本活动的'+({rocket:'火箭',car:'跑车',flower:'鲜花'}[gift])+'赠送次数已用完');run('INSERT OR REPLACE INTO miniapp_gift_usage VALUES(?,?,?,?)',[t.key,openid,gift,used+1]);run('INSERT INTO miniapp_gift_receipts VALUES(?,?,?,?,?)',[t.key,openid,requestId,gift,now]);if(t.row)event.id=run('INSERT INTO interaction_events(activity,kind,name,text,created) VALUES(?,?,?,?,?)',[t.row.id,'gift',name,event.text,now]).lastInsertRowid});
  if(t.guest&&!duplicate){t.guest.events||=[];t.guest.events.push(event);t.guest.events=t.guest.events.slice(-80)}
  res.status(duplicate?200:201).json({ok:true,duplicate,gift,gifts:quotas(t.key,openid),free:true});
 }));
 app.get('/api/owner/gift-policy',owner,(req,res)=>res.set('Cache-Control','no-store').json({gifts:policy()}));
 app.post('/api/owner/gift-policy',owner,csrf,wrap((req,res)=>{const value={};for(const type of types){const item=req.body?.gifts?.[type];if(!item||typeof item.enabled!=='boolean'||!Number.isInteger(item.limit)||item.limit<0||item.limit>1000)throw problem(400,'礼物限额必须为 0–1000 的整数，0 表示不限次');value[type]={enabled:item.enabled,limit:item.limit}}fs.writeFileSync(policyPath+'.tmp',JSON.stringify(value),{mode:0o600});fs.renameSync(policyPath+'.tmp',policyPath);res.json({gifts:policy()})}));
 return {bindGuest:fn=>{findGuest=fn},policy,commentPolicy:comment.policy};
}
