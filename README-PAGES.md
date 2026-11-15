# 瞎折腾摇奖吧 · Pages 部署教程

[GitHub Pages 示范站点](https://xiazheteng8.github.io/lucky-draw-studio/) · [VPS 示范站点](https://lucky.xiazheteng.fun/) · [YouTube @xiazheteng8](https://www.youtube.com/@xiazheteng8) · [Telegram @xiazheteng8](https://t.me/xiazheteng8)

[返回本地 / VPS 教程](README.md)

## 初始账号与密码

摇奖吧没有预设站长账号或密码。首次在自己的部署地址打开 `/setup`，自行创建站长账号和密码。本地或 VPS 按启动提示使用私有初始化密钥（若已配置）；Cloudflare Worker 部署前自行设置私有 `SETUP_KEY`。初始化完成后用 `/owner` 进入站长后台。GitHub Pages 示范页是通往 VPS 的入口。

## 1. 先把源码放到 GitHub

1. 登录 GitHub，打开 [新建仓库](https://github.com/new)。在 **Repository name** 填 `lucky-draw-studio`。需要发布公开示范站点时，确认源码已清理，再选 **Public**。
2. 手头只有 ZIP 时，先解压。上传前逐项检查：源码、运行资源和公开测试样例可以提交；个人数据、真实名单、数据库、上传目录、各类备份、`.env` 和密钥保留在本机。
3. 安装 [Git](https://git-scm.com/downloads)，打开项目根目录的终端。空仓库页面会显示推送命令。首次使用时先配置 Git 提交姓名和邮箱，然后在项目目录按下列顺序运行。把仓库地址换成 GitHub 页面显示的 HTTPS 地址。

```text
git init -b main
git add .
git status --short
git commit -m "Initial source release"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

看完 `git status --short` 的待提交名单，再执行提交。推送时按 Git 的提示登录。刷新仓库页面，确认能看到项目目录。

## 2. GitHub Pages 示范站点

1. 在 GitHub 仓库打开 **Settings → Pages**，把 **Source** 选为 **GitHub Actions**。
2. 打开 **Actions → Deploy GitHub Pages demo → Run workflow**，选择 **main** 并确认。仓库已带工作流，从 `docs` 发布演示。
3. 等部署任务显示绿色勾，再回到 **Settings → Pages** 点击 **Visit site**。

[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 3. Cloudflare Pages

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，打开 **Workers & Pages → Create application → Pages → Connect to Git**，授权 Cloudflare 访问你的仓库并选中它。
2. 生产分支填 `main`，项目根目录填 `cloudflare`，框架选择 **None**，构建命令填 `npm run pages:build`，输出目录填 `pages-dist`。
3. 先按 [摇奖吧 Cloudflare 原说明](cloudflare/README.md) 创建 Worker 所需的存储，设置私有 `SETUP_KEY`，再在 `cloudflare` 文件夹运行 `npm ci`、`npm run cf:check` 和 `npm run cf:deploy`。打开 Pages 项目的绑定设置，把 `API_BACKEND` 指向这个 Worker，重新部署。打开自己的 `pages.dev` 域名下的 `/setup`，完成站长初始化后再用测试名单试抽。

[Cloudflare Pages 官方部署说明](https://developers.cloudflare.com/pages/get-started/git-integration/)
