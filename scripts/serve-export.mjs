#!/usr/bin/env node
/**
 * Local preview of the statically exported site in `out/`.
 *
 * `next dev` is great for iterating, but the deployed artifact is the static
 * export — this serves exactly those files with the same routing rules
 * Cloudflare Pages applies, so what you click is what ships:
 *
 *   /track                    → out/track.html
 *   /p/royal-oud...           → out/p/royal-oud....html
 *   /                         → out/index.html
 *
 * Usage:  npm run build && npm run preview        (PORT=4000 npm run preview)
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'out');
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function resolveFile(pathname) {
  // Never escape the export directory.
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = [clean, `${clean}.html`, join(clean, 'index.html')];

  for (const candidate of candidates) {
    const target = join(ROOT, candidate);
    if (!target.startsWith(ROOT)) continue;

    try {
      const info = await stat(target);
      if (info.isFile()) return { target, info };
    } catch {
      // try the next candidate
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const direct = await resolveFile(pathname);
  const found = direct ?? (await resolveFile('/404.html'));

  if (!found) {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
    return;
  }

  const extension = extname(found.target).toLowerCase();
  const immutable = pathname.startsWith('/_next/static/');

  response.writeHead(direct ? 200 : 404, {
    'content-type': MIME_TYPES[extension] ?? 'application/octet-stream',
    'content-length': found.info.size,
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(found.target).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`NeoSales static export (out/) → http://${HOST}:${PORT}`);
});
