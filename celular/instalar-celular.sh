#!/data/data/com.termux/files/usr/bin/bash
# Instala a live no próprio celular Android, usando o app Termux.
#   curl -fsSL https://raw.githubusercontent.com/matheusasturofc-del/Live/claude/live-infinita-automatizada-ns6yq7/celular/instalar-celular.sh | bash
# Roda em segundo plano (tela virtual), então o celular continua livre pra usar.
set -e
BRANCH="claude/live-infinita-automatizada-ns6yq7"
REPO="https://github.com/matheusasturofc-del/Live.git"
ENV="$HOME/live.env"
PASTA="$HOME/live"

echo "=== 1/5 Conferindo espaço livre ==="
livre_mb=$(( $(df -k "$HOME" | awk 'NR==2{print $4}') / 1024 ))
echo "Espaço livre: ${livre_mb} MB"
if [ "$livre_mb" -lt 2500 ]; then
  echo "❌ Precisa de pelo menos 2500 MB livres (ideal: 3000 MB)."
  echo "   Apague fotos/vídeos/apps e rode o comando de novo."
  exit 1
fi

echo "=== 2/5 Instalando o básico no Termux ==="
pkg update -y
pkg install -y proot-distro pulseaudio git nodejs-lts

echo "=== 3/5 Baixando o jogo ==="
if [ -d "$PASTA/.git" ]; then
  git -C "$PASTA" fetch --depth 1 origin "$BRANCH" && git -C "$PASTA" reset --hard FETCH_HEAD
else
  git clone --depth 1 -b "$BRANCH" "$REPO" "$PASTA"
fi
(cd "$PASTA" && npm ci --omit=dev --no-audit --no-fund)

echo "=== 4/5 Instalando Linux + navegador + FFmpeg (demora uns 10-20 min) ==="
proot-distro install debian 2>/dev/null || echo "(Debian já estava instalado)"
proot-distro login debian -- bash -c "
  export DEBIAN_FRONTEND=noninteractive
  dpkg --configure -a 2>/dev/null || true
  apt-get clean
  apt-get update
  apt-get install -y --no-install-recommends chromium xvfb ffmpeg pulseaudio-utils \
    fonts-noto-color-emoji nodejs ca-certificates curl
  apt-get clean   # apaga os downloads para liberar espaço
"

if [ ! -f "$ENV" ]; then
  echo "=== 5/5 Configuração ==="
  read -r -p "Chave de transmissão do YouTube: " k < /dev/tty
  read -r -p "ID do seu canal (começa com UC...): " c < /dev/tty
  read -r -p "Crie uma senha para o painel /admin: " s < /dev/tty
  # celular: modo leve (24 fps) para não esquentar demais
  printf 'STREAM_KEY=%s\nYT_CHANNEL_ID=%s\nADMIN_SENHA=%s\nFPS=24\nPRESET=ultrafast\nBITRATE=2500k\nCHROME=/usr/bin/chromium\nCHROME_FLAGS=--single-process\nCAPTURA=navegador\n' \
    "$k" "$c" "$s" > "$ENV"
  chmod 600 "$ENV"
fi

# ---------- comandos "live", "live-parar", "live-log", "live-atualizar" ----------
cat > "$HOME/live-iniciar.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Liga a live (e religa sozinha se cair)
termux-wake-lock 2>/dev/null || true
pulseaudio --kill >/dev/null 2>&1 || true
pulseaudio --start --exit-idle-time=-1 \
  --load="module-native-protocol-tcp auth-ip-acl=127.0.0.1 auth-anonymous=1"
sleep 1
pactl load-module module-null-sink sink_name=live >/dev/null   # som vai pra live, não pro alto-falante
pactl set-default-sink live
while true; do
  proot-distro login debian --bind "$HOME/live:/root/live" --bind "$HOME/live.env:/root/live.env" -- bash -c \
    'set -a; . /root/live.env; set +a; export PULSE_SERVER=127.0.0.1; cd /root/live && exec ./transmitir.sh'
  echo "A live parou, religando em 10s..."; sleep 10
done
EOF
cat > "$HOME/live-parar.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Para a live na hora (força o fechamento de tudo)
pkill -9 -f live-iniciar.sh
pkill -9 -f proot
pkill -9 -f "ffmpeg|chromium|Xvfb|servidor/server.js" 2>/dev/null
pulseaudio --kill 2>/dev/null
(termux-wake-unlock >/dev/null 2>&1 &)
echo "Live parada."
EOF
chmod +x "$HOME/live-iniciar.sh" "$HOME/live-parar.sh"
# comandos de verdade (funcionam na hora, sem reabrir o Termux)
sed -i '/alias live/d' "$HOME/.bashrc" 2>/dev/null || true
B="$PREFIX/bin"
printf '#!/data/data/com.termux/files/usr/bin/bash\nnohup bash ~/live-iniciar.sh > ~/live.log 2>&1 &\necho "Live ligando em segundo plano. Para ver: live-log"\n' > "$B/live"
printf '#!/data/data/com.termux/files/usr/bin/bash\nbash ~/live-parar.sh\n' > "$B/live-parar"
printf '#!/data/data/com.termux/files/usr/bin/bash\ntail -n 30 -f ~/live.log\n' > "$B/live-log"
printf '#!/data/data/com.termux/files/usr/bin/bash\ncurl -fsSL https://raw.githubusercontent.com/matheusasturofc-del/Live/%s/celular/instalar-celular.sh | bash\n' "$BRANCH" > "$B/live-atualizar"
chmod +x "$B/live" "$B/live-parar" "$B/live-log" "$B/live-atualizar"

# Liga sozinha quando o celular reiniciar (precisa do app Termux:Boot)
mkdir -p "$HOME/.termux/boot"
printf '#!/data/data/com.termux/files/usr/bin/bash\nbash ~/live-iniciar.sh > ~/live.log 2>&1\n' > "$HOME/.termux/boot/live"
chmod +x "$HOME/.termux/boot/live"

echo
echo "✅ Instalado! Espaço livre agora: $(( $(df -k "$HOME" | awk 'NR==2{print $4}') / 1024 )) MB"
echo "   Ligar a live:   live"
echo "   Parar a live:   live-parar"
echo "   Ver o que acontece: live-log   (sair: Ctrl+C)"
echo "   Painel:         http://localhost:3000/admin  (no navegador do celular)"
echo "   Ver o jogo:     http://localhost:3000/"
