/**
 * Debug script: simulate biquge365.net search
 * Run: node scripts/debug-search.mjs
 * (requires local cors proxy running at :3001)
 */
import * as cheerio from '../node_modules/cheerio/dist/esm/index.js';
import http from 'http';

const RULES = {
  bookList: '.search@li!0&&.gengxin@li&&.wanben@li',
  name:     '.name@a@text||.p2@a@text',
  author:   '.zuo@a@text||.zuo@text',
  bookUrl:  '.name@a@href',
};

function fetchViaProxy(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const proxyUrl = `http://localhost:3001/proxy?url=${encodeURIComponent(url)}`;
    const parsed = new URL(proxyUrl);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parseInt(parsed.port) || 80,
      path: parsed.pathname + parsed.search,
      method,
      headers: body ? {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      } : {},
    };
    const req = http.request(reqOpts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function parseLegadoSel(r) {
  let exclude = null;
  const excl = r.match(/!(\d+)$/);
  if (excl) { exclude = parseInt(excl[1]); r = r.slice(0, -excl[0].length); }
  let sel;
  if (r.startsWith('class.')) sel = '.' + r.slice(6).split('.')[0];
  else if (r.startsWith('tag.')) sel = r.slice(4).split('.')[0];
  else if (r.startsWith('id.')) sel = '#' + r.slice(3);
  else sel = r;
  return { sel, exclude };
}

function getElementsForRule(root, rule) {
  // Handle && (multiple source selectors, merge results)
  const orParts = rule.split('&&');
  const results = [];
  for (const orPart of orParts) {
    // Multi-level: .search@li!0 means find .search first, then li inside it
    const levels = orPart.split('@');
    let scope = root.find('body').length ? root.find('body') : root;
    let items = null;
    for (let i = 0; i < levels.length; i++) {
      const { sel, exclude } = parseLegadoSel(levels[i]);
      const found = scope.find(sel);
      let arr = [];
      found.each((idx, el) => { if (exclude === null || idx !== exclude) arr.push(el); });
      console.log(`    [${orPart}] level ${i} "${levels[i]}" (${sel}) → ${arr.length} elements`);
      if (arr.length === 0) { scope = null; break; }
      if (i < levels.length - 1) {
        // Use first match as new scope for next level
        scope = root._root ? root._root.find(arr[0]) : root.find(sel).first();
        // Actually we need to search within each found element
        // Collect all children from all matching elements
        const $ = root;
        const combined = arr.flatMap(el => {
          const { sel: nextSel, exclude: nextExcl } = parseLegadoSel(levels[i+1]);
          let children = [];
          root.find(el).find(nextSel).each((idx, child) => {
            if (nextExcl === null || idx !== nextExcl) children.push(child);
          });
          return children;
        });
        console.log(`    [${orPart}] after multi-level at ${i}: ${combined.length} elements`);
        items = combined;
        break;
      } else {
        items = arr;
      }
    }
    if (items) results.push(...items);
  }
  return results;
}

const keyword = '庆余年';
const postBody = `type=articlename&s=${encodeURIComponent(keyword)}&submit=`;

console.log('=== Fetching biquge365.net search ===');
const resp = await fetchViaProxy('https://www.biquge365.net/s.php', 'POST', postBody);
console.log('Status:', resp.status, '| HTML length:', resp.text.length);
console.log('HTML preview (first 600 chars):');
console.log(resp.text.slice(0, 600));
console.log('\n');

if (resp.text.length > 100 && resp.status === 200) {
  const $ = cheerio.load(resp.text);
  
  console.log('=== Testing bookList rule parts ===');
  const orParts = RULES.bookList.split('&&');
  for (const part of orParts) {
    const levels = part.split('@');
    console.log(`\nPart: "${part}" (${levels.length} levels)`);
    let scope = $.root();
    for (const level of levels) {
      const { sel, exclude } = parseLegadoSel(level);
      const found = scope.find(sel);
      let count = found.length;
      if (exclude !== null) count = found.filter((i) => i !== exclude).length;
      console.log(`  "${level}" → sel="${sel}" → ${found.length} total${exclude !== null ? `, excl[${exclude}] → ${count}` : ''}`);
      if (found.length > 0) {
        console.log(`  first match: ${$.html(found.first()).slice(0, 200)}`);
        scope = found.first(); // narrow scope for next level
      } else {
        console.log(`  *** NO MATCH - chain breaks here ***`);
        break;
      }
    }
  }
}
