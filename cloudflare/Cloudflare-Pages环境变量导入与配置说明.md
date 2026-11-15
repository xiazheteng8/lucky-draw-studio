# Cloudflare Pages 环境变量导入与配置说明

## 一、当前已部署成功的资源信息
- **Pages 项目名**：`lucky`
- **默认 Pages 域名**：`https://lucky-37k.pages.dev`
- **绑定的后端 Worker**：`xia-zhe-teng-giveaway`（已通过 Service Binding `API_BACKEND` 绑定，开箱即用同源路由）
- **绑定的 KV 空间**：`CONFIG_KV` (ID: `03809dd879c145cebf2e850b575d8f59`)
- **存储引擎**：Cloudflare Durable Objects (`REGISTRY`, `ROOMS`，自动内嵌 SQLite 数据库)

---

## 二、自定义域名解析设置（关键一步）
由于当前 API Token 权限限制，无法直接通过 API 写入 DNS 解析记录。请按以下步骤在 Cloudflare 仪表盘完成自定义域名解析：
1. 打开 [Cloudflare 控制台](https://dash.cloudflare.com/)，选择域名 `xzt8.dpdns.org`。
2. 点击左侧 **DNS** -> **记录 (Records)** -> **添加记录 (Add record)**：
   - **类型 (Type)**：`CNAME`
   - **名称 (Name)**：`lucky`
   - **目标 (Target)**：`lucky-37k.pages.dev`
   - **代理状态 (Proxy status)**：已代理（橙色小云朵）
   - **TTL**：自动 (Auto)
3. 保存后，Pages 会在 1-2 分钟内自动完成 SSL 证书签发并生效。届时直接访问：
   `https://lucky.xzt8.dpdns.org`

---

## 三、环境变量配置文件说明
本项目根目录下已为您生成两份配置文件：
1. `pages-env.env`：标准 `.env` 键值对格式，支持直接复制或本地测试。
2. `pages-env.json`：JSON 结构，方便需要程序读取或批量导入。

### 常用环境变量说明：
| 变量名 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `SITE_NAME` | `瞎折腾摇奖吧` | 站点名称 |
| `ALLOW_PASSWORD_REGISTER` | `true` | 是否允许用户名/密码注册账号 |
| `SETUP_KEY` | *(留空)* | **首次部署初始化密钥**。代码已修改优化，**留空即可直接进入 `/setup` 初始化设置站长账号**，无需从控制台找密钥！ |
| `YOUTUBE_API_KEY` | *(留空)* | 如需从 YouTube 视频抓取评论，请填入 Google Cloud 申请的 API Key |
| `SIGNIN_BASE_URL` | *(留空)* | 公网 HTTPS 地址（如 `https://lucky.xzt8.dpdns.org`），用于第三方扫码授权重定向 |
| `WECHAT_APP_ID` | *(留空)* | 微信公众平台 AppID |
| `WECHAT_APP_SECRET` | *(留空)* | 微信公众平台 AppSecret |

---

## 四、如何修改或追加 Pages 环境变量
1. 访问 Cloudflare 控制台 -> **Workers 和 Pages** -> **lucky** 项目。
2. 进入 **设置 (Settings)** -> **环境变量 (Environment variables)**。
3. 点击 **添加变量 (Add variable)** 或直接复制 `pages-env.env` 中的内容按需添加。
4. 也可以直接在部署时通过本地命令 `npx wrangler pages deploy` 同步。
