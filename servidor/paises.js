// Lista de países + detecção de nomes de países em mensagens do chat (25+ línguas e emojis de bandeira).
const iso = require('i18n-iso-countries');

// 193 membros da ONU + alguns muito comentados
const CODIGOS = `AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA
CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT
GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV
ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU
RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TZ TH TL TG TO TT TN TR TM TV
UG UA AE GB US UY UZ VU VE VN YE ZM ZW VA PS XK TW PR`.split(/\s+/).filter(Boolean);

// Nomes curtos em inglês para mostrar na tela
const NOME_CURTO = {
  US: 'USA', GB: 'UK', RU: 'Russia', KR: 'South Korea', KP: 'North Korea', IR: 'Iran', SY: 'Syria',
  TZ: 'Tanzania', CD: 'DR Congo', CG: 'Congo', CI: 'Ivory Coast', CZ: 'Czechia', MK: 'North Macedonia',
  FM: 'Micronesia', PS: 'Palestine', VA: 'Vatican', BN: 'Brunei', LA: 'Laos', MD: 'Moldova', TW: 'Taiwan',
  TR: 'Turkey', NL: 'Netherlands', DO: 'Dominican Rep.', CF: 'Central African Rep.', BA: 'Bosnia',
  KN: 'St Kitts & Nevis', VC: 'St Vincent', LC: 'St Lucia', ST: 'Sao Tome', AG: 'Antigua & Barbuda',
  TT: 'Trinidad & Tobago', GQ: 'Eq. Guinea', AE: 'UAE', SA: 'Saudi Arabia', XK: 'Kosovo',
  PG: 'Papua New Guinea', MH: 'Marshall Islands', SB: 'Solomon Islands', VN: 'Vietnam',
  'GB-ENG': 'England', 'GB-SCT': 'Scotland', 'GB-WLS': 'Wales',
};

// Apelidos extras (já normalizados: minúsculas, sem acento)
const APELIDOS = {
  US: ['usa', 'america', 'eua', 'estados unidos', 'eeuu', 'united states', 'murica', 'amerika'],
  GB: ['uk', 'britain', 'great britain', 'reino unido', 'gran bretana', 'gra bretanha'],
  'GB-ENG': ['england', 'inglaterra', 'angleterre', 'inghilterra', 'engeland'],
  'GB-SCT': ['scotland', 'escocia', 'ecosse', 'schottland', 'scozia'],
  'GB-WLS': ['wales', 'gales', 'pays de galles', 'galles'],
  NL: ['holland', 'holanda', 'hollande', 'olanda'],
  AE: ['uae', 'emirates', 'emirados', 'emiratos', 'dubai'],
  KR: ['korea', 'coreia', 'corea', 'coree', 'south korea', 'coreia do sul', '한국', '대한민국'],
  KP: ['north korea', 'coreia do norte', '북한'],
  SA: ['ksa', 'saudi', 'arabia saudita'],
  ZA: ['rsa', 'south africa', 'africa do sul'],
  CD: ['drc', 'dr congo', 'rdc'],
  CZ: ['czech', 'tchequia', 'chequia'],
  TR: ['turkey', 'turquia', 'turkiye', 'turkei', 'turchia'],
  IR: ['persia', 'iran'],
  MM: ['burma', 'birmania', 'myanmar'],
  CI: ['ivory coast', 'cote d ivoire', 'costa do marfim', 'costa de marfil'],
  BR: ['brasil', 'brazil', 'brazilian', 'brasileiro', 'bra'],
  AR: ['argentina', 'arg'],
  PT: ['portugal', 'tuga'],
  RU: ['russia', 'rossiya'],
  DE: ['deutschland', 'germany', 'alemanha'],
  MX: ['mexico', 'mex'],
  PK: ['pakistan', 'pak', 'pakistan zindabad'],
  IN: ['india', 'bharat', 'hindustan'],
  ID: ['indonesia', 'indo'],
  PH: ['philippines', 'pinas', 'pilipinas', 'filipinas'],
  BA: ['bosnia'],
  VA: ['vatican', 'vaticano'],
  PS: ['palestine', 'palestina'],
  XK: ['kosovo', 'kosova'],
  TW: ['taiwan'],
  PR: ['puerto rico', 'porto rico'],
  VN: ['vietnam', 'viet nam'],
  LA: ['laos'],
  SY: ['syria', 'siria'],
  MD: ['moldova', 'moldavia'],
  BO: ['bolivia'],
  VE: ['venezuela'],
  TZ: ['tanzania'],
};

const LINGUAS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'fa', 'ur', 'hi',
  'bn', 'id', 'ms', 'vi', 'th', 'ja', 'ko', 'zh', 'sv', 'ro', 'el', 'he'];
const SEM_ESPACO = new Set(['th', 'ja', 'ko', 'zh']); // línguas sem espaço entre palavras

// Palavras comuns que coincidem com nomes de país em alguma língua (evita falsos votos)
const IGNORAR = new Set(['ira']);

function normalizar(txt) {
  return (' ' + String(txt).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ').replace(/\s+/g, ' ');
}

const paises = []; // {code, nome, flag}
const indiceEspaco = new Map(); // " nome " -> code
const indiceSubstr = new Map(); // nome (CJK/tailandês/coreano) -> code

function adicionar(alias, code, semEspaco) {
  if (semEspaco) {
    const a = alias.replace(/\s+/g, '');
    if (a.length >= 2 && !indiceSubstr.has(a)) indiceSubstr.set(a, code);
    return;
  }
  const n = normalizar(alias);
  const limpo = n.trim();
  if (!limpo || IGNORAR.has(limpo)) return;
  // nomes latinos muito curtos geram falsos positivos (ex.: "us"), exceto apelidos explícitos
  if (limpo.length < 4 && /^[a-z ]+$/.test(limpo) && !(APELIDOS[code] || []).includes(limpo)) return;
  if (!indiceEspaco.has(n)) indiceEspaco.set(n, code);
}

const todosCodigos = [...CODIGOS, 'GB-ENG', 'GB-SCT', 'GB-WLS'];
for (const code of todosCodigos) {
  const nome = NOME_CURTO[code] || iso.getName(code, 'en') || code;
  paises.push({ code, nome, flag: code.toLowerCase() });
  for (const a of APELIDOS[code] || []) adicionar(a, code, false);
  adicionar(nome, code, false);
}
for (const lang of LINGUAS) {
  for (const code of CODIGOS) {
    if (code === 'XK') continue;
    const nomes = iso.getName(code, lang, { select: 'all' }) || [];
    for (const nm of nomes) adicionar(nm, code, SEM_ESPACO.has(lang));
  }
}
const porCodigo = Object.fromEntries(paises.map((p) => [p.code, p]));

// Emoji de bandeira (🇧🇷) -> código
function bandeirasEmoji(texto) {
  const r = [];
  const re = /([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/gu;
  let m;
  while ((m = re.exec(texto))) {
    const code = String.fromCharCode(m[1].codePointAt(0) - 0x1f1e6 + 65, m[2].codePointAt(0) - 0x1f1e6 + 65);
    if (porCodigo[code]) r.push({ pos: m.index, code });
  }
  return r;
}

const chavesEspaco = [...indiceEspaco.keys()];
const chavesSubstr = [...indiceSubstr.keys()];

/** Retorna o código do primeiro país citado na mensagem, ou null. */
function detectarPais(texto) {
  if (!texto) return null;
  const emoji = bandeirasEmoji(texto);
  if (emoji.length) return emoji[0].code;
  const n = normalizar(texto);
  let melhor = null;
  for (const k of chavesEspaco) {
    const pos = n.indexOf(k);
    if (pos >= 0 && (!melhor || pos < melhor.pos || (pos === melhor.pos && k.length > melhor.len)))
      melhor = { pos, len: k.length, code: indiceEspaco.get(k) };
  }
  if (melhor) return melhor.code;
  const bruto = texto.replace(/\s+/g, '');
  for (const k of chavesSubstr) {
    const pos = bruto.indexOf(k);
    if (pos >= 0 && (!melhor || pos < melhor.pos || (pos === melhor.pos && k.length > melhor.len)))
      melhor = { pos, len: k.length, code: indiceSubstr.get(k) };
  }
  return melhor ? melhor.code : null;
}

/** Mensagem que é só "67" (ou variações) */
function ehSpam67(texto) {
  return /^[\s6７7!.?]*$/.test(texto) && /6/.test(texto) && /[7７]/.test(texto);
}

module.exports = { paises, porCodigo, detectarPais, ehSpam67, CODIGOS };
