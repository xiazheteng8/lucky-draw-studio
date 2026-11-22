const {pickFunny,decorateEmoji,quickBlessings} = require('../../utils-fun-blessings.js');
const { DEFAULT_LOGO, profileLogo } = require('../../utils-profile.js');
const app = getApp();
const freshGifts = () => ({flower:{enabled:true,limit:0,used:0,remaining:null},rocket:{enabled:true,limit:1,used:0,remaining:1},car:{enabled:true,limit:1,used:0,remaining:1}});

Page({
  data: {
    id: null,
    site: 'legacy',
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
    defaultAvatar: DEFAULT_LOGO,
    activityLogo: DEFAULT_LOGO,
    avatarUrl: '',
    nickName: '',
    nicknameReady: false,
    blessing: pickFunny(), quickBlessings: quickBlessings('deepsea'), commentRemaining: 0, commentEnabled: true,
    likesCount: 0,
    heartPulsing: false,
    submitting: false,
    checkedIn: false,
    checkingIn: false,
    loadError: '',
    isWinner: false,
    winnerPrize: '',
    privacyAccepted: false,
    privacyContractName: '用户隐私保护指引',
    profileGuideClosed: false,
    giftBusy: '',
    gifts: {
      flower: { enabled: true, limit: 0, remaining: null },
      rocket: { enabled: true, limit: 1, remaining: 1 },
      car: { enabled: true, limit: 1, remaining: 1 }
    },
    pollTimer: null
  },

  onLoad(options = {}) {
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: (res) => {
          this.setData({
            privacyContractName: String(res.privacyContractName || '用户隐私保护指引').replace(/^《|》$/g, ''),
            privacyAccepted: !res.needAuthorization
          });
        }
      });
    }
    const parsed = app.parseScanQuery(options);
    const id = parsed.id || app.globalData.campaignId;
    const token = parsed.id ? parsed.token : (app.globalData.token || '');
    if (id) this.openCampaign(id, token, parsed.id ? parsed.site : app.globalData.site);
  },

  openCampaign(id, token, site) {
    if (this.data.checkingIn) return;
    this._commentUntil = 0; this._commentReceipt = null; this.startCommentClock();
    this._giftScopeVersion = (this._giftScopeVersion || 0) + 1;
    this._giftQuotaTask = null;
    this._lastGiftQuotaAt = 0;
    this._quotaLoadedVersion = null;
    app.globalData.campaignId = id;
    app.globalData.site = site;
    app.globalData.token = token;
    this.setData({
      id,
      token,
      site,
      checkedIn: false,
      giftBusy: '',
      gifts: freshGifts(),
      nickName: '',
      nicknameReady: false,
      avatarUrl: '',
      blessing: pickFunny(), submitting: false, commentRemaining: 0,
      loadError: '',
      profileGuideClosed: false,
      privacyAccepted: false,
      campaign: { open: false }
    });
    this.retryCampaign();
    this.loadGiftPolicy();
    this.startStatusPolling(id, token);
  },

  retryCampaign() {
    this.fetchCampaignInfo(this.data.id, this.data.token);
  },

  onShow() {
    this.startCommentClock();
    const g = app.globalData;
    if (g.campaignId && (String(g.campaignId) !== String(this.data.id) || g.site !== this.data.site || (g.token && g.token !== this.data.token))) {
      this.openCampaign(g.campaignId, g.token || '', g.site);
    } else if (this.data.id) {
      this.startStatusPolling(this.data.id, this.data.token);
      this.refreshGiftQuota({ ensureSession: this.data.checkedIn, force: true });
    }
  },

  onHide() { clearInterval(this._commentClock); if (this.data.pollTimer) clearInterval(this.data.pollTimer); },

  onUnload() {
    clearInterval(this._commentClock);
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
    }
  },

  // 轮询活动开奖状态
  startStatusPolling(id, token) {
    if (this.data.pollTimer) clearInterval(this.data.pollTimer);
    this.data.pollTimer = setInterval(() => {
      this.fetchCampaignInfo(id, this.data.token || token);
    }, 3000);
  },

  noop() {},

  closeProfileGuide() {
    this.setData({ profileGuideClosed: true });
  },

  openProfileGuide() {
    this.setData({ profileGuideClosed: false });
  },

  // 弹窗一：同意隐私条款
  agreePrivacyStep() {
    this.setData({ privacyAccepted: true });
  },

  // 弹窗二：选微信头像（微信原生头像选择器，选定后自动推进至第三步）
  onChooseAvatar(e) {
    const avatar = e.detail?.avatarUrl || '';
    if (avatar) {
      this.setData({ avatarUrl: avatar });
      wx.showToast({ title: '头像已选定', icon: 'success' });
    }
  },

  // 返回修改头像
  rechooseAvatar() {
    this.setData({ avatarUrl: '' });
  },

  // 弹窗三：输入/选用微信昵称
  onNicknameInput(e) {
    const val = String(e.detail?.value || '').trim();
    this.setData({
      nickName: val,
      nicknameReady: Boolean(val)
    });
  },

  // 弹窗三：提交确认报名
  async submitCheckin(e) {
    if (!this.data.id || this.data.checkingIn || this.data.checkedIn || !this.data.campaign.open) return;
    if (!this.data.avatarUrl) return wx.showToast({ title: '请先选择微信头像', icon: 'none' });
    const name = String(e?.detail?.value?.nickname || this.data.nickName || '').trim();
    if (!name) return wx.showToast({ title: '请选择或填写昵称', icon: 'none' });
    this.setData({ checkingIn: true });
    const { id, token, avatarUrl, site } = this.data;
    try {
      const avatar = await this.encodeAvatar(avatarUrl);
      const login = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
      if (!login.code) throw new Error('微信登录失败，请重试');
      const result = await new Promise((resolve, reject) => wx.request({
        url: app.apiUrl(site, '/api/miniapp/checkin/' + encodeURIComponent(id)),
        method: 'POST',
        data: { token, loginCode: login.code, name, avatar },
        success: resolve,
        fail: reject
      }));
      if (result.statusCode < 200 || result.statusCode >= 300 || !result.data?.ok) {
        throw new Error(result.data?.error || '报名失败，请重新扫码');
      }
      this.setData({
        checkedIn: true,
        nickName: name,
        profileGuideClosed: true
      });
      app.globalData.myCheckin = { name, avatar };
      this.refreshGiftQuota({ ensureSession: true, force: true });
      wx.showToast({ title: '报名成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '报名失败，请检查网络', icon: 'none' });
    } finally {
      this.setData({ checkingIn: false });
    }
  },

  openPrivacy() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({ fail: () => wx.showToast({ title: '请完善隐私保护指引', icon: 'none' }) });
    }
  },

  async encodeAvatar(src) {
    const file = await new Promise((resolve, reject) => wx.compressImage({
      src, quality: 65, compressedWidth: 160, compressedHeight: 160,
      success: resolve, fail: () => resolve({ tempFilePath: src })
    }));
    const { data } = await new Promise((resolve, reject) => wx.getFileSystemManager().readFile({
      filePath: file.tempFilePath, encoding: 'base64', success: resolve, fail: reject
    }));
    const mime = data.startsWith('/9j/') ? 'jpeg' : data.startsWith('iVBORw0KGgo') ? 'png' : 'jpeg';
    if (!mime || data.length > 64000) throw new Error('头像过大或格式不支持，请换一张');
    return 'data:image/' + mime + ';base64,' + data;
  },

  // 获取活动信息并同步主题与大屏数据
  fetchCampaignInfo(id, token) {
    if (!id) return;
    const site = this.data.site;
    wx.request({
      url: app.apiUrl(this.data.site, `/api/miniapp/campaign/${id}?token=${encodeURIComponent(token)}`),
      method: 'GET',
      success: (res) => {
        if (this.data.id !== id || this.data.site !== site) return;
        if (res.statusCode === 200 && res.data) {
          const c = res.data;
          const themeName = c.theme || 'deepsea';

          // 活动自定义图标
          let logoUrl = this.data.activityLogo || DEFAULT_LOGO;
          const logoSource = typeof c.logo === 'string' ? c.logo : '';
          if (this._logoSource !== logoSource) {
            this._logoSource = logoSource;
            profileLogo(logoSource, site, app).then(url => {
              if (this.data.id === id && this.data.site === site && this._logoSource === logoSource) {
                this.setData({ activityLogo: url });
              }
            });
            logoUrl = DEFAULT_LOGO;
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
            loadError: '',
            activityLogo: logoUrl,
            themeClass: 'theme-' + themeName, quickBlessings: quickBlessings(themeName),
            likesCount: c.likes || this.data.likesCount,
            isWinner,
            winnerPrize
          };
          if ((c.signupToken || c.token) && !this.data.token) {
            updated.token = c.signupToken || c.token;
            app.globalData.token = c.signupToken || c.token;
          }
          this.setData(updated);
          this.refreshGiftQuota({ ensureSession: this.data.checkedIn });
        } else {
          this.setData({ loadError: res.data?.error || '活动加载失败，请重新扫码' });
        }
      },
      fail: (err) => {
        if (this.data.id !== id || this.data.site !== site) return;
        this.setData({
          loadError: /domain list|合法域名/i.test(err.errMsg || '')
            ? '微信不允许访问活动服务器，请检查 request 合法域名'
            : '连接活动服务器失败，请检查网络后重试'
        });
      }
    });
  },

  onActivityLogoError() {
    this.setData({ activityLogo: DEFAULT_LOGO });
  },

  loadGiftPolicy() {
    const { id, site } = this.data, version = this._giftScopeVersion;
    wx.request({
      url: app.apiUrl(site, '/api/miniapp/gift-policy'),
      success: (r) => {
        if (this._giftScopeVersion !== version || this.data.id !== id || this.data.site !== site) return;
        if (r.statusCode === 200 && r.data?.gifts) {
          const gifts = {};
          for (const type of ['flower', 'rocket', 'car']) {
            const rule = r.data.gifts[type];
            if (!rule) continue;
            const used = this._quotaLoadedVersion === version ? (this.data.gifts[type]?.used || 0) : 0;
            gifts[type] = { ...rule, used, remaining: rule.limit === 0 ? null : Math.max(0, rule.limit - used) };
          }
          this.setData({ gifts });
          this.applyCommentPolicy(r.data);
        }
      }
    });
  },

  refreshGiftQuota({ ensureSession = false, force = false } = {}) {
    const { id, site, token } = this.data, version = this._giftScopeVersion;
    if (!id || !token || !this.data.campaign.open) return Promise.resolve();
    if (this._giftQuotaTask) return this._giftQuotaTask;
    if (!force && Date.now() - (this._lastGiftQuotaAt || 0) < 2000) return Promise.resolve();
    const cached = wx.getStorageSync('miniapp_session_v2_' + site);
    if (!ensureSession && (!cached?.loginToken || cached.expiresAt < Date.now() + 60000)) return Promise.resolve();
    const current = () => this._giftScopeVersion === version && this.data.id === id && this.data.site === site;
    const task = (async () => {
      try {
        let session = ensureSession ? await app.getMiniappSession(site) : cached;
        if (!current()) return;
        const request = () => new Promise((resolve, reject) => wx.request({
          url: app.apiUrl(site, '/api/miniapp/gifts/' + id + '?token=' + encodeURIComponent(token)),
          header: { authorization: 'Bearer ' + session.loginToken }, success: resolve, fail: reject
        }));
        let r = await request();
        if (r.statusCode === 401 && ensureSession && current()) {
          session = await app.getMiniappSession(site, true);
          if (!current()) return;
          r = await request();
        }
        if (current() && r.statusCode === 200 && r.data?.gifts) {
          this._quotaLoadedVersion = version;
          this._lastGiftQuotaAt = Date.now();
          this.setData({ gifts: r.data.gifts });
          this.applyCommentPolicy(r.data);
        }
      } catch (error) { console.warn('本场礼物额度刷新失败', error); }
    })();
    this._giftQuotaTask = task;
    task.finally(() => { if (this._giftQuotaTask === task) this._giftQuotaTask = null; });
    return task;
  },

  async sendGift(e) {
    const gift = e.currentTarget.dataset.gift;
    if (this.data.giftBusy || !this.data.id || !this.data.gifts[gift]?.enabled) return;
    if (!this.data.checkedIn) {
      this.setData({ profileGuideClosed: false });
      return wx.showToast({ title: '请先完成报名签到', icon: 'none' });
    }
    const { id, site, token } = this.data, version = this._giftScopeVersion, name = this.data.nickName || '微信观众';
    const current = () => this._giftScopeVersion === version && this.data.id === id && this.data.site === site;
    this.setData({ giftBusy: gift });
    try {
      let session = await app.getMiniappSession(site);
      if (!current()) return;
      const requestId = 'gift-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
      const request = () => new Promise((resolve, reject) => wx.request({
        url: app.apiUrl(site, '/api/miniapp/gifts/' + id),
        method: 'POST',
        header: { authorization: 'Bearer ' + session.loginToken, 'content-type': 'application/json' },
        data: { token, gift, name, requestId },
        success: resolve,
        fail: reject
      }));
      let result = await request();
      if (!current()) return;
      if (result.statusCode === 401) {
        session = await app.getMiniappSession(site, true);
        if (!current()) return;
        result = await request();
      }
      if (!current()) return;
      if (result.data?.gifts) { this._quotaLoadedVersion = version; this.setData({ gifts: result.data.gifts }); }
      if (result.statusCode < 200 || result.statusCode >= 300 || !result.data?.ok) {
        throw Error(result.data?.error || '赠送失败，请重试');
      }
      wx.showToast({ title: ({ flower: '鲜花已送出', rocket: '火箭已升空', car: '跑车已出发' })[gift], icon: 'success' });
    } catch (e) {
      if (current()) wx.showToast({ title: e.message || '网络连接失败', icon: 'none' });
    } finally {
      if (current()) this.setData({ giftBusy: '' });
    }
  },

  startCommentClock() {
    clearInterval(this._commentClock);
    this._commentClock=setInterval(()=>this.setData({commentRemaining:Math.max(0,Math.ceil(((this._commentUntil||0)-Date.now())/1000))}),1000);
  },
  applyCommentPolicy(data) {
    if(data.commentPolicy){this._commentPolicy=data.commentPolicy;this.setData({commentEnabled:data.commentPolicy.enabled});if(!data.commentPolicy.enabled)this._commentUntil=0;}
    const wait=data.commentRetryAfterSeconds??data.retryAfterSeconds;
    if(Number.isFinite(wait))this._commentUntil=Date.now()+Math.max(0,wait)*1000;
    this.setData({commentRemaining:Math.max(0,Math.ceil(((this._commentUntil||0)-Date.now())/1000))});
  },
  fillQuickTag(e) { this._commentReceipt=null;this.setData({blessing:e.currentTarget.dataset.text}); },
  onBlessingFocus() { this._commentReceipt=null;this.setData({blessing:''}); },
  onBlessingInput(e) { this._commentReceipt=null;this.setData({blessing:e.detail.value}); },
  async sendBlessingMessage() {
    if(this.data.submitting||this.data.loadError)return;
    if(!this.data.checkedIn){this.setData({profileGuideClosed:false});return wx.showToast({title:'请先完成报名签到',icon:'none'});}
    if(this.data.commentRemaining>0)return wx.showToast({title:'请等待'+this.data.commentRemaining+'秒',icon:'none'});
    const text=decorateEmoji(this.data.blessing);
    if(!text)return wx.showToast({title:'请输入祝福或留言内容',icon:'none'});
    const {id,site,token}=this.data,version=this._giftScopeVersion;
    const current=()=>this._giftScopeVersion===version&&this.data.id===id&&this.data.site===site;
    const prior=this._commentReceipt;
    const requestId=prior?.text===text?prior.requestId:'comment-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
    this._commentReceipt={text,requestId};this.setData({submitting:true,blessing:text});
    try{
      let session=await app.getMiniappSession(site);if(!current())return;
      const request=()=>new Promise((resolve,reject)=>wx.request({url:app.apiUrl(site,'/api/miniapp/blessing/'+id),method:'POST',header:{authorization:'Bearer '+session.loginToken,'content-type':'application/json'},data:{token,text,name:this.data.nickName||'微信观众',requestId},success:resolve,fail:reject}));
      let res=await request();if(!current())return;
      if(res.statusCode===401){session=await app.getMiniappSession(site,true);if(!current())return;res=await request();}
      if(!current())return;this.applyCommentPolicy(res.data||{});
      if(res.statusCode<200||res.statusCode>=300||!res.data?.ok)throw Error(res.data?.error||'发送失败，请重试');
      this._commentReceipt=null;this.setData({blessing:pickFunny(text)});if(wx.hideKeyboard)wx.hideKeyboard();
      wx.showToast({title:'留言已送上大屏',icon:'success'});
    }catch(error){if(current())wx.showToast({title:error.message||'网络连接失败，请重试',icon:'none'});}
    finally{if(current())this.setData({submitting:false});}
  },

  tapHeart() {
    this.setData({
      heartPulsing: true,
      likesCount: this.data.likesCount + 1
    });
    setTimeout(() => this.setData({ heartPulsing: false }), 300);

    if (this.data.id) {
      wx.request({
        url: app.apiUrl(this.data.site, `/api/interact/${this.data.id}?token=${encodeURIComponent(this.data.token)}`),
        method: 'POST',
        data: { kind: 'like', viewer: app.getViewerId(), name: this.data.nickName || this.data.myName || '微信观众' },
        header: { 'content-type': 'application/json' }
      });
    }
  },

  scanScreenCode() {
    wx.scanCode({
      success: (res) => {
        const parsed = app.parseScanQuery ? app.parseScanQuery({ path: res.path, result: res.result }) : {};
        const id = parsed.id;
        const token = parsed.token || '';
        if (id && !this.data.checkingIn && !this.data.submitting) {
          this.openCampaign(id, token, parsed.site);
        } else {
          wx.showModal({ title: '提示', content: '未在二维码中识别到有效活动', showCancel: false });
        }
      }
    });
  }
});
