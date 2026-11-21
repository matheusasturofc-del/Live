// Servidor do jogo: entrega a página, guarda votos/doações/progresso e lê o chat do YouTube.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { paises, porCodigo, detectarPais, ehSpam67 } = require('./paises');
const { iniciarChat } = require('./chat');

const PORTA = Number(process.env.PORT || 3000);
const RAIZ = path.join(__dirname, '..');
const PUBLICO = path.join(RAIZ, 'public');
const BANDEIRAS = path.join(RAIZ, 'node_modules', 'flag-icons', 'flags', '1x1');
const FONTES = path.join(RAIZ, 'node_modules', '@fontsource', 'luckiest-guy', 'files');
const DADOS = process.env.DADOS_DIR || path.join(RAIZ, 'dados');
fs.mkdirSync(DADOS, { recursive: true });

const log = (m) => console.log(`[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] ${m}`);
const lerJson = (f, padrao) => { try { return JSON.parse(fs.readFileSync(path.join(DADOS, f), 'utf8')); } catch (_) { return padrao; } };
const salvarJson = (f, d) => { const p = path.join(DADOS, f); fs.writeFileSync(p + '.tmp', JSON.stringify(d)); fs.renameSync(p + '.tmp', p); };

// ---------------- Votos ----------------
const votos = new Map(); // code -> Set(usuarios)
const feed = []; // últimos votos
let bloqueados67 = 0;

function registrarComentario({ usuario, texto }) {
  if (ehSpam67(texto)) { bloqueados67++; return; }
  const code = detectarPais(texto);
  if (!code) return;
  if (!votos.has(code)) votos.set(code, new Set());
  votos.get(code).add(usuario); // 1 voto por pessoa por país (spam não conta)
  feed.unshift({ usuario: usuario.slice(0, 18), code, n: votos.get(code).size });
  feed.length = Math.min(feed.length, 6);
}

function ranking() {
  return [...votos.entries()].map(([code, s]) => ({ code, votos: s.size }))
    .sort((a, b) => b.votos - a.votos);
}

// ---------------- Doações ----------------
// Conversão aproximada para dólar, só para ordenar o ranking
const PARA_USD = { '$': 1, 'US$': 1, 'R$': 0.18, '€': 1.08, '£': 1.27, '₹': 0.012, '¥': 0.0067, 'CA$': 0.73,
  'A$': 0.66, 'MX$': 0.055, '₩': 0.00073, 'TRY': 0.029, '₺': 0.029, 'PKR': 0.0036, 'IDR': 0.000063,
  'PHP': 0.017, '₱': 0.017, 'ARS': 0.001, 'COP': 0.00025, 'CLP': 0.0011, 'PEN': 0.27, 'SAR': 0.27,
  'AED': 0.27, 'EGP': 0.02, 'RUB': 0.011, 'PLN': 0.25, 'NT$': 0.031, 'HK$': 0.13, 'CHF': 1.13 };

function emDolar(valor) {
  const m = String(valor).match(/^\s*([^\d\s.,]*)\s*([\d.,]+)\s*([^\d\s.,]*)/);
  if (!m) return 0;
  const moeda = (m[1] || m[3] || '$').trim();
  let num = m[2];
  // "1.234,56" ou "1,234.56" ou "10,00"
  if (/,\d{2}$/.test(num)) num = num.replace(/\./g, '').replace(',', '.'); else num = num.replace(/,/g, '');
  const taxa = PARA_USD[moeda] ?? PARA_USD[moeda.toUpperCase()] ?? 0.5;
  return (parseFloat(num) || 0) * taxa;
}

const doadores = lerJson('doadores.json', {}); // nome -> total em USD
const doacoes = []; // fila recente {id, usuario, valor}
let idDoacao = 0;

function registrarDoacao({ usuario, valor, texto, teste = false }) {
  const usd = valor === 'MEMBER' ? 2 : emDolar(valor);
  if (!teste) { doadores[usuario] = (doadores[usuario] || 0) + usd; salvarJson('doadores.json', doadores); }
  doacoes.push({ id: ++idDoacao, usuario: usuario.slice(0, 22), valor: valor === 'MEMBER' ? 'NEW MEMBER' : valor,
    texto: (texto || '').slice(0, 60) });
  if (doacoes.length > 20) doacoes.shift();
  log(`Doação: ${usuario} ${valor}`);
}

function topDoadores() {
  return Object.entries(doadores).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([usuario, usd]) => ({ usuario: usuario.slice(0, 16), usd: Math.round(usd * 100) / 100 }));
}

// ---------------- HTTP ----------------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };

function arquivo(res, base, rel) {
  const p = path.normalize(path.join(base, rel));
  if (!p.startsWith(base)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'max-age=3600' });
    res.end(data);
  });
}

const json = (res, d) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(d)); };
const corpo = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (_) { ok({}); } }); });

// Só o próprio servidor (o navegador da live) pode mudar o jogo; o resto do mundo só vê.
const ehLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const SENHA = process.env.ADMIN_SENHA || '';
const PASTA_MUSICA = path.join(PUBLICO, 'audio', 'custom');
let versaoMusica = Date.now();
const statusChat = { texto: 'iniciando' };

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const r = url.pathname;
  const mudaJogo = req.method === 'POST' && ['/api/estado', '/api/proxima', '/api/comentar'].includes(r);
  if (mudaJogo && !ehLocal(req)) { res.writeHead(403).end('forbidden'); return; }

  // ----- página de administração (pelo celular) -----
  if (r.startsWith('/api/admin/')) {
    if (!SENHA || req.headers['x-senha'] !== SENHA) { res.writeHead(401).end('senha errada'); return; }
    if (r === '/api/admin/status') {
      return json(res, { chat: statusChat.texto, votosAbertos: ranking().length, bloqueados67, doadores: topDoadores(),
        estado: lerJson('estado.json', null), musicas: ['fundo.mp3', 'doacao.mp3'].filter((f) => fs.existsSync(path.join(PASTA_MUSICA, f))) });
    }
    if (r === '/api/admin/musica' && req.method === 'PUT') {
      const tipo = url.searchParams.get('tipo');
      if (!['fundo', 'doacao'].includes(tipo)) { res.writeHead(400).end(); return; }
      const destino = path.join(PASTA_MUSICA, tipo + '.mp3');
      const partes = []; let tam = 0;
      req.on('data', (c) => { tam += c.length; if (tam > 30e6) req.destroy(); else partes.push(c); });
      req.on('end', () => { fs.writeFileSync(destino, Buffer.concat(partes)); versaoMusica = Date.now(); log(`Música enviada: ${tipo}`); json(res, { ok: true }); });
      return;
    }
    if (r === '/api/admin/musica' && req.method === 'DELETE') {
      const tipo = url.searchParams.get('tipo');
      if (['fundo', 'doacao'].includes(tipo)) fs.rmSync(path.join(PASTA_MUSICA, tipo + '.mp3'), { force: true });
      versaoMusica = Date.now(); return json(res, { ok: true });
    }
    if (r === '/api/admin/doacao-teste' && req.method === 'POST') {
      registrarDoacao({ usuario: 'Test Donator', valor: '$5.00', texto: 'test', teste: true }); return json(res, { ok: true });
    }
    res.writeHead(404).end(); return;
  }
  if (r === '/admin') return arquivo(res, PUBLICO, 'admin.html');
  if (r === '/api/paises') return json(res, paises);
  if (r === '/api/estado' && req.method === 'GET') return json(res, lerJson('estado.json', null));
  if (r === '/api/estado' && req.method === 'POST') { salvarJson('estado.json', await corpo(req)); return json(res, { ok: true }); }
  if (r === '/api/votos') {
    const desde = Number(url.searchParams.get('desde') || 0);
    return json(res, { ranking: ranking().slice(0, 8), feed, bloqueados67, versaoMusica,
      doacoes: doacoes.filter((d) => d.id > desde), topDoadores: topDoadores() });
  }
  if (r === '/api/proxima' && req.method === 'POST') {
    // Pega os 5 mais votados e zera os votos deles (os outros continuam acumulando)
    const { quantos = 5 } = await corpo(req);
    const top = ranking().slice(0, quantos);
    for (const t of top) votos.delete(t.code);
    return json(res, top);
  }
  if (r === '/api/comentar' && req.method === 'POST') { // para testes manuais
    const b = await corpo(req);
    if (b.valor) registrarDoacao({ usuario: b.usuario || 'test', valor: b.valor, texto: b.texto });
    else registrarComentario({ usuario: b.usuario || 'test', texto: b.texto || '' });
    return json(res, { ok: true, pais: detectarPais(b.texto || '') });
  }
  if (r.startsWith('/flags/')) return arquivo(res, BANDEIRAS, r.slice(7));
  if (r === '/fonte.woff2') return arquivo(res, FONTES, 'luckiest-guy-latin-400-normal.woff2');
  if (r === '/') return arquivo(res, PUBLICO, 'index.html');
  return arquivo(res, PUBLICO, r);
});

// Baixa músicas personalizadas de um link (opcional), se ainda não existirem
async function baixarMusicas() {
  const pasta = path.join(PUBLICO, 'audio', 'custom');
  for (const [nomeArq, url] of [['fundo.mp3', process.env.MUSICA_FUNDO_URL], ['doacao.mp3', process.env.MUSICA_DOACAO_URL]]) {
    const destino = path.join(pasta, nomeArq);
    if (!url || fs.existsSync(destino)) continue;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
      log(`Música baixada: ${nomeArq}`);
    } catch (e) { log(`Não consegui baixar ${nomeArq}: ${e.message}`); }
  }
}

servidor.listen(PORTA, async () => {
  log(`Jogo em http://localhost:${PORTA}`);
  await baixarMusicas();
  iniciarChat({
    fonte: process.env.CHAT || 'youtube',
    canalId: process.env.YT_CHANNEL_ID,
    videoId: process.env.YT_VIDEO_ID,
    aoComentar: registrarComentario,
    aoDoar: registrarDoacao,
    log: (m) => { statusChat.texto = m; log(m); },
  });
});

module.exports = { porCodigo };
