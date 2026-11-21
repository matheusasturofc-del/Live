#!/usr/bin/env bash
# Instalador de 1 comando para um servidor Ubuntu/Debian (VPS).
#   curl -fsSL https://raw.githubusercontent.com/matheusasturofc-del/Live/claude/live-infinita-automatizada-ns6yq7/instalar.sh | sudo bash
# Rodar de novo = atualiza o jogo mantendo suas configurações, votos e campeões.
set -e
REPO="https://github.com/matheusasturofc-del/Live.git"
BRANCH="${BRANCH:-claude/live-infinita-automatizada-ns6yq7}"
PASTA=/opt/live
ENV=/opt/live.env

[ "$(id -u)" = 0 ] || { echo "Rode com sudo"; exit 1; }

perguntar() { # pergunta mesmo quando o script vem por "curl | bash"
  local var="$1" texto="$2" valor=""
  read -r -p "$texto: " valor < /dev/tty
  printf '%s=%s\n' "$var" "$valor" >> "$ENV"
}

if [ ! -f "$ENV" ]; then
  echo "=== Configuração (só na primeira vez) ==="
  perguntar STREAM_KEY "Chave de transmissão do YouTube"
  perguntar YT_CHANNEL_ID "ID do seu canal (começa com UC...)"
  perguntar ADMIN_SENHA "Crie uma senha para o painel /admin"
  # Servidor de 1 núcleo: modo leve (24 fps, compressão mais rápida)
  if [ "$(nproc)" -le 1 ]; then
    printf 'FPS=24\nPRESET=ultrafast\nBITRATE=2500k\n' >> "$ENV"
    echo "Servidor com 1 núcleo: modo leve ativado."
  fi
  chmod 600 "$ENV"
fi

# Pouca RAM (ex.: 1 GB): cria 2 GB de memória extra no disco (swap) para não travar
if [ "$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)" -lt 1800 ] && ! swapon --show | grep -q .; then
  echo "=== Pouca RAM: criando 2 GB de swap ==="
  (fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048) && chmod 600 /swapfile \
    && mkswap /swapfile >/dev/null && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab || true
fi

echo "=== Instalando Docker e Git ==="
command -v git >/dev/null || (apt-get update && apt-get install -y git)
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh

echo "=== Baixando o jogo ==="
if [ -d "$PASTA/.git" ]; then git -C "$PASTA" fetch --depth 1 origin "$BRANCH" && git -C "$PASTA" reset --hard FETCH_HEAD
else git clone --depth 1 -b "$BRANCH" "$REPO" "$PASTA"; fi

# Oracle Cloud: a imagem Ubuntu deles bloqueia portas no firewall interno. Libera a 80 (painel /admin).
if iptables -S INPUT 2>/dev/null | grep -q REJECT; then
  echo "=== Liberando a porta 80 no firewall interno ==="
  iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
  command -v netfilter-persistent >/dev/null && netfilter-persistent save >/dev/null 2>&1 || true
fi

echo "=== Montando (pode levar alguns minutos) ==="
docker build -t live "$PASTA"
mkdir -p /opt/live-dados /opt/live-musicas
docker rm -f live >/dev/null 2>&1 || true
docker run -d --name live --restart always --shm-size=1g --env-file "$ENV" \
  -p 80:3000 -v /opt/live-dados:/dados -v /opt/live-musicas:/app/public/audio/custom live

IP=$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
echo
echo "✅ Pronto! A live liga sozinha e volta sozinha se o servidor reiniciar."
echo "   Ver o jogo:      http://$IP/"
echo "   Painel (músicas): http://$IP/admin"
echo "   Ver o log:       docker logs -f live"
echo "   Mudar a chave:   nano $ENV  e depois  docker restart live"
