#!/bin/bash
echo "🚀 Iniciando configuração para Koyeb..."

# Instalar Chrome
echo "📦 Instalando Chrome..."
if command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu
    apt-get update
    apt-get install -y wget gnupg ca-certificates
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
    apt-get update
    apt-get install -y google-chrome-stable
elif command -v yum >/dev/null 2>&1; then
    # CentOS/RHEL
    yum install -y wget
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
    yum install -y google-chrome-stable_current_x86_64.rpm
elif command -v apk >/dev/null 2>&1; then
    # Alpine
    apk update
    apk add --no-cache chromium
    export CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
fi

# Instalar FFmpeg
echo "🎬 Instalando FFmpeg..."
if command -v apt-get >/dev/null 2>&1; then
    apt-get install -y ffmpeg
elif command -v yum >/dev/null 2>&1; then
    yum install -y ffmpeg
elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache ffmpeg
fi

# Instalar Chrome via Puppeteer como fallback
echo "🌐 Instalando Chrome via Puppeteer..."
npx puppeteer browsers install chrome || echo "⚠️ Puppeteer Chrome install failed"

# Verificar instalações
echo "✅ Verificando instalações..."
if command -v google-chrome >/dev/null 2>&1; then
    echo "✓ Chrome instalado: $(google-chrome --version)"
elif command -v chromium >/dev/null 2>&1; then
    echo "✓ Chromium instalado: $(chromium --version)"
else
    echo "⚠️ Chrome/Chromium não encontrado"
fi

if command -v ffmpeg >/dev/null 2>&1; then
    echo "✓ FFmpeg instalado: $(ffmpeg -version | head -1)"
else
    echo "⚠️ FFmpeg não encontrado"
fi

echo "🎉 Configuração concluída!"