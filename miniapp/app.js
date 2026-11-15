// app.js - 瞎折腾摇奖吧小程序全局配置
function parseScanQuery(options = {}) {
  let id = options.id || null;
  let token = options.token || '';
  let serverUrl = null;

  // 1. 微信普通链接二维码扫描进入 (options.q)
  if (options.q) {
    try {
      const decodedUrl = decodeURIComponent(options.q);
      console.log('[App] 微信扫一扫解码 URL:', decodedUrl);
      const urlMatch = decodedUrl.match(/^(https?:\/\/[^\/?#]+)/i);
      if (urlMatch) {
        serverUrl = urlMatch[1];
      }
      const qIndex = decodedUrl.indexOf('?');
      if (qIndex !== -1) {
        const queryStr = decodedUrl.substring(qIndex + 1);
        const pairs = queryStr.split('&');
        for (const pair of pairs) {
          const [k, v] = pair.split('=');
          if (k === 'id') id = decodeURIComponent(v || '');
          if (k === 'token') token = decodeURIComponent(v || '');
        }
      }
    } catch (e) {
      console.error('[App] 解析 options.q 失败:', e);
    }
  }

  // 2. 微信小程序码扫描进入 (options.scene)
  if (options.scene && !id) {
    try {
      const decodedScene = decodeURIComponent(options.scene);
      console.log('[App] 微信小程序码 scene:', decodedScene);
      if (decodedScene.includes('=')) {
        const pairs = decodedScene.split('&');
        for (const pair of pairs) {
          const [k, v] = pair.split('=');
          if (k === 'id') id = decodeURIComponent(v || '');
          if (k === 'token') token = decodeURIComponent(v || '');
        }
      } else {
        id = decodedScene;
      }
    } catch (e) {
      console.error('[App] 解析 scene 失败:', e);
    }
  }

  return { id, token, serverUrl };
}

App({
  globalData: {
    // 默认活动服务器地址，扫码如果包含服务器地址将自动切换
    serverUrl: 'https://lucky.xiazheteng.fun',
    openid: null,
    userInfo: null,
    campaignId: null,
    token: null,
    myCheckin: null
  },

  parseScanQuery,

  onLaunch(options) {
    console.log('[摇奖吧] 小程序启动, 参数:', options);
    this.handleLaunchOptions(options);

    const cachedOpenid = wx.getStorageSync('wx_openid');
    if (cachedOpenid) {
      this.globalData.openid = cachedOpenid;
    }
    const cachedServer = wx.getStorageSync('custom_server_url');
    if (cachedServer) {
      this.globalData.serverUrl = cachedServer;
    }
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
    if (parsed.serverUrl) {
      this.globalData.serverUrl = parsed.serverUrl;
      wx.setStorageSync('custom_server_url', parsed.serverUrl);
    }
  },

  getViewerId() {
    let id=wx.getStorageSync('lucky_viewer_id');
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(id||'')){id='mini-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);wx.setStorageSync('lucky_viewer_id',id)}
    return id;
  },

  // 微信快捷登录换取 openid
  getOpenId() {
    return new Promise((resolve, reject) => {
      if (this.globalData.openid) {
        return resolve(this.globalData.openid);
      }
      wx.login({
        success: (res) => {
          if (!res.code) {
            return reject(new Error('微信登录失败，未获取到临时 code'));
          }
          wx.request({
            url: this.globalData.serverUrl + '/api/miniapp/login',
            method: 'POST',
            data: { code: res.code },
            header: { 'content-type': 'application/json' },
            success: (loginRes) => {
              if (loginRes.statusCode === 200 && loginRes.data?.openid) {
                this.globalData.openid = loginRes.data.openid;
                wx.setStorageSync('wx_openid', loginRes.data.openid);
                resolve(loginRes.data.openid);
              } else {
                const fallbackId = 'wx_dev_' + Math.random().toString(36).substring(2, 10);
                this.globalData.openid = fallbackId;
                resolve(fallbackId);
              }
            },
            fail: () => {
              const fallbackId = 'wx_dev_' + Math.random().toString(36).substring(2, 10);
              this.globalData.openid = fallbackId;
              resolve(fallbackId);
            }
          });
        },
        fail: (err) => reject(err)
      });
    });
  }
});
