/**
 * A static file server for the tests that open built pages in a real browser
 * (test/bundlers, test/lab). It serves each folder of `mounts` (URL prefix →
 * folder; the longest prefix wins) with a folder's index.html, and first
 * offers every request to `handle`, which returns true when it answered it.
 * It listens on 127.0.0.1 at a free port and never serves above a mount:
 * `..` stops at the URL's root.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, posix } from 'node:path';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.heic': 'image/heic', '.svg': 'image/svg+xml',
};

/** Resolves to the listening server; `server.address().port` is its port. */
export function serveStatic(mounts, handle = () => false) {
  const prefixes = Object.keys(mounts).sort((a, b) => b.length - a.length);
  const server = createServer((request, response) => {
    let url;
    let path;
    try {
      url = new URL(request.url, 'http://x');
      path = posix.normalize(decodeURIComponent(url.pathname));
    } catch {
      return response.writeHead(400).end();
    }
    if (handle(request, response, url)) return;
    const prefix = prefixes.find((p) => path.startsWith(p));
    if (!prefix) return response.writeHead(404).end();
    let file = join(mounts[prefix], path.slice(prefix.length));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
