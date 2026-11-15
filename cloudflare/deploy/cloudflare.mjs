import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),cli=path.join(path.dirname(require.resolve('wrangler/package.json')),'bin','wrangler.js');
const run=args=>{const result=spawnSync(process.execPath,[cli,...args],{stdio:'inherit',cwd:new URL('..',import.meta.url),env:process.env});if(result.status!==0)process.exit(result.status||1)};
if(process.argv.includes('--check')){run(['deploy','--dry-run']);process.exit(0)}
console.log('开始部署独立 Cloudflare 版；首次需要登录 Cloudflare，并按提示创建文件存储。');
run(['deploy']);
console.log('部署完成。公开创建页 /；请先用 wrangler secret put SETUP_KEY 配置一次性初始化密钥，再打开 /setup 设置站长账号密码。站长入口 /owner，用户入口 /account。');
