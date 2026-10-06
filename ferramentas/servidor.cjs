// Servidor de arquivos para desenvolvimento. A publicação usa somente arquivos estáticos.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let caminho;
  try { caminho = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const arquivo = path.resolve(raiz, '.' + (caminho === '/' ? '/index.html' : caminho));
  if (!arquivo.startsWith(raiz + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(arquivo, (erro, dados) => {
    if (erro) { res.writeHead(404).end('Arquivo não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(arquivo)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(dados);
  });
}).listen(4175, '127.0.0.1', () => console.log('CEP Fácil: http://127.0.0.1:4175'));
