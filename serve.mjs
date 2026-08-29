// serve.mjs — tiny static server so the page can load its data (browsers block fetch() from file://).
//   node serve.mjs        then open http://localhost:8000
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const PORT = Number(process.env.PORT || 8000);
createServer(async (req, res) => {
  res.on('finish', () => { if (res.statusCode >= 400) console.log(`${res.statusCode} ${req.url}`); });
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) throw Object.assign(new Error('forbidden'), { code: 'EACCES' });
    let s = await stat(file).catch(() => null);
    if (s?.isDirectory()) { file = path.join(file, 'index.html'); s = await stat(file).catch(() => null); }
    if (!s) {
      if (path.extname(p)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end(`Not found: ${p}`); }
      file = path.join(ROOT, 'index.html'); // SPA fallback for app routes (Part 3)
    }
    let body = await readFile(file);
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Cache-Control': 'no-store' };
    // Real hosts gzip JSON automatically; do the same here so local timing is honest.
    if (/^(text|application\/json)/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); headers['Content-Encoding'] = 'gzip'; }
    res.writeHead(200, headers);
    res.end(body);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end(String(e.message));
  }
}).listen(PORT, () => console.log(`FoodCheck: open http://localhost:${PORT}  (Ctrl+C to stop)`));
