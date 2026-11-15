const app = getApp();

Page({
  data: {
    id: null,
    token: '',
    themeClass: 'theme-deepsea',
    campaign: {
      title: '载入活动中...',
      open: true,
      checkinCount: 0,
      theme: 'deepsea',
      logo: '',
      isDrawn: false,
      winners: []
    },
    defaultAvatar: 'https://lucky.xiazheteng.fun/default-logo.jpg',
    activityLogo: 'https://lucky.xiazheteng.fun/default-logo.jpg',
    avatarUrl: '',
    nickName: '',
    blessing: '',
    likesCount: 0,
    heartPulsing: false,
    submitting: false,
    checkedIn: false,
    isWinner: false,
    winnerPrize: '',
    pollTimer: null
  },

  async onLoad(options) {
    console.log('[Checkin] 扫码启动进入活动页, 参数:', options);

    // 1. 自动解析扫码参数 (支持普通二维码、小程序码、普通链接)
    const parsed = app.parseScanQuery ? app.parseScanQuery(options) : {};
    const id = parsed.id || options.id || app.globalData.campaignId;
    const token = parsed.token || options.token || app.globalData.token || '';

    if (parsed.serverUrl) {
      app.globalData.serverUrl = parsed.serverUrl;
    }

    // 2. 自动获取微信用户身份（无需手动输入）
    let openid = '';
    try {
      openid = await app.getOpenId();
    } catch (e) {
      openid = 'wx_' + Math.random().toString(36).substring(2, 8);
    }

    const cachedAvatar = wx.getStorageSync('wx_avatar_url') || wx.getStorageSync('wx_avatar_base64');
    const cachedNick = wx.getStorageSync('wx_nickname');

    // 自动识别昵称与头像：有缓存直接用，无缓存自动根据微信OpenID生成个性化标识
    const autoNick = cachedNick || ('微信观众_' + (openid ? openid.slice(-4).toUpperCase() : '8888'));
    const autoAvatar = cachedAvatar || this.data.defaultAvatar;

    this.setData({
      id,
      token,
      nickName: autoNick,
      avatarUrl: autoAvatar
    });

    if (id) {
      app.globalData.campaignId = id;
      app.globalData.token = token;
      
      // 3. 加载活动详情，并立刻全自动签到登上大屏
      this.fetchCampaignInfo(id, token, () => {
        this.autoCheckin(openid, autoNick, autoAvatar);
      });

      // 4. 开启轮询，同步大屏开奖状态与点赞数
      this.startStatusPolling(id, token);
    }
  },

  onUnload() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
    }
  },

  // 轮询活动开奖状态
  startStatusPolling(id, token) {
    if (this.data.pollTimer) clearInterval(this.data.pollTimer);
    this.data.pollTimer = setInterval(() => {
      this.fetchCampaignInfo(id, token);
    }, 3000);
  },

  // 扫码进入后，全自动完成签到登上大屏（无需任何多余点击）
  autoCheckin(openid, name, avatar) {
    if (!this.data.id || this.data.checkedIn) return;

    wx.request({
      url: `${app.globalData.serverUrl}/api/miniapp/checkin/${this.data.id}`,
      method: 'POST',
      data: {
        token: this.data.token,
        openid: openid,
        name: name,
        avatar: avatar,
        danmaku: '微信扫码直接签到成功！'
      },
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if ((res.statusCode === 200 && res.data?.ok) || res.statusCode === 409) {
          // 200 成功，或 409 已在名单中，均视为已成功登上大屏
          this.setData({ checkedIn: true });
          app.globalData.myCheckin = { name, avatar };
        }
      }
    });
  },

  // 获取活动信息并同步主题与大屏数据
  fetchCampaignInfo(id, token, callback) {
    if (!id) return;
    wx.request({
      url: `${app.globalData.serverUrl}/api/miniapp/campaign/${id}?token=${token}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const c = res.data;
          const themeName = c.theme || 'deepsea';

          // 活动自定义图标
          let logoUrl = this.data.defaultAvatar;
          if (c.logo) {
            logoUrl = c.logo.startsWith('http') ? c.logo : (app.globalData.serverUrl + c.logo);
          }

          // 检查是否中奖
          let isWinner = false;
          let winnerPrize = '';
          if (c.isDrawn && Array.isArray(c.winners)) {
            for (const w of c.winners) {
              if (w.name === this.data.nickName) {
                isWinner = true;
                winnerPrize = w.prize || w.rank || '中奖幸运儿';
                break;
              }
            }
          }

          const updated = {
            campaign: c,
            activityLogo: logoUrl,
            themeClass: 'theme-' + themeName,
            likesCount: c.likes || this.data.likesCount,
            isWinner,
            winnerPrize
          };
          if ((c.signupToken || c.token) && !this.data.token) {
            updated.token = c.signupToken || c.token;
            app.globalData.token = c.signupToken || c.token;
          }
          this.setData(updated);

          if (typeof callback === 'function') {
            callback();
          }
        }
      }
    });
  },

  // 快捷填入祝福语
  fillQuickTag(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ blessing: text });
  },

  onBlessingInput(e) {
    this.setData({ blessing: e.detail.value });
  },

  // 发送现场留言祝福评论到大屏幕 (双重通道保障 100% 成功上屏)
  async sendBlessingMessage() {
    const msg = this.data.blessing.trim();
    if (!msg) {
      return wx.showToast({ title: '请输入祝福或留言内容', icon: 'none' });
    }

    this.setData({ submitting: true });

    try {
      const openid = await app.getOpenId();
      const sendData = {
        kind: 'message',
        name: this.data.nickName,
        text: msg,
        message: msg,
        viewer: app.getViewerId(),
        openid: openid,
        token: this.data.token
      };

      // 优先调用小程序极速祝福接口，免除复杂 CORS 与防重拦截
      wx.request({
        url: `${app.globalData.serverUrl}/api/miniapp/blessing/${this.data.id}`,
        method: 'POST',
        data: sendData,
        header: { 'content-type': 'application/json', 'x-miniapp': 'true' },
        success: (res) => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            this.setData({ submitting: false, blessing: '', checkedIn: true });
            return wx.showToast({ title: '🎉 祝福已上大屏！', icon: 'success' });
          }
          // 回退调用通用互动接口
          this.fallbackSendBlessing(sendData);
        },
        fail: () => {
          // 网络回退
          this.fallbackSendBlessing(sendData);
        }
      });
    } catch (e) {
      this.setData({ submitting: false });
      wx.showToast({ title: '发送失败，请重试', icon: 'none' });
    }
  },

  // 备用通道发送
  fallbackSendBlessing(sendData) {
    wx.request({
      url: `${app.globalData.serverUrl}/api/interact/${this.data.id}?token=${this.data.token}`,
      method: 'POST',
      data: sendData,
      header: { 'content-type': 'application/json', 'x-miniapp': 'true' },
      success: (res) => {
        this.setData({ submitting: false });
        if (res.statusCode === 200 || res.statusCode === 201) {
          wx.showToast({ title: '🎉 祝福已上大屏！', icon: 'success' });
          this.setData({ blessing: '', checkedIn: true });
        } else {
          wx.showToast({ title: res.data?.error || '发送失败，请重试', icon: 'none' });
        }
      },
      fail: (err) => {
        this.setData({ submitting: false });
        console.error('发送留言失败:', err);
        wx.showToast({ title: '网络连接失败，请重试', icon: 'none' });
      }
    });
  },

  // 点爱心 ♥
  tapHeart() {
    this.setData({
      heartPulsing: true,
      likesCount: this.data.likesCount + 1
    });
    setTimeout(() => this.setData({ heartPulsing: false }), 300);

    if (this.data.id) {
      wx.request({
        url: `${app.globalData.serverUrl}/api/interact/${this.data.id}?token=${this.data.token}`,
        method: 'POST',
        data: { kind: 'like', viewer: app.getViewerId(), name: this.data.nickName || this.data.myName || '微信观众' },
        header: { 'content-type': 'application/json' }
      });
    }
  },

  // 备用：在未扫码时允许点击扫大屏码
  scanScreenCode() {
    wx.scanCode({
      success: (res) => {
        const parsed = app.parseScanQuery ? app.parseScanQuery({ q: res.result }) : {};
        const id = parsed.id;
        const token = parsed.token || '';
        if (parsed.serverUrl) app.globalData.serverUrl = parsed.serverUrl;
        if (id) {
          this.setData({ id, token });
          app.globalData.campaignId = id;
          app.globalData.token = token;
          this.fetchCampaignInfo(id, token, () => {
            app.getOpenId().then(openid => {
              this.autoCheckin(openid, this.data.nickName, this.data.avatarUrl);
            });
          });
          this.startStatusPolling(id, token);
        } else {
          wx.showModal({ title: '提示', content: '未在二维码中识别到有效活动', showCancel: false });
        }
      }
    });
  }
});
