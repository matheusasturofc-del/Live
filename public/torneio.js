// Estrutura do campeonato (salva no servidor, sobrevive a reinícios).
//
// CHAVE (bracket):  20 classificatórias de 5 países (escolhidos pelo chat)
//                   -> 20 vencedores em 4 grupos de 5 -> 4 -> 2 semifinais -> final  => campeão da chave
// COPA:             chave A + chave B -> final da copa (duelo)                       => campeão da copa
// CICLO:            5 copas -> GRANDE FINAL com os 5 campeões                          => GRANDE CAMPEÃO
//                   grande campeão vai para "PAST CHAMPIONS" e todo o resto reseta.
(function (raiz) {
  const QUALIFICATORIAS = 20;
  const COPAS = 5;
  const NOME_CHAVE = ['A', 'B'];

  function embaralhar(lista, rng = Math.random) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function novoEstado(passados = [], ciclo = 1) {
    return { versao: 1, ciclo, copa: 0, chave: 0, fase: 'qual', idx: 0,
      vencQual: [], grupos: [], vencGrupos: [], vencSemi: [], campChaves: [], campCopas: [],
      passados, filaPadrao: [], posFila: 0 };
  }

  // Divide em grupos evitando o mesmo país duas vezes no mesmo grupo
  function montarGrupos(paises, tamanho, rng) {
    const qtd = Math.ceil(paises.length / tamanho);
    const grupos = Array.from({ length: qtd }, () => []);
    for (const p of embaralhar(paises, rng)) {
      const g = grupos.find((x) => x.length < tamanho && !x.includes(p)) || grupos.find((x) => x.length < tamanho);
      g.push(p);
    }
    return grupos;
  }

  function batalhaAtual(e) {
    const sub = `CUP ${e.copa + 1}/${COPAS} · BRACKET ${NOME_CHAVE[e.chave]}`;
    switch (e.fase) {
      case 'qual': return { fase: e.fase, titulo: `QUALIFIER ${e.idx + 1}/${QUALIFICATORIAS}`, sub, porVotos: true };
      case 'grupos': return { fase: e.fase, titulo: `GROUP STAGE ${e.idx + 1}/4`, sub, participantes: e.grupos[e.idx] };
      case 'semi': return { fase: e.fase, titulo: `SEMI-FINAL ${e.idx + 1}/2`, sub,
        participantes: e.vencGrupos.slice(e.idx * 2, e.idx * 2 + 2) };
      case 'final': return { fase: e.fase, titulo: `BRACKET ${NOME_CHAVE[e.chave]} FINAL`, sub, participantes: e.vencSemi.slice(0, 2) };
      case 'copa': return { fase: e.fase, titulo: `CUP ${e.copa + 1} FINAL`, sub: `BRACKET A vs BRACKET B`, participantes: e.campChaves.slice(0, 2) };
      case 'grande': return { fase: e.fase, titulo: 'GRAND FINAL', sub: `ALL ${COPAS} CUP CHAMPIONS`, participantes: e.campCopas.slice() };
    }
    return null;
  }

  // Completa uma classificatória com países padrão (se faltar voto)
  function completarComPadrao(e, escolhidos, todos, quantos = 5, rng = Math.random) {
    const r = escolhidos.slice(0, quantos);
    let tentativas = 0;
    while (r.length < quantos && tentativas++ < 1000) {
      if (!e.filaPadrao.length || e.posFila >= e.filaPadrao.length) { e.filaPadrao = embaralhar(todos, rng); e.posFila = 0; }
      const c = e.filaPadrao[e.posFila++];
      if (!r.includes(c)) r.push(c);
    }
    return r;
  }

  /** Registra o vencedor da batalha atual. Retorna uma lista de comemorações a mostrar. */
  function registrarVencedor(e, code, rng = Math.random) {
    const festa = [];
    switch (e.fase) {
      case 'qual':
        e.vencQual.push(code); e.idx++;
        if (e.idx >= QUALIFICATORIAS) { e.grupos = montarGrupos(e.vencQual, 5, rng); e.fase = 'grupos'; e.idx = 0; }
        break;
      case 'grupos':
        e.vencGrupos.push(code); e.idx++;
        if (e.idx >= e.grupos.length) { e.vencGrupos = embaralhar(e.vencGrupos, rng); e.fase = 'semi'; e.idx = 0; }
        break;
      case 'semi':
        e.vencSemi.push(code); e.idx++;
        if (e.idx >= 2) { e.fase = 'final'; e.idx = 0; }
        break;
      case 'final':
        e.campChaves.push(code);
        festa.push({ tipo: 'chave', code, texto: `BRACKET ${NOME_CHAVE[e.chave]} CHAMPION` });
        e.vencQual = []; e.grupos = []; e.vencGrupos = []; e.vencSemi = []; e.idx = 0;
        if (e.chave === 0) { e.chave = 1; e.fase = 'qual'; } else { e.fase = 'copa'; }
        break;
      case 'copa':
        e.campCopas.push(code);
        festa.push({ tipo: 'copa', code, texto: `CUP ${e.copa + 1} CHAMPION` });
        e.campChaves = []; e.chave = 0; e.copa++;
        e.fase = e.copa >= COPAS ? 'grande' : 'qual';
        break;
      case 'grande': {
        festa.push({ tipo: 'grande', code, texto: 'GRAND CHAMPION' });
        const passados = [{ code, ciclo: e.ciclo, data: new Date().toISOString().slice(0, 10) }, ...e.passados].slice(0, 30);
        const fila = { filaPadrao: e.filaPadrao, posFila: e.posFila };
        Object.assign(e, novoEstado(passados, e.ciclo + 1), fila); // reseta tudo
        break;
      }
    }
    return festa;
  }

  const api = { novoEstado, batalhaAtual, registrarVencedor, completarComPadrao, embaralhar, QUALIFICATORIAS, COPAS };
  raiz.Torneio = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
