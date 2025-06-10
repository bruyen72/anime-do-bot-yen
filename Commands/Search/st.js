const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO ULTRA COMPATÍVEL
// ========================================
const ST_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_st_ultra'),
    QUALITY: 85,
    SIZE: 512,
    TIMEOUT: 25000
};

// Criar diretório
try {
    if (!fs.existsSync(ST_CONFIG.TEMP_DIR)) {
        fs.mkdirSync(ST_CONFIG.TEMP_DIR, { recursive: true });
    }
} catch (e) {
    console.log('Diretório já existe ou erro:', e.message);
}

// ========================================
// DOWNLOAD ULTRA COMPATÍVEL - TODAS AS POSSIBILIDADES
// ========================================
async function ultraDownload(quoted, m) {
    console.log('📥 Iniciando download ultra compatível...');
    
    // Lista de todas as possíveis fontes de mídia
    const mediaSources = [];
    
    // 1. Quoted com fakeObj
    if (quoted?.fakeObj) {
        mediaSources.push(['quoted.fakeObj', quoted.fakeObj]);
    }
    
    // 2. Quoted direto
    if (quoted && typeof quoted === 'object') {
        mediaSources.push(['quoted', quoted]);
    }
    
    // 3. Message principal
    if (m?.message) {
        mediaSources.push(['m', m]);
    }
    
    // 4. Quoted message
    if (quoted?.message) {
        mediaSources.push(['quoted.message', { message: quoted.message }]);
    }
    
    // 5. Buscar em imageMessage
    if (m?.message?.imageMessage) {
        mediaSources.push(['m.imageMessage', { message: { imageMessage: m.message.imageMessage } }]);
    }
    
    // 6. Buscar em videoMessage
    if (m?.message?.videoMessage) {
        mediaSources.push(['m.videoMessage', { message: { videoMessage: m.message.videoMessage } }]);
    }
    
    // 7. Buscar em documentMessage (para alguns tipos)
    if (m?.message?.documentMessage) {
        mediaSources.push(['m.documentMessage', { message: { documentMessage: m.message.documentMessage } }]);
    }
    
    // 8. Quoted imageMessage
    if (quoted?.message?.imageMessage) {
        mediaSources.push(['quoted.imageMessage', { message: { imageMessage: quoted.message.imageMessage } }]);
    }
    
    // 9. Quoted videoMessage
    if (quoted?.message?.videoMessage) {
        mediaSources.push(['quoted.videoMessage', { message: { videoMessage: quoted.message.videoMessage } }]);
    }
    
    // 10. ExtendedTextMessage (para algumas mídias)
    if (quoted?.message?.extendedTextMessage?.contextInfo) {
        const contextInfo = quoted.message.extendedTextMessage.contextInfo;
        if (contextInfo.quotedMessage) {
            mediaSources.push(['contextInfo.quotedMessage', { message: contextInfo.quotedMessage }]);
        }
    }
    
    console.log(`🔍 Encontradas ${mediaSources.length} possíveis fontes de mídia`);
    
    // Tentar cada fonte
    for (let i = 0; i < mediaSources.length; i++) {
        const [sourceName, sourceData] = mediaSources[i];
        
        try {
            console.log(`🔄 Tentativa ${i + 1}/${mediaSources.length}: ${sourceName}`);
            
            const downloadPromise = downloadMediaMessage(sourceData, 'buffer', {});
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 10000)
            );
            
            const buffer = await Promise.race([downloadPromise, timeoutPromise]);
            
            if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
                console.log(`✅ SUCESSO em ${sourceName}: ${(buffer.length / 1024).toFixed(1)}KB`);
                return buffer;
            } else {
                console.log(`⚠️ ${sourceName}: Buffer inválido`);
            }
            
        } catch (error) {
            console.log(`❌ ${sourceName}: ${error.message}`);
        }
    }
    
    // Se chegou aqui, tentar métodos alternativos
    console.log('🔄 Tentando métodos alternativos...');
    
    // Método alternativo 1: Verificar se é uma resposta a mídia
    try {
        if (quoted && quoted.mtype) {
            console.log(`🔄 Tentando por mtype: ${quoted.mtype}`);
            
            if (['imageMessage', 'videoMessage', 'stickerMessage'].includes(quoted.mtype)) {
                const buffer = await downloadMediaMessage(quoted, 'buffer', {});
                if (buffer && buffer.length > 0) {
                    console.log(`✅ SUCESSO por mtype: ${(buffer.length / 1024).toFixed(1)}KB`);
                    return buffer;
                }
            }
        }
    } catch (e) {
        console.log(`❌ Método mtype falhou: ${e.message}`);
    }
    
    // Método alternativo 2: Verificar mensagem raw
    try {
        if (m?.message && Object.keys(m.message).length > 0) {
            console.log('🔄 Tentando mensagem raw...');
            const buffer = await downloadMediaMessage(m, 'buffer', {});
            if (buffer && buffer.length > 0) {
                console.log(`✅ SUCESSO raw: ${(buffer.length / 1024).toFixed(1)}KB`);
                return buffer;
            }
        }
    } catch (e) {
        console.log(`❌ Método raw falhou: ${e.message}`);
    }
    
    throw new Error('Falha em todos os métodos de download');
}

// ========================================
// PROCESSAR SIMPLES
// ========================================
async function processMedia(inputPath, outputPath, isVideo = false) {
    if (isVideo) {
        return processVideoSimple(inputPath, outputPath);
    } else {
        return processImageSimple(inputPath, outputPath);
    }
}

async function processImageSimple(inputPath, outputPath) {
    try {
        const buffer = await sharp(inputPath)
            .resize(ST_CONFIG.SIZE, ST_CONFIG.SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: ST_CONFIG.QUALITY })
            .toBuffer();
        
        fs.writeFileSync(outputPath, buffer);
        return buffer.length > 0;
    } catch (error) {
        console.log(`❌ Erro Sharp: ${error.message}`);
        return false;
    }
}

async function processVideoSimple(inputPath, outputPath) {
    return new Promise((resolve) => {
        const process = spawn('ffmpeg', [
            '-hide_banner', '-loglevel', 'error', '-y',
            '-i', inputPath,
            '-vf', `scale=${ST_CONFIG.SIZE}:${ST_CONFIG.SIZE}:force_original_aspect_ratio=decrease,pad=${ST_CONFIG.SIZE}:${ST_CONFIG.SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
            '-c:v', 'libwebp',
            '-quality', ST_CONFIG.QUALITY.toString(),
            '-loop', '0', '-an', '-t', '6',
            outputPath
        ]);
        
        process.on('close', (code) => {
            resolve(code === 0 && fs.existsSync(outputPath));
        });
        
        process.on('error', () => resolve(false));
        
        setTimeout(() => {
            try { process.kill('SIGKILL'); } catch (e) {}
            resolve(false);
        }, ST_CONFIG.TIMEOUT);
    });
}

// ========================================
// DETECTAR TIPO POR BUFFER
// ========================================
function detectType(buffer) {
    const hex = buffer.slice(0, 16).toString('hex');
    
    if (hex.startsWith('474946')) return { ext: 'gif', isVideo: true };
    if (hex.startsWith('ffd8ff')) return { ext: 'jpg', isVideo: false };
    if (hex.startsWith('89504e47')) return { ext: 'png', isVideo: false };
    if (hex.includes('667479706d703') || hex.includes('667479704d534e56')) return { ext: 'mp4', isVideo: true };
    if (hex.startsWith('52494646') && hex.includes('57454250')) return { ext: 'webp', isVideo: false };
    
    return { ext: 'jpg', isVideo: false }; // Padrão
}

// ========================================
// COMANDO .ST FINAL
// ========================================
module.exports = {
    name: "st",
    alias: ["sticker"],
    desc: "Criar sticker - compatível com tudo",
    category: "Converter", 
    usage: ".st [responda mídia]",
    react: "🔥",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🔥 ========== .ST ULTRA COMPATÍVEL ========== 🔥');
        
        let tempInput = null;
        let tempOutput = null;
        
        try {
            // Verificar se há alguma mídia disponível
            const hasQuotedMedia = quoted && (
                quoted.message?.imageMessage ||
                quoted.message?.videoMessage ||
                quoted.message?.documentMessage ||
                quoted.fakeObj ||
                quoted.mtype
            );
            
            const hasDirectMedia = m.message && (
                m.message.imageMessage ||
                m.message.videoMessage ||
                m.message.documentMessage
            );
            
            if (!hasQuotedMedia && !hasDirectMedia) {
                return m.reply(
                    `🔥 **STICKER ULTRA (.ST)**\n\n` +
                    `📱 **Como usar:**\n` +
                    `• Responda uma imagem com ${prefix}st\n` +
                    `• Responda um vídeo com ${prefix}st\n` +
                    `• Responda um GIF com ${prefix}st\n\n` +
                    `✅ **Garantido:**\n` +
                    `• Funciona com qualquer mídia\n` +
                    `• Qualidade 85 sempre\n` +
                    `• Tamanho 512x512\n\n` +
                    `⚡ **RESPONDA UMA MÍDIA AGORA!**`
                );
            }
            
            console.log('📱 Mídia detectada, iniciando download...');
            
            // Download ultra compatível
            const buffer = await ultraDownload(quoted, m);
            
            if (!buffer) {
                return m.reply('❌ **Download falhou**\n💡 Responda diretamente a mídia');
            }
            
            if (buffer.length > 25 * 1024 * 1024) {
                return m.reply('❌ **Arquivo muito grande**\n💡 Máximo 25MB');
            }
            
            // Detectar tipo
            const mediaType = detectType(buffer);
            console.log(`🎯 Detectado: ${mediaType.ext} (${mediaType.isVideo ? 'vídeo' : 'imagem'})`);
            
            // Preparar arquivos
            const id = Date.now();
            tempInput = path.join(ST_CONFIG.TEMP_DIR, `input_${id}.${mediaType.ext}`);
            tempOutput = path.join(ST_CONFIG.TEMP_DIR, `output_${id}.webp`);
            
            // Salvar entrada
            fs.writeFileSync(tempInput, buffer);
            console.log(`💾 Arquivo salvo: ${(buffer.length / 1024).toFixed(1)}KB`);
            
            // Processar
            const success = await processMedia(tempInput, tempOutput, mediaType.isVideo);
            
            if (!success || !fs.existsSync(tempOutput)) {
                return m.reply('❌ **Processamento falhou**\n💡 Formato não suportado');
            }
            
            // Ler resultado
            const stickerBuffer = fs.readFileSync(tempOutput);
            
            if (stickerBuffer.length === 0) {
                return m.reply('❌ **Sticker vazio**\n💡 Erro no processamento');
            }
            
            // Enviar
            await Yaka.sendMessage(m.chat, { 
                sticker: stickerBuffer 
            }, { quoted: m });
            
            console.log(`✅ STICKER ENVIADO: ${(stickerBuffer.length / 1024).toFixed(1)}KB`);
            
        } catch (error) {
            console.error('❌ ERRO:', error.message);
            
            if (error.message.includes('download') || error.message.includes('Download')) {
                return m.reply('❌ **Falha no download**\n💡 Responda diretamente a mídia (não encaminhe)');
            } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                return m.reply('❌ **Timeout**\n💡 Arquivo muito pesado ou conexão lenta');
            } else {
                return m.reply('❌ **Erro técnico**\n💡 Tente com outro arquivo');
            }
            
        } finally {
            // Limpeza
            [tempInput, tempOutput].forEach(file => {
                try {
                    if (file && fs.existsSync(file)) {
                        fs.unlinkSync(file);
                    }
                } catch (e) {}
            });
        }
    }
};

console.log('\n🔥 ========== .ST ULTRA COMPATÍVEL CARREGADO ========== 🔥');
console.log('📱 Compatível com TODAS as mídias do WhatsApp');
console.log('🔄 10+ métodos de download diferentes');
console.log('🎯 Detecção automática de tipo');
console.log('⚡ Qualidade 85 fixa');
console.log('🚀 Use: .st [responder mídia]');
console.log('==========================================\n');
