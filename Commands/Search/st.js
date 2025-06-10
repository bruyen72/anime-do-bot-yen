const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO ULTRA ROBUSTA PARA ST
// ========================================
const STICKER_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_sticker'),
    MAX_SIZE_STATIC: 150000,    // 150KB
    MAX_SIZE_ANIMATED: 120000,  // 120KB
    MAX_DURATION: 6,
    // Qualidades SEGURAS e ALTAS
    QUALITY_LEVELS: [88, 85, 82, 78, 75, 72, 68, 65],
    STANDARD_SIZE: 512
};

// Criar diretório se não existir
if (!fs.existsSync(STICKER_CONFIG.TEMP_DIR)) {
    fs.mkdirSync(STICKER_CONFIG.TEMP_DIR, { recursive: true });
}

// ========================================
// DOWNLOAD (MANTENDO SEU SISTEMA)
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
// PROCESSAMENTO ULTRA SEGURO
// ========================================
async function processSticker(inputPath, outputPath, isVideo) {
    console.log(`🔄 Processamento SEGURO - ${isVideo ? 'VÍDEO' : 'IMAGEM'}`);
    
    const maxSize = isVideo ? STICKER_CONFIG.MAX_SIZE_ANIMATED : STICKER_CONFIG.MAX_SIZE_STATIC;
    
    for (const quality of STICKER_CONFIG.QUALITY_LEVELS) {
        try {
            console.log(`🔄 Tentando qualidade ${quality}...`);
            
            if (isVideo) {
                const success = await processVideoSafe(inputPath, outputPath, quality);
                if (!success) continue;
            } else {
                const success = await processImageSafe(inputPath, outputPath, quality);
                if (!success) continue;
            }
            
            // Verificar resultado
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                const sizeKB = stats.size / 1024;
                
                console.log(`📊 Resultado Q${quality}: ${sizeKB.toFixed(1)}KB`);
                
                if (stats.size <= maxSize || quality === STICKER_CONFIG.QUALITY_LEVELS[STICKER_CONFIG.QUALITY_LEVELS.length - 1]) {
                    console.log(`✅ Qualidade ${quality} OK: ${sizeKB.toFixed(1)}KB`);
                    return sizeKB.toFixed(1);
                }
                
                console.log('⚠️ Muito grande, tentando menor...');
                // Deletar arquivo grande antes da próxima tentativa
                try { fs.unlinkSync(outputPath); } catch (e) {}
            }
            
        } catch (error) {
            console.log(`❌ Qualidade ${quality} falhou: ${error.message}`);
            // Limpar arquivo de erro
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
        }
    }
    
    throw new Error('Processamento falhou em todas as qualidades');
}

// ========================================
// PROCESSAMENTO DE VÍDEO SEGURO
// ========================================
async function processVideoSafe(inputPath, outputPath, quality) {
    return new Promise((resolve) => {
        try {
            const args = [
                '-hide_banner',
                '-loglevel', 'error',
                '-y',
                '-i', inputPath,
                '-vf', `scale=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
                '-c:v', 'libwebp',
                '-quality', quality.toString(),
                '-compression_level', '4',
                '-method', '6',
                '-loop', '0',
                '-an', '-sn', '-dn',
                '-t', STICKER_CONFIG.MAX_DURATION.toString(),
                outputPath
            ];
            
            console.log(`🎬 Executando FFmpeg Q${quality}...`);
            
            const process = spawn('ffmpeg', args, {
                stdio: ['ignore', 'ignore', 'pipe']
            });
            
            let stderr = '';
            if (process.stderr) {
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            
            process.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ FFmpeg Q${quality} sucesso`);
                    resolve(true);
                } else {
                    console.log(`❌ FFmpeg Q${quality} falhou: código ${code}`);
                    resolve(false);
                }
            });
            
            process.on('error', (error) => {
                console.log(`❌ Erro FFmpeg Q${quality}: ${error.message}`);
                resolve(false);
            });
            
            // Timeout de segurança
            setTimeout(() => {
                try {
                    process.kill('SIGTERM');
                    setTimeout(() => {
                        try { process.kill('SIGKILL'); } catch (e) {}
                    }, 2000);
                } catch (e) {}
                console.log(`⏱️ Timeout FFmpeg Q${quality}`);
                resolve(false);
            }, 30000);
            
        } catch (error) {
            console.log(`❌ Erro ao iniciar FFmpeg Q${quality}: ${error.message}`);
            resolve(false);
        }
    });
}

// ========================================
// PROCESSAMENTO DE IMAGEM SEGURO
// ========================================
async function processImageSafe(inputPath, outputPath, quality) {
    try {
        console.log(`🖼️ Processando imagem Q${quality}...`);
        
        const inputBuffer = fs.readFileSync(inputPath);
        
        const outputBuffer = await sharp(inputBuffer)
            .resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
                kernel: sharp.kernel.lanczos2
            })
            .webp({
                quality: quality,
                effort: 6,
                alphaQuality: quality >= 80 ? 100 : 90
            })
            .toBuffer();
        
        fs.writeFileSync(outputPath, outputBuffer);
        console.log(`✅ Imagem Q${quality} processada`);
        return true;
        
    } catch (error) {
        console.log(`❌ Erro Sharp Q${quality}: ${error.message}`);
        return false;
    }
}

// ========================================
// COMANDO ST ULTRA SEGURO
// ========================================
module.exports = {
    name: "st",
    alias: ["sticker", "stick"],
    desc: "Criar sticker com alta qualidade - versão segura",
    category: "Converter",
    usage: ".st [responda mídia]",
    react: "🔥",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🔥 ========== STICKER SEGURO (.ST) ========== 🔥');
        
        const tempFiles = [];
        let progressMsg = null;
        
        try {
            if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage) {
                return m.reply(
                    `🔥 **CRIAR STICKER SEGURO (.ST)**\n\n` +
                    `🚀 **Como usar:**\n` +
                    `• Responda uma imagem ou vídeo com ${prefix}st\n\n` +
                    `✅ **Recursos:**\n` +
                    `• Qualidade 88-85 (ALTA)\n` +
                    `• Processamento ultra seguro\n` +
                    `• Sistema anti-erro\n` +
                    `• Tamanho 512x512\n\n` +
                    `⚡ **FUNCIONAMENTO GARANTIDO!**`
                );
            }
            
            // Download
            const buffer = await downloadMedia(quoted || m, m);
            const fileInfo = await fileType.fromBuffer(buffer);
            const isVideo = fileInfo?.mime?.startsWith('video/') || fileInfo?.ext === 'gif';
            
            // Verificar tamanho
            if (buffer.length > 20 * 1024 * 1024) {
                return m.reply('❌ **Arquivo muito grande!**\n\nTamanho máximo: 20MB');
            }
            
            // Progresso
            const sizeKB = (buffer.length / 1024).toFixed(1);
            
            if (buffer.length > 500 * 1024) {
                progressMsg = await m.reply(
                    `🔄 **CRIANDO STICKER SEGURO**\n\n` +
                    `📊 Arquivo: ${sizeKB}KB\n` +
                    `🎯 Tipo: ${isVideo ? 'Vídeo/GIF animado' : 'Imagem estática'}\n` +
                    `🎨 Qualidade: 88-85 (ALTA)\n` +
                    `🛡️ Sistema anti-erro ativo\n\n` +
                    `⚡ Processando com segurança...`
                );
            }
            
            // Arquivos temporários
            const uniqueId = Date.now();
            const inputPath = path.join(STICKER_CONFIG.TEMP_DIR, `safe_input_${uniqueId}.${fileInfo?.ext || 'tmp'}`);
            const outputPath = path.join(STICKER_CONFIG.TEMP_DIR, `safe_sticker_${uniqueId}.webp`);
            tempFiles.push(inputPath, outputPath);
            
            // Salvar entrada
            fs.writeFileSync(inputPath, buffer);
            console.log(`💾 Arquivo salvo: ${inputPath}`);
            
            // Processar
            const startTime = Date.now();
            const resultSize = await processSticker(inputPath, outputPath, isVideo);
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
            
            // Verificar saída
            if (!fs.existsSync(outputPath)) {
                throw new Error('Arquivo de saída não foi criado');
            }
            
            const stickerBuffer = fs.readFileSync(outputPath);
            if (stickerBuffer.length === 0) {
                throw new Error('Arquivo de saída está vazio');
            }
            
            // Remover progresso
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) {
                    console.log('⚠️ Não foi possível deletar progresso');
                }
            }
            
            // Enviar sticker
            await Yaka.sendMessage(m.chat, { 
                sticker: stickerBuffer 
            }, { quoted: m });
            
            console.log(`✅ STICKER SEGURO concluído: ${resultSize}KB em ${processingTime}s`);
            
        } catch (error) {
            console.error('❌ ERRO NO .ST SEGURO:', error.message);
            console.error('Stack:', error.stack);
            
            // Remover progresso
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) {}
            }
            
            // Erro detalhado
            let errorMsg = '❌ **Erro no processamento**\n\n';
            
            if (error.message.includes('Download')) {
                errorMsg += '📥 Falha no download\n💡 Reenvie o arquivo';
            } else if (error.message.includes('FFmpeg') || error.message.includes('spawn')) {
                errorMsg += '🎬 Erro no FFmpeg\n💡 Verifique se o FFmpeg está instalado';
            } else if (error.message.includes('Sharp')) {
                errorMsg += '🖼️ Erro no processamento de imagem\n💡 Formato pode estar corrompido';
            } else if (error.message.includes('arquivo')) {
                errorMsg += '📁 Erro de arquivo\n💡 Permissões ou espaço em disco';
            } else {
                errorMsg += `🔧 ${error.message}\n💡 Tente novamente em alguns segundos`;
            }
            
            m.reply(errorMsg);
            
        } finally {
            // Limpeza ultra segura
            console.log('🧹 Iniciando limpeza...');
            for (const filePath of tempFiles) {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Removido: ${path.basename(filePath)}`);
                    }
                } catch (cleanError) {
                    console.log(`⚠️ Erro limpeza ${path.basename(filePath)}: ${cleanError.message}`);
                }
            }
            console.log('✅ Limpeza concluída');
        }
    }
};

// ========================================
// INICIALIZAÇÃO
// ========================================
console.log('\n🔥 ========== STICKER SEGURO (.ST) CARREGADO ========== 🔥');
console.log('🛡️ Sistema ultra seguro ativo');
console.log('🎨 Qualidades seguras: 88, 85, 82, 78, 75...');
console.log('📊 Timeouts e fallbacks configurados');
console.log('🧹 Limpeza automática garantida');
console.log('🚀 Comando: .st [responder mídia]');
console.log('==========================================\n');
