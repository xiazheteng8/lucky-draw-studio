const app = getApp();

Page({
  data: {
    id: null,
    site: 'legacy',
    token: '',
    themeClass: 'theme-deepsea',
    myName: '',
    myAvatar: '',
    campaign: {
      isDrawn: false,
      winners: [],
      theme: 'deepsea'
    },
    isWinner: false,
    winnerPrize: '',
    likesCount: 0,
    heartPulsing: false,
    pollTimer: null
  },

  onLoad(options) {
    const id = options.id || app.globalData.campaignId;
    const token = options.token || app.globalData.token || '';
    const myName = options.name ? decodeURIComponent(options.name) : (app.globalData.myCheckin?.name || '我');
    const myAvatar = app.globalData.myCheckin?.avatar || wx.getStorageSync('wx_avatar_base64') || '';
    
    this.setData({ id, token, site: options.site || app.globalData.site, myName, myAvatar });
    this.checkStatus();
    this.data.pollTimer = setInterval(() => {
      this.checkStatus();
    }, 3000);
  },

  onUnload() {
    if (this.data.pollTimer) clearInterval(this.data.pollTimer);
  },

  checkStatus() {
    if (!this.data.id) return;
    wx.request({
      url: app.apiUrl(this.data.site, `/api/miniapp/campaign/${this.data.id}?token=${encodeURIComponent(this.data.token)}`),
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const campaign = res.data;
          let isWinner = false;
          let winnerPrize = '';

          if (campaign.isDrawn && Array.isArray(campaign.winners)) {
            for (const w of campaign.winners) {
              if (w.name === this.data.myName) {
                isWinner = true;
                winnerPrize = w.prize || w.rank || '中奖者';
                break;
              }
            }
          }

          this.setData({
            campaign,
            themeClass: 'theme-' + (campaign.theme || 'deepsea'),
            likesCount: campaign.likes || this.data.likesCount,
            isWinner,
            winnerPrize
          });
          if (campaign.isDrawn && this.data.pollTimer) {
            clearInterval(this.data.pollTimer);
          }
        }
      }
    });
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
  }
});
