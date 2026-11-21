FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium xvfb pulseaudio pulseaudio-utils ffmpeg fonts-noto-color-emoji ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV CHROME=/usr/bin/chromium DADOS_DIR=/dados PORT=3000
VOLUME /dados
EXPOSE 3000
CMD ["./transmitir.sh"]
