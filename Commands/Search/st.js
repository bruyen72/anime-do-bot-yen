const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO MELHORADA PARA STICKER
// ========================================
const STICKER_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_sticker'),
    MAX_SIZE_STATIC: 100000,    // 100KB (aumentado)
    MAX_SIZE_ANIMATED: 80000,   // 80KB (aumentado)
    MAX_DURATION: 6,            // 6 segundos
    // Qualidades melhoradas - começando com alta qualidade
    QUALITY_LEVELS: [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30],
    STANDARD_SIZE: 512,
    // Configurações avançadas para melhor qualidade
    SHARP_CONFIG: {
        effort: 6,
        smartSubsample: true,
        reductionEffort: 6
    },
    FFMPEG_CONFIG: {
        compression_level: 4, // Melhor que 6
        method: 6,
        preset: 'photo' // Para melhor qualidade
    }
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
// ANÁLISE DE QUALIDADE INTELIGENTE
// ========================================
function getOptimalQualityRange(fileSize, isVideo) {
    const sizeKB = fileSize / 1024;
    
    if (isVideo) {
        if (sizeKB > 2000) return [70, 85]; // Arquivos grandes: qualidade média-alta
        if (sizeKB > 1000) return [75, 90]; // Arquivos médios: qualidade alta
        return [80, 95]; // Arquivos pequenos: qualidade máxima
    } else {
        if (sizeKB > 1000) return [75, 90]; // Imagens grandes: qualidade alta
        if (sizeKB > 500) return [80, 95];  // Imagens médias: qualidade muito alta
        return [85, 95]; // Imagens pequenas: qualidade máxima
    }
}

// ========================================
// PROCESSAMENTO MELHORADO COM ALTA QUALIDADE
// ========================================
async function processSticker(inputPath, outputPath, isVideo, originalSize) {
    console.log(`🔄 Processamento OTIMIZADO - ${isVideo ? 'VÍDEO' : 'IMAGEM'}`);
    
    const maxSize = isVideo ? STICKER_CONFIG.MAX_SIZE_ANIMATED : STICKER_CONFIG.MAX_SIZE_STATIC;
    const [minQuality, maxQuality] = getOptimalQualityRange(originalSize, isVideo);
    
    // Filtrar qualidades dentro do range otimizado
    const optimalQualities = STICKER_CONFIG.QUALITY_LEVELS.filter(q => q >= minQuality && q <= maxQuality);
    
    // Se não há qualidades no range, usar as melhores disponíveis
    const qualitiesToTry = optimalQualities.length > 0 ? optimalQualities : STICKER_CONFIG.QUALITY_LEVELS.slice(0, 5);
    
    console.log(`🎯 Usando qualidades: ${qualitiesToTry.join(', ')}`);
    
    for (const quality of qualitiesToTry) {
        try {
            console.log(`🔄 Processando qualidade ${quality}...`);
            
            if (isVideo) {
                // ========== VÍDEO COM QUALIDADE MELHORADA ==========
                const args = [
                    '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', inputPath,
                    // Filtros melhorados para vídeo
                    '-vf', `scale=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
                    '-c:v', 'libwebp',
                    '-lossless', '0',
                    '-compression_level', STICKER_CONFIG.FFMPEG_CONFIG.compression_level.toString(),
                    '-quality', quality.toString(),
                    '-method', STICKER_CONFIG.FFMPEG_CONFIG.method.toString(),
                    '-preset', STICKER_CONFIG.FFMPEG_CONFIG.preset,
                    '-loop', '0',
                    '-an', '-sn', '-dn',
                    '-t', STICKER_CONFIG.MAX_DURATION.toString(),
                    // Configurações adicionais para qualidade
                    '-auto-alt-ref', '1',
                    '-lag-in-frames', '16',
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
                    }, 30000); // Timeout aumentado para processamento de qualidade
                });
                
            } else {
                // ========== IMAGEM COM QUALIDADE SUPERIOR ==========
                const inputBuffer = fs.readFileSync(inputPath);
                
                // Pré-processamento para melhor qualidade
                let pipeline = sharp(inputBuffer, { 
                    density: 300, // DPI alta para melhor qualidade
                    limitInputPixels: false 
                });
                
                // Aplicar filtros de melhoria se necessário
                const metadata = await pipeline.metadata();
                if (metadata.width < 512 || metadata.height < 512) {
                    // Para imagens pequenas, usar interpolação de alta qualidade
                    pipeline = pipeline.resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: sharp.kernel.lanczos3, // Melhor interpolação
                        withoutEnlargement: false
                    });
                } else {
                    // Para imagens grandes, redimensionar com alta qualidade
                    pipeline = pipeline.resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: sharp.kernel.lanczos2
                    });
                }
                
                const outputBuffer = await pipeline
                    .webp({
                        quality: quality,
                        lossless: quality >= 90 ? true : false, // Lossless para qualidades muito altas
                        nearLossless: quality >= 85 ? true : false,
                        effort: STICKER_CONFIG.SHARP_CONFIG.effort,
                        smartSubsample: STICKER_CONFIG.SHARP_CONFIG.smartSubsample,
                        reductionEffort: STICKER_CONFIG.SHARP_CONFIG.reductionEffort,
                        alphaQuality: quality >= 80 ? 100 : 90 // Qualidade do canal alpha
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
                        console.log(`✅ Qualidade ${quality} aprovada: ${sizeKB.toFixed(1)}KB`);
                    } else {
                        console.log(`⚠️ Usando melhor qualidade possível: ${sizeKB.toFixed(1)}KB`);
                    }
                    return sizeKB.toFixed(1);
                }
                
                console.log('⚠️ Muito grande, tentando qualidade menor...');
            }
            
        } catch (error) {
            console.log(`❌ Qualidade ${quality} falhou: ${error.message}`);
            
            // Se é a última qualidade, tentar uma qualidade de emergência muito baixa
            if (quality === qualitiesToTry[qualitiesToTry.length - 1]) {
                console.log('🔄 Tentando qualidade de emergência...');
                try {
                    return await processEmergencyQuality(inputPath, outputPath, isVideo);
                } catch (emergencyError) {
                    throw new Error(`Todas as tentativas falharam. Último erro: ${error.message}`);
                }
            }
        }
    }
    
    throw new Error('Processamento falhou em todas as qualidades');
}

// ========================================
// PROCESSAMENTO DE EMERGÊNCIA (QUALIDADE BAIXA MAS FUNCIONAL)
// ========================================
async function processEmergencyQuality(inputPath, outputPath, isVideo) {
    console.log('🚨 Usando processamento de emergência...');
    
    const emergencyQuality = 25; // Qualidade baixa para garantir funcionamento
    const maxSize = isVideo ? STICKER_CONFIG.MAX_SIZE_ANIMATED : STICKER_CONFIG.MAX_SIZE_STATIC;
    
    if (isVideo) {
        const args = [
            '-hide_banner', '-loglevel', 'error', '-y',
            '-i', inputPath,
            '-vf', `scale=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
            '-c:v', 'libwebp',
            '-lossless', '0',
            '-compression_level', '6',
            '-quality', emergencyQuality.toString(),
            '-method', '4',
            '-loop', '0',
            '-an', '-sn', '-dn',
            '-t', STICKER_CONFIG.MAX_DURATION.toString(),
            outputPath
        ];
        
        const process = spawn('ffmpeg', args);
        await new Promise((resolve, reject) => {
            process.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg: ${code}`)));
            process.on('error', reject);
            setTimeout(() => { process.kill('SIGKILL'); reject(new Error('Timeout')); }, 20000);
        });
    } else {
        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = await sharp(inputBuffer)
            .resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({
                quality: emergencyQuality,
                lossless: false,
                effort: 3
            })
            .toBuffer();
        
        fs.writeFileSync(outputPath, outputBuffer);
    }
    
    const stats = fs.statSync(outputPath);
    const sizeKB = stats.size / 1024;
    console.log(`🚨 Emergência concluída: ${sizeKB.toFixed(1)}KB`);
    return sizeKB.toFixed(1);
}

// ========================================
// COMANDO PRINCIPAL
// ========================================
module.exports = {
    name: "st",
    alias: ["sticker", "fig", "figurinha"],
    desc: "Criar sticker de imagem ou vídeo com alta qualidade",
    category: "Converter",
    usage: ".s [responda mídia]",
    react: "🔥",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🔥 ========== STICKER ALTA QUALIDADE ========== 🔥');
        
        const tempFiles = [];
        
        try {
            if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage) {
                return m.reply(
                    `🔥 **CRIAR STICKER HD**\n\n` +
                    `🚀 **Como usar:**\n` +
                    `• Responda uma imagem ou vídeo com ${prefix}s\n\n` +
                    `✅ **Recursos:**\n` +
                    `• Qualidade HD otimizada\n` +
                    `• Processamento inteligente\n` +
                    `• Suporte a imagens e vídeos\n` +
                    `• Tamanho 512x512 perfeito\n\n` +
                    `⚡ **MÁXIMA QUALIDADE GARANTIDA!**`
                );
            }
            
            const buffer = await downloadMedia(quoted || m, m);
            const fileInfo = await fileType.fromBuffer(buffer);
            const isVideo = fileInfo?.mime?.startsWith('video/') || fileInfo?.ext === 'gif';
            
            // Verificar tamanho do arquivo
            if (buffer.length > 15 * 1024 * 1024) { // 15MB
                return m.reply('❌ **Arquivo muito grande!**\n\nTamanho máximo: 15MB');
            }
            
            // Mensagem de progresso aprimorada
            let progressMsg = null;
            const sizeKB = (buffer.length / 1024).toFixed(1);
            const [minQ, maxQ] = getOptimalQualityRange(buffer.length, isVideo);
            
            if (buffer.length > 500 * 1024) { // 500KB
                progressMsg = await m.reply(
                    `🔄 **CRIANDO STICKER HD**\n\n` +
                    `📊 Arquivo: ${sizeKB}KB\n` +
                    `🎯 Tipo: ${isVideo ? 'Vídeo/GIF animado' : 'Imagem estática'}\n` +
                    `🎨 Qualidade alvo: ${minQ}-${maxQ}\n` +
                    `⚡ Processando com máxima qualidade...\n\n` +
                    `⏱️ Aguarde alguns segundos`
                );
            }
            
            const uniqueId = Date.now();
            const inputPath = path.join(STICKER_CONFIG.TEMP_DIR, `input_${uniqueId}.${fileInfo?.ext || 'tmp'}`);
            const outputPath = path.join(STICKER_CONFIG.TEMP_DIR, `sticker_hd_${uniqueId}.webp`);
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
            
            console.log(`✅ STICKER HD concluído: ${resultSize}KB em ${processingTime}s`);
            
        } catch (error) {
            console.error('❌ Erro sticker:', error.message);
            
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) {}
            }
            
            let errorMsg = '❌ **Erro ao criar sticker HD**\n\n';
            
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
console.log('\n🔥 ========== STICKER ALTA QUALIDADE CARREGADO ========== 🔥');
console.log('⚡ Sistema de qualidade inteligente ativo');
console.log('🎨 Qualidades: 30-95 (adaptativo)');
console.log('📏 Tamanho: 512x512 HD');
console.log('🚀 Comando: .s [responder mídia]');
console.log('==========================================\n');
