const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO PADRÃO PARA STICKER
// ========================================
const STICKER_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_stickers'),
    
    MAX_SIZE_STATIC: 80000,     // 80KB
    MAX_SIZE_ANIMATED: 65000,   // 65KB
    MAX_DURATION: 6,            // 6 segundos
    
    QUALITY_LEVELS: [25, 20, 15, 10, 5] // Qualidades otimizadas para WebP (menor KB)
};

if (!fs.existsSync(STICKER_CONFIG.TEMP_DIR)) {
    fs.mkdirSync(STICKER_CONFIG.TEMP_DIR, { recursive: true });
}

// ========================================
// DOWNLOAD DE MÍDIA
// ========================================
async function downloadMedia(quoted, m) {
    console.log('📥 Baixando mídia...');
    
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
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
            ]);
            
            if (buffer && buffer.length > 0) {
                console.log(`✅ Download: ${(buffer.length / 1024).toFixed(1)}KB`);
                return buffer;
            }
        } catch (error) {
            console.log(`❌ Estratégia ${i + 1}: ${error.message}`);
        }
    }
    
    throw new Error('Falha ao baixar mídia');
}

// ========================================
// PROCESSAMENTO DE STICKER
// ========================================
async function processSticker(inputPath, outputPath, isVideo) {
    console.log(`🖼️ Processando sticker - ${isVideo ? 'VÍDEO' : 'IMAGEM'}`);
    
    const maxSize = isVideo ? STICKER_CONFIG.MAX_SIZE_ANIMATED : STICKER_CONFIG.MAX_SIZE_STATIC;
    
    for (const quality of STICKER_CONFIG.QUALITY_LEVELS) {
        try {
            console.log(`🔄 Processando qualidade ${quality}...`);
            
            if (isVideo) {
                // ========== VÍDEO PARA STICKER ==========
                const args = [
                    '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', inputPath,
                    '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512', // Preenche e corta, sem bordas
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
                
                const process = spawn('ffmpeg', args);
                
                await new Promise((resolve, reject) => {
                    process.on('close', (code) => {
                        code === 0 ? resolve() : reject(new Error(`FFmpeg: ${code}`));
                    });
                    
                    process.on('error', reject);
                    
                    setTimeout(() => {
                        process.kill('SIGKILL');
                        reject(new Error('Timeout'));
                    }, 35000);
                });
                
            } else {
                // ========== IMAGEM PARA STICKER ==========
                const inputBuffer = fs.readFileSync(inputPath);
                
                const outputBuffer = await sharp(inputBuffer)
                    .resize(512, 512, {
                        fit: 'cover' // Preenche o espaço, cortando se necessário
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
    
    throw new Error('Falha ao processar sticker');
}

// ========================================
// COMANDO PRINCIPAL STICKER
// ========================================
module.exports = {
    name: "st",
    alias: ["sticker", "s"],
    desc: "Converte mídia em sticker",
    category: "Converter",
    usage: ".st [responda mídia]",
    react: "🖼️",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🖼️ ========== CONVERSOR DE STICKER ========== 🖼️');
        
        const tempFiles = [];
        
        try {
            if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage) {
                return m.reply(
                    `🖼️ **CONVERSOR DE STICKER**\n\n` +
                    `🚀 **Como usar:**\n` +
                    `• Responda uma imagem ou vídeo com ${prefix}st\n\n` +
                    `✅ **Funcionalidade:**\n` +
                    `• Converte imagens e vídeos em stickers\n` +
                    `• Mantém a proporção original\n` +
                    `• Adiciona fundo transparente\n\n` +
                    `🎯 **RESULTADO: STICKER PADRÃO!**`
                );
            }
            
            const buffer = await downloadMedia(quoted || m, m);
            const fileInfo = await fileType.fromBuffer(buffer);
            const isVideo = fileInfo?.mime?.startsWith('video/') || fileInfo?.ext === 'gif';
            
            // Mensagem de progresso
            let progressMsg = null;
            if (buffer.length > 2 * 1024 * 1024) {
                progressMsg = await m.reply(
                    `🖼️ **PROCESSANDO STICKER**\n\n` +
                    `📊 Tamanho: ${(buffer.length / 1024).toFixed(1)}KB\n` +
                    `⚡ Processando: Conversão para sticker\n` +
                    `⏱️ Tempo: 15-25 segundos\n\n` +
                    `🖼️ SEU STICKER ESTÁ CHEGANDO!`
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
            
            // Deletar mensagem de progresso
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) {}
            }
            
            // Envio
            const chatId = m.chat || m.from || m.key?.remoteJid;
            await Yaka.sendMessage(chatId, { sticker: stickerBuffer });
            
            console.log(`✅ STICKER concluído: ${sizeKB}KB em ${processingTime}s`);
            
        } catch (error) {
            console.error('❌ Erro ao criar sticker:', error.message);
            m.reply(`❌ **Erro:** ${error.message}\n\n💡 Tente com arquivo menor`);
        } finally {
            tempFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
        }
    }
};

// ========================================
// INICIALIZAÇÃO
// ========================================
console.log('\n🖼️ ========== CONVERSOR DE STICKER CARREGADO ========== 🖼️');
console.log('✅ Converte imagens e vídeos em stickers padrão');
console.log('🚀 Comando: .st [responder mídia]');
console.log('===========================================\n');
