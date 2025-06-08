# Dockerfile otimizado para Railway - Node 20 para Baileys
FROM node:20-bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Instalar dependências em uma única camada
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copiar e instalar dependências primeiro (para cache)
COPY package*.json ./
RUN npm ci --only=production --no-audit --legacy-peer-deps && npm cache clean --force

# Copiar código
COPY . .

# Criar diretórios e usuário
RUN mkdir -p /app/data /tmp/yaka_stickers \
    && adduser --disabled-password --gecos '' chrome \
    && chown -R chrome:chrome /app /tmp/yaka_stickers

EXPOSE 3000

USER chrome

CMD ["node", "index.js"]
