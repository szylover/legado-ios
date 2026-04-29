/**
 * WebDavClient — WebDAV 操作封装
 * 所有请求经过 /api/proxy 转发以绕过 CORS
 */

export interface WebDavConfig {
  url: string;      // e.g. https://dav.example.com/legado/
  username: string;
  password: string;
}

function proxyUrl(target: string) {
  return `/api/proxy?url=${encodeURIComponent(target)}`;
}

function authHeader(username: string, password: string): string {
  return 'Basic ' + btoa(`${username}:${password}`);
}

/** Ensure the remote directory exists (MKCOL if 404) */
export async function ensureDir(cfg: WebDavConfig): Promise<void> {
  const dirUrl = cfg.url.endsWith('/') ? cfg.url : cfg.url + '/';
  const res = await fetch(proxyUrl(dirUrl), {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader(cfg.username, cfg.password),
      Depth: '0',
    },
  });
  if (res.status === 404) {
    await fetch(proxyUrl(dirUrl), {
      method: 'MKCOL',
      headers: { Authorization: authHeader(cfg.username, cfg.password) },
    });
  }
}

/** Upload text content to a file on WebDAV */
export async function putFile(cfg: WebDavConfig, filename: string, content: string): Promise<void> {
  const dirUrl = cfg.url.endsWith('/') ? cfg.url : cfg.url + '/';
  const fileUrl = dirUrl + filename;
  const res = await fetch(proxyUrl(fileUrl), {
    method: 'PUT',
    headers: {
      Authorization: authHeader(cfg.username, cfg.password),
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: content,
  });
  if (!res.ok) throw new Error(`PUT failed: ${res.status} ${res.statusText}`);
}

/** Download text content from a file on WebDAV */
export async function getFile(cfg: WebDavConfig, filename: string): Promise<string> {
  const dirUrl = cfg.url.endsWith('/') ? cfg.url : cfg.url + '/';
  const fileUrl = dirUrl + filename;
  const res = await fetch(proxyUrl(fileUrl), {
    method: 'GET',
    headers: { Authorization: authHeader(cfg.username, cfg.password) },
  });
  if (!res.ok) throw new Error(`GET failed: ${res.status} ${res.statusText}`);
  return res.text();
}
