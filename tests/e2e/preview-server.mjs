import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(fileURLToPath(import.meta.url), '../../..');
const PORT = 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const API_MOCKS = {
  '/api/security/apply-fix': (req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { violation, fix } = JSON.parse(body || '{}');
      if (!violation || !violation.file || !violation.line) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'apply_fix_requires_violation_file_and_line' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true, file: violation.file, line: violation.line,
        before: 'original line content',
        after: fix?.after || fix?.suggestion || '',
        diff_preview: {
          before: 'original\nline\ncontent',
          after: 'fixed\nline\ncontent',
        },
        backup_created: `/tmp/${violation.file}.bak-s135-1234567890`,
      }));
    });
  },
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const mock = API_MOCKS[url.pathname];
  if (mock) return mock(req, res);

  const relPath = url.pathname === '/' ? 'vision-core-next.html' : url.pathname.replace(/^\//, '');
  let filePath = path.join(DIR, 'frontend', relPath);
  const ext = path.extname(filePath);
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Preview server on http://localhost:${PORT}`));
