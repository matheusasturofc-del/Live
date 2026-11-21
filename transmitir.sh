#!/usr/bin/env bash
# Liga tudo e transmite para o YouTube 24/7:
#   tela virtual (Xvfb) + som virtual (PulseAudio) + jogo (Node + Chromium) + FFmpeg -> RTMP
# Se qualquer parte cair, ela é religada sozinha.
set -u
cd "$(dirname "$0")"

RTMP_URL="${RTMP_URL:-rtmp://a.rtmp.youtube.com/live2}"
SAIDA="${SAIDA:-${RTMP_URL%/}/${STREAM_KEY:-}}"
if [ -z "${STREAM_KEY:-}" ] && [ -z "${SAIDA_TESTE:-}" ]; then
  echo "ERRO: defina STREAM_KEY (chave de transmissão do YouTube)"; exit 1
fi
[ -n "${SAIDA_TESTE:-}" ] && SAIDA="$SAIDA_TESTE"
LARGURA=720; ALTURA=1280; FPS="${FPS:-30}"
BITRATE="${BITRATE:-3500k}"; PRESET="${PRESET:-veryfast}"
PORTA="${PORT:-3000}"
CHROME="${CHROME:-$(command -v chromium || command -v chromium-browser || command -v google-chrome || echo /opt/pw-browsers/chromium)}"
export DISPLAY=:99

log() { echo "[$(date '+%F %T')] $*"; }
# roda um comando para sempre, religando se cair
sempre() { local nome="$1"; shift; while true; do "$@"; log "$nome parou (código $?), religando em 3s"; sleep 3; done; }

trap 'log "Encerrando"; kill 0; exit 0' INT TERM

# 1) tela virtual
rm -f /tmp/.X99-lock
sempre Xvfb Xvfb :99 -screen 0 ${LARGURA}x${ALTURA}x24 -nolisten tcp -ac &
sleep 2

# 2) som virtual
# (no celular, o som virtual é ligado pelo Termux e chega aqui via PULSE_SERVER)
if [ -z "${PULSE_SERVER:-}" ]; then
  pulseaudio --kill >/dev/null 2>&1
  pulseaudio -D --exit-idle-time=-1 --disallow-exit --log-level=error 2>/dev/null
  sleep 1
  pactl load-module module-null-sink sink_name=live sink_properties=device.description=live >/dev/null
  pactl set-default-sink live
fi

# 3) servidor do jogo (votos, doações, chat do YouTube)
sempre servidor node servidor/server.js &
for _ in $(seq 1 30); do curl -s "localhost:$PORTA/api/votos" >/dev/null && break; sleep 1; done

# 4) navegador mostrando o jogo em tela cheia
# (--no-zygote/--disable-gpu: necessários no Linux dentro do Termux; os erros vão para navegador.log)
rm -rf /tmp/chrome-live/Singleton* 2>/dev/null
sempre navegador "$CHROME" --kiosk --no-sandbox --no-zygote --disable-gpu --no-first-run --noerrdialogs --disable-infobars \
  --disable-session-crashed-bubble --disable-dev-shm-usage --disable-features=Translate,VizDisplayCompositor \
  --autoplay-policy=no-user-gesture-required --password-store=basic --disable-breakpad \
  --window-position=0,0 --window-size=${LARGURA},${ALTURA} --user-data-dir=/tmp/chrome-live \
  --force-device-scale-factor=1 "http://localhost:$PORTA/" >> navegador.log 2>&1 &
sleep 15

# 5) captura tela + som e envia para o YouTube
log "Transmitindo ${LARGURA}x${ALTURA}@${FPS}fps"
sempre ffmpeg ffmpeg -hide_banner -loglevel warning \
  -thread_queue_size 512 -f x11grab -draw_mouse 0 -framerate "$FPS" -video_size ${LARGURA}x${ALTURA} -i :99 \
  -thread_queue_size 512 -f pulse -i live.monitor \
  -c:v libx264 -preset "$PRESET" -tune zerolatency -b:v "$BITRATE" -maxrate "$BITRATE" -bufsize "$(( ${BITRATE%k} * 2 ))k" \
  -pix_fmt yuv420p -g $((FPS * 2)) -keyint_min $((FPS * 2)) -sc_threshold 0 \
  -c:a aac -b:a 160k -ar 44100 -ac 2 \
  -f flv "$SAIDA"
