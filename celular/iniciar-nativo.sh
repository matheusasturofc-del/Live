#!/data/data/com.termux/files/usr/bin/bash
# Liga a live rodando DIRETO no Termux (sem o Debian/proot): mais leve e sem o travamento do navegador.
# Precisa de: pkg install tur-repo && pkg install chromium ffmpeg nodejs-lts
#   nohup bash ~/live/celular/iniciar-nativo.sh > ~/live.log 2>&1 &
termux-wake-lock 2>/dev/null || true
cd "$HOME/live" || exit 1
set -a; . "$HOME/live.env"; set +a
export CAPTURA=navegador
export CHROME="$(command -v chromium-browser || command -v chromium)"
export CHROME_FLAGS="${CHROME_FLAGS_NATIVO:---single-process}"
export TMPDIR="${TMPDIR:-$PREFIX/tmp}"
unset PULSE_SERVER
# Termux novo precisa do termux-exec (LD_PRELOAD) para executar programas; por isso o Chromium roda em
# processo único (--single-process): ele não consegue abrir processos internos ("CANNOT LINK EXECUTABLE").
if [ -z "$CHROME" ]; then echo "Chromium do Termux não encontrado: pkg install tur-repo && pkg install chromium"; exit 1; fi
while true; do
  bash ./transmitir.sh
  echo "A live parou, religando em 10s..."; sleep 10
done
