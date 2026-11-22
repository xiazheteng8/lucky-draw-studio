# ☁️ Cloudflare Pages + Worker 部署教程

[← 返回功能介绍](../README.md) · [🔑 平台 API](API-CONFIG.md) · [📱 小程序](DEPLOY-MINIAPP.md)

## 🧩 先看懂要部署什么

```text
浏览器 → Pages 网站
           └─ /api 请求 → Pages Functions
                           └─ API_BACKEND 服务绑定 → Worker 后端
                                                      ├─ SQLite Durable Objects
                                                      └─ KV 配置存储
```

**需要先部署 Worker 后端，再部署 Pages 前端。**只上传网页不能实现账号、活动、报名和抽奖 API。

GitHub Pages 与 Cloudflare Pages 是不同产品。GitHub Pages 只能提供静态内容；本项目完整功能使用 Cloudflare Worker + Pages。

## 🧰 准备环境

1. 注册 [Cloudflare](https://dash.cloudflare.com/)，确认账号允许使用本项目的 Worker、SQLite Durable Objects 和 KV；用量、额度与费用以控制台为准。
2. 安装 [Node.js 22 或更新的 LTS](https://nodejs.org/)。
3. 下载完整仓库，在 **`cloudflare` 文件夹**打开终端。

```bash
npm ci
npx wrangler login
```

浏览器会提示登录并授权。命令行登录无需把 API Token 写进源码。

## 🗄️ 1. 创建 KV

```bash
npx wrangler kv namespace create CONFIG_KV
```

命令会返回一个 namespace ID。编辑 `cloudflare/wrangler.jsonc`，将 `YOUR_CONFIG_KV_ID` 替换为实际 ID，例如：

```json
"kv_namespaces": [
  { "binding": "CONFIG_KV", "id": "这里替换为实际ID" }
]
```

文件里的 `REGISTRY`、`ROOMS` 绑定和 `migrations` 要保留，首次部署由 Wrangler 创建对应 SQLite Durable Objects。不要因为看不懂就删除这些配置。

Worker 默认名称为 `xia-zhe-teng-giveaway`；如修改名称，后续的 Pages 服务绑定也要选择新名称。

## 🔐 2. 设置初始化密钥

```bash
npx wrangler secret put SETUP_KEY
```

按提示输入自己生成的长随机字符串并妥善保存。**没有预设 SETUP_KEY，也没有默认站长密码。**可用以下命令生成随机字符串，再复制到密钥提示中：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

YouTube 和微信等凭证可以在网站初始化后通过后台配置。使用环境变量方式时，敏感字段放 Worker Secrets，不放前端构建变量。

## 🚀 3. 部署 Worker

```bash
npm run cf:check
npm run cf:deploy
```

第一个命令检查构建，不发布；第二个正式发布。记录终端输出的 Worker 名称与访问地址。

✅ 在 Worker 地址打开 `/setup`，至少应能加载页面。这里只做连通检查；推荐在最终 Pages 域名下完成站长初始化和后续使用。

## 🌐 4. 创建 Pages 网站

### 推荐：连接 Git 仓库

在 Cloudflare 控制台创建 Pages 项目，连接你自己的 GitHub 仓库，填写：

| 项目 | 内容 |
| --- | --- |
| 生产分支 | `main` |
| 根目录 | `cloudflare` |
| 框架 | None / 无 |
| 构建命令 | `npm run pages:build` |
| 输出目录 | `pages-dist` |

如果仓库只上传了 `cloudflare` 文件夹里面的内容，根目录应留空，而不是再次填写 `cloudflare`。

### 另一种方式：命令行上传

仍在本机 `cloudflare` 目录执行：

```bash
npm run pages:build
npm run pages:test
npm run pages:deploy -- --project-name 你的Pages项目名
```

首次可能提示创建 Pages 项目，按提示操作。请部署完整 `pages-dist`，不要漏掉 `_worker.js`、`_routes.json` 等文件。

## 🔗 5. 绑定后端 Worker

在 **Pages 项目**设置中找到 Functions / Bindings：

1. 添加 **Service Binding（服务绑定）**。
2. 变量名填写 **`API_BACKEND`**，大小写必须一致。
3. 服务选择第 3 步部署的 Worker。
4. 设置兼容日期为仓库 `wrangler.jsonc` 中的值（当前为 `2026-10-30`），兼容标志包含 **`nodejs_compat`**。
5. 保存后**重新部署 Pages**，让绑定生效。

生产和预览环境的绑定分别配置。首次缺少绑定出现 `API_BACKEND_NOT_CONFIGURED` / 503，通常就是这里尚未完成。

⚠️ 根目录 `wrangler.jsonc` 是 Worker 后端配置，不能直接当 Pages 配置使用。命令行请优先使用仓库提供的 `pages:*` 命令，它会隔离两套配置。

## 👑 6. 初始化并绑定自己的域名

1. 打开 `https://你的项目.pages.dev/setup`，填写 SETUP_KEY，创建站长。
2. 测试用户名登录、创建名单活动和大屏开奖。
3. 如使用自己的域名，在 Pages 的自定义域名设置里添加，并按控制台要求配置 DNS。
4. 最终确定使用哪个域名，就在后台把活动 HTTPS 地址设为该域名；小程序、公众号、钉钉回调也使用它。

不要今天用 Worker 域名报名、明天用 Pages 域名找浏览器录像：不同域名的浏览器存储与登录 Cookie 独立。

## 🔑 API 与小程序

从最终网站进入 `/owner`、`/admin` 及对应平台设置页，按 [API 教程](API-CONFIG.md) 配置。小程序使用 [单独的接入教程](DEPLOY-MINIAPP.md)。

若平台要求固定出口 IP 白名单，不能把 Worker 域名解析出的 IP 当成固定出口 IP。需要按平台支持方式选择带固定出口的 VPS 后端或网关。

## 🔄 更新与数据

- 更新 Worker：在 `cloudflare` 执行 `npm run cf:check`、`npm run cf:deploy`。
- 更新 Pages：Git 集成推送后触发构建，或重新运行 `pages:build` 和 `pages:deploy`。
- 保留原 Worker 名称、`STUDIO_ID`、绑定与存储配置，不要把“重新建一个空 Worker”当成更新。
- 生产账号和活动在 DO / KV 中，前端构建目录不是数据库备份。
- VPS 与 Cloudflare 是独立数据环境，不会自动同步名单和账号。

官方参考：[Pages Git 集成](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings) · [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
