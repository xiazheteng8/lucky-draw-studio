import fs from 'node:fs';
import crypto from 'node:crypto';
if (fs.existsSync('.env')) throw Error('.env 已存在，请编辑现有文件');
const key = crypto.randomBytes(24).toString('hex');
fs.writeFileSync('.env', fs.readFileSync('.env.example','utf8').replace('SETUP_KEY=', 'SETUP_KEY='+key), {mode:0o600});
console.log('已生成 .env。请修改域名并启动服务，在 /setup 设置站长账号。初始化密钥请从本机 .env 读取。');
