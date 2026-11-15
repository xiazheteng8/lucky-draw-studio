import {requiresThemeUnlock,normalizeThemeAnimation} from '../public/theme-policy.js';
import {configWithEnv,signinCapabilities,safeSettings,updateSettings,activateTelegram,providerRoute,chosenProvider,startPath,randomToken} from '../src/signin-service.js';
import {themeById,isThemeId} from '../public/themes.js';
import {publicBase,normalizeWechatAvatar} from '../src/interaction-model.js';
import {sourceReference,importSource} from '../src/source-import.js';
import selectedTracks,{matchSelectedTrack,selectedLibrary} from '../src/music-library.js';
import {workbookBytes} from './xlsx.js';
import {StudioRegistry as BaseRegistry,DrawRoom} from './storage.js';
import {videoIdFrom,safeCsv,validOverlayToken} from '../src/core.js';
import {presentation,displayRow,awardNameFor} from '../src/studio.js';
import {fetchYouTubeComments,fetchYouTubeVideo,enrichYouTubeHandles} from '../src/youtube.js';
import defaultMusicSettings from '../src/music-defaults.js';
import builtinTracks,{mergeMusicTracks} from '../src/music-catalog.js';
import donation from '../private/donation.js';
import {randomBytes,createHash} from 'node:crypto';
import {runtimeConfig,publicConfig,HOUR} from '../src/runtime-config.js';
import {accountRoute,retentionConfig,DAY} from './accounts.js';


export class StudioRegistry extends BaseRegistry{





}
export {DrawRoom};
const random=()=>randomBytes(24).toString('base64url'),json=(v,status=200)=>Response.json(v,{status}),social={youtube:'https://www.youtube.com/@xiazheteng8',telegram:'https://t.me/xiazheteng8',github:'https://github.com/xiazheteng8?tab=repositories'};
function outcome(v,status=200){return v?.error?json({error:v.error},v.status||400):json(v,status)}
function configuration(c={},prior={}){const date=v=>{if(!v)return null;const d=new Date(v);if(!Number.isFinite(d.valueOf()))throw Error('时间格式无效');return d.toISOString()},list=v=>Array.isArray(v)?[...new Set(v.map(String).map(s=>s.trim()).filter(Boolean))]:[];const schedule=Boolean(c.scheduleEnabled),when=date(c.scheduleAt??prior.schedule_at);if(schedule&&!when)throw Error('启用定时开奖时必须设置时间');return {blacklist_json:JSON.stringify(list(c.blacklist??JSON.parse(prior.blacklist_json||'[]'))),authors_json:JSON.stringify(list(c.requiredAuthors??JSON.parse(prior.authors_json||'[]'))),start_at:date(c.startAt??prior.start_at),end_at:date(c.endAt??prior.end_at),schedule_at:when,schedule_enabled:Number(schedule),winner_count:Math.max(1,Math.min(100,Number(c.winnerCount??prior.winner_count)||1)),reveal_interval_ms:Math.max(1000,Math.min(180000,Number(c.revealIntervalMs??prior.reveal_interval_ms)||5000)),final_announcement:String(c.finalAnnouncement??prior.final_announcement??'').slice(0,2000),exclude_video_author:Number(c.excludeVideoAuthor??Boolean(prior.exclude_video_author)),dedupe_authors:c.dedupeAuthors===false?0:1,status:schedule?'scheduled':'ready'}}
function apiConfig(g){return {blacklist:JSON.parse(g.blacklist_json||'[]'),requiredAuthors:JSON.parse(g.authors_json||'[]'),startAt:g.start_at,endAt:g.end_at,scheduleAt:g.schedule_at,scheduleEnabled:Boolean(g.schedule_enabled),winnerCount:g.winner_count,revealIntervalMs:g.reveal_interval_ms,finalAnnouncement:g.final_announcement,dedupeAuthors:g.dedupe_authors!==0,excludeVideoAuthor:Boolean(g.exclude_video_author)}}
async function parseRows(body,g){let rows=body.rows;if(body.xlsx){const {default:ExcelJS}=await import('exceljs/dist/exceljs.min.js');const wb=new ExcelJS.Workbook();await wb.xlsx.load(Buffer.from(body.xlsx,'base64'));const sheet=wb.worksheets[0];if(!sheet)throw Error('Excel 表格为空');const keys=sheet.getRow(1).values.slice(1).map(String);rows=[];sheet.eachRow((row,n)=>{if(n>1){const r={};keys.forEach((k,i)=>{const v=row.getCell(i+1).value;r[k]=v&&typeof v==='object'?(v.text||v.result||v.richText?.map(t=>t.text).join('')||''):v??''});rows.push(r)}})}if(!Array.isArray(rows)||!rows.length||rows.length>10000)throw Error('每次请导入 1–10000 行');const pick=(r,keys)=>keys.map(k=>r[k]).find(v=>v!==undefined&&String(v).trim())||'';return rows.map((r,i)=>{const handle=String(pick(r,['handle','账号','@账号'])).trim(),name=String(pick(r,['name','姓名','昵称'])).trim(),key=String(pick(r,['id','编号','channel','频道ID'])||handle||name).trim();if(!key)throw Error(`第 ${i+2} 行缺少编号、账号或姓名`);if(['youtube','comments'].includes(g.source_mode)&&!/^@\S+$/.test(handle))throw Error(`第 ${i+2} 行需要真实 @账号`);let avatar=String(body.avatars?.[String(pick(r,['头像文件','头像','avatar']))]||pick(r,['avatar','头像','头像文件']));if(!/^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(avatar))avatar='';if(avatar.length>500000)throw Error(`第 ${i+2} 行头像超过大小限制`);return {id:String(pick(r,['commentId','评论ID'])||key).slice(0,200),author_channel_id:key.slice(0,200),author_name:name||handle,name:name||handle,handle,text:String(pick(r,['comment','评论','内容'])),published_at:'',avatar,raw_json:JSON.stringify({...r,handle,avatar})}})}
async function bodyOf(req){const length=Number(req.headers.get('content-length')||0);if(length>20000000)throw Object.assign(Error('上传内容超过 20MB'),{status:413});let n=0,chunks=[];for await(const b of req.body||[]){n+=b.length;if(n>20000000)throw Object.assign(Error('上传内容超过 20MB'),{status:413});chunks.push(b)}const text=Buffer.concat(chunks).toString();return text?JSON.parse(text):{}}
async function signinConfig(registry,env){let c=await registry.get('signinConfig',null);if(!c&&env.CONFIG_KV){c=await env.CONFIG_KV.get('signin-config','json');if(c)await registry.set('signinConfig',c)}return configWithEnv(c||{},env)}
async function saveSigninConfig(registry,env,c){if(env.CONFIG_KV){for(let attempt=0;;attempt++){try{await env.CONFIG_KV.put('signin-config',JSON.stringify(c));break}catch(e){if(attempt>=2||!/(429|rate|too many)/i.test(e.message))throw e;await new Promise(resolve=>setTimeout(resolve,1100))}}}await registry.set('signinConfig',c)}
function signinContext(registry,env,room){return {getConfig:()=>signinConfig(registry,env),saveConfig:c=>saveSigninConfig(registry,env,c),getActivity:id=>room(id).get(),register:(id,profile)=>room(id).checkInVerified(profile),put:(k,v)=>registry.set('signin-flow:'+k,v),consume:async k=>{const v=await registry.consume('signin-flow:'+k);return v?.expires>Date.now()?v:null},claim:k=>registry.claim('signin-receipt:'+k,Date.now()+86400000),release:k=>registry.consume('signin-receipt:'+k),login:async profile=>{const sid=randomToken();await registry.set('wxviewer:'+sid,profile);return 'lucky_wechat='+sid+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'}}}
async function signinBase(g,registry,env,fallback){return publicBase(g.source_mode==='wechat'?(await signinConfig(registry,env)).baseUrl||'':JSON.parse(g.presentation_json||'{}').interactionBaseUrl||'',fallback)}

let wxTokenCache = { token: '', expire: 0 };
async function getWeChatAccessToken(appId, appSecret) {
  if (wxTokenCache.token && wxTokenCache.expire > Date.now()) {
    return wxTokenCache.token;
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  if (data.access_token) {
    wxTokenCache = {
      token: data.access_token,
      expire: Date.now() + ((data.expires_in || 7200) - 300) * 1000
    };
    return data.access_token;
  }
  throw new Error(data.errmsg || '获取微信 access_token 失败');
}

async function getWeChatMiniAppCode(appId, appSecret, scene, page, envVersion = 'trial') {
  const token = await getWeChatAccessToken(appId, appSecret);
  const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scene: String(scene),
      page: page || 'pages/checkin/checkin',
      check_path: false,
      env_version: envVersion
    }),
    signal: AbortSignal.timeout(10000)
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    const err = await res.json();
    throw new Error(err.errmsg || '生成小程序码失败');
  }
  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:image/jpeg;base64,' + btoa(binary);
}

async function generateQrForGiveaway(g, url, registry, env) {
  if (g.source_mode === 'wechat') {
    const cfg = await signinConfig(registry, env);
    const appId = cfg.wechat?.appId || env.WECHAT_APP_ID || '';
    const appSecret = cfg.wechat?.appSecret || env.WECHAT_APP_SECRET || '';
    const envVersion = cfg.wechat?.envVersion || env.WECHAT_ENV_VERSION || 'trial';
    if (appId && appSecret) {
      try {
        const qr = await getWeChatMiniAppCode(appId, appSecret, `id=${g.id}`, 'pages/checkin/checkin', envVersion);
        console.log(`[CF Screen] 活动 ${g.id} 成功生成微信小程序原生太阳码 (env: ${envVersion})`);
        return qr;
      } catch (err) {
        console.warn('[CF Screen] 生成小程序太阳码异常，回退至普通二维码:', err.message);
      }
    }
  }
  const QRCode = (await import('qrcode/lib/server.js')).default;
  return await QRCode.toDataURL(url, { width: 360, margin: 2 });
}

async function route(req,env){const u=new URL(req.url),p=u.pathname,method=req.method,registry=env.REGISTRY.getByName('studio:'+env.STUDIO_ID),room=id=>env.ROOMS.getByName(`studio:${env.STUDIO_ID}:draw:${id}`),cookie=/(?:^|;\s*)studio_session=([\w-]+)/.exec(req.headers.get('cookie')||'')?.[1]||'';
if(p.startsWith('/api/signin/')||/^\/MP_verify_[A-Za-z0-9]+\.txt$/.test(p)){return await providerRoute(req,signinContext(registry,env,room))}
if(p==='/api/public-config'&&method==='GET')return json(publicConfig(runtimeConfig(env,await registry.get('authConfig')||{})));
if(p==='/api/signin-capabilities'&&method==='GET'){const c=signinCapabilities(await signinConfig(registry,env),'cloudflare',Boolean(env.CONFIG_KV));return json({providers:c.providers.map(({id,label,available})=>({id,label,available}))})}
if(p==='/healthz')return json({ok:true,service:'瞎折腾摇奖吧',runtime:'cloudflare-independent'});
if(p==='/public/social-links')return json(social);


if(p==='/api/theme'){const id=await registry.get('theme','deepsea');return json({id,animation:normalizeThemeAnimation(id,await registry.get('theme-animation',''))})}
if(p==='/api/music'){const available=mergeMusicTracks(builtinTracks,await registry.get('uploadedTracks',[]));return json({tracks:available.map(({file,...r})=>r),library:selectedLibrary(selectedTracks,available),settings:await registry.get('musicSettings',defaultMusicSettings)})}
if(p.startsWith('/api/music/')){const id=p.split('/').pop(),track=(await registry.get('uploadedTracks',[])).find(t=>t.id===id);if(track){if(!env.MEDIA)return json({error:'存储未配置'},503);const object=await env.MEDIA.get('music/'+track.file);if(!object)return json({error:'音乐文件不存在'},404);const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);return new Response(object.body,{headers})}const builtin=builtinTracks.find(t=>t.id===id);if(!builtin)return json({error:'音乐不存在'},404);return env.ASSETS.fetch(new Request(new URL('/builtin-music/'+builtin.file,u.origin),req))}
if(p==='/api/avatar'){try{const v=new URL(u.searchParams.get('url')||'');if(v.protocol!=='https:'||v.port||v.username||v.password||!['static-legacy.dingtalk.com','static.dingtalk.com','yt3.ggpht.com','yt3.googleusercontent.com','wx.qlogo.cn','thirdwx.qlogo.cn','q.qlogo.cn','i0.hdslb.com','i1.hdslb.com','i2.hdslb.com','secure.gravatar.com'].includes(v.hostname))return new Response(null,{status:400});const r=await fetch(v,{redirect:'error',signal:AbortSignal.timeout(7000)});const type=r.headers.get('content-type')||'';if(!r.ok||!/^image\/(png|jpeg|webp)/.test(type))return new Response(null,{status:404});return new Response(r.body,{headers:{'content-type':type,'cache-control':'public,max-age=3600'}})}catch{return new Response(null,{status:404})}}
if(p==='/api/wechat/start'){const id=Number(u.searchParams.get('id')),g=await room(id).get();if(!g||g.source_mode!=='wechat'||chosenProvider(g)!=='wechat'||g.signup_token!==u.searchParams.get('token'))return new Response('报名已结束或链接无效',{status:403});const wx=await signinConfig(registry,env);if(!wx.wechat.appId||!wx.wechat.appSecret||u.protocol!=='https:')return new Response('微信授权签到尚未配置完成，请联系活动管理员。',{status:503});const state=random();await registry.set('wx:'+state,{id,expires:Date.now()+600000});const v=new URL('https://open.weixin.qq.com/connect/oauth2/authorize');v.search=new URLSearchParams({appid:wx.wechat.appId,redirect_uri:(wx.baseUrl||u.origin)+'/api/wechat/callback',response_type:'code',scope:'snsapi_userinfo',state});return Response.redirect(v+'#wechat_redirect',302)}
if(p==='/api/wechat/callback'){const wx=await signinConfig(registry,env),pending=await registry.consume('wx:'+u.searchParams.get('state'));if(!pending||pending.expires<Date.now()||!u.searchParams.get('code'))return new Response('授权已过期，请重新扫码',{status:403});const v=new URL('https://api.weixin.qq.com/sns/oauth2/access_token');v.search=new URLSearchParams({appid:wx.wechat.appId,secret:wx.wechat.appSecret,code:u.searchParams.get('code'),grant_type:'authorization_code'});const t=await(await fetch(v,{signal:AbortSignal.timeout(10000)})).json();if(!t.access_token||!t.openid)throw Error('微信授权失败');const profile=new URL('https://api.weixin.qq.com/sns/userinfo');profile.search=new URLSearchParams({access_token:t.access_token,openid:t.openid,lang:'zh_CN'});const user=await(await fetch(profile,{signal:AbortSignal.timeout(10000)})).json();if(!user.openid||user.openid!==t.openid||!user.nickname)throw Error('暂时无法获取微信头像与昵称，请重试或联系活动管理员。');const profileData={provider:'wechat',openid:user.openid,nickname:user.nickname,avatar:normalizeWechatAvatar(user.headimgurl),expires:Date.now()+604800000},r=await room(pending.id).checkInVerified(profileData);if(r.error)return outcome(r);const sid=random();await registry.set('wxviewer:'+sid,profileData);const g=await room(pending.id).get();return new Response(null,{status:302,headers:{'Location':'/interact.html?id='+pending.id+'&token='+g.signup_token,'Set-Cookie':'lucky_wechat='+sid+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800'}})}

const overlay=/^\/api\/overlay\/(\d+)$/.exec(p);if(overlay){if(method!=='GET')return json({error:'方法不允许'},405);return outcome(await room(Number(overlay[1])).overlay(u.searchParams.get('token')))}
const results=/^\/api\/results\/(\d+)$/.exec(p);if(results){const r=room(Number(results[1])),g=await r.get();if(!g)return json({error:'未找到活动'},404);const viewer=(await registry.session(cookie))?.user;if(!viewer)return json({error:'请先登录'},401);if(viewer.role!=='owner'&&g.owner_id!==viewer.id)return json({error:'未找到活动'},404);const {overlay_token,signup_token,seed,...giveaway}=g;return json({giveaway,winners:await r.winners()})}

if (p.startsWith('/api/miniapp/')) {
  const messageMatch=/^\/api\/miniapp\/(blessing|like)\/(\d+)$/.exec(p);
  if(messageMatch&&method==='POST'){
    const r=room(Number(messageMatch[2])),g=await r.get(),b=await bodyOf(req);
    if(!g||!validOverlayToken(g.signup_token,b.token||u.searchParams.get('token')))return json({error:'互动凭据无效，请重新扫码'},403);
    const raw=String(b.viewer||b.openid||''),viewer=/^[a-zA-Z0-9-]{16,80}$/.test(raw)?raw:createHash('sha256').update(raw||req.headers.get('cf-connecting-ip')||'miniapp').digest('hex').slice(0,32);
    return outcome(await r.interactionPost({kind:messageMatch[1]==='like'?'like':'message',viewer,name:b.name||b.nickName||'微信观众',text:b.text||b.message||''},req.headers.get('cf-connecting-ip')||'local'),201);
  }

  if (p === '/api/miniapp/login' && method === 'POST') {
    const b = await bodyOf(req);
    const code = String(b.code || '').trim();
    if (!code) return json({ error: 'code 不能为空' }, 400);
    const wx = await signinConfig(registry, env);
    if (wx.wechat?.appId && wx.wechat?.appSecret) {
      try {
        const wxRes = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${wx.wechat.appId}&secret=${wx.wechat.appSecret}&js_code=${code}&grant_type=authorization_code`);
        const data = await wxRes.json();
        if (data.openid) return json({ openid: data.openid, session_key: data.session_key });
      } catch (err) {}
    }
    const hash = crypto.randomUUID().slice(0, 12);
    return json({ openid: 'wx_mock_' + hash, mock: true });
  }

  const campMatch = /^\/api\/miniapp\/campaign\/(\d+)$/.exec(p);
  if (campMatch && method === 'GET') {
    const r = room(Number(campMatch[1])), g = await r.get();
    if (!g) return json({ error: '未找到活动' }, 404);
    const comments = await r.comments();
    const isDrawn = g.status === 'drawn';
    const winners = isDrawn ? await r.winners() : [];
    const pres = JSON.parse(g.presentation_json || '{}');
    const snap = await r.interactionSnapshot();
    return json({
      id: g.id,
      title: g.title || '幸运互动',
      status: g.status,
      open: !isDrawn,
      checkinCount: comments.length,
      winnerCount: g.winner_count,
      theme: pres.theme || 'deepsea',
      logo: pres.logoImage || '/default-logo.jpg',
      likes: snap.likes || 0,
      signupToken: g.signup_token,token:g.signup_token,
      isDrawn,
      winners: winners.map(w => ({ id: w.id, name: w.author_name, rank: w.rank, prize: w.prize }))
    });
  }

  const chkMatch = /^\/api\/miniapp\/checkin\/(\d+)$/.exec(p);
  if (chkMatch && method === 'POST') {
    const r = room(Number(chkMatch[1])), g = await r.get();
    if (!g) return json({ error: '未找到活动' }, 404);
    const b = await bodyOf(req);
    if (!validOverlayToken(g.signup_token, b.token)) return json({ error: '签到凭据无效，请重新扫码' }, 403);
    const result = await r.registerCustomCandidate({ name: b.name, code: b.code, text: b.danmaku || b.text, viewer: b.openid });
    return outcome(result, 201);
  }
}

const interactive=/^\/api\/interact\/(\d+)(\/screen)?$/.exec(p);if(interactive){const r=room(Number(interactive[1])),g=await r.get(),screen=Boolean(interactive[2]);if(!g||!validOverlayToken(screen?g.overlay_token:g.signup_token,u.searchParams.get('token')))return json({error:'互动链接无效，请重新扫码'},403);if(method==='GET'){const result=await r.interactionSnapshot();if(screen){const base=await signinBase(g,registry,env,u.origin),url=base+(g.source_mode==='wechat'?startPath(g):'/interact.html')+'?id='+g.id+'&token='+g.signup_token,qr=await generateQrForGiveaway(g,url,registry,env);return json({...result,url,qr,localOnly:false})}const sid=/(?:^|;\s*)lucky_wechat=([\w-]+)/.exec(req.headers.get('cookie')||'')?.[1],profile=sid?await registry.get('wxviewer:'+sid):null,verified=profile?.expires>Date.now()?profile:null;const viewer=u.searchParams.get('viewer');const qual=g.source_mode==='custom'?await r.customQualification(viewer):await r.wechatQualification(verified);return json({...result,...qual,authorizeUrl:g.source_mode==='wechat'?startPath(g)+'?id='+g.id+'&token='+g.signup_token:''})}if(method==='POST'&&!screen){const origin=req.headers.get('origin');if(origin&&origin!==u.origin)return json({error:'请从扫码页面参与互动'},403);const b=await bodyOf(req);if(b.kind==='custom_register'){return outcome(await r.registerCustomCandidate({name:b.name,code:b.code,text:b.text,viewer:b.viewer}),201)}if(b.kind==='checkin'){const sid=/(?:^|;\s*)lucky_wechat=([\w-]+)/.exec(req.headers.get('cookie')||'')?.[1],profile=sid?await registry.get('wxviewer:'+sid):null;if(!profile||profile.expires<=Date.now())return json({error:'请先完成微信授权签到',authorizeUrl:startPath(g)+'?id='+g.id+'&token='+g.signup_token},401);return outcome(await r.checkInVerified(profile))}if(!/^[a-zA-Z0-9-]{16,80}$/.test(String(b.viewer||'')))b.viewer=createHash('sha256').update(String(b.viewer||b.openid||req.headers.get('cf-connecting-ip')||'miniapp')).digest('hex').slice(0,32);return outcome(await r.interactionPost(b,req.headers.get('cf-connecting-ip')||'local'),201)}return json({error:'方法不允许'},405)}
if(!p.startsWith('/api/')){let file=p;if(p==='/'||p==='/admin'||/^\/settings\/(wechat|dingtalk|telegram)\/?$/.test(p))file='/index.html';else if(p==='/owner'||p==='/setup')file='/owner.html';else if(p==='/account'||p==='/login')file='/account.html';else if(/^\/(overlay|live)\/\d+$/.test(p))file='/overlay.html';else if(/^\/results\/\d+$/.test(p))file='/results.html';return env.ASSETS.fetch(new Request(new URL(file,u.origin),req))}
const session=await registry.session(cookie);if(!['GET','HEAD'].includes(method)){const origin=req.headers.get('origin');if((origin&&origin!==u.origin)||req.headers.get('sec-fetch-site')==='cross-site')return json({error:'请求来源无效'},403);const h=req.headers.get('x-csrf-token');if(p!=='/api/owner/setup'&&(!session||h!==session.csrf))return json({error:'CSRF 校验失败'},403);}
if(p==='/api/csrf'){if(method!=='GET')return json({error:'方法不允许'},405);if(session)return json({token:session.csrf});const created=await registry.openSession();return new Response(JSON.stringify({token:created.csrf}),{headers:{'content-type':'application/json','Set-Cookie':`studio_session=${created.sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${u.protocol==='https:'?'; Secure':''}`}});}

// 跨域 OPTIONS 支持
if (req.method === 'OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Token, x-miniapp, Origin, Accept'
    }
  });
}

// 微信小程序专属发送祝福与留言
if (p.startsWith('/api/miniapp/blessing/') && req.method === 'POST') {
  const activityId = p.split('/')[4];
  const b = await bodyOf(req);
  const text = String(b.text || b.message || '').trim();
  const name = String(b.name || b.nickName || '微信观众').trim();
  if (!text) return json({ error: '请输入祝福语' }, 400);
  const event = { id: Date.now(), activity: activityId, kind: 'message', name, text, created: Date.now() };
  if (env.CONFIG_KV) {
    const key = `events:${activityId}`;
    let list = [];
    try { list = JSON.parse(await env.CONFIG_KV.get(key) || '[]'); } catch {}
    list.unshift(event);
    if (list.length > 80) list = list.slice(0, 80);
    await env.CONFIG_KV.put(key, JSON.stringify(list));
  }
  return json({ ok: true, name, text });
}

// 主题解锁与免验打赏路由
if (p === '/api/account/unlocked-themes') {
 const user=session?.user;if(!user)return json({unlockedThemes:[]});
 const unlockedThemes=[];
 for(const id of ['festival','caishen']){let value=await env.CONFIG_KV?.get(`unlocked_theme:${user.username}:${id}`);if(!value&&id==='festival')value=await env.CONFIG_KV?.get(`unlocked_theme:${user.username}:cny`);if(value)unlockedThemes.push(id)}
 return json({unlockedThemes});
}
if(p==='/api/account/unlock-theme'&&method==='POST'){
 const user=session?.user;if(!user)return json({error:'请先登录账号'},401);
 const b=await bodyOf(req),themeId=b.themeId==='cny'?'festival':String(b.themeId||''),amount=Number(b.amount);
 if(!requiresThemeUnlock(themeId)||!Number.isFinite(amount)||amount<=0)return json({error:'主题或金额无效'},400);
 if(!env.CONFIG_KV)return json({error:'主题解锁存储未配置，请联系站长'},503);
 await env.CONFIG_KV.put(`unlocked_theme:${user.username}:${themeId}`,JSON.stringify({amount,unlockedAt:Date.now(),unverified:true}));
 return json({ok:true,unlocked:true,themeId,amount,unverified:true});
}
if (p === '/api/theme/cny-status') {
  const user = session?.user;
  let isUnlocked = false;
  if (user) {
    if (user.role === 'owner') isUnlocked = true;
    else {
      const key = `unlocked_theme:${user.username}:cny`;
      const val = await env.CONFIG_KV?.get(key);
      if (val) isUnlocked = true;
    }
  }
  return json({ theme: 'cny', unlocked: isUnlocked, isOwner: user?.role === 'owner', mianbaoduoConfigured: false });
}

if(p==='/api/account'||p.startsWith('/api/account/')||p.startsWith('/api/owner/')){const result=await accountRoute(req,env,registry,session,bodyOf);return result||json({error:'接口不存在'},404)}
const user=session?.user,policy=runtimeConfig(env,await registry.get('authConfig')||{});if((p==='/api/giveaways'||p.startsWith('/api/giveaways/'))&&!user)return json({error:'请先登录'},401);
if(p.startsWith('/api/admin/')&&user?.role!=='owner')return json({error:'仅站长可访问'},user?403:401);
if(p==='/api/donation'||p==='/donation.png')return new Response(Buffer.from(donation,'base64'),{headers:{'content-type':'image/png','cache-control':'public,max-age=86400'}});
if(p==='/api/admin/signin-capabilities')return json(signinCapabilities(await signinConfig(registry,env),'cloudflare',Boolean(env.CONFIG_KV)));
if(p==='/api/admin/signin-config'){const c=await signinConfig(registry,env);if(method==='GET')return json(safeSettings(c));if(method==='POST'){const next=updateSettings(c,await bodyOf(req));await saveSigninConfig(registry,env,next);return json(safeSettings(next))}}
if(p==='/api/admin/signin-config/telegram/activate'&&method==='POST')return json(await activateTelegram(signinContext(registry,env,room)));
if(p==='/api/admin/theme'&&method==='POST'){const b=await bodyOf(req);if(!isThemeId(b.id))throw Error('请选择可用主题');if(requiresThemeUnlock(b.id)){let unlocked=await env.CONFIG_KV?.get(`unlocked_theme:${user.username}:${b.id}`);if(!unlocked&&b.id==='festival')unlocked=await env.CONFIG_KV?.get(`unlocked_theme:${user.username}:cny`);if(!unlocked)return json({error:'请先打赏解锁此主题'},403)}await registry.set('theme',b.id);await registry.set('theme-animation',normalizeThemeAnimation(b.id,b.animation));return json({id:b.id,animation:normalizeThemeAnimation(b.id,b.animation)})}
if(p==='/api/admin/settings')return json({youtubeApiConfigured:Boolean(await registry.get('youtubeKey',env.YOUTUBE_API_KEY||''))});
if(p==='/api/admin/youtube-key'){if(method==='DELETE'){await registry.set('youtubeKey','');return json({configured:false})}const b=await bodyOf(req),key=String(b.apiKey||'').trim();if(key.length<20||key.length>300)throw Error('API Key 格式无效');await registry.set('youtubeKey',key);return json({configured:true})}
if(p==='/api/admin/music/settings'&&method==='POST'){const b=await bodyOf(req),ids=new Set(['off',...builtinTracks.map(t=>t.id),...(await registry.get('uploadedTracks',[])).map(t=>t.id)]);if(!['waiting','drawing','winner'].every(k=>ids.has(b[k]))||!Number.isFinite(Number(b.volume)))throw Error('音乐设置无效');await registry.set('musicSettings',{waiting:b.waiting,drawing:b.drawing,winner:b.winner,volume:Math.min(1,Math.max(0,Number(b.volume)))});return json({ok:true})}
if(p==='/api/admin/music/upload'&&method==='POST'){if(!env.MEDIA)return json({error:'R2存储未启用，无法上传自定义音乐'},503);const b=await bodyOf(req),m=String(b.data||'').match(/^data:(audio\/(?:mpeg|mp3|wav|x-wav|ogg|mp4|webm));base64,([A-Za-z0-9+/=]+)$/);if(!m)throw Error('不支持的音频格式');const bytes=Buffer.from(m[2],'base64');if(bytes.length>12000000||!bytes.length)throw Error('音频需小于 12MB');const selected=matchSelectedTrack(selectedTracks,b.name,b.libraryId);if(b.libraryId&&!selected)throw Error('曲库条目不存在');const id=selected?.id||crypto.randomUUID(),ext=({'audio/mpeg':'mp3','audio/mp3':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','audio/mp4':'m4a','audio/webm':'webm'})[m[1]],file=id+'.'+ext;await env.MEDIA.put('music/'+file,bytes,{httpMetadata:{contentType:m[1]}});await registry.appendTrack({id,name:selected?.name||String(b.name||'自定义音乐').slice(0,100),builtin:false,file,libraryId:selected?.id||null,artist:selected?.artist||''});return json({id},201)}
if(p==='/api/platforms')return json([{name:'YouTube',status:'API 优先；未配置时尝试公开评论',direct:true},{name:'其他视频平台',status:'请自行尝试是否支持',direct:false},{name:'blog',status:'从文章链接抓取评论（如果支持）',direct:false}]);
if(p==='/api/giveaways'){if(method==='GET'){const ids=await registry.ids(),rows=[];for(let i=0;i<ids.length;i+=15)rows.push(...await Promise.all(ids.slice(i,i+15).map(id=>room(id).snapshot())));return json(rows.filter(g=>g&&(user.role==='owner'||g.owner_id===user.id)))}if(method==='POST'){const b=await bodyOf(req),source_mode=['youtube','comments','custom','wechat'].includes(b.sourceMode)?b.sourceMode:'youtube',video_id=['youtube','comments'].includes(source_mode)&&b.videoUrl?sourceReference(b.videoUrl,source_mode):source_mode==='youtube'?null:'local-'+crypto.randomUUID();if(!video_id)throw Error('请提供有效的 YouTube 视频链接；其他平台请使用评论表格');const title=String(b.title||'').trim(),keyword=source_mode==='wechat'?'':String(b.keyword||'').trim();if(title.length>200||keyword.length>120)throw Error('活动名称或关键词过长');const id=await registry.allocate(),g={id,video_id,title,keyword,...retentionConfig(user,configuration(b.config),Date.now(),policy),owner_id:user.id,retention_hours:policy.retentionHours,retention_24h:user.role!=='owner'&&!user.verified,expires_at:user.role!=='owner'&&!user.verified?new Date(Date.now()+policy.activityHours*HOUR).toISOString():null,source_mode,overlay_token:random(),signup_token:random(),presentation_json:JSON.stringify(presentation(b.presentation)),created_at:new Date().toISOString(),last_error:''};try{await room(id).create(g)}catch(e){await registry.remove(id);throw e}return json({id},201)}}
const match=/^\/api\/giveaways\/(\d+)(?:\/([^/]+))?$/.exec(p);if(!match)return json({error:'接口不存在'},404);const id=Number(match[1]),operation=match[2]||'',r=room(id),g=await r.get();if(!g||(user.role!=='owner'&&g.owner_id!==user.id))return json({error:'未找到活动'},404);
if(!operation){if(method==='GET')return json({...g,config:apiConfig(g)});if(method==='PATCH'){const b=await bodyOf(req);return outcome(await r.patch({title:String(b.title??g.title).slice(0,200),keyword:String(b.keyword??g.keyword).slice(0,120),...retentionConfig(user,configuration(b.config||apiConfig(g),g),Date.parse(g.created_at),policy)}))}if(method==='DELETE'){await r.remove();await registry.remove(id);return json({deleted:true})}}
if(operation==='presentation'&&method==='POST')return outcome(await r.patch({presentation_json:JSON.stringify(presentation(await bodyOf(req)))}));
if(operation==='clone'&&method==='POST'){const newId=await registry.allocate();return outcome(await room(newId).create({...g,...retentionConfig(user,{end_at:g.end_at},Date.now(),policy),id:newId,owner_id:user.id,retention_hours:policy.retentionHours,retention_24h:user.role!=='owner'&&!user.verified,expires_at:user.role!=='owner'&&!user.verified?new Date(Date.now()+policy.activityHours*HOUR).toISOString():null,created_at:new Date().toISOString(),draw_ends_at:null,title:(g.title||g.video_title||'活动')+'（新任务）',overlay_token:random(),signup_token:random(),status:'ready',schedule_enabled:0,schedule_at:null,reveal_started_at:null,seed:null}),201)}
if(operation==='comments'&&method==='GET'){const items=u.searchParams.get('eligible')==='true'?await r.eligible():await r.comments();return json({items,total:items.length})}
if(operation==='comments'&&method==='POST'){const b=await bodyOf(req);if(!Array.isArray(b.comments))throw Error('评论数组无效');return outcome(await r.importRows(b.comments.slice(0,500).map(c=>displayRow({id:String(c.id).slice(0,200),author_channel_id:String(c.authorChannelId).slice(0,200),author_name:String(c.authorName||''),text:String(c.text||''),published_at:String(c.publishedAt||''),raw_json:JSON.stringify(c.raw||{})}))),201)}
if(operation==='spreadsheet'&&method==='POST'){if(g.status==='drawn')return json({error:'已开奖活动不可导入'},409);const rows=await parseRows(await bodyOf(req),g),awardNames=rows.map(c=>String(JSON.parse(c.raw_json||'{}')['获奖名称']||'').trim().slice(0,60)).filter(Boolean).slice(0,100),result=await r.importRows(rows);if(!result.error&&awardNames.length)await r.patch({presentation_json:JSON.stringify({...JSON.parse(g.presentation_json||'{}'),rankStyle:'custom',awardNames})});return outcome(result)}
if(operation==='next'&&method==='POST'){const b=await bodyOf(req);return outcome(await r.nextReveal(b.expectedRound))}
if(operation==='draw'&&method==='POST'){retentionConfig(user,g,Date.parse(g.created_at),policy);const b=await bodyOf(req);return outcome(await r.draw(Math.max(1,Math.min(100,Number(b.count)||g.winner_count))))}
if(operation==='import'&&method==='POST'){if(g.status==='drawn')return json({error:'已开奖活动不可导入'},409);if(!['youtube','comments'].includes(g.source_mode))throw Error('此模式请使用名单文件夹导入');const key=await registry.get('youtubeKey',env.YOUTUBE_API_KEY||'');const {rows,video,source}=await importSource(g.video_id,key);const result=await r.importRows(rows.map(c=>displayRow({id:c.id,author_channel_id:c.authorChannelId,author_name:c.authorName,text:c.text,published_at:c.publishedAt,raw_json:JSON.stringify(c.raw)})));if(result.error)return outcome(result);await r.patch({video_title:video.title,video_channel:video.channelTitle,video_author_channel_id:video.channelId,video_published_at:video.publishedAt});return json({...result,source})}
if(operation==='interaction'&&method==='GET'){const base=await signinBase(g,registry,env,u.origin),url=base+(g.source_mode==='wechat'?startPath(g):'/interact.html')+'?id='+g.id+'&token='+g.signup_token,qr=await generateQrForGiveaway(g,url,registry,env);return json({...await r.interactionSnapshot(),url,qr})}
if(operation==='signup'&&method==='GET'){const base=await signinBase(g,registry,env,u.origin),url=base+(g.source_mode==='wechat'?startPath(g):'/interact.html')+'?id='+id+'&token='+g.signup_token,qr=await generateQrForGiveaway(g,url,registry,env);return json({...await r.interactionSnapshot(),url,qr})}

if(operation==='export.csv'){const rows=(await r.winners()).map(w=>({rank:w.rank,获奖名称:awardNameFor(JSON.parse(g.presentation_json||'{}'),w.rank-1),account:w.handle,name:['custom','wechat'].includes(g.source_mode)?w.author_name:'',comment:w.text,drawn_at:w.drawn_at}));return new Response('\ufeff'+safeCsv(rows),{headers:{'content-type':'text/csv;charset=utf-8','content-disposition':'attachment; filename="winners.csv"'}})}
if(operation==='export.xlsx'){const rows=[['名次','账号','姓名','完整评论','获奖名称','完整导入信息']];for(const w of await r.winners()){const raw=JSON.parse(w.raw_json||'{}');if(String(raw.avatar||'').startsWith('data:'))raw.avatar='[嵌入头像]';rows.push([w.rank,w.handle,['custom','wechat'].includes(g.source_mode)?w.name:'',w.text,awardNameFor(JSON.parse(g.presentation_json||'{}'),w.rank-1),JSON.stringify(raw)])}return new Response(workbookBytes(rows),{headers:{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','content-disposition':'attachment; filename="winners.xlsx"'}})}
return json({error:'接口或方法不存在'},404)
}
export default {async fetch(req,env,ctx){let response;try{response=await route(req,env)}catch(e){console.error(JSON.stringify({event:'request_failed',path:new URL(req.url).pathname,message:e.message}));response=json({error:e.message||'服务暂时不可用'},e.status||400)}const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://telegram.org; frame-src 'self' https://oauth.telegram.org https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");if(new URL(req.url).pathname.startsWith('/api/')&&!new URL(req.url).pathname.startsWith('/api/music/'))headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}};
