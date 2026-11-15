import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const [command, ...args] = process.argv.slice(2);
if (!['dev', 'deploy'].includes(command)) throw new Error('Expected dev or deploy');
await fs.access(path.join(root, 'pages-dist', '_worker.js', 'index.js'));
// Isolate Pages from the backend Worker config and its DO bindings.
const cwd = await fs.mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'giveaway-pages-cli-'));
try {
  const child = spawn(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
    'pages', command, path.join(root, 'pages-dist'),
    ...(command === 'dev' ? ['--compatibility-date', '2026-10-30', '--compatibility-flags', 'nodejs_compat'] : []), ...args,
  ], { cwd, stdio: 'inherit' });
  const stop = () => child.kill();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    process.exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => resolve(code ?? 1));
    });
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
} finally {
  await fs.rm(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
