# 瞎折腾摇奖吧 · Cloudflare Worker／Pages 版

[VPS 示范站点](https://lucky.xiazheteng.fun/) · [YouTube @xiazheteng8](https://www.youtube.com/@xiazheteng8) · [Telegram @xiazheteng8](https://t.me/xiazheteng8)

第一次部署？先按 [本地 / VPS 新手教程](../README.md) 或 [GitHub / Cloudflare Pages 新手教程](../README-PAGES.md) 操作。下面是本目录的功能和配置参考。

支持独立 Worker，或 Cloudflare Pages 静态前端 + Functions 同源 API + `API_BACKEND` Service Binding → 独立 Worker。DO、KV、R2、Secrets 留在 Worker。GitHub Actions 发布到 Cloudflare Pages，不是原生 GitHub Pages 跳转站。

先 `npm ci`，配置 Worker 存储和私有 Secret `SETUP_KEY`，运行 `npm run cf:check`、`npm run cf:deploy`。Pages 使用 `npm run pages:build`、`npm run pages:test`、`npm run pages:deploy -- --project-name 实际项目名`，并在 Pages 添加 `API_BACKEND` 服务绑定。首次在最终域名 `/setup` 设置站长，后台 `/owner`，账号 `/account`。

完整步骤与全部具体设置见 [完整使用与部署说明.md](完整使用与部署说明.md)，[使用与部署.md](使用与部署.md) 为同内容副本。覆盖 Windows、VPS Docker／systemd、Cloudflare Worker／Pages、GitHub Actions、环境变量、账号／验证码／OAuth、全部主要活动与舞台字段、音乐、二维码、录像导出、备份升级回滚和故障排查。

第三方网站登录与观众签到分别配置；未使用真实第三方凭证完成验收前，不把“已配置”当成供应商可用。现场录像只在录制浏览器的同源本地存储中，及时下载。不要公开 `.env`、`.dev.vars`、setupKey、密码、Token 或备份。
