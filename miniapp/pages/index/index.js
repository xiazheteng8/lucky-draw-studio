const app = getApp();

Page({
  onLoad(options) {
    this.openCampaign(app.parseScanQuery(options));
  },

  openCampaign({ id, token, site }) {
    if (!id) return false;
    wx.navigateTo({
      url: `/pages/checkin/checkin?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}&site=${encodeURIComponent(site || 'legacy')}`
    });
    return true;
  },

  scanQrCode() {
    wx.scanCode({
      success: (result) => {
        const params = app.parseScanQuery({ path:result.path,result:result.result });
        if (!this.openCampaign(params)) {
          wx.showToast({ title: '无法识别有效活动二维码', icon: 'none' });
        }
      }
    });
  }
});
