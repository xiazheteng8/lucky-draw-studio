# 瞎折腾摇奖吧 · Cloudflare Pages 部署与完整设置说明

本文档详细说明如何在 Cloudflare 全球边缘网络（Pages + Workers + Durable Objects + KV）上部署并配置「瞎折腾摇奖吧」，实现与 VPS 版本 100% 一致的全套功能（包含 4 种抽奖模式、微信小程序原生太阳码直接扫码签到、春节专享主题与专属财神特效等）。

---

## 一、系统功能架构

1. **四大抽奖模式**：
   - 🎬 **视频评论抽奖**：支持 YouTube 等视频平台评论抓取。
   - 📝 **从 blog 导入**：支持博客文章留言名单导入。
   - ◈ **自定义名单**：支持 Excel、CSV、TSV 表格与头像文件夹批量拖拽导入，支持大屏展示二维码现场扫码报名。
   - ▦ **扫码抽奖**：支持微信扫码（自动生成小程序原生太阳码直达小程序签到）、钉钉扫码、Telegram 机器人扫码。
2. **春节专享模式（CNY Theme）**：
   - 经典中国红与流光金配色，配有中国结迎春装饰。
   - 打赏作者弹窗解锁后全局激活。
   - 专属开奖特效「🧧 满天红包 · 财神降临」：全屏穿梭飞舞红包、未中奖送随机祝福语、最终中奖金元宝爆闪与立体财神爷动画。
3. **小程序端扫码直达**：
   - 微信“扫一扫”大屏太阳码，直接拉起小程序进入签到主页。
   - 自动获取微信身份，完全无手动输入框。
   - 现场互动留言、祝福弹幕一键发送到大屏幕，送心意 ♥ 心跳动画实时互动。

---

## 二、部署准备

在开始部署前，请确保您具备以下条件：
1. 一个 [Cloudflare 账号](https://dash.cloudflare.com/)（免费版即可支持 Pages，Durable Objects 需 Workers 付费计划或免费试用）。
2. 本地安装了 Node.js（v18 或更高版本）。
3. 微信小程序账号（用于扫码抽奖功能）：`AppID` 与 `AppSecret`。

---

## 三、方式 A：通过 GitHub + Cloudflare Pages 控制台自动化部署（推荐）

1. **上传代码到 GitHub**：
   - 将 `cloudflare_version/youtube-giveaway-studio` 文件夹推送到您自己的私有或公开 GitHub 仓库。
2. **连接 Cloudflare Pages**：
   - 登录 Cloudflare 控制台 -> 点击左侧 **【Workers 和 Pages】** -> 点击 **【创建】** -> 选择 **【Pages】** -> **【连接到 Git】**。
   - 选择您刚刚推送的 GitHub 仓库。
3. **构建设置（Build Settings）**：
   - **框架预设（Framework preset）**：选择 `None`。
   - **构建命令（Build command）**：
     ```bash
     npm run pages:build
     ```
   - **构建输出目录（Build output directory）**：
     ```text
     pages-dist
     ```
4. **绑定资源与环境变量（在 Pages 控制台的 Settings -> Functions 中配置）**：
   - **KV 命名空间绑定**：
     - 变量名：`CONFIG_KV`
     - 绑定到您的 KV 命名空间（如无请先在 Cloudflare 创建一个 KV）。
   - **Durable Object 绑定**：
     - `REGISTRY` -> 类名 `StudioRegistry`
     - `ROOMS` -> 类名 `DrawRoom`
   - **环境变量（Environment Variables）**：
     - `STUDIO_ID` = `main`
     - `BASE_URL` = 您的 Pages 域名（例如 `https://lucky.yourdomain.com` 或 Cloudflare 默认提供的 pages.dev 域名）
     - `WECHAT_APP_ID` = 您的微信小程序 AppID（可选，配置后自动生成太阳码）
     - `WECHAT_APP_SECRET` = 您的微信小程序 AppSecret（可选）
     - `WECHAT_ENV_VERSION` = `trial`（未上线时填 trial 体验版；正式上线后填 release）
5. **点击【保存并部署】**：
   Cloudflare 会自动执行编译并发布至全球边缘节点！

---

## 四、方式 B：通过本地 Wrangler 命令行一键部署

如果您在本地电脑操作，可以直接使用终端命令行部署：

1. **进入项目目录**：
   ```powershell
   cd "cloudflare_version/youtube-giveaway-studio"
   ```
2. **安装依赖**：
   ```powershell
   npm install
   ```
3. **编译 Pages 静态资源与 API**：
   ```powershell
   npm run pages:build
   ```
4. **登录 Cloudflare 认证**：
   ```powershell
   npx wrangler login
   # 或者设置 API Token:
   # $env:CLOUDFLARE_API_TOKEN="你的Cloudflare_API_Token"
   ```
5. **一键部署 Pages 项目**：
   ```powershell
   npx wrangler pages deploy pages-dist --project-name=lucky
   ```
6. **部署关联的 Cloudflare Worker 后端**：
   ```powershell
   npx wrangler deploy
   ```

---

## 五、完整设置与参数配置说明

### 1. 微信小程序太阳码与扫码配置

在 Cloudflare Pages 运行环境下，大屏系统支持全自动调用微信官方 API 生成原生小程序太阳码：

| 配置项 | 说明 | 推荐设置 |
| :--- | :--- | :--- |
| `WECHAT_APP_ID` | 微信小程序的唯一识别码 | 在微信公众平台【开发管理 -> 开发设置】获取 |
| `WECHAT_APP_SECRET` | 微信小程序的开发者密码 | 同上获取（请勿泄漏） |
| `WECHAT_ENV_VERSION` | 生成太阳码的版本类型 | **测试阶段**填 `trial`；**小程序上线后**填 `release` |
| `BASE_URL` | 活动的线上 HTTPS 域名 | 填绑定在 Cloudflare 上的活动网址 |

> 💡 **自动回退机制**：如果未配置微信小程序的 AppID 和 AppSecret，大屏系统会自动生成标准网页版二维码（普通网址），不影响任何基础功能的正常运行。

### 2. 小程序后台的合法域名设置

请务必登录 **微信公众平台**（[mp.weixin.qq.com](https://mp.weixin.qq.com)），在 **【开发管理】->【开发设置】->【服务器域名】** 中添加：
- **request 合法域名**：添加您的 Pages 域名，例如 `https://lucky-37k.pages.dev`（或您的自定义域名）。
- 否则手机微信端小程序发起网络请求会被微信拦截。

### 3. 自定义域名绑定（可选）

1. 进入 Cloudflare 控制台 -> **【Workers 和 Pages】** -> 点击您的项目（例如 `lucky`）。
2. 点击顶部 **【自定义域（Custom Domains）】** -> 点击 **【设置自定义域】**。
3. 输入您解析在 Cloudflare 上的二级域名（例如 `lucky.xiazheteng.fun`）。
4. Cloudflare 会自动申请免费 SSL 证书并在全球生效，即可用自己的独立域名对外提供抽奖服务！

---

## 六、常见问题排查

1. **手机扫码提示“不在合法域名列表中”？**
   - 请在微信小程序后台将 Pages 域名加入 `request 合法域名`。
   - 或者在微信开发者工具中勾选【不校验合法域名、web-view、TLS版本以及HTTPS证书】。
2. **大屏幕太阳码无法生成？**
   - 检查 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 是否正确填写。
   - 微信官方接口生成小程序码要求小程序必须至少上传过一次代码并生成体验版或正式版。
3. **抽奖历史与数据保留时长？**
   - 系统支持在后台配置数据保留时限（默认 24 小时，可设 1~168 小时），开奖后自动由 Durable Object 调度定时清理，安全合规。
