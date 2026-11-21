// Country Battle Royale: desenho da tela, fases do jogo, votos, doações e mensagens do bot.
(async function () {
  const tela = document.getElementById('tela');
  const g = tela.getContext('2d');
  const W = 720, H = 1280;
  const ARENA = { cx: 360, cy: 575, R: 285 };
  const CORES = ['#ff2bd6', '#ff3b3b', '#1fe4ff', '#ffd400', '#2bff7a'];
  const FONTE = "'Jogo', 'Arial Black', sans-serif";
  const BOT_INTERVALO = 5 * 60 * 1000; // mensagem do bot a cada 5 min (intercalando)
  const BOT_MSGS = [
    { texto: "DON'T SPAM 67!", voz: 'voz-67' },
    { texto: 'COMMENT WHAT NEXT COUNTRY!', voz: 'voz-country' },
  ];

  // ---------- dados ----------
  const listaPaises = await fetch('/api/paises').then((r) => r.json());
  const PAIS = Object.fromEntries(listaPaises.map((p) => [p.code, p]));
  const todosCodigos = listaPaises.map((p) => p.code);
  const nome = (c) => (PAIS[c] ? PAIS[c].nome : c).toUpperCase();

  let estado = await fetch('/api/estado').then((r) => r.json()).catch(() => null);
  if (!estado || estado.versao !== 1) estado = Torneio.novoEstado();
  const salvar = () => fetch('/api/estado', { method: 'POST', body: JSON.stringify(estado) }).catch(() => {});

  let votos = { ranking: [], feed: [], topDoadores: [], bloqueados67: 0 };
  let ultimaDoacao = 0, versaoMusica = null, precisaRecarregar = false;
  const filaDoacoes = [];
  async function atualizarVotos() {
    try {
      const d = await fetch('/api/votos?desde=' + ultimaDoacao).then((r) => r.json());
      votos = d;
      // música trocada pela página de admin: recarrega a página para tocar a nova
      if (versaoMusica && d.versaoMusica !== versaoMusica) precisaRecarregar = true;
      versaoMusica = d.versaoMusica;
      for (const x of d.doacoes) { filaDoacoes.push(x); ultimaDoacao = Math.max(ultimaDoacao, x.id); }
    } catch (_) { /* servidor reiniciando */ }
  }
  setInterval(atualizarVotos, 1000); atualizarVotos();

  // ---------- bandeiras (pré-renderizadas em círculo) ----------
  const bandeiras = {};
  function bandeira(code) {
    if (code in bandeiras) return bandeiras[code];
    bandeiras[code] = null;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const x = c.getContext('2d'); x.beginPath(); x.arc(80, 80, 80, 0, Math.PI * 2); x.clip();
      x.drawImage(img, 0, 0, 160, 160); bandeiras[code] = c;
    };
    img.src = '/flags/' + code.toLowerCase() + '.svg';
    return null;
  }
  listaPaises.forEach((p) => bandeira(p.code));

  function desenharBandeira(code, x, y, r, aro = '#fff', larg = 3) {
    const b = bandeira(code);
    g.save();
    if (b) g.drawImage(b, x - r, y - r, r * 2, r * 2);
    else { g.fillStyle = '#444'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    if (aro) { g.strokeStyle = aro; g.lineWidth = larg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }

  function texto(t, x, y, { tam = 24, cor = '#fff', alin = 'center', base = 'middle', contorno = 4, max } = {}) {
    g.font = `${tam}px ${FONTE}`; g.textAlign = alin; g.textBaseline = base;
    if (contorno) { g.lineWidth = contorno; g.strokeStyle = '#000'; g.lineJoin = 'round'; g.strokeText(t, x, y, max); }
    g.fillStyle = cor; g.fillText(t, x, y, max);
  }

  function caixa(x, y, w, h, r, cor) {
    g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = cor; g.fill();
  }

  // ---------- partículas ----------
  const particulas = [];
  function faiscas(x, y, cor, n = 10, vel = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = vel * (0.3 + Math.random());
      particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0, max: 0.4 + Math.random() * 0.4, cor, tam: 2 + Math.random() * 3 });
    }
  }
  function confete(n = 120) {
    for (let i = 0; i < n; i++) {
      particulas.push({ x: Math.random() * W, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 120, vy: 150 + Math.random() * 250,
        vida: 0, max: 4 + Math.random() * 2, cor: CORES[i % CORES.length], tam: 5 + Math.random() * 6, confete: true, giro: Math.random() * 6 });
    }
  }
  const textosFlutuantes = [];
  function flutuar(t, x, y, cor) { textosFlutuantes.push({ t, x, y, cor, vida: 0 }); }

  // ---------- fases ----------
  let fase = 'intro', tFase = 0, info = null, participantes = [], votosIntro = {}, batalha = null, vencedor = null;
  let festas = [], festaAtual = null, avisouMorteSubita = false, ultimoBip = -1;

  async function prepararBatalha() {
    if (precisaRecarregar) { location.reload(); return; }
    info = Torneio.batalhaAtual(estado);
    votosIntro = {};
    if (info.porVotos) {
      const top = await fetch('/api/proxima', { method: 'POST', body: '{"quantos":5}' }).then((r) => r.json()).catch(() => []);
      top.forEach((t) => { votosIntro[t.code] = t.votos; });
      participantes = Torneio.completarComPadrao(estado, top.map((t) => t.code), todosCodigos);
    } else {
      participantes = info.participantes.slice();
    }
    batalha = null; vencedor = null; avisouMorteSubita = false; ultimoBip = -1;
    fase = 'intro'; tFase = 0;
  }

  function comecarLuta() {
    batalha = new Batalha(participantes.map((code, i) => ({ code, cor: CORES[i % CORES.length] })), ARENA);
    fase = 'luta'; tFase = 0;
  }

  function terminarLuta() {
    vencedor = batalha.vencedor.code;
    festas = Torneio.registrarVencedor(estado, vencedor);
    salvar();
    Sons.vitoria(); confete(60);
    fase = 'vitoria'; tFase = 0;
  }

  // ---------- mensagens do bot ----------
  let botIdx = 0, botAte = 0, botTexto = '';
  const inicioBot = Date.now();
  function verificarBot(agora) {
    const n = Math.floor((agora - inicioBot) / BOT_INTERVALO);
    if (n >= 1 && n !== botIdx) {
      botIdx = n;
      const m = BOT_MSGS[(n - 1) % BOT_MSGS.length];
      botTexto = m.texto; botAte = agora + 9000; Sons.voz(m.voz);
    }
  }

  // ---------- doações ----------
  let doacaoAtual = null, doacaoT = 0;
  const DURACAO_DOACAO = 10;
  function verificarDoacao(dt) {
    if (doacaoAtual) { doacaoT += dt; if (doacaoT > DURACAO_DOACAO) doacaoAtual = null; return; }
    if (filaDoacoes.length) {
      doacaoAtual = filaDoacoes.shift(); doacaoT = 0;
      Sons.moeda(); confete(80);
      // voz do bot agradecendo e depois o som de doação (se houver)
      Sons.voz('voz-donation');
      setTimeout(() => Sons.somDoacao(), 1600);
    }
  }

  // ---------- atualização ----------
  function atualizar(dt) {
    tFase += dt;
    if (fase === 'intro') {
      const falta = Math.ceil(7 - tFase);
      if (falta <= 3 && falta !== ultimoBip && falta > 0) { ultimoBip = falta; Sons.bip(false); }
      if (tFase >= 7) { Sons.bip(true); comecarLuta(); }
    } else if (fase === 'luta') {
      const sub = 4, h = dt / sub;
      for (let k = 0; k < sub && !batalha.fim; k++) batalha.passo(h);
      for (const e of batalha.tirarEventos()) {
        if (e.tipo === 'corte') { faiscas(e.x, e.y, e.dono.cor, 6, 160); Sons.corte(e.dono.i); }
        else if (e.tipo === 'quique' && e.ganhou) Sons.quique(e.bola.i);
        else if (e.tipo === 'batida') Sons.batida();
        else if (e.tipo === 'eliminado') {
          faiscas(e.x, e.y, e.bola.cor, 40, 380); faiscas(e.x, e.y, '#fff', 20, 250);
          flutuar(nome(e.bola.code) + ' OUT!', e.x, e.y, e.bola.cor); Sons.eliminado();
        }
      }
      if (batalha.emMorteSubita && !avisouMorteSubita && !batalha.fim) { avisouMorteSubita = true; Sons.morteSubita(); }
      if (batalha.fim) terminarLuta();
    } else if (fase === 'vitoria') {
      if (tFase >= 5) {
        if (festas.length) { festaAtual = festas.shift(); fase = 'festa'; tFase = 0; Sons.campeao(festaAtual.tipo === 'grande'); confete(festaAtual.tipo === 'grande' ? 300 : 150); }
        else prepararBatalha();
      }
    } else if (fase === 'festa') {
      const dur = festaAtual.tipo === 'grande' ? 15 : 8;
      if (festaAtual.tipo === 'grande' && Math.floor(tFase) % 3 === 0 && Math.floor(tFase) !== Math.floor(tFase - dt)) confete(80);
      if (tFase >= dur) {
        if (festas.length) { festaAtual = festas.shift(); tFase = 0; Sons.campeao(festaAtual.tipo === 'grande'); confete(150); }
        else { festaAtual = null; prepararBatalha(); }
      }
    }
    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i]; p.vida += dt;
      if (p.vida > p.max) { particulas.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.confete) { p.vx *= 0.94; p.vy *= 0.94; } else p.giro += dt * 6;
    }
    for (let i = textosFlutuantes.length - 1; i >= 0; i--) {
      const t = textosFlutuantes[i]; t.vida += dt; t.y -= 40 * dt;
      if (t.vida > 1.6) textosFlutuantes.splice(i, 1);
    }
    verificarDoacao(dt);
  }

  // ---------- desenho ----------
  function desenharTopo() {
    // Campeões passados
    caixa(10, 8, W - 20, 58, 14, 'rgba(255,215,0,0.12)');
    texto('🏆 PAST CHAMPIONS', 24, 37, { tam: 20, cor: '#ffd700', alin: 'left', contorno: 3 });
    const passados = estado.passados || [];
    if (!passados.length) texto('NO CHAMPION YET - BE THE FIRST!', 250, 37, { tam: 17, cor: '#aaa', alin: 'left', contorno: 2 });
    passados.slice(0, 11).forEach((p, i) => {
      desenharBandeira(p.code, 260 + i * 41, 37, 17, '#ffd700', 2);
    });

    // Campeões das copas deste ciclo (vão para a grande final)
    texto('CUP CHAMPIONS', 24, 92, { tam: 17, cor: '#fff', alin: 'left', contorno: 3 });
    for (let i = 0; i < Torneio.COPAS; i++) {
      const c = estado.campCopas[i], x = 205 + i * 46;
      if (c) desenharBandeira(c, x, 92, 18, '#ffd700', 2);
      else { g.strokeStyle = '#555'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(x, 92, 18, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); texto(String(i + 1), x, 93, { tam: 14, cor: '#666', contorno: 0 }); }
    }
    texto('BRACKET A', 470, 82, { tam: 13, cor: '#bbb', alin: 'left', contorno: 2 });
    if (estado.campChaves[0]) desenharBandeira(estado.campChaves[0], 492, 104, 12, '#fff', 2);
    else texto('?', 492, 105, { tam: 16, cor: '#666', contorno: 0 });
    texto('CYCLE ' + estado.ciclo, W - 24, 92, { tam: 17, cor: '#888', alin: 'right', contorno: 2 });

    // Título da batalha + placar
    if (!info) return;
    const grande = info.fase === 'grande';
    texto(info.titulo, 24, 148, { tam: grande ? 40 : 34, cor: grande ? '#ffd700' : '#ff3b3b', alin: 'left', contorno: 5, max: 330 });
    texto(info.sub, 24, 184, { tam: 16, cor: '#ddd', alin: 'left', contorno: 3, max: 330 });
    let status = 'GET READY!';
    if (fase === 'luta') {
      const t = batalha.t;
      status = batalha.emMorteSubita ? 'SUDDEN DEATH!' : '⏱ ' + Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    } else if (fase === 'vitoria' || fase === 'festa') status = 'WINNER!';
    const pisca = fase === 'luta' && batalha.emMorteSubita && Math.floor(performance.now() / 250) % 2;
    texto(status, 24, 222, { tam: 26, cor: pisca ? '#ff3b3b' : '#ffd400', alin: 'left', contorno: 4 });

    // placar de cordas
    const linhas = (batalha ? batalha.bolas.slice() : participantes.map((code, i) => ({ code, cor: CORES[i], cordas: [], vivo: true })))
      .sort((a, b) => (b.vivo - a.vivo) || (b.cordas.length - a.cordas.length));
    const max = Math.max(10, ...linhas.map((l) => l.cordas.length));
    linhas.forEach((l, i) => {
      const y = 128 + i * 25, x = 360, w = 300;
      caixa(x, y, w, 21, 6, 'rgba(255,255,255,0.06)');
      caixa(x, y, Math.max(26, w * (l.cordas.length / max)), 21, 6, l.vivo ? l.cor + 'aa' : '#333');
      desenharBandeira(l.code, x + 12, y + 10.5, 9, null);
      texto(nome(l.code), x + 26, y + 11, { tam: 14, cor: l.vivo ? '#fff' : '#777', alin: 'left', contorno: 3, max: 200 });
      texto(l.vivo ? String(l.cordas.length) : '✖', x + w + 22, y + 11, { tam: 16, cor: l.vivo ? '#fff' : '#f44', contorno: 3 });
    });
  }

  function desenharArena() {
    const { cx, cy, R } = ARENA;
    const morte = fase === 'luta' && batalha.emMorteSubita;
    g.save();
    g.lineWidth = 5;
    g.strokeStyle = morte ? `rgba(255,${60 + 60 * Math.sin(performance.now() / 120)},60,1)` : '#cfcfcf';
    g.shadowColor = morte ? '#ff3b3b' : '#ffffff'; g.shadowBlur = 14;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.restore();

    if (fase === 'intro') return desenharIntro();
    if (!batalha) return;

    // cordas
    // fios
    g.lineWidth = 1.5;
    for (const b of batalha.bolas) {
      if (!b.vivo) continue;
      g.strokeStyle = b.cor; g.globalAlpha = 0.8; g.beginPath();
      for (const c of b.cordas) { g.moveTo(c.x, c.y); g.lineTo(b.x, b.y); }
      g.stroke();
    }
    g.globalAlpha = 1;
    // bolas
    for (const b of batalha.bolas) {
      if (!b.vivo) continue;
      g.save(); g.shadowColor = b.cor; g.shadowBlur = 18;
      desenharBandeira(b.code, b.x, b.y, b.r, b.cor, 4); g.restore();
      texto(nome(b.code), b.x, b.y + b.r + 13, { tam: 13, cor: '#fff', contorno: 3, max: 140 });
    }
    if (fase === 'vitoria' && vencedor) desenharVencedor();
  }

  function desenharIntro() {
    const { cx, cy, R } = ARENA;
    const n = participantes.length;
    participantes.forEach((code, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const raio = n <= 2 ? R * 0.5 : R * 0.62;
      const x = cx + Math.cos(a) * raio, y = cy + Math.sin(a) * raio * (n <= 2 ? 0.6 : 1);
      const entrada = Math.min(1, Math.max(0, (tFase - i * 0.15) * 3));
      desenharBandeira(code, x, y, 48 * entrada, CORES[i % CORES.length], 5);
      if (entrada >= 1) {
        texto(nome(code), x, y + 66, { tam: 20, cor: '#fff', max: 200 });
        const v = votosIntro[code];
        const sub = info && info.porVotos ? (v ? v + (v === 1 ? ' VOTE' : ' VOTES') : 'RANDOM PICK') : '';
        if (sub) texto(sub, x, y + 88, { tam: 15, cor: v ? '#ffd400' : '#999', contorno: 3 });
      }
    });
    const falta = Math.ceil(7 - tFase);
    if (falta <= 3) {
      const esc = 1 + (1 - (tFase % 1)) * 0.6;
      texto(String(falta), cx, cy, { tam: 110 * esc, cor: '#ffd400', contorno: 8 });
    } else {
      texto(n <= 2 ? 'DUEL!' : 'NEXT BATTLE', cx, cy - 22, { tam: 30, cor: '#9fd8ff' });
      texto('GET READY!', cx, cy + 20, { tam: 44, cor: '#ffd400', contorno: 6 });
    }
  }

  function desenharVencedor() {
    const { cx, cy } = ARENA;
    const k = Math.min(1, tFase * 2.5);
    g.fillStyle = `rgba(0,0,0,${0.6 * k})`; g.beginPath(); g.arc(cx, cy, ARENA.R - 3, 0, Math.PI * 2); g.fill();
    desenharBandeira(vencedor, cx, cy - 20, 85 * k, '#ffd700', 6);
    texto('👑', cx, cy - 130 * k, { tam: 60 * k, contorno: 0 });
    if (k >= 1) {
      texto(nome(vencedor), cx, cy + 100, { tam: 44, cor: '#fff', contorno: 6, max: 520 });
      texto('WINS!', cx, cy + 148, { tam: 40, cor: '#ffd400', contorno: 6 });
      const prox = Torneio.batalhaAtual(estado);
      if (prox && !festas.length) texto('NEXT: ' + prox.titulo, cx, cy + 195, { tam: 18, cor: '#9fd8ff', contorno: 3 });
    }
  }

  function desenharFesta() {
    const f = festaAtual, grande = f.tipo === 'grande';
    g.fillStyle = 'rgba(0,0,0,0.82)'; g.fillRect(0, 0, W, H);
    const pulso = 1 + Math.sin(tFase * 4) * 0.04;
    g.save(); g.translate(W / 2, 520); g.rotate(tFase * 0.4);
    for (let i = 0; i < 16; i++) {
      g.rotate(Math.PI / 8); g.fillStyle = i % 2 ? 'rgba(255,215,0,0.10)' : 'rgba(255,255,255,0.04)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -700); g.lineTo(60, -700); g.fill();
    }
    g.restore();
    texto(grande ? '🏆 GRAND CHAMPION 🏆' : f.texto, W / 2, 250, { tam: grande ? 46 : 42, cor: '#ffd700', contorno: 7, max: 680 });
    if (grande) texto('BEST COUNTRY IN THE WORLD!', W / 2, 305, { tam: 26, cor: '#fff', contorno: 5 });
    texto('👑', W / 2, 395, { tam: 90 * pulso, contorno: 0 });
    desenharBandeira(f.code, W / 2, 560, 130 * pulso, '#ffd700', 8);
    texto(nome(f.code), W / 2, 745, { tam: 60, cor: '#fff', contorno: 8, max: 680 });
    const prox = Torneio.batalhaAtual(estado);
    const msg = grande ? 'EVERYTHING RESETS... NEW CYCLE STARTS!' : f.tipo === 'copa' ? 'GOES TO THE GRAND FINAL!' : 'GOES TO THE CUP FINAL!';
    texto(msg, W / 2, 820, { tam: 24, cor: '#9fd8ff', contorno: 4, max: 680 });
    if (prox) texto('NEXT: ' + prox.titulo, W / 2, 870, { tam: 20, cor: '#ccc', contorno: 3 });
  }

  function desenharBaixo() {
    // Próximos (votos)
    const y0 = 878;
    texto('VOTES', 24, y0 + 26, { tam: 26, cor: '#ffd400', alin: 'left', contorno: 4 });
    const top = votos.ranking.slice(0, 5);
    for (let i = 0; i < 5; i++) {
      const x = 155 + i * 64, t = top[i];
      if (t) {
        desenharBandeira(t.code, x, y0 + 24, 24, i < 5 ? '#fff' : '#666', 3);
        texto(String(t.votos), x + 20, y0 + 44, { tam: 15, cor: '#ffd400', contorno: 3 });
      } else { g.strokeStyle = '#444'; g.lineWidth = 2; g.beginPath(); g.arc(x, y0 + 24, 24, 0, Math.PI * 2); g.stroke(); texto('?', x, y0 + 25, { tam: 18, cor: '#555', contorno: 0 }); }
    }
    texto('67 BLOCKED: ' + (votos.bloqueados67 || 0), W - 20, y0 + 26, { tam: 14, cor: '#888', alin: 'right', contorno: 2 });
    const pisca = Math.floor(performance.now() / 600) % 2;
    texto('COMMENT A COUNTRY - TOP 5 PLAY NEXT!', W / 2, y0 + 72, { tam: 22, cor: pisca ? '#ffffff' : '#9fd8ff', contorno: 4, max: 690 });

    // Feed de votos (esquerda) + top doadores (direita)
    const y1 = y0 + 92;
    caixa(10, y1, 400, 120, 12, 'rgba(255,255,255,0.06)');
    texto('LATEST VOTES', 22, y1 + 15, { tam: 14, cor: '#aaa', alin: 'left', contorno: 0 });
    (votos.feed || []).slice(0, 4).forEach((f, i) => {
      const y = y1 + 39 + i * 24;
      desenharBandeira(f.code, 32, y, 10, null);
      texto(nome(f.code), 50, y + 1, { tam: 15, cor: '#fff', alin: 'left', contorno: 2, max: 150 });
      texto(f.usuario, 210, y + 1, { tam: 13, cor: '#9a9a9a', alin: 'left', contorno: 0, max: 130 });
      texto('#' + f.n, 398, y + 1, { tam: 14, cor: '#ffd400', alin: 'right', contorno: 0 });
    });

    caixa(420, y1, 290, 120, 12, 'rgba(255,215,0,0.10)');
    texto('💰 TOP DONATORS', 432, y1 + 15, { tam: 14, cor: '#ffd700', alin: 'left', contorno: 0 });
    const top5 = votos.topDoadores || [];
    if (!top5.length) texto('SUPER CHAT TO BE HERE!', 565, y1 + 70, { tam: 15, cor: '#999', contorno: 0 });
    top5.slice(0, 4).forEach((d, i) => {
      const y = y1 + 39 + i * 24;
      texto(['🥇', '🥈', '🥉', '4.'][i], 438, y + 1, { tam: 15, alin: 'left', contorno: 0 });
      texto(d.usuario, 468, y + 1, { tam: 14, cor: '#fff', alin: 'left', contorno: 0, max: 150 });
      texto('$' + d.usd.toFixed(2), 700, y + 1, { tam: 14, cor: '#ffd700', alin: 'right', contorno: 0 });
    });
  }

  function desenharBot(agora) {
    if (agora > botAte) return;
    const k = Math.min(1, (botAte - agora) / 400, (9000 - (botAte - agora)) / 300);
    const y = 268, w = 620;
    g.save(); g.globalAlpha = Math.max(0, k);
    const pisca = Math.floor(agora / 300) % 2;
    caixa(W / 2 - w / 2, y, w, 54, 27, pisca ? '#ff3b3b' : '#c4001d');
    texto('🤖 ' + botTexto, W / 2, y + 28, { tam: 28, cor: '#fff', contorno: 4, max: w - 30 });
    g.restore();
  }

  function desenharDoacao() {
    if (!doacaoAtual) return;
    const t = doacaoT;
    const entra = Math.min(1, t * 4), sai = Math.min(1, Math.max(0, (DURACAO_DOACAO - t) * 3));
    const y = 300 - (1 - entra) * 260 - (1 - sai) * 260;
    const w = 640, h = 170, x = (W - w) / 2;
    g.save();
    g.shadowColor = '#ffd700'; g.shadowBlur = 30;
    const grad = g.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#ffcc00'); grad.addColorStop(1, '#ff7b00');
    caixa(x, y, w, h, 24, grad);
    g.restore();
    texto('💸 THANKS FOR THE DONATION! 💸', W / 2, y + 36, { tam: 30, cor: '#fff', contorno: 5, max: w - 30 });
    texto(doacaoAtual.usuario, W / 2, y + 85, { tam: 36, cor: '#fff', contorno: 6, max: w - 40 });
    texto(doacaoAtual.valor, W / 2, y + 132, { tam: 40, cor: '#00ff88', contorno: 6, max: w - 40 });
  }

  function desenhar() {
    const agora = performance.now();
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    desenharTopo();
    desenharArena();
    desenharBaixo();
    for (const p of particulas) {
      g.globalAlpha = Math.max(0, 1 - p.vida / p.max); g.fillStyle = p.cor;
      if (p.confete) { g.save(); g.translate(p.x, p.y); g.rotate(p.giro); g.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2); g.restore(); }
      else { g.beginPath(); g.arc(p.x, p.y, p.tam, 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1;
    for (const t of textosFlutuantes) {
      g.globalAlpha = Math.max(0, 1 - t.vida / 1.6);
      texto(t.t, t.x, t.y, { tam: 26, cor: t.cor, contorno: 5 });
    }
    g.globalAlpha = 1;
    if (fase === 'festa' && festaAtual) desenharFesta();
    desenharBot(Date.now());
    desenharDoacao();
  }

  // ---------- som ----------
  const avisoSom = document.getElementById('som');
  // No celular o navegador só libera o som depois de um toque: não espera por isso (senão o jogo nem começa)
  async function ligarSom() {
    await Promise.race([Sons.iniciar(), new Promise((ok) => setTimeout(ok, 400))]);
    if (Sons.ativo()) { avisoSom.style.display = 'none'; Sons.musica(); }
  }
  avisoSom.addEventListener('click', ligarSom);
  document.addEventListener('pointerdown', ligarSom);
  await ligarSom();
  if (!Sons.ativo()) avisoSom.style.display = 'flex';

  // ---------- loop ----------
  await document.fonts.load(`20px ${FONTE}`).catch(() => {});
  await prepararBatalha();
  let anterior = performance.now();
  function quadro(agora) {
    const dt = Math.min(0.05, (agora - anterior) / 1000); anterior = agora;
    verificarBot(Date.now());
    atualizar(dt);
    desenhar();
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  // Para testes: window.jogo
  // ---------- modo captura pelo navegador: grava o canvas + som e manda pro servidor ----------
  if (new URLSearchParams(location.search).has('transmitir')) iniciarGravador();

  async function iniciarGravador() {
    const cfg = await fetch('/api/config').then((r) => r.json()).catch(() => ({ fps: 24, bitrate: 2500000 }));
    const tipos = ['video/webm;codecs=h264,opus', 'video/x-matroska;codecs=avc1,opus', 'video/webm;codecs=vp8,opus'];
    const tipo = tipos.find((t) => MediaRecorder.isTypeSupported(t));
    let gravador = null, sessao = 0, fila = [], enviando = false;

    // Aviso na tela do aparelho (fica fora do canvas, então NÃO aparece na live)
    const aviso = document.createElement('div');
    aviso.style.cssText = 'position:fixed;top:6px;left:6px;z-index:9;padding:4px 8px;border-radius:8px;' +
      'font:12px sans-serif;color:#fff;background:rgba(0,0,0,.6);pointer-events:none';
    document.body.appendChild(aviso);
    let ultimoOk = 0;
    setInterval(() => {
      const ok = Date.now() - ultimoOk < 5000;
      aviso.textContent = ok ? '🔴 transmitindo (' + (tipo || '?').split(';')[1] + ')' : '⚠️ sem conexão com o servidor do Termux';
      aviso.style.background = ok ? 'rgba(0,120,0,.7)' : 'rgba(180,0,0,.8)';
    }, 1000);

    // Mantém a tela ligada enquanto transmite (Chrome do celular)
    async function manterTelaLigada() { try { await navigator.wakeLock.request('screen'); } catch (_) { /* sem suporte */ } }
    manterTelaLigada();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) manterTelaLigada(); });

    function comecar() {
      const stream = new MediaStream([...tela.captureStream(cfg.fps).getVideoTracks(), ...Sons.streamAudio.getAudioTracks()]);
      sessao = Date.now();
      const minha = sessao;
      gravador = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: cfg.bitrate, audioBitsPerSecond: 128000,
        videoKeyFrameIntervalDuration: 2000 });
      gravador.ondataavailable = (e) => { if (e.data.size && minha === sessao) { fila.push({ sessao: minha, blob: e.data }); enviar(); } };
      gravador.start(1000);
    }

    async function enviar() {
      if (enviando) return;
      enviando = true;
      while (fila.length) {
        const item = fila.shift();
        if (item.sessao !== sessao) continue;
        try {
          const r = await fetch(`/api/stream?sessao=${item.sessao}&tipo=${encodeURIComponent(tipo)}`, { method: 'POST', body: item.blob });
          const d = await r.json();
          if (d.ok) ultimoOk = Date.now();
          if (d.reiniciar) { // o servidor reiniciou o envio: começa uma gravação nova (com cabeçalho novo)
            fila = []; try { gravador.stop(); } catch (_) { /* ignora */ }
            setTimeout(comecar, 1000); break;
          }
        } catch (_) { await new Promise((ok) => setTimeout(ok, 1000)); }
      }
      enviando = false;
    }
    comecar();
  }

  window.jogo = { estado: () => estado, fase: () => fase, forcarBot: () => { botAte = Date.now() + 9000; botTexto = BOT_MSGS[0].texto; Sons.voz(BOT_MSGS[0].voz); } };
})();
