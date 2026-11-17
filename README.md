# 瞎折腾摇奖吧

[YouTube @xiazheteng8](https://www.youtube.com/@xiazheteng8) · [Telegram @xiazheteng8](https://t.me/xiazheteng8) · [GitHub 项目](https://github.com/xiazheteng8/lucky-draw-studio)

[国内 VPS 演示](https://lucky.tanzhe.top/) · [原 VPS 演示](https://lucky.xiazheteng.fun/) · [Cloudflare Pages 演示](https://lucky-37k.pages.dev/)

从 YouTube 评论、微信扫码或 Excel 名单创建抽奖活动，用独立大屏展示候场、抽奖和中奖结果。适合直播互动、线下活动、公司年会和社区抽奖。

[下载对应版本](#下载对应版本) · [功能与大屏](#功能与大屏) · [本地试运行](#本地试运行) · [普通-vps-部署](#普通-vps-部署) · [cloudflare-pages-部署](#cloudflare-pages-部署) · [youtube-api-获取与配置](#youtube-api-获取与配置) · [微信小程序配置](#微信小程序配置) · [其他扫码平台](#其他扫码平台)

## 下载对应版本

在 [GitHub Releases](https://github.com/xiazheteng8/lucky-draw-studio/releases) 打开包含这些附件的版本。附件发布后，也可通过下表直接下载。

| 下载 | 适用场景 |
| --- | --- |
| [VPS 本地版 ZIP](https://github.com/xiazheteng8/lucky-draw-studio/releases/latest/download/lucky-draw-vps-20261117.zip) | Windows 本地运行，或在 Linux VPS 上部署 Node.js 站点 |
| [Cloudflare Pages 版 ZIP](https://github.com/xiazheteng8/lucky-draw-studio/releases/latest/download/lucky-draw-cloudflare-pages-20261117.zip) | 部署 Cloudflare Pages 前端和 Worker 后端 |
| [微信小程序源码 ZIP](https://github.com/xiazheteng8/lucky-draw-studio/releases/latest/download/lucky-draw-wechat-miniapp-20261117.zip) | 导入微信开发者工具，连接自己的抽奖后端 |

直链指向 GitHub 的最新正式 Release。如果附件还没发布，或后来移动到旧版本，请从 Releases 列表选对应版本，或先用 [Code → Download ZIP](https://github.com/xiazheteng8/lucky-draw-studio/archive/refs/heads/main.zip) 下载仓库源码。

## 功能与大屏

| 抽奖方式 | 怎么用 | 需要准备什么 |
| --- | --- | --- |
| YouTube 视频评论 | 贴入视频链接，导入评论，从符合条件的评论者中抽奖 | 可公开读取评论的视频。建议配置 YouTube Data API v3 |
| 微信扫码 | 观众扫现场大屏二维码，报名后参加抽奖 | 可手机访问的 HTTPS 后端及对应微信平台凭证 |
| 钉钉或 Telegram 扫码 | 先配置平台，再在活动中选择签到方式 | 钉钉应用凭证或 Telegram 机器人 |
| 自定义名单 | 导入 Excel、CSV 或名单目录，也可给名单配头像 | 打开项目的名单模板，按示例填写 |
| Blog 文章评论 | 填文章链接，导入站点支持的评论数据 | 可读取的评论来源。导入后先核对实际名单 |

创建活动时可以设中奖人数、手动逐位或自动连续开奖、倒计时、动画候选次数和最终公示文案。评论抽奖支持关键词、按参与者去重、评论时间范围、排除作者以及频道 ID 黑白名单。开奖前先打开**查看参与名单**，确认筛选后人数够用。

在**舞台设计**中可设置 LOGO、各名次奖项名称和奖品图片、奖章样式、候场／开奖／颁奖音乐及音量。**主题外观**含新春、财神及深海、极光、黑金等主题。新春主题使用金色粒子和中奖头像环。活动开启互动时，观众可发留言和点赞，大屏会显示互动和中奖结果。

活动管理中打开**直播大屏**，可用浏览器全屏或把完整链接放到 OBS 的**浏览器来源**。中奖名单可导出 Excel、CSV 或结果图片。支持的浏览器可录制现场或导出开奖动画 WebM。现场录像保存在录制用的浏览器里，结束后在同一浏览器、同一站点导出。[舞台与导出细节](server/使用与部署.md)

## 本地试运行

1. 获取源码，解压下载的 ZIP。GitHub 页面可点 **Code → Download ZIP**。[项目下载](https://github.com/xiazheteng8/lucky-draw-studio)
2. 安装 Node.js 22 或更新的 LTS，重新打开终端后运行 `node -v`。Windows 用户打开 `server`，双击 `启动本地.cmd`。也可在 `server` 目录运行下面三条命令。[Node.js 下载](https://nodejs.org/en/download)
3. 第一次访问 `http://localhost:3000/setup`。按终端提示找到初始化密钥，自行创建站长用户名和密码。项目没有通用的默认账号或密码。之后通过 `/owner` 打开站长后台。
4. 在首页创建一个**自定义名单**活动，导入几条测试记录，打开大屏，先试一次完整抽奖。

```bash
npm ci --omit=dev
npm run setup
npm start
```

## 普通 VPS 部署

两条路线共用同一个 Node.js 服务和 systemd 配置。普通 VPS 可以用 SSH 上传文件并配置 Nginx。已有 1Panel 和 Nginx Proxy Manager（下称 NPM）的用户，通过 1Panel 上传源码、在面板终端启动服务，再到 NPM 配域名和证书。安装项目依赖用的 npm 是 Node.js 命令。

### 1. 准备域名和运行环境

1. 在域名 DNS 控制台添加一条 A 记录，例如 `lucky.example.com` → VPS 公网 IPv4。示例域名全文都要换成你的实际域名。
2. 安装 Node.js 22 或更新的 LTS，在 SSH 终端确认 `node -v` 和 `npm -v` 可以运行。用 `command -v node` 记下 Node 的绝对路径，稍后写进服务配置。[Node.js 下载](https://nodejs.org/en/download)
3. 选择上传方式，目标目录统一为 `/opt/lucky-draw/server`。
   - **普通 VPS**：通过 SFTP 把完整仓库里的 `server` 文件夹上传到 `/opt/lucky-draw`。
   - **1Panel**：打开 **主机 → 文件**（部分版本菜单叫 **文件管理**），在 `/opt` 新建 `lucky-draw`，进入后点 **上传**。可以上传 `server` 文件夹，也可以直接上传下载表里的 `lucky-draw-vps-20261117.zip`。上传 ZIP 时，选中它点 **解压**，把解压出来的项目目录移动或重命名为 `/opt/lucky-draw/server`。[1Panel 文档](https://1panel.cn/docs/)
4. 在 `/opt/lucky-draw/server` 里确认能直接看到 `package.json`、`src`、`public` 和 `.env.example`。多出一层目录时，移动里面的项目文件夹，确保后续命令在真正的项目目录执行。下面的 `YOUR_LINUX_USER` 指有权限读写项目目录的普通 Linux 用户。如果文件是面板以 root 上传的，可由管理员把项目目录交给该用户，再用该用户执行安装。

### 2. 配置并启动 Node.js 服务

用部署用户在 `/opt/lucky-draw/server` 里安装依赖和创建配置。使用 1Panel 的话，可以在面板的 **终端** 执行下面的命令，配置文件也可以通过文件管理器编辑。`openssl rand -hex 32` 用来生成你自己的私有初始化密钥。

```bash
cd /opt/lucky-draw/server
npm ci --omit=dev
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
```

编辑 `.env`，找到对应变量并替换。初始化密钥填上一步本机生成的值。

```dotenv
NODE_ENV=production
PORT=3000
DATA_DIR=./data
BASE_URL=https://lucky.example.com
TRUST_PROXY=1
SETUP_KEY=替换为自己生成的初始化密钥
```

`TRUST_PROXY=1` 对应前面只有一层可信反向代理的情况。公网开放网站使用的 `80`、`443`，Node 的 `3000` 留给本机代理。

用管理员权限创建 `/etc/systemd/system/lucky-draw.service`。替换 `User` 和 `ExecStart` 中的 Node 路径。

```ini
[Unit]
Description=Lucky Draw Studio
After=network.target

[Service]
User=YOUR_LINUX_USER
WorkingDirectory=/opt/lucky-draw/server
ExecStart=/usr/bin/node /opt/lucky-draw/server/src/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lucky-draw
curl http://127.0.0.1:3000/healthz
sudo journalctl -u lucky-draw -n 50 --no-pager
```

`/healthz` 返回 `"ok":true` 后，再添加网站和 HTTPS。

### 3. 绑定域名与 HTTPS

#### 1Panel 上传路线使用 Nginx Proxy Manager

1. 先在 1Panel 终端运行 `curl http://127.0.0.1:3000/healthz`。看到 `"ok":true` 再配反代。1Panel 在此路线负责文件和终端，域名由 NPM 管理。如果 1Panel 的 OpenResty 已经占用这台机器的公网 80 或 443，先核对现有站点和端口，再决定如何让 NPM 接管入口。
2. 登录 NPM，打开 **Hosts → Proxy Hosts → Add Proxy Host**，按表填写。[Nginx Proxy Manager 官方指南](https://nginxproxymanager.com/guide/)

   | NPM 字段 | 填写示例 |
   | --- | --- |
   | Domain Names | `lucky.example.com`，只填域名 |
   | Scheme | `http` |
   | Forward Hostname / IP | NPM 能访问的 Node.js 服务器地址 |
   | Forward Port | `3000`，与 `.env` 中的 `PORT` 一致 |

   NPM 与 Node.js 在同一网络命名空间时，上游可填 `127.0.0.1`。NPM 若运行在独立容器里，`127.0.0.1` 是代理容器自己。在 1Panel 的容器网络详情确认该网络的宿主机网关，或使用 NPM 能访问的宿主机内网 IP。保持 `3000` 不直接对公网开放，并允许 NPM 从其网络访问该端口。
3. 切到 **SSL**，申请或选择该域名的证书。证书可用后开启 **Force SSL**，保存。通过手机流量访问 `https://lucky.example.com/healthz`。如果是 **502**，先核对 NPM 上游地址、端口及防火墙。证书申请失败时，先检查域名是否解析到 NPM 的公网地址，以及 80/443 是否可达。
4. 打开 `https://lucky.example.com/setup`，填自己设好的初始化密钥，创建站长账号。

#### 普通 VPS 使用 Nginx

在你的域名站点中把请求转给 `http://127.0.0.1:3000`。下面是网站 `server` 块里的反代片段。绑定域名并签发证书后，确认同一反代规则也在 HTTPS 的 `server` 块内。

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

普通 Nginx 配置修改后运行 `sudo nginx -t`，通过后运行 `sudo systemctl reload nginx`。

通过任一路线绑定域名后，都可以用 `/healthz` 检查服务，再从 `/setup` 初始化站长。以后升级先备份 `data/` 和 `.env`，上传新版源码后在项目目录运行 `npm ci --omit=dev` 和 `sudo systemctl restart lucky-draw`。使用小程序时，还需配置下文的专用转发路径。

## Cloudflare Pages 部署

Pages 提供网页，Pages Functions 把同源的 `/api/*` 请求转给后端 Worker。需要先部署 Worker，再部署 Pages 并绑定后端。GitHub 可托管源码和触发构建，原生 GitHub Pages 无法执行这套后端。

### 1. 部署 Worker 后端

1. 打开 `cloudflare` 目录，运行 `npm ci`，再使用 `npx wrangler login` 登录。也可按文档配置 CI 用的账户 ID 和 API Token。[Cloudflare 控制台](https://dash.cloudflare.com/) · [管理 API Token](https://dash.cloudflare.com/profile/api-tokens)
2. 在控制台的 **Storage & databases → KV** 创建项目用的 KV 命名空间。将其 ID 填到 `cloudflare/wrangler.jsonc` 中 `CONFIG_KV` 的 `id`，替换 `YOUR_CONFIG_KV_ID`。保留仓库已有的 `REGISTRY`、`ROOMS` 和 `migrations` 定义。需要媒体存储时，按项目的 Worker 存储说明补充相应绑定。[Worker 配置说明](cloudflare/README.md)
3. 在 `cloudflare` 目录运行以下命令。`secret put` 等提示出现后再粘贴你自己生成的私有密钥。

```bash
npm ci
npm run cf:check
npm run cf:deploy
npx wrangler secret put SETUP_KEY
```

### 2. 把 Pages 连到 Worker

1. 在 [Cloudflare 控制台](https://dash.cloudflare.com/) 进入 **Workers & Pages → Create application → Pages**，连接本项目的 GitHub 仓库。
2. 生产分支填 `main`，框架选 **None**。从完整仓库部署时根目录填 `cloudflare`；如果仓库根目录就是独立 Pages 源码包的内容，根目录留空。构建命令填 `npm run pages:build`，输出目录填 `pages-dist`。[Cloudflare Git 集成](https://developers.cloudflare.com/pages/get-started/git-integration/)
3. 在 Pages **Settings** 里设置 Functions 兼容日期 `2026-10-30` 和兼容标志 `nodejs_compat`。添加 **Service binding**，变量名填 `API_BACKEND`，服务选择刚部署的 Worker。生产和预览环境需要分别绑定。保存后重新部署。[Cloudflare Service Binding](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings)
4. 打开最终 Pages 域名的 `/setup`，用 Worker 的 `SETUP_KEY` 创建站长。能打开首页但 API 返回 `API_BACKEND_NOT_CONFIGURED` 时，回到 Pages 检查生产环境绑定，然后重新部署。YouTube 等凭证配置在后端 Worker，回调地址使用观众实际打开的站点域名。

如果用 Wrangler 直接发布，在 `cloudflare` 目录执行以下命令。保持 `pages-dist` 里的 `_worker.js` 和 `_routes.json` 随静态文件一起发布。

```bash
npm ci
npm run pages:build
npm run pages:test
npm run pages:deploy -- --project-name 你的实际Pages项目名
```

[Pages 构建与绑定详解](cloudflare/deploy/PAGES.md) · [GitHub 与 Pages 补充教程](README-PAGES.md)

## YouTube API 获取与配置

1. 登录 Google Cloud，新建项目或选择专门用于抽奖的项目。[Google Cloud 项目](https://console.cloud.google.com/projectcreate)
2. 在该项目下打开 API 页面，点击**启用**。[启用 YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
3. 打开**凭据 → 创建凭据 → API 密钥**。在密钥的 API 限制中，只允许 **YouTube Data API v3**。如果限制调用来源，要依据后端实际出口配置。[Google Cloud 凭据](https://console.cloud.google.com/apis/credentials) · [YouTube API 获取指南](https://developers.google.com/youtube/data/getting-started)
4. 用站长账号登录摇奖吧，打开 **API 与扫码平台设置**，在 YouTube 输入框填 API Key 并保存。也可在 VPS 的 `.env` 配置 `YOUTUBE_API_KEY` 后重启，或在 Cloudflare Worker 运行 `npx wrangler secret put YOUTUBE_API_KEY`。
5. 创建 **YouTube 视频评论** 活动，用一个确认已开放评论的公开视频试导入，核对合格名单再开奖。未配置 API 时，程序会尝试读取公开评论，结果受视频状态和服务器网络影响。

## 微信小程序配置

### 1. 获取凭证

1. 注册或登录微信公众平台，选择**小程序**。在 **开发管理 → 开发设置** 找到小程序 **AppID** 和 **AppSecret**。[微信公众平台](https://mp.weixin.qq.com/)
2. 在自己的 VPS 后端填写同一个小程序的 AppID 和 AppSecret，或在站长的扫码平台设置中保存。使用环境变量时为 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`。AppSecret 只放服务端。
3. 在小程序后台 **开发设置 → 服务器域名**，把实际入口加入 **request 合法域名**，例如 `https://lucky.example.com`。隐私保护指引中说明所选头像和昵称会用于签到和现场大屏。[微信网络配置文档](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

### 2. 让小程序连到自己的站点

本仓库的 `miniapp/app.js` 使用 `GATEWAY_URL` 作为固定入口，API 会走 `/miniapp-gateway/站点代码/api/…`。上线自己的活动时，把 `GATEWAY_URL` 改成自己在微信后台登记的 HTTPS 域名。

**只有一台 VPS** 时，可将以下片段加到该域名的 Nginx HTTPS `server` 块，保留原来的网页反代规则。默认圆形码没有 `site` 参数，使用 `legacy` 路由。走 1Panel 上传路线时，在 NPM 编辑对应的 **Proxy Host → Advanced**，把下方的完整配置片段粘贴进去并保存。

```nginx
location ~ "^/miniapp-gateway/legacy/api/(?:miniapp/(?:login|(?:campaign|checkin|blessing)/[0-9]+)|interact/[0-9]+)$" {
    rewrite ^/miniapp-gateway/legacy(/.*)$ $1 break;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

这里的上游地址与网页使用同一个 Node.js 服务。如果 NPM 主反代用的是宿主机内网 IP 或不同端口，请将这里的 `127.0.0.1:3000` 替换为同一个上游。自己的普通链接二维码如需让小程序识别，链接参数要带 `site=legacy`。**多台 VPS** 可参考仓库的入口配置，为每个站点代码分配固定上游。示例文件里的域名、上游和 DNS 解析器对应演示站，使用前按你的网络设置修改。[多站点反代示例](server/deploy/miniapp-gateway.conf)

### 3. 导入、扫码和发布

1. 下载微信开发者工具。打开后选**导入项目**，选择仓库中的 `miniapp` 目录，填写你刚拿到的 AppID。[微信开发者工具下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 在自己部署的站点上创建**微信扫码**测试活动并打开大屏。在开发者工具编译、预览和上传，再去公众平台 **版本管理** 把对应开发版本设为体验版。
3. 用有体验资格的手机，扫活动大屏的体验版小程序码。小程序会先引导选择头像，再提示在键盘上方选微信昵称，确认报名后可以留言或点赞。微信需要观众亲自操作头像选择器和昵称栏。[头像与昵称官方说明](https://www.tencentcloud.website/zh/document/product/1219/68263)
4. 真机确认成功后提交审核并发布。生成正式版大屏码时，把服务端小程序码环境改成 `release`；测试体验版用 `trial`。如果后台已经保存了微信环境设置，以保存的设置为准。改完后刷新大屏，重新生成对应版本的码。

Cloudflare Pages 演示站目前未接入上述 VPS 小程序入口。部署 Pages 网页与在微信公众平台发布小程序是两项独立操作。

## 其他扫码平台

网站账号登录和观众活动签到是两个用途，请在后台对应区域配置。微信小程序凭证与公众号网页授权凭证也要按实际使用方式配置。

| 平台 | 凭证到哪里拿 | 在摇奖吧哪里填 |
| --- | --- | --- |
| 微信公众号网页授权 | 在公众平台选择具备网页授权能力的公众号，查看 AppID、AppSecret 和网页授权域名。[微信公众平台](https://mp.weixin.qq.com/) | `/settings/wechat`。回调为 `/api/wechat/callback`，按平台要求上传域名验证文件 |
| 钉钉 | 在开放平台创建应用，获取 Client ID、Client Secret，按控制台开通登录与个人信息权限。[钉钉开放平台](https://open-dev.dingtalk.com/) | `/settings/dingtalk`。回调为 `/api/signin/dingtalk/callback` |
| Telegram | 在 Telegram 用 `/newbot` 创建机器人，记录 Token 和机器人用户名。[BotFather](https://t.me/BotFather) | `/settings/telegram`。填写 Token、用户名和公网 HTTPS 站点地址，保存后点击启用接收 |

[扫码配置字段和回调](server/扫码平台配置.md) · [抽奖模式与主题](server/抽奖模式与主题说明.md)

源码包中的 `.env.example` 和 `.dev.vars.example` 只作配置模板。自己的 API 密钥、AppSecret、Token、站长密码、真实名单和活动数据库放在各自的部署环境中。
