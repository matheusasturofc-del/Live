# Dockerfile para rodar a live no Hugging Face Spaces (grátis, sem cartão).
# Copie TODO este arquivo para um arquivo chamado "Dockerfile" no seu Space (SDK: Docker).
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git chromium xvfb pulseaudio pulseaudio-utils \
      ffmpeg fonts-noto-color-emoji ca-certificates curl && rm -rf /var/lib/apt/lists/*
# Muda sempre que o código no GitHub muda -> o Space baixa a versão nova ao reconstruir
ADD https://api.github.com/repos/matheusasturofc-del/Live/commits/claude/live-infinita-automatizada-ns6yq7 /tmp/versao.json
RUN git clone --depth 1 -b claude/live-infinita-automatizada-ns6yq7 https://github.com/matheusasturofc-del/Live.git /app \
    && cd /app && npm ci --omit=dev && chown -R 1000:1000 /app
# Músicas opcionais: se você subir fundo.mp3 e/ou doacao.mp3 no Space, elas entram aqui
COPY --chown=1000:1000 . /tmp/space
RUN cp /tmp/space/fundo.mp3 /tmp/space/doacao.mp3 /app/public/audio/custom/ 2>/dev/null; true
WORKDIR /app
ENV CHROME=/usr/bin/chromium DADOS_DIR=/tmp/dados PORT=7860 HOME=/tmp \
    RTMP_URL=rtmps://a.rtmps.youtube.com:443/live2
USER 1000
EXPOSE 7860
CMD ["./transmitir.sh"]
