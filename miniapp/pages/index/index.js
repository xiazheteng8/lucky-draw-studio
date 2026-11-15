const app = getApp();

Page({
  data: {},

  onLoad(options) {
    console.log('[Index] 启动参数:', options);
    // 处理微信扫一扫直接拉起小程序携带的参数
    let campaignId = options.id;
    let token = options.token;

    if (options.scene) {
      try {
        const decoded = decodeURIComponent(options.scene);
        const params = new URLSearchParams(decoded);
        if (params.get('id')) campaignId = params.get('id');
        if (params.get('token')) token = params.get('token');
      } catch (e) {
        console.warn('解析二维码 scene 失败:', e);
      }
    }

    // 若通过扫码直接进入，自动跳转到签到报名页
    if (campaignId) {
      app.globalData.campaignId = campaignId;
      app.globalData.token = token || '';
      wx.navigateTo({
        url: `/pages/checkin/checkin?id=${campaignId}&token=${token || ''}`
      });
    }
  },

  scanQrCode() {
    wx.scanCode({
      success: (res) => {
        console.log('[Scan] 扫码结果:', res);
        let url = res.result || '';
        try {
          let id = '', token = '';
          if (url.includes('?')) {
            const query = url.split('?')[1];
            const pairs = query.split('&');
            for (const p of pairs) {
              const [k, v] = p.split('=');
              if (k === 'id') id = v;
              if (k === 'token') token = v;
            }
          }
          if (id) {
            app.globalData.campaignId = id;
            app.globalData.token = token;
            wx.navigateTo({
              url: `/pages/checkin/checkin?id=${id}&token=${token}`
            });
            return;
          }
        } catch (e) {}

        wx.showToast({ title: '无法识别有效活动二维码', icon: 'none' });
      },
      fail: () => {
        wx.showToast({ title: '已取消扫码', icon: 'none' });
      }
    });
  }
});
