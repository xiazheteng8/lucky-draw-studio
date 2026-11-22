# 🔑 平台 API 与扫码配置指南

[← 返回项目介绍](../README.md) · [🖥️ VPS](DEPLOY-VPS.md) · [☁️ Pages](DEPLOY-PAGES.md) · [📱 小程序完整教程](DEPLOY-MINIAPP.md)

**先部署网站，再配置要用的平台。**自定义名单、主题、大屏、音乐和回放不需要第三方抽奖 API；不用某个平台就留空。

本文的 `https://lucky.example.com` 均替换成你自己的最终网站地址。

## 🗺️ 配置入口总表

| 功能 | 需要的凭证 | 网站配置入口 |
| --- | --- | --- |
| YouTube 评论 | YouTube Data API v3 API Key | 站长控制台 `/admin` |
| 微信小程序 | 小程序 AppID、AppSecret、合法域名 | `/settings/wechat`，并配置小程序项目 |
| 微信公众号网页签到 | 有网页授权能力的公众号 AppID、AppSecret | `/settings/wechat` |
| 钉钉签到 | 应用 Client ID、Client Secret | `/settings/dingtalk` |
| Telegram 签到 | Bot Token、Bot Username | `/settings/telegram` |
| Blog 评论 | 可读取的评论来源 | 创建活动时填文章链接 |

这些页面需要站长权限。账号注册目前使用用户名密码；第三方扫码设置用于**活动参与者签到**，不表示开启第三方平台账号注册。

<a id="youtube"></a>

## 📺 YouTube 视频评论

### 1. 获取 API Key

1. 登录 [Google Cloud 控制台](https://console.cloud.google.com/)。
2. 创建一个项目，或选择自己的现有项目。
3. 到“API 和服务 → 库”，搜索并启用 **YouTube Data API v3**。
4. 到“API 和服务 → 凭据”，创建 **API 密钥**。
5. 编辑密钥的 API 限制，限定到 YouTube Data API v3。若设置应用限制，要符合后端服务器请求方式；不要给服务端请求套浏览器 Referer 限制。

这里不是 Gemini / AI Studio 的密钥，也不需要 OAuth 客户端密码来读取公开评论。

### 2. 填入摇奖吧

用站长账号打开 `/admin`，找到 YouTube API Key，粘贴保存。VPS 也可填 `.env`：

```dotenv
YOUTUBE_API_KEY=你自己的YouTube密钥
```

Cloudflare 环境变量方式：在 `cloudflare` 目录执行：

```bash
npx wrangler secret put YOUTUBE_API_KEY
```

优先采用后台入口统一管理，避免在多个地方留下不同的旧 Key。Key 保存在后端，不要写入网页或小程序。

### 3. 测试

选择“视频评论”，填入一个公开且开启评论的视频链接，导入后查看实际参与名单。先核对数量，再设置去重、时间和关键词筛选。

| 提示 | 先检查 |
| --- | --- |
| API 未启用 / accessNotConfigured | 是否在该 Key 所属项目启用了 YouTube Data API v3 |
| quotaExceeded | 项目配额、是否反复抓取大视频；换 Key 不一定能绕过同项目配额 |
| commentsDisabled | 视频是否关闭评论 |
| 403 / key 无效 | Key 是否复制完整，应用限制是否阻止服务端请求 |
| 超时 | VPS 能否访问 Google API，不能只看你电脑能否打开 YouTube |

官方参考：[Data API 入门](https://developers.google.com/youtube/v3/getting-started) · [评论线程接口](https://developers.google.com/youtube/v3/docs/commentThreads/list)

## 📱 微信小程序报名

需要小程序 AppID / AppSecret、已发布的小程序以及 HTTPS 后端。**公众号凭证不能替代小程序凭证。**

完整的导入、后端地址、域名、隐私、体验版与正式版发布流程见 [小程序教程](DEPLOY-MINIAPP.md)。推荐新手按该教程从头配置，不要只填两项密钥就直接组织现场活动。

接口用途：`wx.login` 产生临时 code，服务端使用 code 换取身份；头像昵称由用户选择填写；活动码指向 `pages/checkin/checkin`。AppSecret、access_token、session_key 均不放进客户端源码。

官方参考：[小程序登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html) · [无限小程序码](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html)

<a id="wechat-official"></a>

## 💚 微信公众号网页签到

这是微信浏览器网页授权方式，**不是微信小程序**。公众号是否具备相应授权能力，需在自己的公众平台权限表中确认；并非所有个人主体账号都拥有全部能力。

### 配置步骤

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)，进入自己的公众号。
2. 获取公众号 AppID、AppSecret，并按要求配置服务端 IP 白名单。
3. 将自己活动网站域名配置为网页授权域名。例如网站是 `https://lucky.example.com`，授权域名栏通常填主机名 `lucky.example.com`，按平台表单要求填写。
4. 若要求 `MP_verify_*.txt` 校验文件，在摇奖吧 `/settings/wechat` 上传对应文件，确认文件 URL 可访问，再到微信后台完成校验。
5. 在 `/settings/wechat` 保存公众号凭证和 HTTPS 活动根地址。

项目网页授权回调路径是：

```text
https://lucky.example.com/api/wechat/callback
```

同一组微信配置会被相关微信服务读取。选择公众号方式前，应确认使用的版本和部署是否需要小程序凭证；不要反复把同一配置在两套 AppID 之间切换，指望两个渠道同时可用。

✅ 用手机微信扫公众号签到链接，完成授权，确认大屏人数增加；只有网页打开而没有登记身份不算成功。

官方参考：[公众号网页授权](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html)

<a id="dingtalk"></a>

## 🏢 钉钉签到

### 创建应用并获取凭证

1. 登录 [钉钉开放平台](https://open.dingtalk.com/)，创建适合自己组织与使用场景的应用。
2. 开通账号授权登录及读取当前用户基本资料所需权限。
3. 获取与 OAuth 登录应用对应的 **Client ID / Client Secret**。平台不同应用类型可能采用不同显示名称，按当前应用文档确认映射，不要填另一个应用的凭证。
4. 设置应用可使用范围，测试账号要在范围内。
5. 设置登录回调为：

```text
https://lucky.example.com/api/signin/dingtalk/callback
```

### 填入摇奖吧

打开 `/settings/dingtalk`，填写 Client ID、Client Secret、HTTPS 活动地址并保存。VPS 环境变量对应：

```dotenv
DINGTALK_CLIENT_ID=自己的ClientID
DINGTALK_CLIENT_SECRET=自己的ClientSecret
SIGNIN_BASE_URL=https://lucky.example.com
```

Cloudflare 可使用 Worker Secrets 配置敏感字段；保存后用钉钉真机扫码授权，确认能读取昵称并登记资格。

项目使用 OAuth2 `openid` 授权并请求当前用户资料。出现“无权限”或“用户不在可用范围”，先检查应用权限、发布状态和成员范围；回调错误则逐字核对协议、域名与路径。

官方入口：[钉钉开放平台文档](https://open.dingtalk.com/document/)

<a id="telegram"></a>

## ✈️ Telegram 机器人签到

### 1. 创建机器人

1. 在 Telegram 找到官方 [@BotFather](https://t.me/BotFather)。
2. 发送 `/newbot`，按提示设置机器人名称与用户名。
3. 记录 BotFather 返回的 **Bot Token**，以及机器人的用户名。

Bot Token 是机器人密码。用户名不是你个人的用户名，通常以 `bot` 结尾。

### 2. 配置并启用接收

打开网站 `/settings/telegram`：

| 字段 | 填写内容 |
| --- | --- |
| Bot Token | BotFather 给的令牌 |
| Bot Username | 机器人的用户名，可去掉开头 `@` |
| 活动 HTTPS 地址 | `https://lucky.example.com` |

先保存，再点击**“启用接收”**。项目会校验机器人并注册 Webhook：

```text
https://lucky.example.com/api/signin/telegram/webhook
```

不需要手工拼接含 Token 的公开链接来设置 Webhook。VPS 对应环境变量为 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_BOT_USERNAME`，可选 `TELEGRAM_WEBHOOK_SECRET`；使用变量时也要在后台启用接收。

### 3. 正确的测试方式

创建选择 Telegram 签到的活动 → 扫活动码 → 打开机器人 → 点击 Start / 开始 → 机器人回复签到结果 → 点击返回活动互动页。

**只给机器人发“你好”，不代表已携带活动参数签到。**项目处理带活动参数的 `/start` 指令。

### 常见问题

- **已读但不回复**：检查是否从活动入口启动、Webhook 是否已启用、VPS 能否访问 Telegram API。
- **一个机器人接多个网站**：同一机器人只保留当前 Webhook，后设置的网站会接走消息。不同独立部署建议用不同机器人。
- **改了域名**：重新保存活动根地址并启用接收。
- **getUpdates 没消息**：Webhook 与 getUpdates 拉取不能同时使用，不要用轮询脚本抢占接收。
- **需要 Chat ID 吗**：此签到流程从用户消息识别身份，无需站长手工填自己的 Chat ID；它不是定时新闻推送配置。

官方参考：[创建机器人](https://core.telegram.org/bots/tutorial) · [Webhook API](https://core.telegram.org/bots/api#setwebhook)

## 📝 Blog 评论与其他视频平台

Blog 模式按项目支持的公开评论来源尝试导入，不是通用爬虫，也不保证任意文章、登录后评论或动态评论系统均可读取。

没有单独的“万能 Blog API Key”。若导入失败，可把合法获得的名单整理为 Excel / CSV 后走自定义名单，不要把零条记录当成已经成功抓取。

YouTube 以外的视频平台同样以当前导入器的实际支持为准，不在界面输入一个链接就等于完成该平台 API 接入。

## 🧰 凭证配置总原则

- 页面配置和环境变量二选一优先管理；扫码平台同名环境变量可覆盖页面值，改不生效先检查旧变量。
- 密钥输入框留空通常表示保留，不代表凭证已删除；以对应页面状态为准。
- 修改域名后，同时检查 BASE_URL、SIGNIN_BASE_URL、平台回调、合法域名与 Telegram Webhook。
- 前端页面能打开，不代表服务器能访问 Google / 微信 / 钉钉 / Telegram 的接口。
- 不要把 `.env`、`.dev.vars`、数据库或带真实密钥的截图上传 GitHub。
