FROM node:20-bullseye 
ENV DEBIAN_FRONTEND=noninteractive 
ENV NODE_OPTIONS="--max-old-space-size=6144" 

# ==================== INSTALAR CHROME + FFMPEG + DEPENDÊNCIAS ====================
RUN apt-get update && apt-get install -y \
    # Chrome dependencies
    wget \
    gnupg \
    curl \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libgtk-3-0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    libgbm-dev \
    libvips-dev \
    # FFmpeg e dependências de mídia
    ffmpeg \
    libavcodec-extra \
    libavformat-dev \
    libavutil-dev \
    libswscale-dev \
    libavfilter-dev \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# ==================== VERIFICAR INSTALAÇÕES ====================
# Verificar se Chrome foi instalado
RUN google-chrome-stable --version

# Verificar se FFmpeg foi instalado corretamente
RUN ffmpeg -version && ffprobe -version

# Mostrar informações do sistema
RUN echo "=== SISTEMA CONFIGURADO ===" \
    && echo "Node: $(node --version)" \
    && echo "NPM: $(npm --version)" \
    && echo "Chrome: $(google-chrome-stable --version)" \
    && echo "FFmpeg: $(ffmpeg -version | head -1)" \
    && echo "FFprobe: $(ffprobe -version | head -1)" \
    && echo "======================="

# ==================== CONFIGURAÇÃO DO APP ====================
WORKDIR /app 
COPY package.json ./ 
RUN npm install --production --legacy-peer-deps 
COPY . . 

# ==================== VARIÁVEIS DE AMBIENTE ====================
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true 
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Variáveis para FFmpeg
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# ==================== USUÁRIOS E PERMISSÕES ====================
RUN mkdir -p /app/data \
    && mkdir -p /tmp/yaka_stickers \
    && groupadd -r chrome \
    && useradd -r -g chrome chrome \
    && mkdir -p /home/chrome/.config/google-chrome \
    && chown -R chrome:chrome /home/chrome /app /tmp/yaka_stickers

# ==================== CONFIGURAÇÃO FINAL ====================
EXPOSE 3000 
CMD ["node", "index.js"]