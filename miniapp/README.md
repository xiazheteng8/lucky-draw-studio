# 瞎折腾摇奖吧 · 微信小程序端 (现场扫码签到与弹幕互动)

[VPS 示范站点](https://lucky.xiazheteng.fun/) · [YouTube @xiazheteng8](https://www.youtube.com/@xiazheteng8) · [Telegram @xiazheteng8](https://t.me/xiazheteng8)

第一次部署？先按 [本地 / VPS 新手教程](../README.md) 或 [GitHub / Cloudflare Pages 新手教程](../README-PAGES.md) 操作。下面是本目录的功能和配置参考。

本小程序是专门为 **「瞎折腾摇奖吧」年会大屏现场互动** 打造的轻量级微信小程序手持端。

## 功能亮点
1. **微信扫码秒进**：现场观众掏出手机微信扫一扫大屏二维码，直接拉起小程序进入对应场次。
2. **姓名与工号校验**：支持输入真实姓名、工号/学号（唯一校验，防止重复扫码作弊）。
3. **现场大屏弹幕联动**：签到时填写的祝福语或随后发送的弹幕，会实时从大屏幕中央飘过。
4. **实时中奖开奖状态同步**：大屏开奖时，手机端实时呈现中奖弹窗与领奖台名单。
5. **深海科技风设计**：界面风格与 PC 大屏完全一致，丝滑现代。

---

## 如何在微信开发者工具中打开并运行？

1. 下载并安装官方 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 打开微信开发者工具，选择 **【导入项目】**。
3. 项目目录选择本文件夹：`wechat-miniprogram-studio`。
4. **AppID 填写**：
   - 如果您已有小程序，填写您在微信公众平台申请的小程序 AppID。
   - 如果仅在本地测试，可以选择 **测试号**（无需注册即可立即体验）。
5. 点击 **【导入】** 即可立即在模拟器中预览。

---

## 域名与后端接口配置

小程序默认连接的服务器地址为：
`https://lucky.xiazheteng.fun`

- 在微信公众平台后台（mp.weixin.qq.com）：
  进入 **【开发】->【开发管理】->【开发设置】->【服务器域名】**，将 `https://lucky.xiazheteng.fun` 添加到 `request 合法域名` 列表中即可上线发布！
