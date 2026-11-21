#!/usr/bin/env bash
# Live infinita: transmite em loop para YouTube/Twitch/etc. e se reconecta sozinha se cair.
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="${CONFIG:-$DIR/config.env}"
[ -f "$CONFIG" ] || { echo "Falta $CONFIG. Rode: cp config.env.example config.env"; exit 1; }
# shellcheck source=/dev/null
source "$CONFIG"

MODO="${MODO:-videos}"; EMBARALHAR="${EMBARALHAR:-1}"
RESOLUCAO="${RESOLUCAO:-1280x720}"; FPS="${FPS:-30}"
BITRATE_VIDEO="${BITRATE_VIDEO:-3000k}"; BITRATE_AUDIO="${BITRATE_AUDIO:-128k}"
PRESET="${PRESET:-veryfast}"; COPIAR_SEM_RECODIFICAR="${COPIAR_SEM_RECODIFICAR:-0}"
W="${RESOLUCAO%x*}"; H="${RESOLUCAO#*x}"
# SAIDA pode ser sobrescrita para testes (ex.: SAIDA=teste.flv)
SAIDA="${SAIDA:-${RTMP_URL%/}/${STREAM_KEY}}"
LISTA="$DIR/.playlist.txt"

log() { echo "[$(date '+%F %T')] $*"; }

# Gera a playlist no formato do concat do ffmpeg
gerar_lista() {
  local pasta="$1" padrao="$2"
  local arquivos
  arquivos="$(find "$pasta" -maxdepth 1 -type f -regextype posix-extended -iregex ".*\.($padrao)$" | sort)"
  [ -n "$arquivos" ] || { log "Nenhum arquivo em $pasta"; return 1; }
  [ "$EMBARALHAR" = "1" ] && arquivos="$(echo "$arquivos" | shuf)"
  : > "$LISTA"
  while IFS= read -r f; do
    printf "file '%s'\n" "${f//\'/\'\\\'\'}" >> "$LISTA"
  done <<< "$arquivos"
  log "Playlist com $(wc -l < "$LISTA") arquivo(s) de $pasta"
}

GOP=$((FPS * 2))  # keyframe a cada 2s (exigência do YouTube: <= 4s)
ENC_VIDEO=(-c:v libx264 -preset "$PRESET" -b:v "$BITRATE_VIDEO" -maxrate "$BITRATE_VIDEO"
           -bufsize "$(( ${BITRATE_VIDEO%k} * 2 ))k" -pix_fmt yuv420p
           -g "$GOP" -keyint_min "$GOP" -sc_threshold 0 -r "$FPS")
ENC_AUDIO=(-c:a aac -b:a "$BITRATE_AUDIO" -ar 44100 -ac 2)
ESCALA="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p"

transmitir() {
  case "$MODO" in
    videos)
      if [ "$COPIAR_SEM_RECODIFICAR" = "1" ]; then
        gerar_lista "$DIR/midia/preparados" "mp4" || return 1
        ffmpeg -hide_banner -loglevel warning -stats -re -stream_loop -1 \
          -f concat -safe 0 -i "$LISTA" -c copy -f flv "$SAIDA"
      else
        gerar_lista "$DIR/midia/videos" "mp4|mkv|mov|webm|avi|flv" || return 1
        ffmpeg -hide_banner -loglevel warning -stats -re -stream_loop -1 \
          -f concat -safe 0 -i "$LISTA" \
          -vf "$ESCALA" "${ENC_VIDEO[@]}" "${ENC_AUDIO[@]}" -f flv "$SAIDA"
      fi
      ;;
    imagem)
      local img
      img="$(find "$DIR/midia/imagem" -maxdepth 1 -type f -regextype posix-extended -iregex '.*\.(jpg|jpeg|png|webp)$' | head -1)"
      [ -n "$img" ] || { log "Coloque uma imagem em midia/imagem"; return 1; }
      gerar_lista "$DIR/midia/musicas" "mp3|m4a|aac|wav|ogg|flac|opus" || return 1
      ffmpeg -hide_banner -loglevel warning -stats \
        -re -loop 1 -framerate "$FPS" -i "$img" \
        -re -stream_loop -1 -f concat -safe 0 -i "$LISTA" \
        -map 0:v -map 1:a -vf "$ESCALA" "${ENC_VIDEO[@]}" -tune stillimage \
        "${ENC_AUDIO[@]}" -f flv "$SAIDA"
      ;;
    *) log "MODO inválido: $MODO (use videos ou imagem)"; exit 1 ;;
  esac
}

trap 'log "Encerrando."; exit 0' INT TERM
log "Iniciando live infinita (modo: $MODO, ${RESOLUCAO}@${FPS}fps)"
while true; do
  transmitir
  log "Transmissão parou (código $?). Reconectando em 10s..."
  sleep 10
done
