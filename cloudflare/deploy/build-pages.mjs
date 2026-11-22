import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'pages-dist');
await fs.rm(output, { recursive: true, force: true });
await fs.cp(path.join(root, 'public'), output, { recursive: true });

// Explicit rewrites keep the address bar, query and fragment on the Pages site.
// No catch-all rewrite: an unknown API or asset must never become index.html.
const aliases = {
  '/admin': '/index.html',
  '/account': '/account.html',
  '/login': '/account.html',
  '/owner': '/owner.html',
  '/setup': '/owner.html',
  '/settings/wechat': '/index.html',
  '/settings/dingtalk': '/index.html',
  '/settings/telegram': '/index.html',
  '/live/:id': '/overlay.html',
  '/overlay/:id': '/overlay.html',
  '/results/:id': '/results.html',
};
const targets = new Set(Object.values(aliases));
await fs.mkdir(path.join(output, '_pages'), { recursive: true });
for (const target of targets) {
  await fs.copyFile(path.join(output, target.slice(1)), path.join(output, '_pages', path.basename(target)));
}
const redirects = Object.entries(aliases).flatMap(([from, to]) => {
  // Pages canonicalizes *.html URLs; rewrite to a clean internal asset URL.
  const clean = '/_pages/' + (to === '/index.html' ? '' : path.basename(to, '.html'));
  return [`${from} ${clean} 200`, `${from}/ ${clean} 200`];
});
await fs.writeFile(path.join(output, '_redirects'), redirects.join('\n') + '\n');
await fs.writeFile(path.join(output, '404.html'), '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面不存在</title><h1>页面不存在</h1><p><a href="/">返回活动中心</a></p></html>\n');
await fs.writeFile(path.join(output, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://telegram.org; worker-src 'self' blob:; frame-src 'self' https://oauth.telegram.org https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'
`);
const buildCwd = await fs.mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'giveaway-pages-build-'));
let result;
try {
  result = spawnSync(process.execPath, [
    path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
    'pages', 'functions', 'build', path.join(root, 'pages-functions'),
    '--project-directory', buildCwd,
    '--outdir', path.join(output, '_worker.js'),
    '--output-routes-path', path.join(output, '_routes.json'),
    '--compatibility-date', '2026-10-30',
  ], { cwd: buildCwd, stdio: 'inherit' });
} finally {
  await fs.rm(buildCwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
// Limit Function invocations to backend routes; static pages stay on Pages CDN.
await fs.writeFile(path.join(output, '_routes.json'), JSON.stringify({
  version: 1,
  include: ['/api', '/api/*', '/MP_verify_*.txt'],
  exclude: [],
}, null, 2) + '\n');
console.log('Cloudflare Pages 静态前端与同源 API Functions 已生成：pages-dist');
