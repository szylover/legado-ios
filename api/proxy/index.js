/**
 * Azure Function: /api/proxy
 * 服务端转发书源请求，绕过浏览器 CORS 限制
 *
 * GET/POST /api/proxy?url=<encoded-target-url>
 */

const https = require('https');
const http  = require('http');
const { URL } = require('url');

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: corsHeaders(),
      body: '',
    };
    return;
  }

  const targetUrl = req.query && req.query.url;
  if (!targetUrl) {
    context.res = { status: 400, headers: corsHeaders(), body: 'Missing ?url= parameter' };
    return;
  }

  let target;
  try {
    target = new URL(decodeURIComponent(targetUrl));
  } catch {
    context.res = { status: 400, headers: corsHeaders(), body: 'Invalid target URL' };
    return;
  }

  try {
    const result = await forward(target, req);
    context.res = {
      status: result.statusCode,
      headers: { ...stripCorsHeaders(result.headers), ...corsHeaders() },
      body: result.body,
      isRaw: true,
    };
  } catch (e) {
    context.res = {
      status: 502,
      headers: corsHeaders(),
      body: `Proxy error: ${e.message}`,
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

function stripCorsHeaders(headers) {
  const out = { ...headers };
  delete out['access-control-allow-origin'];
  delete out['access-control-allow-headers'];
  delete out['access-control-allow-methods'];
  return out;
}

function forward(target, req) {
  return new Promise((resolve, reject) => {
    const lib = target.protocol === 'https:' ? https : http;
    const skip = new Set(['host','connection','transfer-encoding','te','trailer','upgrade']);
    const fwdHeaders = {};
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (!skip.has(k.toLowerCase())) fwdHeaders[k] = v;
    }
    fwdHeaders['host'] = target.host;

    const body = req.rawBody ? Buffer.from(req.rawBody) : Buffer.alloc(0);
    const opts = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers: { ...fwdHeaders, ...(body.length ? { 'content-length': body.length } : {}) },
      rejectUnauthorized: false,
    };

    const proxyReq = lib.request(opts, (proxyRes) => {
      const chunks = [];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => resolve({
        statusCode: proxyRes.statusCode,
        headers: proxyRes.headers,
        body: Buffer.concat(chunks),
      }));
    });
    proxyReq.on('error', reject);
    if (body.length) proxyReq.write(body);
    proxyReq.end();
  });
}
