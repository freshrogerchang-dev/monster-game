import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };

createServer((request, response) => {
  const requested = decodeURIComponent(request.url.split('?')[0]);
  const relative = normalize(requested === '/' ? 'index.html' : requested.replace(/^\/+/, ''));
  const path = join(root, relative);
  if (!path.startsWith(root)) { response.writeHead(403).end('Forbidden'); return; }
  try {
    if (!statSync(path).isFile()) throw new Error('not a file');
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    createReadStream(path).pipe(response);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(4188, '127.0.0.1', () => console.log('Monster Game: http://127.0.0.1:4188'));
