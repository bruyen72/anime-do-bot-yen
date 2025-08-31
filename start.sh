#!/bin/bash

echo "🚀 YAKABOT INICIANDO..."
echo "======================="

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p /opt/render/.cache/puppeteer
mkdir -p /tmp/yaka_stickers
mkdir -p /tmp/yaka_uploads

# Configurar variáveis de ambiente
export PUPPETEER_CACHE_DIR="/opt/render/.cache/puppeteer"
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="false"

echo "🔧 Instalando Chrome (FORÇADO)..."
npx puppeteer browsers install chrome --force

# Aguardar instalação
sleep 3

# Verificar se Chrome foi instalado
echo "🔍 Verificando instalação do Chrome..."
if [ -d "/opt/render/.cache/puppeteer/chrome" ]; then
    echo "✅ Diretório Puppeteer Chrome existe!"
    
    # Listar versões instaladas
    ls -la /opt/render/.cache/puppeteer/chrome/
    
    # Procurar executável do Chrome
    CHROME_PATH=$(find /opt/render/.cache/puppeteer/chrome -name "chrome" -type f 2>/dev/null | head -1)
    
    if [ -n "$CHROME_PATH" ]; then
        echo "✅ Chrome encontrado: $CHROME_PATH"
        
        # Tornar executável
        chmod +x "$CHROME_PATH"
        
        # Configurar variável
        export PUPPETEER_EXECUTABLE_PATH="$CHROME_PATH"
        
        # Testar Chrome
        if "$CHROME_PATH" --version 2>/dev/null; then
            echo "✅ Chrome funcional!"
        else
            echo "⚠️ Chrome instalado mas com problemas"
        fi
    else
        echo "❌ Chrome não encontrado após instalação"
    fi
else
    echo "❌ Diretório Puppeteer Chrome não criado"
fi

echo ""
echo "🚀 INICIANDO APLICAÇÃO..."
echo "========================"

# Iniciar aplicação
node --max-old-space-size=512 index.js
