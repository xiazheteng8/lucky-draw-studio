const GATEWAY_URL = 'https://lucky.tanzhe.top';

// app.js - 瞎折腾摇奖吧小程序全局配置
// Support previously printed ordinary URL QR codes.
const QR_HOSTS = new Map([['lucky.xiazheteng.fun', 'legacy'], ['lucky.tanzhe.top', 'cn'], ['lucky-37k.pages.dev', 'cf']]);

function parseScanQuery(input = {}) {
  const options=input.query&&typeof input.query==='object'?input.query:input;
  let id=options.id||null,token=String(options.token||''),site=String(options.site||''),invalid=false,nativePath=false;
  const decode=value=>{let text=String(value||'');for(let i=0;i<3;i++){try{const next=decodeURIComponent(text);if(next===text)break;text=next}catch{break}}return text};
  function params(value,depth=0){if(depth>3)return;const text=decode(value).replace(/^\?/,'').split('#')[0];if(text.length>4096)return;if(/^\d{1,16}$/.test(text)){id=text;return}for(const pair of text.split('&')){const at=pair.indexOf('=');if(at<0)continue;const key=pair.slice(0,at),v=decode(pair.slice(at+1));if(key==='id')id=v;else if(key==='token')token=v;else if(key==='site')site=v;else if(key==='scene')params(v,depth+1)}}
  function path(value){const text=decode(value);if(!/^\/?pages\/(?:checkin\/checkin|index\/index)(?:\?|$)/.test(text))return false;const at=text.indexOf('?');if(at>=0)params(text.slice(at+1));return true}
  // wx.scanCode returns the Mini Program's navigation path separately from result.
  if(typeof options.path==='string')nativePath=path(options.path);
  if(typeof options.scene==='string')params(options.scene);
  if(!nativePath){const raw=options.q||options.result;if(typeof raw==='string'&&raw){const text=decode(raw),match=/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i.exec(text);if(match){const mapped=QR_HOSTS.get(match[1].toLowerCase());if(!mapped)invalid=true;else{site=site||mapped;const at=text.indexOf('?');if(at>=0)params(text.slice(at+1))}}else if(!path(text)){if(!options.q&&/^(?:id=|\d{1,16}$)/.test(text))params(text);else invalid=true}}}
  const target=site||'legacy';
  return {id:!invalid&&/^\d{1,16}$/.test(String(id))&&['legacy','cn','cf'].includes(target)?String(id):null,token,site:target};
}

App({
  globalData: {
    site: 'legacy',
    openid: null,
    userInfo: null,
    campaignId: null,
    token: null,
    myCheckin: null
  },

  parseScanQuery,

  apiUrl(site, path) {
    return GATEWAY_URL + '/miniapp-gateway/' + encodeURIComponent(site) + path;
  },

  onLaunch(options) {
    this.handleLaunchOptions(options);

    const cachedOpenid = wx.getStorageSync('wx_openid');
    if (cachedOpenid && !/^wx_(dev|mock)_/.test(cachedOpenid)) {
      this.globalData.openid = cachedOpenid;
    }
    wx.removeStorageSync('custom_server_url');
  },

  onShow(options) {
    this.handleLaunchOptions(options);
  },

  handleLaunchOptions(options) {
    if (!options) return;
    const query = options.query || options;
    const parsed = parseScanQuery(query);
    if (parsed.id) {
      this.globalData.campaignId = parsed.id;
      this.globalData.token = parsed.token || '';
    }
    if (parsed.id) this.globalData.site = parsed.site;
  },

  getViewerId() {
    let id=wx.getStorageSync('lucky_viewer_id');
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(id||'')){id='mini-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);wx.setStorageSync('lucky_viewer_id',id)}
    return id;
  },

  async getMiniappSession(site = this.globalData.site, force = false) {
    const key='miniapp_session_v2_'+site,cached=wx.getStorageSync(key);
    if(!force&&cached?.loginToken&&cached.expiresAt>Date.now()+60000)return cached;
    this._loginTasks=this._loginTasks||{};if(this._loginTasks[site]&&!force)return this._loginTasks[site];
    const task=(async()=>{const login=await new Promise((resolve,reject)=>wx.login({success:resolve,fail:reject}));if(!login.code)throw Error('微信登录失败，请重试');
      const result=await new Promise((resolve,reject)=>wx.request({url:this.apiUrl(site,'/api/miniapp/login'),method:'POST',data:{code:login.code},success:resolve,fail:reject}));
      if(result.statusCode!==200||!result.data?.openid||!result.data?.loginToken)throw Error(result.data?.error||'微信登录失败，请重试');
      const session={openid:result.data.openid,loginToken:result.data.loginToken,expiresAt:result.data.expiresAt};wx.setStorageSync(key,session);this.globalData.openid=session.openid;return session;
    })();this._loginTasks[site]=task;try{return await task}finally{delete this._loginTasks[site]}
  },
  async getOpenId(){return (await this.getMiniappSession()).openid;}
});
