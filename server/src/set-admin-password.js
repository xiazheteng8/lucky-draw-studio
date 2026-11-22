import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const password = process.env.ADMIN_NEW_PASSWORD || process.argv[2];
if (!password) {
  console.error("用法: ADMIN_NEW_PASSWORD='非空的新密码' npm run set-admin-password");
  process.exit(1);
}
const envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
  console.error('.env 不存在。请先从 .env.example 创建它。');
  process.exit(1);
}
const replacements = {
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD_HASH: await bcrypt.hash(password, 12),
  SESSION_SECRET: crypto.randomBytes(48).toString('base64url')
};
const seen = new Set();
const updated = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).map((line) => {
  const key = line.split('=', 1)[0];
  if (Object.hasOwn(replacements, key)) {
    seen.add(key);
    return `${key}=${replacements[key]}`;
  }
  return line;
});
for (const [key, value] of Object.entries(replacements)) if (!seen.has(key)) updated.push(`${key}=${value}`);
fs.writeFileSync(envPath, `${updated.filter((line, index, all) => line || index < all.length - 1).join('\n')}\n`, { mode: 0o600 });
console.log('管理员密码和会话密钥已更新。请重启服务后重新登录。');
