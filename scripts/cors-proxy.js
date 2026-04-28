#!/usr/bin/env node
/**
 * cors-proxy.js — 本地 CORS 代理服务器
 *
 * 供 Web 模式 (expo start --web) 使用，绕过浏览器 CORS 限制。
 * 所有来自浏览器的 fetch 请求通过 /proxy?url=<encoded> 转发到目标服务器。
 *
 * 用法:
 *   node scripts/cors-proxy.js          # 启动代理，默认端口 3001
 *   node scripts/cors-proxy.js --port 3002
 *
 * 与 expo start --web 配合使用:
 *   npm run proxy     # 终端1
 *   npm run web       # 终端2
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx >= 0 ? Number(args[portIdx + 1]) : 3001;

// 允许哪些来源（开发时放开，生产时应锁定）
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

const server = http.createServer((req, res) => {
  const origin = req.headers['origin'] || '*';

  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie, Authorization, *');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 只处理 /proxy?url=...
  let parsed;
  try {
    parsed = new URL(req.url, `http://localhost:${PORT}`);
  } catch {
    res.writeHead(400);
    res.end('Bad request URL');
    return;
  }

  if (parsed.pathname !== '/proxy') {
    res.writeHead(404);
    res.end('Not found — use /proxy?url=<encoded>');
    return;
  }

  const targetUrl = parsed.searchParams.get('url');
  if (!targetUrl) {
    res.writeHead(400);
    res.end('Missing ?url= parameter');
    return;
  }

  let target;
  try {
    target = new URL(targetUrl);
  } catch {
    res.writeHead(400);
    res.end(`Invalid target URL: ${targetUrl}`);
    return;
  }

  // 过滤出转发给目标服务器的 headers（去掉浏览器特有的）
  const skipHeaders = new Set([
    'host', 'origin', 'referer', 'connection', 'content-length',
    'transfer-encoding', 'te', 'trailer', 'upgrade',
  ]);
  const forwardHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!skipHeaders.has(k.toLowerCase())) forwardHeaders[k] = v;
  }
  forwardHeaders['host'] = target.host;

  const lib = target.protocol === 'https:' ? https : http;

  const body = [];
  req.on('data', (chunk) => body.push(chunk));
  req.on('end', () => {
    const bodyBuf = Buffer.concat(body);
    const opts = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers: { ...forwardHeaders, ...(bodyBuf.length ? { 'content-length': bodyBuf.length } : {}) },
      rejectUnauthorized: false, // 允许自签名证书（部分书源）
    };

    const proxyReq = lib.request(opts, (proxyRes) => {
      // 透传响应 headers，但覆盖 CORS headers
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders['access-control-allow-origin'];
      delete responseHeaders['access-control-allow-headers'];
      responseHeaders['access-control-allow-origin'] = ALLOWED_ORIGINS.includes(origin) ? origin : '*';

      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
      console.error(`[proxy] Error fetching ${targetUrl}: ${e.message}`);
      if (!res.headersSent) res.writeHead(502);
      res.end(`Proxy error: ${e.message}`);
    });

    if (bodyBuf.length) proxyReq.write(bodyBuf);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`\n🔀 CORS Proxy running at http://localhost:${PORT}/proxy`);
  console.log('   Usage: /proxy?url=<encoded-target-url>');
  console.log('   Press Ctrl+C to stop.\n');
});
