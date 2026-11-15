export async function onRequest({ request, env, next }) {
  const pathname = new URL(request.url).pathname;
  if (pathname !== '/api' && !pathname.startsWith('/api/') && !/^\/MP_verify_[A-Za-z0-9]+\.txt$/.test(pathname)) {
    return next();
  }
  if (!env.API_BACKEND || typeof env.API_BACKEND.fetch !== 'function') {
    return Response.json({
      error: 'Pages API 服务尚未连接。请配置 API_BACKEND Service Binding 指向已部署的后端 Worker，并重新部署 Pages。',
      code: 'API_BACKEND_NOT_CONFIGURED',
    }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  // Preserve the public URL, method, body, Origin, cookies, redirects and streams.
  // In particular, never rewrite to workers.dev: OAuth and CSRF use this URL.
  return env.API_BACKEND.fetch(request);
}
