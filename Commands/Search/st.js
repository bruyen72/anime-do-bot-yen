const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO SIMPLES PARA STICKER
// ========================================
const STICKER_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_sticker'),
    MAX_SIZE_STATIC: 80000,     // 80KB
    MAX_SIZE_ANIMATED: 65000,   // 65KB
    MAX_DURATION: 6,            // 6 segundos
    QUALITY_LEVELS: [78, 63, 48, 33, 18],
    STANDARD_SIZE: 512
};

// Criar diretório se não existir
if (!fs.existsSync(STICKER_CONFIG.TEMP_DIR)) {
    fs.mkdirSync(STICKER_CONFIG.TEMP_DIR, { recursive: true });
}

// ========================================
// DOWNLOAD USANDO O SISTEMA DO SEU INDEX
// ========================================
async function downloadMedia(quoted, m) {
    console.log('📥 Download de mídia...');
    
    const strategies = [
        () => quoted?.fakeObj ? downloadMediaMessage(quoted.fakeObj, 'buffer', {}) : null,
        () => quoted ? downloadMediaMessage(quoted, 'buffer', {}) : null,
        () => m.message ? downloadMediaMessage(m, 'buffer', {}) : null,
        () => quoted?.message ? downloadMediaMessage(quoted.message, 'buffer', {}) : null
    ];
    
    for (let i = 0; i < strategies.length; i++) {
        try {
            const buffer = await Promise.race([
                strategies[i](),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);
            
            if (buffer && buffer.length > 0) {
                console.log(`✅ Download: ${(buffer.length / 1024).toFixed(1)}KB`);
                return buffer;
            }
        } catch (error) {
            console.log(`❌ Estratégia ${i + 1}: ${error.message}`);
        }
    }
    
    throw new Error('Download falhou');
}

// ========================================
// PROCESSAMENTO PADRÃO SEM ZOOM
// ========================================
async function processSticker(inputPath, outputPath, isVideo) {
    console.log(`🔄 Processamento PADRÃO - ${isVideo ? 'VÍDEO' : 'IMAGEM'}`);
    
    const maxSize = isVideo ? STICKER_CONFIG.MAX_SIZE_ANIMATED : STICKER_CONFIG.MAX_SIZE_STATIC;
    
    for (const quality of STICKER_CONFIG.QUALITY_LEVELS) {
        try {
            console.log(`🔄 Processando qualidade ${quality}...`);
            
            if (isVideo) {
                // ========== VÍDEO USANDO SEU FFMPEG ==========
                const args = [
                    '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', inputPath,
                    '-vf', `scale=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
                    '-c:v', 'libwebp',
                    '-lossless', '0',
                    '-compression_level', '6',
                    '-quality', quality.toString(),
                    '-method', '6',
                    '-loop', '0',
                    '-an', '-sn', '-dn',
                    '-t', STICKER_CONFIG.MAX_DURATION.toString(),
                    outputPath
                ];
                
                // Usar ffmpeg direto (seu sistema já configura o PATH)
                const process = spawn('ffmpeg', args);
                
                await new Promise((resolve, reject) => {
                    process.on('close', (code) => {
                        code === 0 ? resolve() : reject(new Error(`FFmpeg: ${code}`));
                    });
                    
                    process.on('error', reject);
                    
                    // Timeout reduzido
                    setTimeout(() => {
                        process.kill('SIGKILL');
                        reject(new Error('Timeout'));
                    }, 25000);
                });
                
            } else {
                // ========== IMAGEM USANDO SHARP ==========
                const inputBuffer = fs.readFileSync(inputPath);
                
                const outputBuffer = await sharp(inputBuffer)
                    .resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .webp({
                        quality: quality,
                        lossless: false,
                        effort: 6
                    })
                    .toBuffer();
                
                fs.writeFileSync(outputPath, outputBuffer);
            }
            
            // Verificar resultado
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                const sizeKB = stats.size / 1024;
                
                console.log(`📊 Resultado Q${quality}: ${sizeKB.toFixed(1)}KB`);
                
                if (stats.size <= maxSize || quality === STICKER_CONFIG.QUALITY_LEVELS[STICKER_CONFIG.QUALITY_LEVELS.length - 1]) {
                    return sizeKB.toFixed(1);
                }
                
                console.log('⚠️ Muito grande, tentando qualidade menor...');
            }
            
        } catch (error) {
            console.log(`❌ Qualidade ${quality} falhou: ${error.message}`);
            if (quality === STICKER_CONFIG.QUALITY_LEVELS[STICKER_CONFIG.QUALITY_LEVELS.length - 1]) {
                throw error;
            }
        }
    }
    
    throw new Error('Processamento falhou');
}

// ========================================
// COMANDO PRINCIPAL
// ========================================
module.exports = {
    name: "s",
    alias: ["sticker", "fig", "figurinha"],
    desc: "Criar sticker de imagem ou vídeo",
    category: "Converter",
    usage: ".s [responda mídia]",
    react: "🔥",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🔥 ========== STICKER SIMPLES ========== 🔥');
        
        const tempFiles = [];
        
        try {
            if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage) {
                return m.reply(
                    `🔥 **CRIAR STICKER**\n\n` +
                    `🚀 **Como usar:**\n` +
                    `• Responda uma imagem ou vídeo com ${prefix}s\n\n` +
                    `✅ **Suporta:**\n` +
                    `• Imagens (JPG, PNG, WEBP)\n` +
                    `• Vídeos e GIFs\n` +
                    `• Processamento rápido\n` +
                    `• Qualidade otimizada\n\n` +
                    `⚡ **STICKER PERFEITO GARANTIDO!**`
                );
            }
            
            // Usar seu sistema anti-hang
            const buffer = await downloadMedia(quoted || m, m);
            const fileInfo = await fileType.fromBuffer(buffer);
            const isVideo = fileInfo?.mime?.startsWith('video/') || fileInfo?.ext === 'gif';
            
            // Verificar tamanho do arquivo
            if (buffer.length > 10 * 1024 * 1024) { // 10MB
                return m.reply('❌ **Arquivo muito grande!**\n\nTamanho máximo: 10MB');
            }
            
            // Mensagem de progresso para arquivos grandes
            let progressMsg = null;
            if (buffer.length > 1 * 1024 * 1024) { // 1MB
                progressMsg = await m.reply(
                    `🔄 **CRIANDO STICKER**\n\n` +
                    `📊 Arquivo: ${(buffer.length / 1024).toFixed(1)}KB\n` +
                    `🎯 Tipo: ${isVideo ? 'Vídeo/GIF animado' : 'Imagem estática'}\n` +
                    `⚡ Processando...\n\n` +
                    `⏱️ Isso pode levar alguns segundos`
                );
            }
            
            const uniqueId = Date.now();
            const inputPath = path.join(STICKER_CONFIG.TEMP_DIR, `input_${uniqueId}.${fileInfo?.ext || 'tmp'}`);
            const outputPath = path.join(STICKER_CONFIG.TEMP_DIR, `sticker_${uniqueId}.webp`);
            tempFiles.push(inputPath, outputPath);
            
            fs.writeFileSync(inputPath, buffer);
            
            const startTime = Date.now();
            const sizeKB = await processSticker(inputPath, outputPath, isVideo);
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
            
            const stickerBuffer = fs.readFileSync(outputPath);
            
            // Remover mensagem de progresso
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) {}
            }
            
            // Enviar sticker
            await Yaka.sendMessage(m.chat, { 
                sticker: stickerBuffer 
            }, { quoted: m });
            
            console.log(`✅ STICKER concluído: ${sizeKB}KB em ${processingTime}s`);
            
        } catch (error) {
            console.error('❌ Erro sticker:', error.message);
            
            // Remover mensagem de progresso em caso de erro
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) {}
            }
            
            // Mensagem de erro amigável
            let errorMsg = '❌ **Erro ao criar sticker**\n\n';
            
            if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                errorMsg += '⏱️ Tempo limite excedido\n💡 Tente com um arquivo menor';
            } else if (error.message.includes('FFmpeg')) {
                errorMsg += '🎬 Erro no processamento de vídeo\n💡 Tente converter o vídeo primeiro';
            } else if (error.message.includes('Download')) {
                errorMsg += '📥 Erro no download\n💡 Tente reenviar o arquivo';
            } else {
                errorMsg += `🔧 ${error.message}\n💡 Tente com outro arquivo`;
            }
            
            m.reply(errorMsg);
        } finally {
            // Limpar arquivos temporários
            tempFiles.forEach(f => { 
                try {
                    if (fs.existsSync(f)) fs.unlinkSync(f); 
                } catch (e) {}
            });
        }
    }
};

// ========================================
// INICIALIZAÇÃO
// ========================================
console.log('\n🔥 ========== STICKER SIMPLES CARREGADO ========== 🔥');
console.log('⚡ Integrado com seu sistema ANTI-HANG');
console.log('🎬 Compatível com seu FFmpeg');
console.log('📏 Tamanho: 512x512 padrão');
console.log('🚀 Comando: .s [responder mídia]');
console.log('==========================================\n');
