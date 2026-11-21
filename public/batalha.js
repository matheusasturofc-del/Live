// Física de uma batalha. Funciona no navegador e no Node (para testes/calibragem).
// Regras: cada país é uma bola que quica dentro da arena. A cada quique na parede ganha uma corda
// (da parede até a bola). Se outra bola passar por cima de uma corda, ela é cortada.
// Ficou sem cordas = eliminado. Último vivo vence.
(function (raiz) {
  const CFG = {
    raioBola: 30,
    velocidade: 340,
    cordasIniciais: 12,
    maxCordas: 120,
    morteSubita5: 42, // segundos até parar de ganhar cordas (5 países)
    morteSubita2: 30, // idem, duelos
    tempoMax5: 75,
    tempoMax2: 55,
    zonaSegura: 1.6, // trecho da corda perto do dono que não corta (em raios)
    fiosPorBatida: 3, // fios criados a cada batida na parede
    espacoFios: 0.035, // distância entre esses fios (radianos)
    semCorteInicio: 3, // segundos iniciais sem cortes
    intervaloCorte: 0.08, // cada bola corta no máximo 1 corda a cada X segundos
  };

  function rnd(rng) { return rng ? rng() : Math.random(); }

  class Batalha {
    constructor(participantes, { cx, cy, R, rng } = {}) {
      this.cx = cx; this.cy = cy; this.R = R; this.rng = rng;
      this.t = 0; this.eventos = []; this.vencedor = null; this.fim = false;
      const n = participantes.length;
      const duelo = n <= 2;
      this.morteSubita = duelo ? CFG.morteSubita2 : CFG.morteSubita5;
      this.tempoMax = duelo ? CFG.tempoMax2 : CFG.tempoMax5;
      const giro = rnd(rng) * Math.PI * 2;
      this.bolas = participantes.map((p, i) => {
        const a = giro + (i / n) * Math.PI * 2;
        const dir = rnd(rng) * Math.PI * 2;
        const b = { ...p, i, r: CFG.raioBola, vivo: true, morteT: 0, cordas: [], ultimoCorte: -9,
          x: cx + Math.cos(a) * R * 0.5, y: cy + Math.sin(a) * R * 0.5,
          vx: Math.cos(dir) * CFG.velocidade, vy: Math.sin(dir) * CFG.velocidade };
        for (let k = 0; k < CFG.cordasIniciais; k++) {
          const aa = a + (k - (CFG.cordasIniciais - 1) / 2) * 0.35;
          b.cordas.push({ x: cx + Math.cos(aa) * R, y: cy + Math.sin(aa) * R });
        }
        return b;
      });
    }

    get vivos() { return this.bolas.filter((b) => b.vivo); }
    get emMorteSubita() { return this.t >= this.morteSubita; }

    passo(dt) {
      if (this.fim) return;
      this.t += dt;
      const { cx, cy, R } = this;
      const mult = this.emMorteSubita ? 1.3 : 1;
      const vivos = this.vivos;

      for (const b of vivos) {
        b.x += b.vx * dt * mult; b.y += b.vy * dt * mult;
        const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
        if (d + b.r > R) {
          const nx = dx / d, ny = dy / d;
          b.x = cx + nx * (R - b.r); b.y = cy + ny * (R - b.r);
          const dot = b.vx * nx + b.vy * ny;
          b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny;
          // pequena variação no ângulo para não cair em trajetórias repetidas
          const ang = Math.atan2(b.vy, b.vx) + (rnd(this.rng) - 0.5) * 0.3;
          const v = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(ang) * v; b.vy = Math.sin(ang) * v;
          if ((b.vx * nx + b.vy * ny) > 0) { b.vx = -b.vx; b.vy = -b.vy; }
          let ganhou = false;
          if (!this.emMorteSubita && b.cordas.length < CFG.maxCordas) {
            // cada batida na parede cria fios (3), um ao lado do outro
            const base = Math.atan2(ny, nx), n = CFG.fiosPorBatida;
            for (let k = 0; k < n; k++) {
              const a = base + (k - (n - 1) / 2) * CFG.espacoFios;
              b.cordas.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
            }
            ganhou = true;
          }
          this.eventos.push({ tipo: 'quique', bola: b, ganhou, x: cx + nx * R, y: cy + ny * R });
        }
      }

      // colisão entre bolas
      for (let i = 0; i < vivos.length; i++) {
        for (let j = i + 1; j < vivos.length; j++) {
          const a = vivos[i], b = vivos[j];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
          if (d > 0 && d < min) {
            const nx = dx / d, ny = dy / d, sobra = (min - d) / 2;
            a.x -= nx * sobra; a.y -= ny * sobra; b.x += nx * sobra; b.y += ny * sobra;
            const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
            if (va - vb > 0) {
              a.vx += (vb - va) * nx; a.vy += (vb - va) * ny;
              b.vx += (va - vb) * nx; b.vy += (va - vb) * ny;
            }
            this.eventos.push({ tipo: 'batida', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          }
        }
      }

      // cortes de cordas
      for (const b of this.t < CFG.semCorteInicio ? [] : vivos) {
        for (const dono of vivos) {
          if (this.t - b.ultimoCorte < CFG.intervaloCorte) break;
          if (dono === b) continue;
          const segura = dono.r * CFG.zonaSegura;
          for (let k = dono.cordas.length - 1; k >= 0; k--) {
            const c = dono.cordas[k];
            const px = dono.x - c.x, py = dono.y - c.y, len2 = px * px + py * py;
            if (len2 < 1) continue;
            let u = ((b.x - c.x) * px + (b.y - c.y) * py) / len2;
            u = Math.max(0, Math.min(1, u));
            const len = Math.sqrt(len2);
            if ((1 - u) * len < segura) continue;
            const qx = c.x + px * u, qy = c.y + py * u;
            if (Math.hypot(b.x - qx, b.y - qy) < b.r && this.t - b.ultimoCorte >= CFG.intervaloCorte) {
              dono.cordas.splice(k, 1);
              b.ultimoCorte = this.t;
              this.eventos.push({ tipo: 'corte', dono, por: b, x: qx, y: qy });
            }
          }
        }
      }

      for (const b of vivos) {
        if (b.cordas.length === 0) {
          b.vivo = false; b.morteT = this.t;
          this.eventos.push({ tipo: 'eliminado', bola: b, x: b.x, y: b.y });
        }
      }

      const rest = this.vivos;
      if (rest.length <= 1 || this.t >= this.tempoMax) {
        let v = rest[0];
        if (rest.length > 1) {
          v = rest.slice().sort((a, b) => b.cordas.length - a.cordas.length || rnd(this.rng) - 0.5)[0];
        }
        if (!v) v = this.bolas.slice().sort((a, b) => b.morteT - a.morteT)[0];
        this.vencedor = v; this.fim = true;
        this.eventos.push({ tipo: 'fim', bola: v });
      }
    }

    tirarEventos() { const e = this.eventos; this.eventos = []; return e; }
  }

  raiz.Batalha = Batalha;
  raiz.CFG_BATALHA = CFG;
  if (typeof module !== 'undefined') module.exports = { Batalha, CFG };
})(typeof window !== 'undefined' ? window : globalThis);
