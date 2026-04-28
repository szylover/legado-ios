#!/usr/bin/env node
/**
 * publish-local.js
 *
 * Builds an Expo static bundle (iOS platform) and writes it to:
 *   publish/v{version}-{gitHash}/
 *
 * Also writes:
 *   publish/manifest.json  — history of all local builds
 *   publish/latest/        — symlink (or copy on Windows) of newest build
 *
 * Usage:
 *   node scripts/publish-local.js           # build + output
 *   node scripts/publish-local.js --serve   # build + start HTTP server on :3000
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const PUBLISH_DIR = path.join(ROOT, 'publish');

// ── helpers ─────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
}

function gitShortHash() {
  try { return run('git rev-parse --short HEAD'); } catch { return 'unknown'; }
}

function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.version || '0.0.0';
}

function getManifest() {
  const p = path.join(PUBLISH_DIR, 'manifest.json');
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return { builds: [] };
}

function saveManifest(m) {
  fs.writeFileSync(path.join(PUBLISH_DIR, 'manifest.json'), JSON.stringify(m, null, 2));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function serveDir(dir, port) {
  const server = http.createServer((req, res) => {
    let filePath = path.join(dir, req.url === '/' ? '/index.html' : req.url);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html', '.js': 'application/javascript',
      '.json': 'application/json', '.png': 'image/png',
      '.jpg': 'image/jpeg', '.css': 'text/css',
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });
  server.listen(port, () => {
    console.log(`\n🌐 Serving at http://localhost:${port}\n`);
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

const shouldServe = process.argv.includes('--serve');
const port = 3000;

const version = getVersion();
const hash = gitShortHash();
const buildId = `v${version}-${hash}`;
const buildDir = path.join(PUBLISH_DIR, buildId);
const distDir = path.join(ROOT, 'dist');
const timestamp = new Date().toISOString();

console.log(`\n📦 Building legado-ios ${buildId} …\n`);

// 1. expo export (creates dist/)
try {
  spawnSync(
    'npx', ['expo', 'export', '--platform', 'ios', '--output-dir', distDir],
    { cwd: ROOT, stdio: 'inherit' }
  );
} catch (e) {
  console.error('❌ expo export failed:', e.message);
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ not created — expo export may have failed');
  process.exit(1);
}

// 2. Copy dist/ → publish/vX.Y.Z-hash/
fs.mkdirSync(buildDir, { recursive: true });
copyDir(distDir, buildDir);

// 3. Write a build-info.json inside the build folder
const buildInfo = { buildId, version, hash, timestamp, platform: 'ios' };
fs.writeFileSync(path.join(buildDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));

// 4. Update latest/ (Windows-safe copy)
const latestDir = path.join(PUBLISH_DIR, 'latest');
if (fs.existsSync(latestDir)) fs.rmSync(latestDir, { recursive: true, force: true });
copyDir(buildDir, latestDir);

// 5. Update manifest.json
const manifest = getManifest();
manifest.latest = buildId;
manifest.builds.unshift(buildInfo);
manifest.builds = manifest.builds.slice(0, 20); // keep last 20
saveManifest(manifest);

// 6. Clean up dist/
fs.rmSync(distDir, { recursive: true, force: true });

console.log(`\n✅ Published: publish/${buildId}/`);
console.log(`   Latest:    publish/latest/`);
console.log(`   Manifest:  publish/manifest.json\n`);
console.log(`Build info:`);
console.log(`  Version:   ${version}`);
console.log(`  Git hash:  ${hash}`);
console.log(`  Time:      ${timestamp}\n`);

if (shouldServe) {
  serveDir(path.join(PUBLISH_DIR, 'latest'), port);
  console.log('Press Ctrl+C to stop.\n');
}
