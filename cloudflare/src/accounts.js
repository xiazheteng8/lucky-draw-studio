import {requiresThemeUnlock} from '../public/theme-policy.js';
import {runtimeConfig,availableModes,updateRuntimeAuth,publicConfig,authFields} from './runtime-config.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {promisify} from 'node:util';
const scrypt=promisify(crypto.scrypt),DAY=86400000;
const publicUser=u=>u?{id:u.id,username:u.username,role:u.role,verified:Boolean(u.verified),emailBound:Boolean(u.email),phoneBound:Boolean(u.phone)}:null;
const fail=(status,message)=>Object.assign(new Error(message),{status});
const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
async function passwordHash(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+Buffer.from(await scrypt(password,salt,64)).toString('hex')}
async function passwordMatches(password,hash){const [salt,value]=String(hash).split(':');return salt&&value&&equal(Buffer.from(await scrypt(password,salt,64)).toString('hex'),value)}
export function accountRoutes(app,{one,all,run,transaction,csrf,dataDir,csrfToken}){
run(`CREATE TABLE IF NOT EXISTS account_users(id INTEGER PRIMARY KEY,username TEXT NOT NULL COLLATE NOCASE UNIQUE,password_hash TEXT,role TEXT NOT NULL DEFAULT 'user',verified INTEGER NOT NULL DEFAULT 0,email TEXT UNIQUE,phone TEXT UNIQUE,created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
run('CREATE TABLE IF NOT EXISTS account_settings(k TEXT PRIMARY KEY,value TEXT NOT NULL)');
run('CREATE TABLE IF NOT EXISTS account_registration_codes(id INTEGER PRIMARY KEY,code_hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL,created_by INTEGER NOT NULL,used_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,used_at TEXT)');
const registrationHash=value=>crypto.createHash('sha256').update(String(value||'').trim().toUpperCase()).digest('hex');
run('CREATE TABLE IF NOT EXISTS account_challenges(id TEXT PRIMARY KEY,session_id TEXT,type TEXT,destination TEXT,code_hash TEXT,expires INTEGER,attempts INTEGER DEFAULT 0,sent_at INTEGER)');
run('CREATE TABLE IF NOT EXISTS account_identities(provider TEXT,subject TEXT,user_id INTEGER,UNIQUE(provider,subject))');
run('CREATE TABLE IF NOT EXISTS account_rate_limits(k TEXT PRIMARY KEY,count INTEGER,expires INTEGER)');
run('CREATE TABLE IF NOT EXISTS account_unlocked_themes(username TEXT NOT NULL COLLATE NOCASE, theme_id TEXT NOT NULL, amount REAL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(username, theme_id))');
run('CREATE TABLE IF NOT EXISTS account_mianbaoduo_config(k TEXT PRIMARY KEY, val TEXT)');

const hasOwner=()=>Boolean(one("SELECT id FROM account_users WHERE role='owner'"));
const keyFile=path.join(dataDir,'owner-setup-key');let setupKey='';
if(!hasOwner()){if(process.env.SETUP_KEY){setupKey=process.env.SETUP_KEY;console.log(`首次设置站长：/setup  setupKey=${setupKey}`)}}
const storedConfig=()=>JSON.parse(one("SELECT value FROM account_settings WHERE k='auth'")?.value||'{}');
const config=()=>runtimeConfig(process.env,storedConfig());
const modes=()=>({password:true,email:false,phone:false,wechat:false,dingtalk:false,telegram:false});
function safeConfig(){const c=config();return {...publicConfig(c),modes:modes(),password:{enabled:true}}}
app.get('/api/public-config',(req,res)=>res.set('Cache-Control','no-store').json(publicConfig(config())));
function limit(key,max,windowMs){const now=Date.now(),row=one('SELECT * FROM account_rate_limits WHERE k=?',[key]);if(row&&row.expires>now&&row.count>=max)throw fail(429,'操作过于频繁，请稍后再试');run('INSERT OR REPLACE INTO account_rate_limits VALUES(?,?,?)',[key,row&&row.expires>now?row.count+1:1,row&&row.expires>now?row.expires:now+windowMs])}
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const userFor=req=>one('SELECT * FROM account_users WHERE id=?',[req.session.accountId||0]);
const auth=(req,res,next)=>{req.account=userFor(req);return req.account?next():res.status(401).json({error:'请先登录'})};
const owner=(req,res,next)=>auth(req,res,()=>req.account.role==='owner'?next():res.status(403).json({error:'仅站长可执行此操作'}));
async function establish(req,u){await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.accountId=u.id;req.session.csrf=csrfToken();await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()))}
function credentials(body){const username=String(body?.username||'').trim(),password=String(body?.password||'');if(!/^[\p{L}\p{N}_@.\-]{3,64}$/u.test(username)||password.length<10||password.length>256)throw fail(400,'用户名需3–64位，密码需10–256位');return {username,password}}
app.get('/api/account',(req,res)=>{if(req.session.csrf&&(!req.session.telegramState||req.session.telegramStateExpires<Date.now())){req.session.telegramState=csrfToken();req.session.telegramStateExpires=Date.now()+600000}res.set('Cache-Control','no-store').json({user:publicUser(userFor(req)),setupRequired:!hasOwner(),modes:modes(),ownerPasswordEnabled:true,telegramState:req.session.csrf?req.session.telegramState||'':'',telegramBotUsername:modes().telegram?config().telegram.botUsername:''})});
function telegramPayload(req,payload){const state=payload.state;const expected=req.session.telegramState,expires=req.session.telegramStateExpires;delete req.session.telegramState;delete req.session.telegramStateExpires;if(!expected||expires<Date.now()||!equal(expected,state))throw fail(403,'Telegram 登录会话无效或已过期');const {state:unused,...signed}=payload;return signed}
const oauthConfig=(provider,base)=>{const c=config();c[provider].redirectUri=base+'/api/account/oauth/'+provider+'/callback';return c};
app.get('/api/owner/setup-status',(req,res)=>{res.set('Cache-Control','no-store');req.session.csrf ||= csrfToken();req.session.setupToken ||= csrfToken();res.json({setupRequired:!hasOwner(),setupToken:req.session.setupToken,csrfToken:req.session.csrf})});
app.post('/api/owner/setup',asyncRoute(async(req,res)=>{limit('setup:'+req.ip,10,900000);const origin=req.get('origin');if((origin&&origin!==`${req.protocol}://${req.get('host')}`)||req.get('sec-fetch-site')==='cross-site')throw fail(403,'请求来源无效');if(hasOwner())throw fail(409,'站长已设置');if(!req.session.setupToken||!equal(req.body.setupToken,req.session.setupToken))throw fail(403,'首次设置会话无效');if(setupKey&&(!req.body.setupKey||!equal(req.body.setupKey,setupKey)))throw fail(403,'首次设置密钥错误');const {username,password}=credentials(req.body),hash=await passwordHash(password);let id;transaction(()=>{if(hasOwner())throw fail(409,'站长已设置');id=run("INSERT INTO account_users(username,password_hash,role,verified) VALUES(?,?,'owner',1)",[username,hash]).lastInsertRowid;run('UPDATE giveaways SET owner_id=? WHERE owner_id IS NULL',[id])});setupKey='';if(fs.existsSync(keyFile))fs.unlinkSync(keyFile);await establish(req,one('SELECT * FROM account_users WHERE id=?',[id]));res.status(201).json({user:publicUser(userFor(req))})}));
app.post('/api/account/login',csrf,asyncRoute(async(req,res)=>{limit('login:'+req.ip,20,900000);const u=one('SELECT * FROM account_users WHERE username=?',[String(req.body.username||'').trim()]);if(!modes().password&&u?.role!=='owner'&&!(u?.verified&&((u.email&&modes().email)||(u.phone&&modes().phone))))throw fail(403,'密码登录已停用');if(!u?.password_hash||typeof req.body.password!=='string'||req.body.password.length>256||!await passwordMatches(req.body.password,u.password_hash))throw fail(401,'用户名或密码错误');await establish(req,u);res.json({user:publicUser(u)})}));
app.post('/api/account/logout',csrf,asyncRoute(async(req,res)=>{await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.csrf=csrfToken();res.json({ok:true})}));
app.post('/api/account/verification/send',csrf,asyncRoute(async(req,res)=>{const type=req.body.type||req.body.kind,destination=String(req.body.destination||req.body.address||'').trim();if(!['email','phone'].includes(type)||!modes()[type])throw fail(503,'该验证服务尚未启用或配置');if(type==='email'?!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination):!/^\+?[1-9]\d{6,14}$/.test(destination))throw fail(400,'邮箱或手机号格式无效');limit('send:'+req.ip,10,3600000);limit('destination:'+destination,1,60000);const c=config()[type],code=String(crypto.randomInt(100000,1000000)),id=crypto.randomUUID(),hash=crypto.createHmac('sha256',req.sessionID).update(code).digest('hex');let r;try{r=await fetch(c.endpoint,{method:'POST',headers:{'content-type':'application/json',...(c.token?{authorization:'Bearer '+c.token}:{})},body:JSON.stringify({type,destination,code,from:c.from}),signal:AbortSignal.timeout(10000),redirect:'error'})}catch{throw fail(502,'验证发送服务不可用')}let result;try{result=await r.json()}catch{}if(!r.ok||result?.success!==true)throw fail(502,'验证发送服务未确认成功');run('DELETE FROM account_challenges WHERE session_id=? AND type=?',[req.sessionID,type]);run('INSERT INTO account_challenges VALUES(?,?,?,?,?,?,0,?)',[id,req.sessionID,type,destination,hash,Date.now()+600000,Date.now()]);res.json({success:true,expiresIn:600})}));
app.post('/api/account/register',csrf,asyncRoute(async(req,res)=>{
 if(!hasOwner())throw fail(409,'请先设置站长');if(req.body.acceptRetention!==true)throw fail(400,'请先确认活动保留与到期清理规则');if(req.body.type||req.body.kind)throw fail(400,'仅支持用户名与密码注册');limit('register:'+req.ip,10,3600000);
 const {username,password}=credentials(req.body),code=String(req.body.registrationCode||'').trim().toUpperCase();if(code.length>100)throw fail(400,'注册码格式无效');const hash=await passwordHash(password);let id;
 try{transaction(()=>{const row=code?one('SELECT id,used_by FROM account_registration_codes WHERE code_hash=?',[registrationHash(code)]):null;if(code&&(!row||row.used_by!==null))throw fail(409,'注册码无效或已经使用');id=run('INSERT INTO account_users(username,password_hash,verified) VALUES(?,?,?)',[username,hash,row?1:0]).lastInsertRowid;if(row)run('UPDATE account_registration_codes SET used_by=?,used_at=CURRENT_TIMESTAMP WHERE id=? AND used_by IS NULL',[id,row.id])})}catch(e){if(e.status)throw e;throw fail(409,'用户名已注册')}
 const u=one('SELECT * FROM account_users WHERE id=?',[id]);await establish(req,u);res.status(201).json({user:publicUser(u)});
}));
app.post('/api/account/bind',auth,csrf,asyncRoute(async(req,res)=>{const type=req.body.kind||req.body.type,destination=String(req.body.address||req.body.destination||'').trim();if(!['email','phone'].includes(type)||!modes()[type])throw fail(403,'该绑定方式未启用');limit('bind:'+req.ip,20,900000);const c=one('SELECT * FROM account_challenges WHERE session_id=? AND type=? AND destination=?',[req.sessionID,type,destination]);if(!c||c.expires<Date.now()||c.attempts>=5)throw fail(400,'验证码无效或已过期');run('UPDATE account_challenges SET attempts=attempts+1 WHERE id=?',[c.id]);if(!equal(crypto.createHmac('sha256',req.sessionID).update(String(req.body.code||'')).digest('hex'),c.code_hash))throw fail(400,'验证码无效或已过期');try{transaction(()=>{run(`UPDATE account_users SET ${type}=?,verified=1 WHERE id=?`,[destination,req.account.id]);run('DELETE FROM account_challenges WHERE id=?',[c.id])})}catch{throw fail(409,'该邮箱或手机号已绑定其他账号')}res.json({user:publicUser(userFor(req))})}));
app.get('/api/owner/auth-config',owner,(req,res)=>res.set('Cache-Control','no-store').json(safeConfig()));
app.post('/api/owner/auth-config',owner,csrf,(req,res,next)=>{try{if(Object.keys(req.body||{}).some(k=>!['siteName','activityHours','retentionHours'].includes(k)))throw fail(400,'平台账号仅支持用户名与密码');const c=updateRuntimeAuth(storedConfig(),req.body);run("INSERT OR REPLACE INTO account_settings VALUES('auth',?)",[JSON.stringify(c)]);res.json(safeConfig())}catch(e){next(e)}});
app.get('/api/owner/registration-codes',owner,(req,res)=>res.set('Cache-Control','no-store').json({codes:all('SELECT c.id,c.label,c.created_at,c.used_at,u.username AS used_by FROM account_registration_codes c LEFT JOIN account_users u ON u.id=c.used_by ORDER BY c.id DESC LIMIT 1000')}));
app.post('/api/owner/registration-codes',owner,csrf,asyncRoute(async(req,res)=>{const count=Number(req.body.count);if(!Number.isInteger(count)||count<1||count>1000)throw fail(400,'生成数量必须为 1–1000');limit('registration-code-generation:'+req.account.id,10,60000);const codes=[];transaction(()=>{for(let i=0;i<count;i++){const code='XZT-'+crypto.randomBytes(10).toString('hex').toUpperCase();run('INSERT INTO account_registration_codes(code_hash,label,created_by) VALUES(?,?,?)',[registrationHash(code),code.slice(0,8)+'…'+code.slice(-4),req.account.id]);codes.push(code)}});res.status(201).set('Cache-Control','no-store').json({codes,message:'完整注册码只显示本次，请及时复制或下载；每码仅使用一次。'})}));
app.post('/api/owner/users/:id/verify',owner,csrf,(req,res)=>{const id=Number(req.params.id),u=Number.isSafeInteger(id)?one('SELECT * FROM account_users WHERE id=?',[id]):null;if(!u)return res.status(404).json({error:'未找到用户'});if(u.role!=='owner')run('UPDATE account_users SET verified=1 WHERE id=?',[id]);res.json({user:publicUser(one('SELECT * FROM account_users WHERE id=?',[id]))})});
app.get('/api/owner/users',owner,(req,res)=>res.json(all('SELECT id,username,role,verified,created_at FROM account_users').map(u=>({...u,verified:Boolean(u.verified)}))));
async function oauthLogin(req,profile){if(!hasOwner())throw fail(409,'请先设置站长');if(!profile?.provider||!profile.id)throw fail(401,'平台身份无效');let identity=one('SELECT user_id FROM account_identities WHERE provider=? AND subject=?',[profile.provider,String(profile.id)]),u;if(identity)u=one('SELECT * FROM account_users WHERE id=?',[identity.user_id]);else{transaction(()=>{const username=profile.provider+'_'+crypto.randomBytes(10).toString('hex'),id=run('INSERT INTO account_users(username,verified) VALUES(?,1)',[username]).lastInsertRowid;run('INSERT INTO account_identities VALUES(?,?,?)',[profile.provider,String(profile.id),id]);u=one('SELECT * FROM account_users WHERE id=?',[id])})}await establish(req,u);return u}
const baseUrl=req=>{const b=String(process.env.BASE_URL||'').replace(/\/$/,'');if(!b.startsWith('https://'))throw fail(503,'站点扫码登录需要配置 HTTPS BASE_URL');return b};
app.get('/api/account/oauth/:provider/start',asyncRoute(async(req,res)=>{const provider=req.params.provider;if(!['wechat','dingtalk'].includes(provider)||!modes()[provider])throw fail(503,'该扫码登录尚未配置');const {providerStartUrl}=await import('./account-providers.js'),state=crypto.randomBytes(32).toString('hex');req.session.accountOAuth={provider,state,expires:Date.now()+600000};const url=await providerStartUrl(provider,oauthConfig(provider,baseUrl(req)),state,baseUrl(req));await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));res.redirect(url)}));
app.get('/api/account/oauth/:provider/callback',asyncRoute(async(req,res)=>{const provider=req.params.provider;if(!modes()[provider])throw fail(503,'该扫码登录尚未配置');let profile;if(provider==='telegram'){const {verifyTelegramLogin}=await import('./account-providers.js');profile=await verifyTelegramLogin(telegramPayload(req,req.query),config().telegram.botToken);limit('tg:'+req.ip,20,900000);const receipt=crypto.createHash('sha256').update(String(req.query.hash).toLowerCase()).digest('hex');if(one('SELECT k FROM account_rate_limits WHERE k=?',['tg-receipt:'+receipt]))throw fail(403,'登录凭证已使用');limit('tg-receipt:'+receipt,1,DAY)}else{const p=req.session.accountOAuth;delete req.session.accountOAuth;if(!p||p.provider!==provider||p.expires<Date.now()||!equal(p.state,req.query.state))throw fail(403,'授权会话已过期');const {exchangeProviderProfile}=await import('./account-providers.js');profile=await exchangeProviderProfile(provider,req.query,oauthConfig(provider,baseUrl(req)),baseUrl(req))}if(profile.provider!==provider)throw fail(401,'平台身份不匹配');await oauthLogin(req,profile);res.redirect('/')}));
app.post('/api/account/oauth/telegram',csrf,asyncRoute(async(req,res)=>{if(!modes().telegram)throw fail(503,'Telegram 登录尚未配置');limit('tg:'+req.ip,20,900000);const {verifyTelegramLogin}=await import('./account-providers.js'),profile=await verifyTelegramLogin(telegramPayload(req,req.body),config().telegram.botToken);const receipt=crypto.createHash('sha256').update(String(req.body.hash).toLowerCase()).digest('hex');if(one('SELECT k FROM account_rate_limits WHERE k=?',['tg-receipt:'+receipt]))throw fail(403,'登录凭证已使用');limit('tg-receipt:'+receipt,1,DAY);res.json({user:publicUser(await oauthLogin(req,profile))})}));

// 主题解锁与免验打赏路由
app.get('/api/account/unlocked-themes', (req, res) => {
  const user = userFor(req);
  if (!user) return res.json({ unlockedThemes: [] });
  const rows = all('SELECT theme_id FROM account_unlocked_themes WHERE username=?', [user.username]);
  res.json({ unlockedThemes: rows.map(r => r.theme_id==='cny'?'festival':r.theme_id) });
});

app.post('/api/account/unlock-theme', csrf, asyncRoute(async (req, res) => {
  const user = userFor(req);
  if (!user) throw fail(401, '请先登录账号后再解锁主题');
  const themeId = req.body?.themeId==='cny'?'festival':String(req.body?.themeId||'');
  const amount = Number(req.body?.amount);
  if(!requiresThemeUnlock(themeId)||!Number.isFinite(amount)||amount<=0)throw fail(400,'主题或金额无效');
  const mbdConfig = one("SELECT val FROM account_mianbaoduo_config WHERE k='app_id'")?.val;
  // If 面包多 Pay 未配置，免验直接解锁
  run('INSERT OR REPLACE INTO account_unlocked_themes(username, theme_id, amount) VALUES(?,?,?)', [user.username, themeId, amount]);
  res.json({ ok: true, unlocked: true, themeId, amount, unverified: !mbdConfig });
}));

app.get('/api/theme/cny-status', (req, res) => {
  const user = userFor(req);
  const mbdConfig = one("SELECT val FROM account_mianbaoduo_config WHERE k='app_id'")?.val;
  let isUnlocked = false;
  if (user) {
    if (user.role === 'owner') isUnlocked = true;
    else {
      const row = one('SELECT theme_id FROM account_unlocked_themes WHERE username=? AND theme_id=?', [user.username, 'cny']);
      if (row) isUnlocked = true;
    }
  }
  res.json({
    theme: 'cny',
    unlocked: isUnlocked,
    isOwner: user?.role === 'owner',
    mianbaoduoConfigured: Boolean(mbdConfig)
  });
});

return {auth,owner,userFor,hasOwner,config};
}
export function purgeGiveaway(id,{run,one,transaction}){transaction(()=>{for(const table of ['comments','winners'])run(`DELETE FROM ${table} WHERE giveaway_id=?`,[id]);for(const table of ['interaction_events','interaction_totals'])if(one("SELECT name FROM sqlite_master WHERE type='table' AND name=?",[table]))run(`DELETE FROM ${table} WHERE activity=?`,[id]);if(one("SELECT name FROM sqlite_master WHERE type='table' AND name='interaction_limits'"))run('DELETE FROM interaction_limits WHERE k LIKE ?',[id+':%']);for(const table of ['miniapp_gift_usage','miniapp_gift_receipts','miniapp_comment_limits','miniapp_comment_receipts'])if(one("SELECT name FROM sqlite_master WHERE type='table' AND name=?",[table]))run(`DELETE FROM ${table} WHERE activity=? OR activity LIKE ?`,['activity:'+id,'activity:'+id+':%']);run('DELETE FROM giveaways WHERE id=?',[id])})}
export const ACCOUNT_DAY=DAY;
