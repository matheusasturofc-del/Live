#!/data/data/com.termux/files/usr/bin/bash
# Plano B do celular: o Termux roda só o servidor + FFmpeg; o jogo roda no app Chrome do Android,
# que grava e manda o vídeo para cá. Abra no Chrome:  http://localhost:3000/?transmitir=1
# Precisa de: pkg install ffmpeg nodejs-lts
#   nohup bash ~/live/celular/iniciar-chrome.sh > ~/live.log 2>&1 &
termux-wake-lock 2>/dev/null || true
cd "$HOME/live" || exit 1
set -a; . "$HOME/live.env"; set +a
export CAPTURA=navegador
command -v ffmpeg >/dev/null || { echo "Falta o FFmpeg: pkg install ffmpeg"; exit 1; }
while true; do
  node servidor/server.js
  echo "Servidor parou, religando em 5s..."; sleep 5
done
