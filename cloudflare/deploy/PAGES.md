# Cloudflare Pages 构建与服务绑定

本项目的 Pages 版本复制当前 `public/` 为真实静态前端；`pages-functions/[[path]].js` 编译为 `pages-dist/_worker.js/index.js`，只代理 `/api`、`/api/*`、`/MP_verify_*.txt`。构建不读取 `PUBLIC_APP_URL`，也不会把后端密钥写入 JavaScript。

## 部署

1. 先用现有 Worker 部署流程部署后端（默认名称 `xia-zhe-teng-giveaway`）。Durable Objects、R2、KV 和 secrets 均配置在这个 Worker；Pages 不负责创建 DO。
2. 在 Cloudflare 创建 Pages 项目。Pages 项目不要误用根目录的 Worker `wrangler.jsonc`。Git 集成的构建命令是 `npm run pages:build`，输出目录 `pages-dist`。`pages:dev` 与 `pages:deploy` 包装器在隔离工作目录调用 Wrangler，避免误加载根目录后端 DO 配置；请优先使用 npm 命令。
3. 在 Pages 项目 Settings → Functions 设置兼容日期 `2026-10-30` 与兼容标志 `nodejs_compat`（Wrangler 编译的运行时代码需要 Node 内置模块），然后在 Settings → Bindings 添加 Service binding：变量名 `API_BACKEND`，服务选择已部署的后端 Worker。生产与预览环境分别配置；配置后重新部署。
4. CLI 发布：`npm ci`、`npm run pages:build`、`npm run pages:test`、`npm run pages:deploy -- --project-name YOUR_PAGES_PROJECT`。CLI 需要 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` 或有效 Wrangler 登录。请部署整个 `pages-dist`，包括 `_worker.js` 目录、`_routes.json`、`_redirects`、`_headers`。

GitHub Actions 使用 `.github/workflows/deploy-pages.yml`：仓库变量 `CF_PAGES_PROJECT`，仓库 secrets `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`；手动触发工作流。GitHub 仅执行 CI 并发布到 Cloudflare Pages。原生 GitHub Pages 无法运行 Functions，不能提供本项目账号、OAuth 和抽奖 API。

如果使用 Pages Git 集成或 Dashboard，后端绑定仍需按上文配置。无需在 Pages 配置后端密钥；密钥保留在 Worker。通过 Cloudflare 的拖放上传纯静态文件不能替代 Functions 发布，请使用上述 Wrangler CLI 或 Git 集成。

## 地址与行为

`/`、`/admin`、`/account`、`/login`、`/owner`、`/setup`、`/settings/wechat`、`/settings/dingtalk`、`/settings/telegram`、`/live/:id`、`/overlay/:id`、`/results/:id` 直接提供页面，地址保留在 Pages 域名。其余原有 `.html` 入口和静态资源继续提供。Pages 会规范化直接访问的 `.html` 地址；内部重写使用 `_pages` 的无后缀资源避免重定向循环。

API 使用 Service Binding 原样转发原始 Request，后端看到的是 Pages 公网 URL、Origin 和 Cookie，因此 CSRF、Cookie 与 OAuth 使用同一站点，无需 CORS。响应不自动跟随 OAuth 跳转，保留 Location、Set-Cookie 与响应流。没有绑定时返回 HTTP 503 与 `API_BACKEND_NOT_CONFIGURED`，不回退为前端 HTML。OAuth/平台后台回调地址需使用实际 Pages 自定义域名，显式配置的站点 base URL 也需同步。

## 本地与验收

`npm run pages:test` 会在隔离目录启动真正的 `wrangler pages dev`，验证静态路由、缺绑定 503 和资源 404，再用 Workerd Service Binding 验证原始请求与 OAuth 响应透传。测试绑定仅作回显断言，不代替线上后端。

手动联调：先在另一个终端运行 `npm run cf:dev`，然后 `npm run pages:build` 与 `npm run pages:dev -- --service API_BACKEND=xia-zhe-teng-giveaway`。必须保持两个本地开发进程同时运行。未提供绑定时可直接验证前端和 503 状态；不要将该状态误判为 API 已部署。

本地构建与模拟器验证不会发布到 Cloudflare；真实云端部署后仍应验证 HTTPS 登录、会话、站长设置和各平台真实回调。
