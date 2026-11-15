import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'pages-dist');
const temp = await fs.mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'giveaway-pages-test-'));
let server, mf;
let logs = '';
try {
  // Outside the Worker project so Wrangler does not load its DO/assets config.
  await fs.cp(dist, path.join(temp, 'site'), { recursive: true });
  const port = await new Promise(resolve => {
    const socket = net.createServer();
    socket.listen(0, '127.0.0.1', () => {
      const value = socket.address().port;
      socket.close(() => resolve(value));
    });
  });
  server = spawn(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
    'pages', 'dev', 'site', '--port', String(port), '--ip', '127.0.0.1',
    '--compatibility-date', '2026-10-30', '--show-interactive-dev-session=false',
  ], { cwd: temp, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false', BROWSER: 'none' } });
  server.stdout.on('data', chunk => { logs += chunk; });
  server.stderr.on('data', chunk => { logs += chunk; });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base); ready = true; break; } catch {}
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert(ready, 'Wrangler Pages dev did not start:\n' + logs);
  const routes = { '/': 'index.html', '/account': 'account.html', '/owner': 'owner.html',
    '/setup': 'owner.html', '/live/42': 'overlay.html', '/results/42': 'results.html',
    '/settings/wechat': 'index.html', '/admin': 'index.html', '/overlay/42': 'overlay.html' };
  for (const [route, file] of Object.entries(routes)) {
    const response = await fetch(base + route + '?token=keep', { redirect: 'manual' });
    assert.equal(response.status, 200, route + ' ' + response.headers.get('location'));
    assert.equal(await response.text(), await fs.readFile(path.join(dist, file), 'utf8'), route);
  }
  for (const route of ['/api', '/api/unknown', '/api/signin/wechat/callback', '/MP_verify_Test123.txt']) {
    const response = await fetch(base + route, { redirect: 'manual' });
    assert.equal(response.status, 503, route);
    assert.equal((await response.json()).code, 'API_BACKEND_NOT_CONFIGURED', route);
  }
  assert.equal((await fetch(base + '/unknown-asset.js')).status, 404);
  console.log('Wrangler Pages: 9 static suffixes, 4 unbound backend paths and asset 404 passed.');

  mf = new Miniflare(convertV4MiniflareOptions({ workers: [{
    name: 'pages-proxy', modules: true, scriptPath: path.join(dist, '_worker.js', 'index.js'),
    compatibilityDate: '2026-10-30',
    serviceBindings: { API_BACKEND: async request => {
      if (new URL(request.url).pathname === '/api/signin/test') {
        return new Response(null, { status: 302, headers: {
          Location: 'https://oauth.example/authorize?redirect_uri=' + encodeURIComponent(new URL('/api/signin/callback', request.url)),
          'Set-Cookie': 'oauth_state=test; Path=/; HttpOnly; Secure; SameSite=Lax',
        } });
      }
      return Response.json({ url: request.url, method: request.method, cookie: request.headers.get('cookie'),
        origin: request.headers.get('origin'), body: await request.text() });
    } },
  }] }));
  const request = { method: 'POST', headers: { cookie: 'studio_session=example', origin: 'https://pages.example', 'content-type': 'application/json' }, body: '{"test":true}' };
  const forwarded = await mf.dispatchFetch('https://pages.example/api/account?keep=1', request);
  assert.deepEqual(await forwarded.json(), { url: 'https://pages.example/api/account?keep=1', method: 'POST',
    cookie: 'studio_session=example', origin: 'https://pages.example', body: '{"test":true}' });
  const oauth = await mf.dispatchFetch('https://pages.example/api/signin/test', { redirect: 'manual' });
  assert.equal(oauth.status, 302);
  assert.match(oauth.headers.get('location'), /https%3A%2F%2Fpages.example%2Fapi%2Fsignin%2Fcallback/);
  assert.match(oauth.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
  const verification = await mf.dispatchFetch('https://pages.example/MP_verify_Test123.txt');
  assert.equal((await verification.json()).url, 'https://pages.example/MP_verify_Test123.txt');
  console.log('Workerd service binding: original public URL, query, POST body, Origin, cookie, OAuth redirect/Set-Cookie and verification passed.');
} finally {
  if (mf) await mf.dispose();
  if (server && server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    await exited;
  }
  await fs.rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
