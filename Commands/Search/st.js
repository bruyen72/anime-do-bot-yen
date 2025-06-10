const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO SIMPLES E ROBUSTA
// ========================================
const ST_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_st_simple'),
    MAX_SIZE: 100000, // 100KB para todos
    QUALITY: 85, // Qualidade fixa alta
    SIZE: 512,
    TIMEOUT: 30000
};

// Criar diretório
try {
    if (!fs.existsSync(ST_CONFIG.TEMP_DIR)) {
        fs.mkdirSync(ST_CONFIG.TEMP_DIR, { recursive: true });
    }
} catch (e) {
    console.log('⚠️ Erro ao criar diretório:', e.message);
}

// ========================================
// DOWNLOAD ULTRA SIMPLES
// ========================================
async function simpleDownload(quoted, m) {
    console.log('📥 Download simples...');
    
    try {
        // Tentar quoted primeiro
        if (quoted) {
            try {
                const buffer = await downloadMediaMessage(quoted, 'buffer', {});
                if (buffer && buffer.length > 0) {
                    console.log(`✅ Download quoted: ${(buffer.length / 1024).toFixed(1)}KB`);
                    return buffer;
                }
            } catch (e) {
                console.log('⚠️ Quoted falhou, tentando message...');
            }
        }
        
        // Tentar message
        if (m && m.message) {
            try {
                const buffer = await downloadMediaMessage(m, 'buffer', {});
                if (buffer && buffer.length > 0) {
                    console.log(`✅ Download message: ${(buffer.length / 1024).toFixed(1)}KB`);
                    return buffer;
                }
            } catch (e) {
                console.log('⚠️ Message falhou');
            }
        }
        
        throw new Error('Todas as tentativas falharam');
        
    } catch (error) {
        throw new Error(`Download falhou: ${error.message}`);
    }
}

// ========================================
// DETECTAR TIPO SIMPLES
// ========================================
function simpleDetectType(buffer) {
    try {
        // Verificar assinatura de bytes
        const hex = buffer.slice(0, 12).toString('hex');
        
        if (hex.startsWith('474946')) return 'gif'; // GIF
        if (hex.startsWith('ffd8ff')) return 'jpg'; // JPEG
        if (hex.startsWith('89504e47')) return 'png'; // PNG
        if (hex.includes('667479706d703')) return 'mp4'; // MP4
        
        return 'jpg'; // Padrão
    } catch (e) {
        return 'jpg';
    }
}

// ========================================
// PROCESSAR IMAGEM SIMPLES
// ========================================
async function processImage(inputPath, outputPath) {
    try {
        console.log('🖼️ Processando imagem...');
        
        const buffer = await sharp(inputPath)
            .resize(ST_CONFIG.SIZE, ST_CONFIG.SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({
                quality: ST_CONFIG.QUALITY,
                effort: 6
            })
            .toBuffer();
        
        fs.writeFileSync(outputPath, buffer);
        console.log(`✅ Imagem: ${(buffer.length / 1024).toFixed(1)}KB`);
        return true;
        
    } catch (error) {
        console.log(`❌ Erro imagem: ${error.message}`);
        return false;
    }
}

// ========================================
// PROCESSAR VÍDEO SIMPLES
// ========================================
async function processVideo(inputPath, outputPath) {
    return new Promise((resolve) => {
        try {
            console.log('🎬 Processando vídeo...');
            
            const args = [
                '-hide_banner', '-loglevel', 'error', '-y',
                '-i', inputPath,
                '-vf', `scale=${ST_CONFIG.SIZE}:${ST_CONFIG.SIZE}:force_original_aspect_ratio=decrease,pad=${ST_CONFIG.SIZE}:${ST_CONFIG.SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
                '-c:v', 'libwebp',
                '-quality', ST_CONFIG.QUALITY.toString(),
                '-loop', '0',
                '-an',
                '-t', '6',
                outputPath
            ];
            
            const process = spawn('ffmpeg', args);
            
            process.on('close', (code) => {
                if (code === 0 && fs.existsSync(outputPath)) {
                    const size = fs.statSync(outputPath).size;
                    console.log(`✅ Vídeo: ${(size / 1024).toFixed(1)}KB`);
                    resolve(true);
                } else {
                    console.log(`❌ FFmpeg falhou: código ${code}`);
                    resolve(false);
                }
            });
            
            process.on('error', (error) => {
                console.log(`❌ Erro FFmpeg: ${error.message}`);
                resolve(false);
            });
            
            // Timeout
            setTimeout(() => {
                try {
                    process.kill('SIGKILL');
                    resolve(false);
                } catch (e) {}
            }, ST_CONFIG.TIMEOUT);
            
        } catch (error) {
            console.log(`❌ Erro ao iniciar FFmpeg: ${error.message}`);
            resolve(false);
        }
    });
}

// ========================================
// COMANDO .ST ULTRA SIMPLES
// ========================================
module.exports = {
    name: "st",
    alias: ["sticker"],
    desc: "Criar sticker simples e robusto",
    category: "Converter",
    usage: ".st [responda mídia]",
    react: "🔥",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🔥 ========== .ST SIMPLES INICIADO ========== 🔥');
        
        let inputFile = null;
        let outputFile = null;
        
        try {
            // Verificar mídia
            if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage) {
                return m.reply(
                    `🔥 **STICKER SIMPLES (.ST)**\n\n` +
                    `🚀 Responda uma mídia com ${prefix}st\n\n` +
                    `✅ **Aceita:**\n` +
                    `• Imagens (JPG, PNG, WEBP)\n` +
                    `• Vídeos e GIFs\n` +
                    `• Qualidade 85 (alta)\n\n` +
                    `⚡ **SIMPLES E FUNCIONA SEMPRE!**`
                );
            }
            
            // Download
            const buffer = await simpleDownload(quoted, m);
            
            if (!buffer || buffer.length === 0) {
                return m.reply('❌ **Falha no download**\n💡 Reenvie o arquivo');
            }
            
            if (buffer.length > 20 * 1024 * 1024) {
                return m.reply('❌ **Arquivo muito grande**\n💡 Máximo 20MB');
            }
            
            // Detectar tipo
            const fileExt = simpleDetectType(buffer);
            const isVideo = ['gif', 'mp4'].includes(fileExt);
            
            console.log(`🎯 Tipo detectado: ${fileExt} (${isVideo ? 'vídeo' : 'imagem'})`);
            
            // Criar arquivos temporários
            const id = Date.now();
            inputFile = path.join(ST_CONFIG.TEMP_DIR, `input_${id}.${fileExt}`);
            outputFile = path.join(ST_CONFIG.TEMP_DIR, `sticker_${id}.webp`);
            
            // Salvar entrada
            fs.writeFileSync(inputFile, buffer);
            
            // Processar
            let success = false;
            if (isVideo) {
                success = await processVideo(inputFile, outputFile);
            } else {
                success = await processImage(inputFile, outputFile);
            }
            
            if (!success) {
                return m.reply('❌ **Erro no processamento**\n💡 Formato não suportado');
            }
            
            // Verificar arquivo final
            if (!fs.existsSync(outputFile)) {
                return m.reply('❌ **Arquivo não criado**\n💡 Tente novamente');
            }
            
            const finalBuffer = fs.readFileSync(outputFile);
            if (finalBuffer.length === 0) {
                return m.reply('❌ **Arquivo vazio**\n💡 Tente outro formato');
            }
            
            // Enviar sticker
            await Yaka.sendMessage(m.chat, { 
                sticker: finalBuffer 
            }, { quoted: m });
            
            const finalSize = (finalBuffer.length / 1024).toFixed(1);
            console.log(`✅ STICKER ENVIADO: ${finalSize}KB Q${ST_CONFIG.QUALITY}`);
            
        } catch (error) {
            console.error('❌ ERRO GERAL:', error.message);
            
            let errorMsg = '❌ **Erro no sticker**\n\n';
            
            if (error.message.includes('Download')) {
                errorMsg += '📥 Falha no download\n💡 Reenvie o arquivo';
            } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                errorMsg += '⏱️ Tempo esgotado\n💡 Arquivo muito pesado';
            } else if (error.message.includes('ENOENT')) {
                errorMsg += '🔧 FFmpeg não encontrado\n💡 Instale o FFmpeg';
            } else {
                errorMsg += '🔧 Erro técnico\n💡 Tente outro arquivo';
            }
            
            m.reply(errorMsg);
            
        } finally {
            // Limpeza sempre
            try {
                if (inputFile && fs.existsSync(inputFile)) {
                    fs.unlinkSync(inputFile);
                    console.log('🗑️ Input removido');
                }
            } catch (e) {}
            
            try {
                if (outputFile && fs.existsSync(outputFile)) {
                    fs.unlinkSync(outputFile);
                    console.log('🗑️ Output removido');
                }
            } catch (e) {}
        }
    }
};

// ========================================
// INICIALIZAÇÃO
// ========================================
console.log('\n🔥 ========== .ST ULTRA SIMPLES CARREGADO ========== 🔥');
console.log('⚡ Sistema simplificado');
console.log('🎨 Qualidade fixa: 85 (alta)');
console.log('📊 Tamanho: 512x512');
console.log('🛡️ Máxima compatibilidade');
console.log('🚀 Comando: .st [responder mídia]');
console.log('==========================================\n');
