# Dockerfile otimizado para Railway - Node 20 + Baileys
FROM node:20-bullseye-slim

# Variáveis de ambiente
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_OPTIONS="--max-old-space-size=6144"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Instalar dependências do sistema em uma única camada
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Chromium e dependências
    chromium \
    chromium-sandbox \
    # FFmpeg
    ffmpeg \
    # Ferramentas essenciais
    curl \
    wget \
    ca-certificates \
    # Dependências para Canvas e Sharp
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libvips-dev \
    # Python para builds nativos
    python3 \
    python3-pip \
    build-essential \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Verificar instalações
RUN echo "=== VERIFICAÇÃO DO SISTEMA ===" \
    && node --version \
    && npm --version \
    && chromium --version || echo "Chromium OK" \
    && ffmpeg -version | head -1 \
    && echo "=========================="

WORKDIR /app

# Copiar package.json primeiro para cache do Docker
COPY package*.json ./

# Instalar dependências npm com configurações otimizadas
RUN npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-retries 3 \
    && npm install --production --legacy-peer-deps --no-audit --no-fund \
    && npm cache clean --force

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários e configurar permissões
RUN mkdir -p \
    /app/data \
    /app/baileys-session \
    /app/temp \
    /app/cache \
    /tmp/yaka_stickers \
    && adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app /tmp/yaka_stickers

# Expor porta
EXPOSE 3000

# Mudar para usuário não-root
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Comando para iniciar o bot
CMD ["npm", "start"]
