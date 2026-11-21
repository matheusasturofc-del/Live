#!/data/data/com.termux/files/usr/bin/bash
# Instala a live no próprio celular Android, usando o app Termux.
#   curl -fsSL https://raw.githubusercontent.com/matheusasturofc-del/Live/claude/live-infinita-automatizada-ns6yq7/celular/instalar-celular.sh | bash
# Roda em segundo plano (tela virtual), então o celular continua livre pra usar.
set -e
BRANCH="claude/live-infinita-automatizada-ns6yq7"
REPO="https://github.com/matheusasturofc-del/Live.git"
ENV="$HOME/live.env"

echo "=== 1/4 Instalando o básico no Termux ==="
pkg update -y
pkg install -y proot-distro pulseaudio

echo "=== 2/4 Instalando um Linux (Debian) dentro do Termux ==="
proot-distro install debian 2>/dev/null || echo "(Debian já estava instalado)"

echo "=== 3/4 Instalando navegador, FFmpeg e o jogo (demora uns 10-20 min) ==="
proot-distro login debian -- bash -c "
  set -e
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends chromium xvfb ffmpeg pulseaudio-utils fonts-noto-color-emoji \
    nodejs npm git curl ca-certificates
  if [ -d /root/live/.git ]; then
    git -C /root/live fetch --depth 1 origin $BRANCH && git -C /root/live reset --hard FETCH_HEAD
  else
    git clone --depth 1 -b $BRANCH $REPO /root/live
  fi
  cd /root/live && npm ci --omit=dev
"

if [ ! -f "$ENV" ]; then
  echo "=== 4/4 Configuração ==="
  read -r -p "Chave de transmissão do YouTube: " k < /dev/tty
  read -r -p "ID do seu canal (começa com UC...): " c < /dev/tty
  read -r -p "Crie uma senha para o painel /admin: " s < /dev/tty
  # celular: modo leve (24 fps) para não esquentar demais
  printf 'STREAM_KEY=%s\nYT_CHANNEL_ID=%s\nADMIN_SENHA=%s\nFPS=24\nPRESET=ultrafast\nBITRATE=2500k\nCHROME=/usr/bin/chromium\n' \
    "$k" "$c" "$s" > "$ENV"
  chmod 600 "$ENV"
fi

# ---------- comandos "live" e "live-parar" ----------
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
  proot-distro login debian --bind "$HOME/live.env:/root/live.env" -- bash -c \
    'set -a; . /root/live.env; set +a; export PULSE_SERVER=127.0.0.1; cd /root/live && exec ./transmitir.sh'
  echo "A live parou, religando em 10s..."; sleep 10
done
EOF
cat > "$HOME/live-parar.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
pkill -f live-iniciar.sh; pkill -f transmitir.sh; pkill -f ffmpeg; pkill -f chromium; pkill -f Xvfb
pkill -f "servidor/server.js"; pkill -f proot; pulseaudio --kill; termux-wake-unlock 2>/dev/null
echo "Live parada."
EOF
chmod +x "$HOME/live-iniciar.sh" "$HOME/live-parar.sh"
grep -q "alias live=" "$HOME/.bashrc" 2>/dev/null || {
  echo "alias live='nohup bash ~/live-iniciar.sh > ~/live.log 2>&1 & echo Live ligando em segundo plano. Ver: live-log'" >> "$HOME/.bashrc"
  echo "alias live-parar='bash ~/live-parar.sh'" >> "$HOME/.bashrc"
  echo "alias live-log='tail -f ~/live.log'" >> "$HOME/.bashrc"
  echo "alias live-atualizar='curl -fsSL https://raw.githubusercontent.com/matheusasturofc-del/Live/$BRANCH/celular/instalar-celular.sh | bash'" >> "$HOME/.bashrc"
}

# Liga sozinha quando o celular reiniciar (precisa do app Termux:Boot)
mkdir -p "$HOME/.termux/boot"
printf '#!/data/data/com.termux/files/usr/bin/bash\nbash ~/live-iniciar.sh > ~/live.log 2>&1\n' > "$HOME/.termux/boot/live"
chmod +x "$HOME/.termux/boot/live"

echo
echo "✅ Instalado!"
echo "   Ligar a live:   live      (feche e abra o Termux uma vez antes)"
echo "   Parar a live:   live-parar"
echo "   Ver o que acontece: live-log   (sair: Ctrl+C)"
echo "   Painel:         http://localhost:3000/admin  (no navegador do celular)"
echo "   Ver o jogo:     http://localhost:3000/"
