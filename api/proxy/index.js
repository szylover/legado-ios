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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PROPFIND, MKCOL, COPY, MOVE, OPTIONS',
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

function forward(target, req, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) { reject(new Error('Too many redirects')); return; }
    const lib = target.protocol === 'https:' ? https : http;
    const skip = new Set(['host','connection','transfer-encoding','te','trailer','upgrade']);
    const fwdHeaders = {};
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (!skip.has(k.toLowerCase())) fwdHeaders[k] = v;
    }
    fwdHeaders['host'] = target.host;
    // Mimic a real browser so novel sites don't reject server-side requests
    if (!fwdHeaders['user-agent']) {
      fwdHeaders['user-agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    }
    if (!fwdHeaders['accept']) {
      fwdHeaders['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    }
    if (!fwdHeaders['accept-language']) {
      fwdHeaders['accept-language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
    }

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
      const status = proxyRes.statusCode;
      // Follow redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(status) && proxyRes.headers['location']) {
        const loc = proxyRes.headers['location'];
        let nextUrl;
        try {
          nextUrl = new URL(loc, target.href);
        } catch {
          reject(new Error(`Bad redirect location: ${loc}`)); return;
        }
        // Consume response body to free socket
        proxyRes.resume();
        // 303 and GET-redirects use GET with no body
        const redirectReq = (status === 303 || req.method === 'GET')
          ? { ...req, method: 'GET', rawBody: null }
          : req;
        forward(nextUrl, redirectReq, redirects + 1).then(resolve, reject);
        return;
      }
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
