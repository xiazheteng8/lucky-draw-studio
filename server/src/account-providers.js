/** Site-account providers; independent of activity sign-in.
 * Requires Web APIs (Node >=20 / Cloudflare Workers). Keep secrets server-side.
 * Caller MUST bind, validate and consume state with the initiating browser before
 * exchange, then issue its own session. No session or state storage occurs here.
 */
const providers = ['wechat', 'dingtalk', 'telegram'];
function required(value, label) {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) throw new Error(`${label} is required`);
  return value;
}
function settings(provider, config) {
  if (!providers.includes(provider)) throw new Error('Unsupported account provider');
  return config?.[provider] || {};
}
function callbackUrl(provider, c, baseUrl) {
  const base = new URL(required(baseUrl, 'baseUrl'));
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('baseUrl must be an HTTPS site URL');
  const url = new URL(c.redirectUri || `${base.href.replace(/\/$/, '')}/api/account/${provider}/callback`);
  if (url.protocol !== 'https:' || url.origin !== base.origin || url.username || url.password || url.hash) throw new Error('redirectUri must be on the HTTPS site origin');
  return url.href;
}
/** Returns an authorization URL. Telegram returns a LOCAL widget-host page URL,
 * not a bot /start or activity-signin link. Render the official Login Widget there.
 * Optional per-provider redirectUri overrides the default site callback.
 */
export function providerStartUrl(provider, config, state, baseUrl) {
  const c = settings(provider, config);
  required(state, 'state');
  const callback = callbackUrl(provider, c, baseUrl);
  if (provider === 'wechat') {
    const url = new URL('https://open.weixin.qq.com/connect/qrconnect');
    url.search = new URLSearchParams({appid: required(c.appId, 'wechat.appId'), redirect_uri: callback, response_type: 'code', scope: 'snsapi_login', state});
    url.hash = 'wechat_redirect';
    return url.href;
  }
  if (provider === 'dingtalk') {
    const url = new URL('https://login.dingtalk.com/oauth2/auth');
    url.search = new URLSearchParams({client_id: required(c.clientId, 'dingtalk.clientId'), redirect_uri: callback, response_type: 'code', scope: 'openid', prompt: 'consent', state});
    return url.href;
  }
  required(c.botUsername, 'telegram.botUsername');
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/$/, '') + '/api/account/telegram/widget';
  url.search = new URLSearchParams({state});
  return url.href;
}
function fields(input) {
  const result = Object.create(null);
  const entries = input instanceof URLSearchParams ? input.entries() : Object.entries(input || {});
  for (const [key, value] of entries) {
    if (Object.hasOwn(result, key) || !['string', 'number'].includes(typeof value) || (typeof value === 'number' && !Number.isSafeInteger(value))) throw new Error('Invalid or duplicate provider field');
    result[key] = String(value);
  }
  return result;
}
function avatar(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
function profile(provider, id, name, photo) {
  if (typeof id !== 'string' || !id || id.length > 256 || /[\r\n]/.test(id)) throw new Error('Provider did not return a valid user ID');
  return {provider, id, name: String(name || provider + ' user').slice(0, 100), avatar: avatar(photo)};
}
async function remoteJson(url, options = {}) {
  try {
    const response = await fetch(url, {...options, redirect: 'error', signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data) || (data.errcode && Number(data.errcode) !== 0)) throw new Error();
    return data;
  } catch { throw new Error('Account provider request failed'); }
}
/** query: plain object or URLSearchParams. Telegram input is ONLY the exact
 * signed widget payload; keep local state outside that payload. IDs are raw,
 * provider-scoped (WeChat openid, DingTalk openId), not prefixed or unionid-based.
 */
export async function exchangeProviderProfile(provider, query, config, baseUrl) {
  const c = settings(provider, config);
  if (provider === 'telegram') return verifyTelegramLogin(query, required(c.botToken, 'telegram.botToken'));
  callbackUrl(provider, c, baseUrl);
  const q = fields(query);
  if (q.error) throw new Error('Provider authorization was denied');
  const code = required(provider === 'dingtalk' ? q.authCode || q.code : q.code, 'authorization code');
  if (provider === 'wechat') {
    const url = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
    url.search = new URLSearchParams({appid: required(c.appId, 'wechat.appId'), secret: required(c.appSecret, 'wechat.appSecret'), code, grant_type: 'authorization_code'});
    const token = await remoteJson(url);
    if (!token.access_token || typeof token.openid !== 'string' || !token.openid) throw new Error('WeChat authorization failed');
    const userUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
    userUrl.search = new URLSearchParams({access_token: token.access_token, openid: token.openid, lang: 'zh_CN'});
    const user = await remoteJson(userUrl);
    if (user.openid !== token.openid) throw new Error('WeChat user identity mismatch');
    return profile(provider, user.openid, user.nickname, user.headimgurl);
  }
  const token = await remoteJson('https://api.dingtalk.com/v1.0/oauth2/userAccessToken', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({clientId: required(c.clientId, 'dingtalk.clientId'), clientSecret: required(c.clientSecret, 'dingtalk.clientSecret'), code, grantType: 'authorization_code'})
  });
  if (!token.accessToken || typeof token.accessToken !== 'string') throw new Error('DingTalk authorization failed');
  const user = await remoteJson('https://api.dingtalk.com/v1.0/contact/users/me', {headers: {'x-acs-dingtalk-access-token': token.accessToken}});
  return profile(provider, user.openId, user.nick, user.avatarUrl);
}
/** Legacy Telegram Login Widget, NOT Mini App initData. Accept POST JSON or
 * URLSearchParams containing only Telegram fields. Maximum age 5 minutes,
 * future clock tolerance 30 seconds. Caller handles browser state and replay.
 */
export async function verifyTelegramLogin(payload, botToken) {
  required(botToken, 'telegram.botToken');
  const p = fields(payload);
  const allowed = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash'];
  if (Object.keys(p).some(key => !allowed.includes(key)) || !/^[1-9]\d{0,15}$/.test(p.id || '') || !Number.isSafeInteger(Number(p.id)) || !/^\d{1,12}$/.test(p.auth_date || '') || !/^[a-fA-F0-9]{64}$/.test(p.hash || '')) throw new Error('Invalid Telegram login payload');
  const age = Math.floor(Date.now() / 1000) - Number(p.auth_date);
  if (age > 300 || age < -30) throw new Error('Telegram login has expired or has a future timestamp');
  const encoder = new TextEncoder();
  const secret = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
  const key = await crypto.subtle.importKey('raw', secret, {name: 'HMAC', hash: 'SHA-256'}, false, ['verify']);
  const signature = Uint8Array.from(p.hash.match(/../g), part => parseInt(part, 16));
  const check = Object.keys(p).filter(k => k !== 'hash').sort().map(k => `${k}=${p[k]}`).join('\n');
  if (!await crypto.subtle.verify('HMAC', key, signature, encoder.encode(check))) throw new Error('Invalid Telegram login signature');
  return profile('telegram', p.id, [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username, p.photo_url);
}

