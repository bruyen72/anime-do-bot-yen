const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO MELHORADA PARA ST
// ========================================
const STICKER_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_sticker'),
    MAX_SIZE_STATIC: 150000,    // 150KB (aumentado para alta qualidade)
    MAX_SIZE_ANIMATED: 120000,  // 120KB (aumentado)
    MAX_DURATION: 6,            // 6 segundos
    // ✅ QUALIDADES ALTAS - SEM BAIXAS
    QUALITY_LEVELS: [95, 92, 88, 85, 82, 78, 75, 72, 68, 65],
    STANDARD_SIZE: 512,
    // Configurações avançadas para MÁXIMA qualidade
    SHARP_CONFIG: {
        effort: 6,
        smartSubsample: false, // Desabilitado para máxima qualidade
        reductionEffort: 6
    },
    FFMPEG_CONFIG: {
        compression_level: 3, // Melhor compressão
        method: 6,
        preset: 'photo' // Para melhor qualidade
    }
};

// Criar diretório se não existir
if (!fs.existsSync(STICKER_CONFIG.TEMP_DIR)) {
    fs.mkdirSync(STICKER_CONFIG.TEMP_DIR, { recursive: true });
}

// ========================================
// DOWNLOAD (MANTENDO SEU SISTEMA FUNCIONANDO)
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
// ANÁLISE DE QUALIDADE PARA ALTA QUALIDADE
// ========================================
function getOptimalQualityRange(fileSize, isVideo) {
    const sizeKB = fileSize / 1024;
    
    if (isVideo) {
        if (sizeKB > 2000) return [78, 88]; // Arquivos grandes: qualidade alta
        if (sizeKB > 1000) return [82, 92]; // Arquivos médios: qualidade muito alta
        return [85, 95]; // Arquivos pequenos: qualidade MÁXIMA
    } else {
        if (sizeKB > 1000) return [82, 92]; // Imagens grandes: qualidade muito alta
        if (sizeKB > 500) return [85, 95];  // Imagens médias: qualidade MÁXIMA
        return [88, 95]; // Imagens pequenas: qualidade PERFEITA
    }
}

// ========================================
// PROCESSAMENTO COM QUALIDADE PERFEITA
// ========================================
async function processSticker(inputPath, outputPath, isVideo, originalSize) {
    console.log(`🔄 Processamento QUALIDADE PERFEITA - ${isVideo ? 'VÍDEO' : 'IMAGEM'}`);
    
    const maxSize = isVideo ? STICKER_CONFIG.MAX_SIZE_ANIMATED : STICKER_CONFIG.MAX_SIZE_STATIC;
    const [minQuality, maxQuality] = getOptimalQualityRange(originalSize, isVideo);
    
    // Filtrar qualidades ALTAS dentro do range
    const optimalQualities = STICKER_CONFIG.QUALITY_LEVELS.filter(q => q >= minQuality && q <= maxQuality);
    
    // Se não há qualidades no range, usar as MELHORES disponíveis
    const qualitiesToTry = optimalQualities.length > 0 ? optimalQualities : STICKER_CONFIG.QUALITY_LEVELS.slice(0, 6);
    
    console.log(`🎯 Usando qualidades ALTAS: ${qualitiesToTry.join(', ')}`);
    
    for (const quality of qualitiesToTry) {
        try {
            console.log(`🔄 Processando qualidade ALTA ${quality}...`);
            
            if (isVideo) {
                // ========== VÍDEO COM QUALIDADE MÁXIMA ==========
                const args = [
                    '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', inputPath,
                    // Filtros ULTRA melhorados para vídeo
                    '-vf', `scale=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
                    '-c:v', 'libwebp',
                    '-lossless', quality >= 90 ? '1' : '0', // Lossless para 90+
                    '-compression_level', STICKER_CONFIG.FFMPEG_CONFIG.compression_level.toString(),
                    '-quality', quality.toString(),
                    '-method', STICKER_CONFIG.FFMPEG_CONFIG.method.toString(),
                    '-preset', STICKER_CONFIG.FFMPEG_CONFIG.preset,
                    '-loop', '0',
                    '-an', '-sn', '-dn',
                    '-t', STICKER_CONFIG.MAX_DURATION.toString(),
                    // Configurações ULTRA para qualidade
                    '-auto-alt-ref', '1',
                    '-lag-in-frames', '25',
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
                    }, 35000); // Timeout maior para qualidade alta
                });
                
            } else {
                // ========== IMAGEM COM QUALIDADE PERFEITA ==========
                const inputBuffer = fs.readFileSync(inputPath);
                
                // Pipeline ULTRA otimizada para máxima qualidade
                let pipeline = sharp(inputBuffer, { 
                    density: 400, // DPI ULTRA alta
                    limitInputPixels: false 
                });
                
                // Aplicar filtros de MÁXIMA qualidade
                const metadata = await pipeline.metadata();
                if (metadata.width < 512 || metadata.height < 512) {
                    // Para imagens pequenas, usar interpolação PERFEITA
                    pipeline = pipeline.resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: sharp.kernel.lanczos3, // MELHOR interpolação
                        withoutEnlargement: false
                    });
                } else {
                    // Para imagens grandes, redimensionar com ALTA qualidade
                    pipeline = pipeline.resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: sharp.kernel.lanczos3 // Sempre o melhor
                    });
                }
                
                const outputBuffer = await pipeline
                    .webp({
                        quality: quality,
                        lossless: quality >= 90, // Lossless para qualidades ALTAS
                        nearLossless: quality >= 85,
                        effort: STICKER_CONFIG.SHARP_CONFIG.effort,
                        smartSubsample: STICKER_CONFIG.SHARP_CONFIG.smartSubsample,
                        reductionEffort: STICKER_CONFIG.SHARP_CONFIG.reductionEffort,
                        alphaQuality: 100 // SEMPRE máximo alpha
                    })
                    .toBuffer();
                
                fs.writeFileSync(outputPath, outputBuffer);
            }
            
            // Verificar resultado
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                const sizeKB = stats.size / 1024;
                
                console.log(`📊 Resultado Q${quality}: ${sizeKB.toFixed(1)}KB`);
                
                // Aceitar se está dentro do limite OU se é a última tentativa
                if (stats.size <= maxSize || quality === qualitiesToTry[qualitiesToTry.length - 1]) {
                    // Se conseguiu uma qualidade boa dentro do limite, retornar
                    if (stats.size <= maxSize) {
                        console.log(`✅ Qualidade PERFEITA ${quality} aprovada: ${sizeKB.toFixed(1)}KB`);
                    } else {
                        console.log(`⚠️ Usando MELHOR qualidade possível: ${sizeKB.toFixed(1)}KB`);
                    }
                    return sizeKB.toFixed(1);
                }
                
                console.log('⚠️ Muito grande, tentando qualidade um pouco menor...');
            }
            
        } catch (error) {
            console.log(`❌ Qualidade ${quality} falhou: ${error.message}`);
            
            // Se é a última qualidade, tentar uma qualidade ainda BOA (não baixa)
            if (quality === qualitiesToTry[qualitiesToTry.length - 1]) {
                console.log('🔄 Tentando qualidade de backup (ainda alta)...');
                try {
                    return await processBackupQuality(inputPath, outputPath, isVideo);
                } catch (backupError) {
                    throw new Error(`Todas as tentativas falharam. Último erro: ${error.message}`);
                }
            }
        }
    }
    
    throw new Error('Processamento falhou em todas as qualidades');
}

// ========================================
// PROCESSAMENTO DE BACKUP (QUALIDADE AINDA ALTA)
// ========================================
async function processBackupQuality(inputPath, outputPath, isVideo) {
    console.log('🔄 Usando processamento de backup (qualidade 70 - ainda alta)...');
    
    const backupQuality = 70; // Qualidade 70 é AINDA ALTA (não baixa como 25)
    
    if (isVideo) {
        const args = [
            '-hide_banner', '-loglevel', 'error', '-y',
            '-i', inputPath,
            '-vf', `scale=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
            '-c:v', 'libwebp',
            '-lossless', '0',
            '-compression_level', '4',
            '-quality', backupQuality.toString(),
            '-method', '6',
            '-loop', '0',
            '-an', '-sn', '-dn',
            '-t', STICKER_CONFIG.MAX_DURATION.toString(),
            outputPath
        ];
        
        const process = spawn('ffmpeg', args);
        await new Promise((resolve, reject) => {
            process.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg: ${code}`)));
            process.on('error', reject);
            setTimeout(() => { process.kill('SIGKILL'); reject(new Error('Timeout')); }, 25000);
        });
    } else {
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = await sharp(inputBuffer)
            .resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
                kernel: sharp.kernel.lanczos2 // Ainda boa interpolação
            })
            .webp({
                quality: backupQuality, // 70 é ainda alta
                lossless: false,
                effort: 6,
                alphaQuality: 90
            })
            .toBuffer();
        
        fs.writeFileSync(outputPath, outputBuffer);
    }
    
    const stats = fs.statSync(outputPath);
    const sizeKB = stats.size / 1024;
    console.log(`🔄 Backup Q70 concluído: ${sizeKB.toFixed(1)}KB`);
    return sizeKB.toFixed(1);
}

// ========================================
// COMANDO ST (MANTENDO SUA ESTRUTURA)
// ========================================
module.exports = {
    name: "st",
    alias: ["sticker", "stick"],
    desc: "Criar sticker com qualidade PERFEITA",
    category: "Converter",
    usage: ".st [responda mídia]",
    react: "🔥",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🔥 ========== STICKER QUALIDADE PERFEITA (.ST) ========== 🔥');
        
        const tempFiles = [];
        
        try {
            if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage) {
                return m.reply(
                    `🔥 **CRIAR STICKER PERFEITO (.ST)**\n\n` +
                    `🚀 **Como usar:**\n` +
                    `• Responda uma imagem ou vídeo com ${prefix}st\n\n` +
                    `✅ **Recursos ULTRA:**\n` +
                    `• Qualidade 95-85 (PERFEITA)\n` +
                    `• Processamento ULTRA inteligente\n` +
                    `• Suporte a imagens e vídeos\n` +
                    `• Tamanho 512x512 HD\n\n` +
                    `⚡ **QUALIDADE PERFEITA GARANTIDA!**`
                );
            }
            
            const buffer = await downloadMedia(quoted || m, m);
            const fileInfo = await fileType.fromBuffer(buffer);
            const isVideo = fileInfo?.mime?.startsWith('video/') || fileInfo?.ext === 'gif';
            
            // Verificar tamanho do arquivo
            if (buffer.length > 20 * 1024 * 1024) { // 20MB
                return m.reply('❌ **Arquivo muito grande!**\n\nTamanho máximo: 20MB');
            }
            
            // Mensagem de progresso MELHORADA
            let progressMsg = null;
            const sizeKB = (buffer.length / 1024).toFixed(1);
            const [minQ, maxQ] = getOptimalQualityRange(buffer.length, isVideo);
            
            if (buffer.length > 500 * 1024) { // 500KB
                progressMsg = await m.reply(
                    `🔄 **CRIANDO STICKER PERFEITO**\n\n` +
                    `📊 Arquivo: ${sizeKB}KB\n` +
                    `🎯 Tipo: ${isVideo ? 'Vídeo/GIF animado' : 'Imagem estática'}\n` +
                    `🎨 Qualidade alvo: ${minQ}-${maxQ} (PERFEITA)\n` +
                    `⚡ Processando com MÁXIMA qualidade...\n\n` +
                    `⏱️ Aguarde - criando perfeição...`
                );
            }
            
            const uniqueId = Date.now();
            const inputPath = path.join(STICKER_CONFIG.TEMP_DIR, `input_${uniqueId}.${fileInfo?.ext || 'tmp'}`);
            const outputPath = path.join(STICKER_CONFIG.TEMP_DIR, `sticker_perfect_${uniqueId}.webp`);
            tempFiles.push(inputPath, outputPath);
            
            fs.writeFileSync(inputPath, buffer);
            
            const startTime = Date.now();
            const resultSize = await processSticker(inputPath, outputPath, isVideo, buffer.length);
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
            
            console.log(`✅ STICKER PERFEITO concluído: ${resultSize}KB em ${processingTime}s`);
            
        } catch (error) {
            console.error('❌ Erro sticker:', error.message);
            
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) {}
            }
            
            let errorMsg = '❌ **Erro ao criar sticker PERFEITO**\n\n';
            
            if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                errorMsg += '⏱️ Tempo limite excedido\n💡 Arquivo muito complexo, tente um menor';
            } else if (error.message.includes('FFmpeg')) {
                errorMsg += '🎬 Erro no processamento de vídeo\n💡 Formato não suportado';
            } else if (error.message.includes('Download')) {
                errorMsg += '📥 Erro no download\n💡 Reenvie o arquivo';
            } else {
                errorMsg += `🔧 ${error.message}\n💡 Tente com outro formato`;
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
console.log('\n🔥 ========== STICKER QUALIDADE PERFEITA (.ST) CARREGADO ========== 🔥');
console.log('⚡ Sistema de qualidade PERFEITA ativo');
console.log('🎨 Qualidades: 95, 92, 88, 85, 82, 78, 75... (SOMENTE ALTAS)');
console.log('📏 Tamanho: 512x512 HD');
console.log('🚀 Comando: .st [responder mídia]');
console.log('🛡️ Backup Q70 (ainda alta) se necessário');
console.log('==========================================\n');
