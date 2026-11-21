// Leitura do chat: YouTube (sem chave de API, sem limite de cota) ou simulado para testes.
const { LiveChat } = require('youtube-chat');

function textoDaMensagem(partes) {
  return (partes || []).map((p) => (p.text !== undefined ? p.text : p.emojiText || '')).join('');
}

/**
 * Conecta ao chat e chama:
 *   aoComentar({ usuario, texto })
 *   aoDoar({ usuario, valor, texto })
 */
function iniciarChat({ fonte, canalId, videoId, aoComentar, aoDoar, log }) {
  if (fonte === 'simulado') return simular({ aoComentar, aoDoar });
  if (!canalId && !videoId) {
    log('Chat desativado: defina YT_CHANNEL_ID (ou YT_VIDEO_ID).');
    return;
  }

  let chat = null;
  const conectar = async () => {
    if (chat) { try { chat.stop(); } catch (_) { /* ignora */ } }
    chat = new LiveChat(videoId ? { liveId: videoId } : { channelId: canalId }, 3000);
    chat.on('start', (id) => log(`Chat conectado (live ${id})`));
    chat.on('chat', (item) => {
      const usuario = item.author?.name || 'someone';
      const texto = textoDaMensagem(item.message);
      if (item.superchat) aoDoar({ usuario, valor: item.superchat.amount, texto });
      else if (item.isMembership) aoDoar({ usuario, valor: 'MEMBER', texto });
      if (texto) aoComentar({ usuario, texto });
    });
    chat.on('error', (e) => log('Erro no chat: ' + (e?.message || e)));
    chat.on('end', () => { log('Chat terminou, tentando de novo em 30s'); setTimeout(conectar, 30000); });
    const ok = await chat.start().catch(() => false);
    if (!ok) { log('Live ainda não encontrada, tentando de novo em 30s'); setTimeout(conectar, 30000); }
  };
  conectar();
}

// Comentários falsos em várias línguas, para testar sem estar ao vivo
function simular({ aoComentar, aoDoar }) {
  const nomes = ['lucas_br', 'ahmed99', 'sakura', 'maria.lopez', 'johnny', 'priya_k', 'ivan', 'kemal',
    'fatima', 'chen', 'oliver', 'ana_pt', 'diego', 'yuki', 'rahul', 'sofia'];
  const frases = ['Brasil!!!', 'Pakistan zindabad', '🇵🇹🇵🇹🇵🇹', 'India', 'Türkiye', 'ALEMANIA', 'Россия',
    'مصر', 'भारत', '日本', 'Indonesia', 'go usa', 'Argentina', 'France!', 'Nigeria', 'Philippines',
    'méxico', 'España', 'Morocco', 'Polska', 'Egypt', 'Canada', '67', '67', 'lol', 'Brazil', 'Bangladesh',
    'Vietnam', '한국', 'Colombia', 'Italia', 'England', 'Japan', 'Saudi Arabia', 'Peru', 'Chile'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  setInterval(() => aoComentar({ usuario: pick(nomes), texto: pick(frases) }), 900);
  setInterval(() => {
    const valores = ['$5.00', 'R$10,00', '€2.00', '₹100.00', '$20.00', 'R$50,00', 'MEMBER'];
    aoDoar({ usuario: pick(nomes), valor: pick(valores), texto: 'love this!' });
  }, 25000);
}

module.exports = { iniciarChat };
