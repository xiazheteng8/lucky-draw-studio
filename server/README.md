# 瞎折腾摇奖吧 · Windows／本地／VPS Docker 版

[GitHub Pages 示范站点](https://xiazheteng8.github.io/lucky-draw-studio/) · [VPS 示范站点](https://lucky.xiazheteng.fun/) · [YouTube @xiazheteng8](https://www.youtube.com/@xiazheteng8) · [Telegram @xiazheteng8](https://t.me/xiazheteng8)

第一次部署？先按 [本地 / VPS 新手教程](../README.md) 或 [GitHub / Cloudflare Pages 新手教程](../README-PAGES.md) 操作。下面是本目录的功能和配置参考。

安装 Node.js 22+ 后双击 `启动本地.cmd`，或依次运行 `npm ci --omit=dev`、`npm run setup`、`npm start`。首次在 `/setup` 使用服务器私有初始化密钥设置站长；后台 `/owner`，用户账号 `/account`。创建表单公开，创建与管理需登录，用户活动数据隔离。

VPS 可使用 Docker + nginx + HTTPS；当前用户部署沿用 Compose 服务 `studio`、容器 `xiazheteng-lucky`、宿主机 3010 → 容器 3000。基础 compose 端口请核对，升级保留 `.env` 和原数据卷。

完整步骤与全部具体设置见 [完整使用与部署说明.md](完整使用与部署说明.md)，[使用与部署.md](使用与部署.md) 为同内容副本。覆盖 Windows、VPS Docker／systemd、Cloudflare Worker／Pages、GitHub Actions、环境变量、账号／验证码／OAuth、全部主要活动与舞台字段、音乐、二维码、录像导出、备份升级回滚和故障排查。

第三方网站登录与观众签到分别配置；未使用真实第三方凭证完成验收前，不把“已配置”当成供应商可用。现场录像只在录制浏览器的同源本地存储中，及时下载。不要公开 `.env`、`.dev.vars`、setupKey、密码、Token 或备份。
