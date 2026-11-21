#!/usr/bin/env bash
# Converte todos os vídeos de midia/videos para um formato idêntico em midia/preparados.
# Depois disso, use COPIAR_SEM_RECODIFICAR=1 e a live gasta quase nada de CPU
# (permite usar um servidor bem barato).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
[ -f "$DIR/config.env" ] && source "$DIR/config.env"
RESOLUCAO="${RESOLUCAO:-1280x720}"; FPS="${FPS:-30}"
BITRATE_VIDEO="${BITRATE_VIDEO:-3000k}"; BITRATE_AUDIO="${BITRATE_AUDIO:-128k}"
W="${RESOLUCAO%x*}"; H="${RESOLUCAO#*x}"; GOP=$((FPS * 2))
ESCALA="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p"

shopt -s nullglob nocaseglob
for f in "$DIR"/midia/videos/*.{mp4,mkv,mov,webm,avi,flv}; do
  nome="$(basename "${f%.*}")"; out="$DIR/midia/preparados/$nome.mp4"
  [ -f "$out" ] && { echo "Já existe: $nome"; continue; }
  echo ">> Preparando $nome"
  # Se o vídeo não tiver áudio, adiciona silêncio (a live precisa de áudio contínuo)
  if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then
    AUDIO=(-map 0:v:0 -map 0:a:0)
    EXTRA=()
  else
    EXTRA=(-f lavfi -i anullsrc=r=44100:cl=stereo)
    AUDIO=(-map 0:v:0 -map 1:a:0 -shortest)
  fi
  ffmpeg -hide_banner -loglevel warning -stats -y -i "$f" "${EXTRA[@]}" "${AUDIO[@]}" \
    -vf "$ESCALA" -r "$FPS" -c:v libx264 -preset medium -profile:v high \
    -b:v "$BITRATE_VIDEO" -maxrate "$BITRATE_VIDEO" -bufsize "$(( ${BITRATE_VIDEO%k} * 2 ))k" \
    -g "$GOP" -keyint_min "$GOP" -sc_threshold 0 \
    -c:a aac -b:a "$BITRATE_AUDIO" -ar 44100 -ac 2 -movflags +faststart "$out"
done
echo "Pronto. Agora coloque COPIAR_SEM_RECODIFICAR=1 no config.env."
