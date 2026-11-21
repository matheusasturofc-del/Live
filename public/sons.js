// Todos os sons são sintetizados aqui (sem arquivos de terceiros = sem direitos autorais).
// Inclui a música de fundo original (estilo phonk/brainrot, 140 BPM), gerada uma vez e tocada em loop.
(function (raiz) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const mestre = ctx.createGain(); mestre.gain.value = 0.9; mestre.connect(ctx.destination);
  const sfx = ctx.createGain(); sfx.gain.value = 0.55; sfx.connect(mestre);
  let VOL_MUSICA = 0.32;
  const busMusica = ctx.createGain(); busMusica.gain.value = VOL_MUSICA; busMusica.connect(mestre);

  const ruidoBuf = (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();

  // Limita quantos sons iguais tocam por segundo (evita barulheira quando muitas cordas estouram)
  const ultimos = {};
  function podeTocar(nome, intervalo) {
    const t = ctx.currentTime;
    if (ultimos[nome] && t - ultimos[nome] < intervalo) return false;
    ultimos[nome] = t; return true;
  }

  function tom({ freq = 440, freqFim, tipo = 'sine', dur = 0.15, vol = 0.3, ataque = 0.005, destino = sfx, quando = 0 }) {
    const t = ctx.currentTime + quando;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(destino); o.start(t); o.stop(t + dur + 0.02);
  }

  function ruido({ dur = 0.1, vol = 0.3, filtro = 'highpass', freq = 2000, q = 1, destino = sfx, quando = 0 }) {
    const t = ctx.currentTime + quando;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruidoBuf; f.type = filtro; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(destino); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  const ESCALA = [0, 3, 5, 7, 10, 12, 15];
  const Sons = {
    ctx,
    async iniciar() { if (ctx.state !== 'running') await ctx.resume().catch(() => {}); },
    ativo() { return ctx.state === 'running'; },

    // corda estourando: "tóim" metálico + estalo
    corte(i = 0) {
      if (!podeTocar('corte', 0.05)) return;
      const f = 900 + ESCALA[i % ESCALA.length] * 60 + Math.random() * 80;
      tom({ freq: f, freqFim: f * 0.35, tipo: 'triangle', dur: 0.18, vol: 0.22 });
      ruido({ dur: 0.05, vol: 0.25, freq: 3500 });
    },
    // ganhou corda ao quicar: "plim" suave
    quique(i = 0) {
      if (!podeTocar('quique', 0.07)) return;
      const nota = 72 + ESCALA[(i * 2) % ESCALA.length];
      tom({ freq: 440 * Math.pow(2, (nota - 69) / 12), tipo: 'sine', dur: 0.12, vol: 0.07 });
    },
    batida() { if (podeTocar('batida', 0.1)) tom({ freq: 180, freqFim: 90, tipo: 'sine', dur: 0.08, vol: 0.18 }); },
    // país eliminado: explosão + "buuuum" descendo
    eliminado() {
      ruido({ dur: 0.45, vol: 0.5, filtro: 'lowpass', freq: 1200 });
      tom({ freq: 600, freqFim: 60, tipo: 'sawtooth', dur: 0.5, vol: 0.18 });
      tom({ freq: 90, freqFim: 40, tipo: 'sine', dur: 0.5, vol: 0.5 });
    },
    bip(final = false) {
      tom({ freq: final ? 1320 : 660, tipo: 'square', dur: final ? 0.45 : 0.15, vol: 0.12 });
      if (final) ruido({ dur: 0.4, vol: 0.2, freq: 5000 });
    },
    morteSubita() {
      for (let k = 0; k < 3; k++) tom({ freq: 880, freqFim: 440, tipo: 'sawtooth', dur: 0.2, vol: 0.12, quando: k * 0.25 });
    },
    // vitória da batalha: arpejo
    vitoria() {
      [0, 4, 7, 12, 16].forEach((s, k) => tom({ freq: 523.25 * Math.pow(2, s / 12), tipo: 'square', dur: 0.25, vol: 0.1, quando: k * 0.09 }));
      tom({ freq: 1046.5, tipo: 'triangle', dur: 0.8, vol: 0.15, quando: 0.45 });
    },
    // campeão (chave/copa/grande): fanfarra maior + "torcida"
    campeao(grande = false) {
      const notas = grande ? [0, 4, 7, 12, 7, 12, 16, 19, 24] : [0, 4, 7, 12, 16, 12, 19];
      notas.forEach((s, k) => {
        tom({ freq: 392 * Math.pow(2, s / 12), tipo: 'sawtooth', dur: 0.3, vol: 0.09, quando: k * 0.13 });
        tom({ freq: 196 * Math.pow(2, s / 12), tipo: 'square', dur: 0.3, vol: 0.06, quando: k * 0.13 });
      });
      ruido({ dur: grande ? 3 : 1.8, vol: 0.18, filtro: 'bandpass', freq: 1500, q: 0.6, quando: 0.2 });
    },
    // doação: "cha-ching" de moedas + brilho
    moeda() {
      tom({ freq: 1975, tipo: 'square', dur: 0.12, vol: 0.1 });
      tom({ freq: 2637, tipo: 'square', dur: 0.5, vol: 0.1, quando: 0.08 });
      for (let k = 0; k < 6; k++) tom({ freq: 3000 + Math.random() * 2000, tipo: 'sine', dur: 0.15, vol: 0.05, quando: 0.15 + k * 0.06 });
      ruido({ dur: 0.25, vol: 0.12, freq: 6000, quando: 0.05 });
    },
    // voz do bot (arquivos gerados com sintetizador de voz)
    async voz(nome) {
      try {
        const buf = await carregar(`/audio/${nome}.wav`);
        const s = ctx.createBufferSource(); s.buffer = buf;
        const g = ctx.createGain(); g.gain.value = 1.6; s.connect(g); g.connect(mestre);
        const t = ctx.currentTime;
        busMusica.gain.setTargetAtTime(0.1, t, 0.05); // abaixa a música enquanto fala
        busMusica.gain.setTargetAtTime(VOL_MUSICA, t + buf.duration, 0.3);
        s.start();
      } catch (_) { /* sem arquivo de voz */ }
    },
    // música de fundo: usa public/audio/custom/fundo.mp3 se existir; senão, a trilha original sintetizada
    async musica() {
      if (Sons._musica) return;
      Sons._musica = true;
      let buf = await carregar('/audio/custom/fundo.mp3').catch(() => null);
      if (!buf) buf = await gerarMusica();
      else busMusica.gain.value = VOL_MUSICA = 0.45;
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(busMusica); s.start();
    },
    // som depois de uma doação: public/audio/custom/doacao.mp3 (se existir)
    async somDoacao() {
      const buf = await carregar('/audio/custom/doacao.mp3').catch(() => null);
      if (!buf) return false;
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 1.1; s.connect(g); g.connect(mestre);
      const t = ctx.currentTime;
      busMusica.gain.setTargetAtTime(0.05, t, 0.1); // abaixa a música de fundo
      busMusica.gain.setTargetAtTime(VOL_MUSICA, t + buf.duration, 0.4);
      s.start();
      return buf.duration;
    },
  };

  const cacheBuf = {};
  async function carregar(url) {
    if (!cacheBuf[url]) cacheBuf[url] = fetch(url).then((r) => { if (!r.ok) throw new Error('404'); return r.arrayBuffer(); })
      .then((a) => ctx.decodeAudioData(a));
    return cacheBuf[url];
  }

  // ---------------- Música original ----------------
  async function gerarMusica() {
    const BPM = 140, passo = 60 / BPM / 4, compassos = 16, sr = 44100;
    const dur = compassos * 16 * passo;
    const off = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
    const saida = off.createDynamicsCompressor(); saida.threshold.value = -14; saida.ratio.value = 4; saida.connect(off.destination);
    const nb = off.createBuffer(1, sr, sr), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

    const env = (g, t, v, d, a = 0.003) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
    function osc(tipo, f, t, d, v, f2, pan = 0) {
      const o = off.createOscillator(), g = off.createGain(), p = off.createStereoPanner();
      o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d * 0.6);
      env(g, t, v, d); p.pan.value = pan; o.connect(g); g.connect(p); p.connect(saida); o.start(t); o.stop(t + d + 0.05);
    }
    function noise(t, d, v, tipo, f, pan = 0) {
      const s = off.createBufferSource(), fl = off.createBiquadFilter(), g = off.createGain(), p = off.createStereoPanner();
      s.buffer = nb; fl.type = tipo; fl.frequency.value = f; env(g, t, v, d, 0.001); p.pan.value = pan;
      s.connect(fl); fl.connect(g); g.connect(p); p.connect(saida); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
    }
    // cowbell (som marcante do phonk)
    function cowbell(m, t, v = 0.13) {
      const f = hz(m);
      [1, 1.48].forEach((r) => {
        const o = off.createOscillator(), bp = off.createBiquadFilter(), g = off.createGain();
        o.type = 'square'; o.frequency.value = f * r; bp.type = 'bandpass'; bp.frequency.value = f * 1.2; bp.Q.value = 3;
        env(g, t, v, 0.22); o.connect(bp); bp.connect(g); g.connect(saida); o.start(t); o.stop(t + 0.3);
      });
    }

    // Progressão em Fá# menor: F#m - D - E - C#m
    const raizes = [42, 38, 40, 37];
    const kick = [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0];
    const hat  = [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,1,1,1];
    // melodia de cowbell (nº da escala, -1 = pausa) - gancho de 2 compassos
    const ESC = [66, 69, 71, 73, 76, 78, 81];
    const gancho = [0,-1,0,2, -1,3,-1,2, 0,-1,4,-1, 3,2,-1,1,  0,-1,0,2, -1,3,-1,5, 4,-1,3,-1, 2,1,0,-1];
    const lead   = [5,-1,-1,4, -1,3,-1,-1, 4,-1,-1,3, 2,-1,0,-1];

    for (let c = 0; c < compassos; c++) {
      const base = c * 16 * passo, raiz = raizes[c % 4], parteB = c >= 8;
      for (let s = 0; s < 16; s++) {
        const t = base + s * passo;
        if (kick[s] || (parteB && s === 14 && c % 2)) osc('sine', 160, t, 0.35, 0.9, 42);
        if (s === 4 || s === 12) { noise(t, 0.18, 0.5, 'bandpass', 1800); noise(t + 0.012, 0.12, 0.3, 'highpass', 3000); }
        if (hat[s]) noise(t, 0.04, s % 2 ? 0.12 : 0.18, 'highpass', 8000, 0.3);
        if (parteB && c % 4 === 3 && s >= 12) noise(t + passo / 2, 0.03, 0.12, 'highpass', 9000, -0.3);
        // 808 com slide
        if (s === 0 || s === 6 || s === 10) osc('sine', hz(raiz), t, s === 0 ? 0.55 : 0.3, 0.55, s === 10 ? hz(raiz) * 0.9 : null);
        const g = gancho[(c % 2) * 16 + s];
        if (g >= 0) cowbell(ESC[g] + (raiz === 37 && g === 0 ? -1 : 0), t);
        if (parteB) {
          const l = lead[s];
          if (l >= 0) {
            osc('sawtooth', hz(ESC[l] + 12), t, passo * 2.5, 0.05, null, -0.2);
            osc('square', hz(ESC[l] + 12) * 1.005, t, passo * 2.5, 0.035, null, 0.2);
          }
        }
      }
      // acorde de fundo
      [0, 3, 7].forEach((iv) => osc('triangle', hz(raiz + 24 + iv + (raiz === 38 || raiz === 40 ? (iv === 3 ? 1 : 0) : 0)), base, 16 * passo, 0.03));
    }
    return off.startRendering();
  }

  raiz.Sons = Sons;
})(window);
