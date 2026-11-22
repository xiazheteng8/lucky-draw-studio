# 🖥️ VPS / Docker / 本地部署教程

[← 返回功能介绍](../README.md) · [☁️ Pages 部署](DEPLOY-PAGES.md) · [🔑 API 配置](API-CONFIG.md)

## 🧰 先准备什么？

| 项目 | 说明 |
| --- | --- |
| Linux VPS | 能通过 SSH 或面板终端操作 |
| 域名 | 例：`lucky.example.com`，替换成自己的域名 |
| Docker + Compose | 本教程推荐的服务器运行方式 |
| 反向代理 | Nginx、Nginx Proxy Manager（NPM）或面板反代，任选一种 |

只在电脑上试名单抽奖，可以先看下一节，无需域名和微信凭证。

<a id="local"></a>

## 💻 先在电脑上试运行

1. 下载仓库：GitHub 页面选择 **Code → Download ZIP**，解压；也可使用 Git 克隆。
2. 安装 [Node.js 22 或更新的 LTS](https://nodejs.org/)，安装后重新打开终端。
3. 在解压目录的 **`server` 文件夹**中打开终端，依次执行：

```bash
npm ci --omit=dev
npm run setup
npm start
```

`npm run setup` 生成 `.env`，如果已存在就直接编辑，不要重复生成。打开 `.env`，找到 `SETUP_KEY` 的值并留在本机。

4. 浏览器打开 `http://localhost:3000/setup`，填写初始化密钥，设置自己的站长用户名与密码。
5. 返回首页，创建一个自定义名单活动，导入几条测试姓名后打开大屏。

✅ 能看到候场、正常开奖和结果，就说明基础服务可用。手机不能通过你电脑的 `localhost` 访问服务；微信正式接入还需要公网 HTTPS。

## 📦 1. 获取服务器源码

在 VPS 的 SSH 或面板终端执行：

```bash
cd /opt
git clone https://github.com/xiazheteng8/lucky-draw-studio.git
cd /opt/lucky-draw-studio/server
```

也可以上传 ZIP 并解压。**确认当前目录能直接看到 `package.json`、`compose.yaml`、`Dockerfile`、`src`、`public` 和 `private`。**不要只上传 `public`。

## ⚙️ 2. 配置环境变量

```bash
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
```

最后一条会输出一串随机字符，用它作为下面的 `SETUP_KEY`。用面板编辑器或 `nano .env` 修改这些项：

```dotenv
NODE_ENV=production
PORT=3000
DATA_DIR=/app/data
BASE_URL=https://lucky.example.com
SIGNIN_BASE_URL=https://lucky.example.com
TRUST_PROXY=1
SETUP_KEY=替换为刚刚生成的随机字符
```

- Docker 容器内使用 `DATA_DIR=/app/data`；直接在电脑运行时使用 `./data`。
- `BASE_URL` 是最终网站地址，包含 `https://`，不带页面路径。
- `TRUST_PROXY=1` 适用于一层可信反向代理；多层代理需按实际链路配置，不要直接照搬。
- 暂时不接 YouTube 或微信时，对应密钥可以留空。

## ▶️ 3. 启动 Docker 服务

先确认 Docker 和 Compose 已安装：

```bash
docker --version
docker compose version
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 studio
curl -f http://127.0.0.1:3000/healthz
```

✅ 最后一条返回健康响应、容器保持运行，表示后端已启动。

仓库默认只把端口绑定在 `127.0.0.1:3000`，用于本机反代。对公网开放网站的 80 / 443 端口即可。

## 🌐 4. 配置域名和反向代理

先在域名服务商设置 A 记录：`lucky` → VPS 的公网 IPv4。若配置了 AAAA，IPv6 也必须指向能提供服务的地址。

### 方案 A：Nginx Proxy Manager（NPM）

> **npm** 是 Node.js 包管理器；这里的 **NPM** 是 Nginx Proxy Manager 反向代理面板，两者不是同一个东西。

在 NPM 新建 **Proxy Host**：

| 字段 | 填写内容 |
| --- | --- |
| Domain Names | `lucky.example.com` |
| Scheme | `http` |
| Forward Hostname / IP | 见下方网络说明 |
| Forward Port | `3000` |
| SSL | 为该域名申请证书，启用 Force SSL |

**上游地址怎么选：**

- NPM 与应用都使用宿主机网络：上游可用 `127.0.0.1`。
- NPM 自己在 Docker 容器里：`127.0.0.1` 是 NPM 容器，不是 VPS！推荐把两者加入同一个 Docker 网络，上游填应用容器的唯一网络别名。
- 例如已有共享网络叫 `proxy`，可在 `server/compose.override.yaml` 添加以下内容，然后重新执行 `docker compose up -d --build`。NPM 也要接入同一个网络。

```yaml
services:
  studio:
    networks:
      proxy:
        aliases:
          - lucky-studio
networks:
  proxy:
    external: true
```

此时 NPM 上游填 `lucky-studio`，端口仍为 `3000`。`proxy` 必须是已存在的网络名，请按实际修改。不要为了绕过 502 随意把应用端口暴露到公网。

### 方案 B：宿主机 Nginx

在已经配置有效 HTTPS 证书的站点 `server` 块中加入：

```nginx
client_max_body_size 20m;

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
}
```

保存后运行 `nginx -t`，通过后再重新加载 Nginx。该片段只包含反代配置，证书与 80 → 443 跳转需由面板或证书工具配置。

## 👑 5. 初始化站长

1. 打开 `https://lucky.example.com/setup`。
2. 填写 `.env` 中的 `SETUP_KEY`，自行创建站长用户名与密码。
3. 以后进入 `/owner` 使用站长账号登录；普通用户使用 `/account`。
4. 到站长后台按需配置 [YouTube 与扫码平台 API](API-CONFIG.md)。

项目没有通用默认账号密码。初始化密钥和站长密码是两回事。

## ✅ 6. 做一场完整验收

填写主办方和活动名 → 选择自定义名单 → 下载模板并填入至少 3 人 → 设置奖项 → 打开大屏 → 抽奖 → 查看结果 → 导出图片和一段 MP4。

基础流程通过后，再配置微信小程序。不要把“网页打开了”当成“微信报名也已接通”。

## 💾 备份和升级

Docker 数据保存在 `studio-data` 命名卷，里面包含数据库、运行配置及上传数据。**升级保留卷，不要执行 `docker compose down -v`。**

可在项目目录执行下面的 Node 命令，把容器内数据流式打包到本机文件；为保持数据库与配置一致，备份期间避免修改活动，重要活动前建议停服备份。

```bash
docker compose exec -T studio tar -czf - -C /app/data . > lucky-data-backup.tgz
```

另行备份 `.env`，不要把备份上传到公开仓库。更新前查看 `git status`，保留自己的配置与改动；干净工作目录可执行：

```bash
git pull --ff-only
docker compose up -d --build
docker compose logs --tail=80 studio
```

更新后刷新页面；若主题资源仍旧，使用 `Ctrl + F5`。常见报错见 [故障排查](FAQ.md)。
