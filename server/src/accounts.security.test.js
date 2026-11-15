import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {accountRoutes} from './accounts.js';
import {openDb,one,all,run,transaction} from './db.js';
const cf=await import(new URL('../../lottery-pages/cloudflare/accounts.js',import.meta.url));
const password='security-test-password';
const csrfToken=()=>crypto.randomBytes(32).toString('hex');
async function localFixture(){
 const dir=fs.mkdtempSync(path.join(process.env.TMPDIR,'account-security-'));
 await openDb(dir);const app=express();app.use(express.json());app.use(session({secret:csrfToken(),resave:false,saveUninitialized:false}));
 const csrf=(req,res,next)=>req.get('x-csrf-token')===req.session.csrf&&req.session.csrf?next():res.status(403).json({error:'CSRF'});
 process.env.SETUP_KEY='security-setup';accountRoutes(app,{one,all,run,transaction,csrf,dataDir:dir,csrfToken});
 app.get('/api/csrf',(req,res)=>{req.session.csrf ||=csrfToken();res.json({token:req.session.csrf})});
 app.use((e,req,res,next)=>res.status(e.status||500).json({error:e.message}));
 const salt='test-salt',stored=salt+':'+crypto.scryptSync(password,salt,64).toString('hex');
 run("INSERT INTO account_users(username,password_hash,role,verified) VALUES(?,?,'owner',1)",['owner',stored]);
 run("INSERT INTO account_users(username,password_hash,verified,email) VALUES(?,?,1,?)",['verified',stored,'verified@example.org']);
 run('INSERT INTO account_users(username,password_hash,verified) VALUES(?,?,0)',['ordinary',stored]);
 run("INSERT OR REPLACE INTO account_settings VALUES('auth',?)",[JSON.stringify({password:{enabled:false},email:{enabled:true,endpoint:'https://sender.example.org'}})]);
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
 let cookie='',token='';async function req(p,body){const r=await fetch(base+p,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json','x-csrf-token':token},body:body?JSON.stringify(body):undefined,redirect:'manual'});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=r.status===302?{}:await r.json();return {status:r.status,data}}
 async function fresh(){token=(await req('/api/csrf')).data.token}
 return {req,fresh,close:async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}};
}
function cfFixture(){
 const settings=new Map(),accounts=[{id:'owner',username:'owner',role:'owner',verified:true,password:cf.passwordHash(password)},{id:'verified',username:'verified',role:'user',verified:true,email:'verified@example.org',password:cf.passwordHash(password)},{id:'ordinary',username:'ordinary',role:'user',verified:false,password:cf.passwordHash(password)}];
 settings.set('authConfig',{modes:{password:false,email:true},emailSender:{url:'https://sender.example.org'}});
 const registry={get:async k=>settings.get(k)||null,set:async(k,v)=>settings.set(k,v),accountOwner:async()=>accounts[0],accountByName:async name=>accounts.find(a=>a.username===name),accountRate:async()=>true,openSession:async()=>({sid:'new-session',csrf:'new-csrf'}),consume:async k=>{const v=settings.get(k);settings.delete(k);return v},claim:async(k,expires)=>{if(settings.has(k))return false;settings.set(k,{expires});return true},providerAccount:async profile=>({id:profile.id,username:'telegram_user',role:'user',verified:true})};
 const session={key:'test-session',csrf:'test-csrf',user:null};
 async function req(p,body){try{const request=new Request('https://studio.example.org'+p,{method:body?'POST':'GET'});const r=await cf.accountRoute(request,{},registry,session,async()=>body||{});return {status:r.status,data:r.status===302?{}:await r.json()}}catch(e){return {status:e.status||400,data:{error:e.message}}}}
 return {req,settings,session,registry,accounts};
}
for(const runtime of ['local','cloudflare'])test(runtime+': verified email users can return when ordinary password mode is disabled',async()=>{
 const f=runtime==='local'?await localFixture():cfFixture();try{if(f.fresh)await f.fresh();assert.equal((await f.req('/api/account/login',{username:'ordinary',password})).status,403);assert.equal((await f.req('/api/account/login',{username:'verified',password:'wrong-password'})).status,401);assert.equal((await f.req('/api/account/login',{username:'verified',password})).status,200);if(f.fresh)await f.fresh();assert.equal((await f.req('/api/account/login',{username:'owner',password})).status,200)}finally{await f.close?.()}
});
for(const runtime of ['local','cloudflare'])test(runtime+': Telegram replay cannot bypass one-use receipt by changing hex case',async()=>{
 const f=runtime==='local'?await localFixture():cfFixture(),botToken='12345:security-test';
 try{
  if(runtime==='local')run("INSERT OR REPLACE INTO account_settings VALUES('auth',?)",[JSON.stringify({telegram:{enabled:true,botToken,botUsername:'security_bot'}})]);
  else f.settings.set('authConfig',{modes:{telegram:true},providers:{telegram:{botToken,botUsername:'security_bot'}}});
  if(f.fresh)await f.fresh();const state=(await f.req('/api/account')).data.telegramState;
  const payload={id:'123456',first_name:'Security',auth_date:String(Math.floor(Date.now()/1000))};
  payload.hash=crypto.createHmac('sha256',crypto.createHash('sha256').update(botToken).digest()).update(Object.keys(payload).sort().map(k=>k+'='+payload[k]).join('\n')).digest('hex');
  const callback=v=>'/api/account/oauth/telegram/callback?'+new URLSearchParams(v);
  assert.equal((await f.req(callback({...payload,state}))).status,302);
  const nextState=(await f.req('/api/account')).data.telegramState;
  assert.equal((await f.req(callback({...payload,hash:payload.hash.toUpperCase(),state:nextState}))).status,403);
 }finally{await f.close?.()}
});
export {localFixture,cfFixture};

