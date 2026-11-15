# 瞎折腾摇奖吧

[GitHub Pages 示范站点](https://xiazheteng8.github.io/lucky-draw-studio/) · [VPS 示范站点](https://lucky.xiazheteng.fun/) · [YouTube @xiazheteng8](https://www.youtube.com/@xiazheteng8) · [Telegram @xiazheteng8](https://t.me/xiazheteng8)

[跳到 GitHub Pages / Cloudflare Pages 教程](README-PAGES.md)

## 初始账号与密码

摇奖吧没有预设站长账号或密码。首次在自己的部署地址打开 `/setup`，自行创建站长账号和密码。本地或 VPS 按启动提示使用私有初始化密钥（若已配置）；Cloudflare Worker 部署前自行设置私有 `SETUP_KEY`。初始化完成后用 `/owner` 进入站长后台。GitHub Pages 示范页是通往 VPS 的入口。

## 1. 准备源码

如果你已经打开 GitHub 仓库，点绿色 **Code → Download ZIP**。下载后右键 ZIP → **全部解压缩**，打开含本 README 的文件夹。若命令要求进入某个文件夹，先打开它，再在资源管理器地址栏输入 `cmd` 并回车。命令在弹出的窗口里逐条输入，每次按回车。

## 2. 先在自己的电脑上试运行

需要 `python` 命令时，从 [Python 官网](https://www.python.org/downloads/) 安装，Windows 安装时勾选 **Add Python to PATH**。摇奖吧使用 [Node.js](https://nodejs.org/en/download)，安装后重新打开终端，输入 `node -v` 检查是否能显示版本号。

打开 `server` 文件夹，双击 `启动本地.cmd`。先安装 Node.js，再按启动窗口提示打开浏览器，默认端口是 `3000`。先建一场测试活动，用虚构名单试抽一次。

## 3. 部署到自己的 VPS

VPS 是一台可从互联网访问的服务器。先在服务商面板确认公网 IP，通过面板的终端或 SSH 登录。把对应的源码目录上传到服务器。以下步骤中，项目若提供 `compose.yaml`，先在 VPS 安装 [Docker Engine 和 Compose 插件](https://docs.docker.com/engine/install/)，再执行项目命令。

进入 `server`，参照 `.env.example` 创建自己的 `.env`，再执行 `docker compose up -d --build`。用 `docker compose ps` 检查服务。反向代理转到 `127.0.0.1:3000`，再按服务器版说明初始化站长账号。

使用自己的域名时，在 DNS 控制台添加指向 VPS 公网 IP 的 A 记录。在网站面板添加同一个域名，按上一步设置静态根目录或反向代理，随后申请 HTTPS 证书。最后用手机流量打开自己的域名测试。若访问失败，先检查 DNS 是否指到这台 VPS，再检查服务器的 80、443 端口和网站配置。使用 Docker 时，可在项目目录运行 `docker compose logs --tail=50` 查看启动报错。

### 微信小程序

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，点击 **导入项目**，选择含 `project.config.json` 的 `miniapp` 文件夹。
2. 只在模拟器看界面可尝试测试号；真机联调和发布使用自己的 AppID。先把自己的摇奖后端部署到 HTTPS 域名。
3. 在 `miniapp/app.js` 查找 `https://lucky.xiazheteng.fun`，把默认后端地址改为自己的地址。在 [微信公众平台](https://mp.weixin.qq.com/) 的 **开发管理 → 开发设置 → 服务器域名** 中，把该域名加入 `request` 合法域名。
4. 在自己的后端新建测试场次，点开发者工具的 **编译** 和 **预览**，用手机检查签到、弹幕和开奖结果。准备发布时，在开发者工具上传代码，再到公众平台提交审核。
