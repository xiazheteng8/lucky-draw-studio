import fs from 'node:fs';
import path from 'node:path';
import {chosenProvider,startPath,providerLabels} from './signin-service.js';
import crypto from 'node:crypto';import os from 'node:os';import {interactionInput,interactionOpen,publicBase} from './interaction-model.js';
export function interactionRoutes(app,{auth,csrf,one,all,run,transaction,QRCode,port}){run('CREATE TABLE IF NOT EXISTS interaction_events(id INTEGER PRIMARY KEY AUTOINCREMENT,activity INTEGER,kind TEXT,name TEXT,text TEXT,created INTEGER)');run('CREATE TABLE IF NOT EXISTS interaction_limits(k TEXT PRIMARY KEY,last INTEGER)');run('CREATE TABLE IF NOT EXISTS interaction_totals(activity INTEGER PRIMARY KEY,likes INTEGER DEFAULT 0)');
function activity(id){return one('SELECT * FROM giveaways WHERE id=?',[Number(id)])}
function tokenFor(g){if(!g.signup_token){g.signup_token=crypto.randomBytes(24).toString('base64url');run('UPDATE giveaways SET signup_token=? WHERE id=?',[g.signup_token,g.id])}return g.signup_token}
function valid(a,b){if(!a||!b)return false;const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function snapshot(g){return {sourceMode:g.source_mode,signinProvider:chosenProvider(g),providerLabel:providerLabels[chosenProvider(g)],signIn:g.source_mode==='wechat',checkinCount:all('SELECT id FROM comments WHERE giveaway_id=?',[g.id]).length,title:g.title||'幸运互动',open:interactionOpen(g),logo:JSON.parse(g.presentation_json||'{}').logoImage||'/default-logo.jpg',likes:one('SELECT likes FROM interaction_totals WHERE activity=?',[g.id])?.likes||0,events:[...all("SELECT id,kind,name,text,created FROM interaction_events WHERE activity=? AND kind='message' ORDER BY id DESC LIMIT 50",[g.id]),...all("SELECT id,kind,name,text,created FROM interaction_events WHERE activity=? AND kind='like' ORDER BY id DESC LIMIT 30",[g.id])].sort((a,b)=>a.id-b.id)}}
function base(req,g){const settings=JSON.parse(g.presentation_json||'{}'),configured=g.source_mode==='wechat'?(process.env.BASE_URL||settings.interactionBaseUrl):(settings.interactionBaseUrl||process.env.BASE_URL);if(configured)return publicBase(configured,req.protocol+'://'+req.get('host'));const host=req.hostname;if(!['localhost','127.0.0.1','::1'].includes(host))return req.protocol+'://'+req.get('host');const interfaces=os.networkInterfaces(),candidates=[];for(const [name,items] of Object.entries(interfaces)){if(/wsl|vethernet|docker|vpn|tun|loopback/i.test(name))continue;for(const item of items||[])if(item.family==='IPv4'&&!item.internal&&/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address))candidates.push(item.address)}const ip=candidates.find(x=>x.startsWith('192.168.'))||candidates[0];return ip?'http://'+ip+':'+port:req.protocol+'://'+req.get('host')}


function getWeChatConfig() {
  let appId = process.env.WECHAT_APP_ID || '';
  let appSecret = process.env.WECHAT_APP_SECRET || '';
  let envVersion = process.env.WECHAT_ENV_VERSION || 'trial';
  try {
    const cfgPath = path.join(process.cwd(), 'data', 'signin-config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.wechat?.appId) appId = cfg.wechat.appId;
      if (cfg.wechat?.appSecret) appSecret = cfg.wechat.appSecret;
      if (cfg.wechat?.envVersion) envVersion = cfg.wechat.envVersion;
    }
  } catch {}
  return { appId, appSecret, envVersion };
}

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
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return 'data:image/jpeg;base64,' + base64;
}

const qrCache = new Map();
async function screen(req, g) {
  const url = base(req, g) + (g.source_mode === 'wechat' ? startPath(g) : '/interact.html') + '?id=' + g.id + '&token=' + tokenFor(g);
  const cacheKey = `${g.id}:${g.source_mode}:${tokenFor(g)}`;

  if (!qrCache.has(cacheKey)) {
    let qrImage = null;
    if (g.source_mode === 'wechat') {
      const { appId, appSecret, envVersion } = getWeChatConfig();
      if (appId && appSecret) {
        try {
          qrImage = await getWeChatMiniAppCode(appId, appSecret, `id=${g.id}`, 'pages/checkin/checkin', envVersion);
          console.log(`[Screen] 活动 ${g.id} 成功生成微信小程序专属太阳码 (env: ${envVersion})`);
        } catch (err) {
          console.warn('[Screen] 生成微信小程序太阳码异常，回退至普通二维码:', err.message);
        }
      }
    }

    if (!qrImage) {
      qrImage = await QRCode.toDataURL(url, { width: 360, margin: 2 });
    }

    if (qrCache.size > 100) qrCache.clear();
    qrCache.set(cacheKey, qrImage);
  }

  return {
    ...snapshot(g),
    url,
    qr: qrCache.get(cacheKey),
    localOnly: /\/\/(localhost|127\.0\.0\.1|\[::1\])(?=[\/:])/.test(url)
  };
}

app.get('/api/interact/:id/screen',async(req,res)=>{try{const g=activity(req.params.id);if(!g||!valid(g.overlay_token,req.query.token))return res.status(403).json({error:'大屏链接无效'});res.set('Cache-Control','no-store').json(await screen(req,g))}catch(e){res.status(400).json({error:e.message})}});
app.get('/api/giveaways/:id/interaction',auth,async(req,res)=>{try{const g=activity(req.params.id);if(!g)return res.status(404).json({error:'未找到活动'});res.json(await screen(req,g))}catch(e){res.status(400).json({error:e.message})}});
app.get('/api/giveaways/:id/signup',auth,async(req,res)=>{try{const g=activity(req.params.id);if(!g)return res.status(404).json({error:'未找到活动'});res.json(await screen(req,g))}catch(e){res.status(400).json({error:e.message})}});
app.get('/api/interact/:id', (req,res)=>{const g=activity(req.params.id);const reqTok=req.query?.token||req.body?.token;if(!g||!valid(g.signup_token,reqTok))return res.status(403).json({error:'互动链接无效，请重新扫码'});const viewer=String(req.query.viewer||'').trim();let customParticipant=null;if(viewer&&g.source_mode==='custom'){const allCandidates=all('SELECT author_name,raw_json FROM comments WHERE giveaway_id=?',[g.id]);for(const c of allCandidates){try{const raw=JSON.parse(c.raw_json||'{}');if(raw.viewer===viewer){customParticipant={name:c.author_name,code:raw.code||''};break}}catch{}}}const candidate=req.session.wxViewer,profile=candidate&&(candidate.provider||'wechat')===chosenProvider(g)?candidate:null,record=profile?.openid?one('SELECT author_name,raw_json FROM comments WHERE giveaway_id=? AND id=?',[g.id,profile.openid]):null;res.set('Cache-Control','no-store').json({...snapshot(g),checkedIn:Boolean(record||customParticipant),participant:record?{name:record.author_name,avatar:JSON.parse(record.raw_json||'{}').avatar||''}:customParticipant,authorizeUrl:g.source_mode==='wechat'?startPath(g)+'?id='+g.id+'&token='+g.signup_token:''})});
app.post('/api/interact/:id',(req,res)=>{try{const g=activity(req.params.id);const reqTok=req.query?.token||req.body?.token;if(!g||!valid(g.signup_token,reqTok))return res.status(403).json({error:'互动链接无效，请重新扫码'});const origin=req.get('origin');const isWx=origin?.includes('servicewechat.com')||req.headers['user-agent']?.includes('MicroMessenger');if(origin&&!isWx&&origin!==req.protocol+'://'+req.get('host'))return res.status(403).json({error:'请从扫码页面参与互动'});
if(req.body?.kind==='custom_register'){if(g.source_mode!=='custom')return res.status(400).json({error:'此活动不是自定义名单模式'});if(!interactionOpen(g))return res.status(409).json({error:'报名已结束，活动已开奖或已关闭'});const trimmedName=String(req.body.name||'').trim(),trimmedCode=String(req.body.code||'').trim(),trimmedText=String(req.body.text||'').trim(),viewer=String(req.body.viewer||'').trim();if(!trimmedName)return res.status(400).json({error:'请填写姓名'});if(trimmedName.length>50)return res.status(400).json({error:'姓名不能超过 50 个字符'});if(trimmedCode.length>50)return res.status(400).json({error:'编号不能超过 50 个字符'});if(trimmedText.length>120)return res.status(400).json({error:'字幕内容不能超过 120 个字符'});const existing=all('SELECT id,author_channel_id,author_name,raw_json FROM comments WHERE giveaway_id=?',[g.id]);if(viewer){for(const c of existing){try{const raw=JSON.parse(c.raw_json||'{}');if(raw.viewer===viewer)return res.status(409).json({error:`您已使用「${c.author_name}」成功报名，不可重复提交`})}catch{}}}if(trimmedCode){const codeLower=trimmedCode.toLowerCase();for(const c of existing){const idLower=String(c.id||'').replace(/^code[:_]/,'').toLowerCase(),authorLower=String(c.author_channel_id||'').replace(/^code[:_]/,'').toLowerCase();let rawCode='';try{const raw=JSON.parse(c.raw_json||'{}');rawCode=String(raw.code||raw['编号']||raw['工号']||raw['学号']||'').toLowerCase()}catch{}if(idLower===codeLower||authorLower===codeLower||rawCode===codeLower)return res.status(409).json({error:`编号「${trimmedCode}」已存在，请勿重复报名`})}}else{const nameLower=trimmedName.toLowerCase();for(const c of existing){let candidateName='';try{const raw=JSON.parse(c.raw_json||'{}');candidateName=String(raw.name||raw['姓名']||'').toLowerCase()}catch{}if(!candidateName)candidateName=String(c.author_name||'').toLowerCase();if(candidateName===nameLower)return res.status(409).json({error:`姓名「${trimmedName}」已存在，请勿重复报名`})}}const candidateId=trimmedCode?('code_'+trimmedCode):('custom_'+crypto.randomUUID()),authorChannelId=trimmedCode?trimmedCode:('name_'+trimmedName),rawJson=JSON.stringify({source:'custom_signup',code:trimmedCode||'',name:trimmedName,viewer:viewer||'',text:trimmedText});transaction(()=>{run('INSERT INTO comments(id,giveaway_id,author_channel_id,author_name,text,published_at,raw_json) VALUES(?,?,?,?,?,?,?)',[candidateId,g.id,authorChannelId,trimmedName,trimmedText,new Date().toISOString(),rawJson]);if(trimmedText)run('INSERT INTO interaction_events(activity,kind,name,text,created) VALUES(?,?,?,?,?)',[g.id,'message',trimmedName,trimmedText,Date.now()])});return res.status(201).json({ok:true,registered:true,name:trimmedName,code:trimmedCode||'',likes:one('SELECT likes FROM interaction_totals WHERE activity=?',[g.id])?.likes||0})}
if(req.body?.kind==='checkin'){if(g.source_mode!=='wechat')return res.status(400).json({error:'此活动不是微信签到模式'});const profile=req.session.wxViewer;if(!profile?.openid||!profile.nickname||(profile.provider||'wechat')!==chosenProvider(g))return res.status(401).json({error:'请先完成平台扫码签到',authorizeUrl:startPath(g)+'?id='+g.id+'&token='+g.signup_token});const existing=one('SELECT * FROM comments WHERE giveaway_id=? AND id=?',[g.id,profile.openid]);if(!interactionOpen(g)){if(existing)return res.json({checkedIn:true,already:true,name:existing.author_name,open:false});return res.status(409).json({error:'签到已结束，本次无法加入抽奖'});}if(!existing)run('INSERT INTO comments(id,giveaway_id,author_channel_id,author_name,text,published_at,raw_json) VALUES(?,?,?,?,?,?,?)',[profile.openid,g.id,profile.openid,profile.nickname,'',new Date().toISOString(),JSON.stringify({source:profile.provider||'wechat',avatar:profile.avatar||''})]);return res.status(existing?200:201).json({checkedIn:true,already:Boolean(existing),name:profile.nickname,avatar:profile.avatar||'',open:true})}if(!interactionOpen(g))return res.status(409).json({error:'本场互动已结束，感谢参与'});const rawViewer=String(req.body?.viewer||req.body?.openid||''),normalizedViewer=/^[a-zA-Z0-9-]{16,80}$/.test(rawViewer)?rawViewer:crypto.createHash('sha256').update(rawViewer||req.ip+':'+String(req.get('user-agent')||'')).digest('hex').slice(0,32),input=interactionInput({...req.body,viewer:normalizedViewer}),now=Date.now(),key=g.id+':'+input.viewer+':'+input.kind,ipKey=g.id+':ip:'+req.ip,last=one('SELECT last FROM interaction_limits WHERE k=?',[key])?.last||0;if(now-last<(input.kind==='like'?450:5000))return res.status(429).json({error:input.kind==='like'?'爱心正在飞，稍等一下再点':'留言已收到，请稍等几秒再发'});const burst=one('SELECT last FROM interaction_limits WHERE k=?',[ipKey])?.last||0;if(now-burst<80)return res.status(429).json({error:'现场很热闹，请稍后重试'});transaction(()=>{run('INSERT OR REPLACE INTO interaction_limits VALUES(?,?)',[key,now]);run('INSERT OR REPLACE INTO interaction_limits VALUES(?,?)',[ipKey,now]);run('DELETE FROM interaction_limits WHERE last<?',[now-3600000]);run('INSERT INTO interaction_events(activity,kind,name,text,created) VALUES(?,?,?,?,?)',[g.id,input.kind,input.name,input.text,now]);if(input.kind==='like')run('INSERT INTO interaction_totals VALUES(?,1) ON CONFLICT(activity) DO UPDATE SET likes=likes+1',[g.id]);run('DELETE FROM interaction_events WHERE activity=? AND kind=? AND id NOT IN (SELECT id FROM interaction_events WHERE activity=? AND kind=? ORDER BY id DESC LIMIT 80)',[g.id,input.kind,g.id,input.kind])});res.status(201).json({ok:true,likes:one('SELECT likes FROM interaction_totals WHERE activity=?',[g.id])?.likes||0})}catch(e){res.status(400).json({error:e.message})}});


// Mini Program API Endpoints
app.get('/api/miniapp/campaign/:id', (req, res) => {
  try {
    const g = activity(req.params.id);
    if (!g) return res.status(404).json({ error: '未找到活动' });
    const count = all('SELECT id FROM comments WHERE giveaway_id=?', [g.id]).length;
    const isDrawn = g.status === 'drawn';
    const winners = isDrawn ? all('SELECT * FROM winners WHERE giveaway_id=? ORDER BY id ASC', [g.id]) : [];
    const pres = JSON.parse(g.presentation_json || '{}');
    const likes = one('SELECT likes FROM interaction_totals WHERE activity=?', [g.id])?.likes || 0;
    res.json({
      id: g.id,
      title: g.title || '幸运互动',
      status: g.status,
      open: interactionOpen(g),
      checkinCount: count,
      winnerCount: g.winner_count,
      theme: pres.theme || 'deepsea',
      logo: pres.logoImage || '/default-logo.jpg',
      likes: likes,
      signupToken: tokenFor(g),
      token: tokenFor(g),
      isDrawn,
      winners: winners.map((w,i) => ({ id: w.id, name: w.author_name, rank:i+1, prize:pres.prizes?.[i]?.name||pres.prizeName||'' }))
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/miniapp/login', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'code 不能为空' });
    let appId = process.env.WECHAT_APP_ID || '', appSecret = process.env.WECHAT_APP_SECRET || '';
    try {
      const cfgPath = path.join(process.cwd(), 'data', 'signin-config.json');
      if (fs.existsSync(cfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (cfg.wechat?.appId) appId = cfg.wechat.appId;
        if (cfg.wechat?.appSecret) appSecret = cfg.wechat.appSecret;
      }
    } catch {}

    if (appId && appSecret) {
      try {
        const wxRes = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`, { signal: AbortSignal.timeout(5000) });
        const data = await wxRes.json();
        if (data.openid) {
          return res.json({ openid: data.openid, session_key: data.session_key });
        }
      } catch (err) {
        console.warn('WeChat code2Session error:', err);
      }
    }
    const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 16);
    res.json({ openid: 'wx_mock_' + hash, mock: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/miniapp/checkin/:id', (req, res) => {
  try {
    const g = activity(req.params.id);
    if (!g) return res.status(404).json({ error: '活动不存在' });
    if (!valid(g.signup_token, req.body?.token)) return res.status(403).json({ error: '签到凭据无效，请重新扫码' });
    if (!interactionOpen(g)) return res.status(409).json({ error: '报名已结束，活动已开奖或已关闭' });

    const name = String(req.body?.name || '').trim();
    const code = String(req.body?.code || '').trim();
    const danmaku = String(req.body?.danmaku || req.body?.text || '').trim();
    const openid = String(req.body?.openid || '').trim();
    const avatar = String(req.body?.avatar || '').trim();

    if (!name) return res.status(400).json({ error: '请填写姓名' });
    if (name.length > 50) return res.status(400).json({ error: '姓名长度不能超过 50 个字符' });
    if (code.length > 50) return res.status(400).json({ error: '工号/学号不能超过 50 个字符' });
    if (danmaku.length > 120) return res.status(400).json({ error: '弹幕内容不能超过 120 个字符' });

    const existing = all('SELECT id, author_channel_id, author_name, raw_json FROM comments WHERE giveaway_id=?', [g.id]);

    if (openid) {
      for (const c of existing) {
        try {
          const raw = JSON.parse(c.raw_json || '{}');
          if (raw.openid === openid) return res.status(409).json({ error: `您已使用「${c.author_name}」成功签到，无需重复提交` });
        } catch {}
      }
    }

    if (code) {
      const codeLower = code.toLowerCase();
      for (const c of existing) {
        let rawCode = '';
        try {
          const raw = JSON.parse(c.raw_json || '{}');
          rawCode = String(raw.code || raw['编号'] || raw['工号'] || raw['学号'] || '').toLowerCase();
        } catch {}
        if (rawCode === codeLower || String(c.author_channel_id || '').toLowerCase() === codeLower) {
          return res.status(409).json({ error: `工号/编号「${code}」已被签到，请勿重复使用` });
        }
      }
    } else {
      const nameLower = name.toLowerCase();
      for (const c of existing) {
        if (String(c.author_name || '').toLowerCase() === nameLower) {
          return res.status(409).json({ error: `姓名「${name}」已在名单中，请勿重复签到` });
        }
      }
    }

    const cid = 'wx_' + (openid ? openid.slice(-12) : crypto.randomBytes(6).toString('hex'));
    const channelId = code || cid;
    const rawJson = JSON.stringify({ name, code, openid, avatar, danmaku, miniapp: true });

    transaction(() => {
      run('INSERT INTO comments(id, giveaway_id, author_channel_id, author_name, text, published_at, raw_json) VALUES(?, ?, ?, ?, ?, ?, ?)',
        [cid, g.id, channelId, name, danmaku || '已签到', new Date().toISOString(), rawJson]);
      if (danmaku) {
        run('INSERT INTO interaction_events(activity, kind, name, text, created) VALUES(?, ?, ?, ?, ?)',
          [g.id, 'message', name, danmaku, Date.now()]);
      }
    });

    const newCount = all('SELECT id FROM comments WHERE giveaway_id=?', [g.id]).length;
    res.json({ ok: true, success: true, count: newCount, name });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


// 微信小程序专属发送祝福与留言接口 (免除复杂防重防刷拦截，确保 100% 成功上大屏)
app.post('/api/miniapp/blessing/:id', (req, res) => {
  try {
    const g = activity(req.params.id);
    if (!g) return res.status(404).json({ error: '活动不存在' });
    if(!valid(g.signup_token,req.body?.token||req.query?.token))return res.status(403).json({error:'互动凭据无效，请重新扫码'});
    if(!interactionOpen(g))return res.status(409).json({error:'本场互动已结束'});
    const text = String(req.body?.text || req.body?.message || '').trim();
    const name = String(req.body?.name || req.body?.nickName || '微信观众').trim();
    const openid = String(req.body?.openid || req.body?.viewer || '').trim();

    if (!text) return res.status(400).json({ error: '请输入祝福或留言内容' });
    if (text.length > 120) return res.status(400).json({ error: '内容不能超过 120 个字' });

    const now = Date.now();
    transaction(() => {
      run('INSERT INTO interaction_events(activity,kind,name,text,created) VALUES(?,?,?,?,?)', [g.id, 'message', name, text, now]);
    });
    return res.status(201).json({ ok: true, name, text });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});
}
