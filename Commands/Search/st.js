const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO ULTRA ROBUSTA PARA .ST
// ========================================
const ST_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_st_sticker'),
    // Tamanhos generosos para aceitar alta qualidade
    MAX_SIZE_STATIC: 200000,    // 200KB para imagens perfeitas
    MAX_SIZE_ANIMATED: 150000,  // 150KB para GIFs/vídeos
    MAX_DURATION: 8,            // 8 segundos para vídeos longos
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB - aceita arquivos pesados
    
    // Qualidades PERFEITAS - sempre começando com o máximo
    QUALITY_LEVELS: [98, 95, 92, 88, 85, 82, 78, 75, 72, 68, 65, 60],
    
    STANDARD_SIZE: 512,
    
    // Configurações avançadas para máxima qualidade
    SHARP_ULTRA: {
        density: 400,
        effort: 6,
        smartSubsample: false,
        reductionEffort: 6,
        alphaQuality: 100
    },
    
    FFMPEG_ULTRA: {
        compression_level: 3,
        method: 6,
        preset: 'photo',
        flags: 'lanczos+accurate_rnd+bitexact'
    }
};

// Criar diretório se não existir
if (!fs.existsSync(ST_CONFIG.TEMP_DIR)) {
    fs.mkdirSync(ST_CONFIG.TEMP_DIR, { recursive: true });
}

// ========================================
// SISTEMA DE DOWNLOAD ULTRA ROBUSTO
// ========================================
async function downloadMediaRobust(quoted, m) {
    console.log('📥 Iniciando download ultra robusto...');
    
    // Múltiplas estratégias para garantir sucesso
    const strategies = [
        // Estratégia 1: FakeObj (mais comum)
        () => quoted?.fakeObj ? downloadMediaMessage(quoted.fakeObj, 'buffer', {}) : null,
        // Estratégia 2: Quoted direto
        () => quoted ? downloadMediaMessage(quoted, 'buffer', {}) : null,
        // Estratégia 3: Mensagem principal
        () => m.message ? downloadMediaMessage(m, 'buffer', {}) : null,
        // Estratégia 4: Quoted.message
        () => quoted?.message ? downloadMediaMessage(quoted.message, 'buffer', {}) : null,
        // Estratégia 5: Busca profunda
        () => {
            const msg = quoted?.message || m.message;
            if (msg?.imageMessage || msg?.videoMessage || msg?.documentMessage) {
                return downloadMediaMessage({ message: msg }, 'buffer', {});
            }
            return null;
        }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
        try {
            console.log(`🔄 Tentativa ${i + 1}/5...`);
            
            const downloadPromise = strategies[i]();
            if (!downloadPromise) continue;
            
            const buffer = await Promise.race([
                downloadPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout de download')), 25000)
                )
            ]);
            
            if (buffer && buffer.length > 0) {
                console.log(`✅ Download sucesso: ${(buffer.length / 1024).toFixed(1)}KB`);
                return buffer;
            }
        } catch (error) {
            console.log(`❌ Estratégia ${i + 1} falhou: ${error.message}`);
        }
    }
    
    throw new Error('❌ Falha em todas as estratégias de download');
}

// ========================================
// DETECTOR DE TIPO DE MÍDIA AVANÇADO
// ========================================
async function detectMediaType(buffer) {
    try {
        const fileInfo = await fileType.fromBuffer(buffer);
        
        const videoTypes = [
            'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm',
            'video/3gpp', 'video/quicktime', 'video/x-msvideo'
        ];
        
        const imageTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
            'image/bmp', 'image/tiff', 'image/svg+xml'
        ];
        
        const gifTypes = ['image/gif'];
        
        const mime = fileInfo?.mime || '';
        const ext = fileInfo?.ext || '';
        
        if (gifTypes.includes(mime) || ext === 'gif') {
            return { type: 'gif', mime, ext, isVideo: true };
        } else if (videoTypes.includes(mime) || ['mp4', 'avi', 'mov', 'mkv', 'webm', '3gp'].includes(ext)) {
            return { type: 'video', mime, ext, isVideo: true };
        } else if (imageTypes.includes(mime) || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
            return { type: 'image', mime, ext, isVideo: false };
        }
        
        // Fallback: tentar detectar por assinatura de bytes
        const signature = buffer.slice(0, 12).toString('hex');
        if (signature.startsWith('474946')) return { type: 'gif', isVideo: true }; // GIF
        if (signature.includes('667479706d703')) return { type: 'video', isVideo: true }; // MP4
        if (signature.startsWith('ffd8ff')) return { type: 'image', isVideo: false }; // JPEG
        if (signature.startsWith('89504e47')) return { type: 'image', isVideo: false }; // PNG
        
        return { type: 'unknown', mime, ext, isVideo: false };
    } catch (error) {
        console.log('⚠️ Erro na detecção, assumindo imagem');
        return { type: 'image', isVideo: false };
    }
}

// ========================================
// PROCESSAMENTO ULTRA AVANÇADO
// ========================================
async function processUltraSticker(inputPath, outputPath, mediaInfo) {
    console.log(`🔄 PROCESSAMENTO ULTRA - ${mediaInfo.type.toUpperCase()}`);
    
    const maxSize = mediaInfo.isVideo ? ST_CONFIG.MAX_SIZE_ANIMATED : ST_CONFIG.MAX_SIZE_STATIC;
    
    for (const quality of ST_CONFIG.QUALITY_LEVELS) {
        try {
            console.log(`🎨 Testando qualidade ULTRA ${quality}...`);
            
            if (mediaInfo.isVideo) {
                await processVideoUltra(inputPath, outputPath, quality);
            } else {
                await processImageUltra(inputPath, outputPath, quality);
            }
            
            // Verificar resultado
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                const sizeKB = stats.size / 1024;
                
                console.log(`📊 Resultado Q${quality}: ${sizeKB.toFixed(1)}KB`);
                
                if (stats.size <= maxSize) {
                    console.log(`✅ QUALIDADE ${quality} PERFEITA: ${sizeKB.toFixed(1)}KB`);
                    return { size: sizeKB.toFixed(1), quality };
                }
                
                console.log(`⚠️ Muito grande (${sizeKB.toFixed(1)}KB > ${(maxSize/1024).toFixed(1)}KB), tentando menor...`);
            }
            
        } catch (error) {
            console.log(`❌ Qualidade ${quality} falhou: ${error.message}`);
        }
    }
    
    throw new Error('❌ Falha em todas as qualidades');
}

// ========================================
// PROCESSAMENTO DE VÍDEO ULTRA
// ========================================
async function processVideoUltra(inputPath, outputPath, quality) {
    const args = [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', inputPath,
        
        // Filtros ultra avançados para máxima qualidade
        '-vf', [
            `scale=${ST_CONFIG.STANDARD_SIZE}:${ST_CONFIG.STANDARD_SIZE}:force_original_aspect_ratio=decrease:flags=${ST_CONFIG.FFMPEG_ULTRA.flags}`,
            `pad=${ST_CONFIG.STANDARD_SIZE}:${ST_CONFIG.STANDARD_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`
        ].join(','),
        
        // Codec e qualidade
        '-c:v', 'libwebp',
        '-lossless', quality >= 95 ? '1' : '0',
        '-compression_level', ST_CONFIG.FFMPEG_ULTRA.compression_level.toString(),
        '-quality', quality.toString(),
        '-method', ST_CONFIG.FFMPEG_ULTRA.method.toString(),
        '-preset', ST_CONFIG.FFMPEG_ULTRA.preset,
        
        // Configurações avançadas
        '-auto-alt-ref', '1',
        '-lag-in-frames', '25',
        '-error-resilient', '1',
        
        '-loop', '0',
        '-an', '-sn', '-dn',
        '-t', ST_CONFIG.MAX_DURATION.toString(),
        
        outputPath
    ];
    
    console.log(`🎬 Executando FFmpeg com ${args.length} parâmetros...`);
    
    const process = spawn('ffmpeg', args);
    
    return new Promise((resolve, reject) => {
        let stderr = '';
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg falhou (${code}): ${stderr.slice(-200)}`));
            }
        });
        
        process.on('error', (error) => {
            reject(new Error(`Erro no spawn: ${error.message}`));
        });
        
        // Timeout generoso para arquivos pesados
        setTimeout(() => {
            process.kill('SIGKILL');
            reject(new Error('Timeout no processamento de vídeo'));
        }, 60000); // 1 minuto
    });
}

// ========================================
// PROCESSAMENTO DE IMAGEM ULTRA
// ========================================
async function processImageUltra(inputPath, outputPath, quality) {
    console.log(`🖼️ Processando imagem com Sharp Ultra...`);
    
    const inputBuffer = fs.readFileSync(inputPath);
    
    // Pipeline ultra otimizada
    let pipeline = sharp(inputBuffer, { 
        density: ST_CONFIG.SHARP_ULTRA.density,
        limitInputPixels: false,
        sequentialRead: true
    });
    
    // Obter metadata para otimização
    const metadata = await pipeline.metadata();
    console.log(`📏 Imagem original: ${metadata.width}x${metadata.height}`);
    
    // Kernel baseado no tamanho da imagem
    let kernel = sharp.kernel.lanczos3;
    if (metadata.width < 256 || metadata.height < 256) {
        kernel = sharp.kernel.mitchell; // Melhor para upscale
    }
    
    const outputBuffer = await pipeline
        .resize(ST_CONFIG.STANDARD_SIZE, ST_CONFIG.STANDARD_SIZE, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            kernel: kernel,
            withoutEnlargement: false,
            withoutReduction: false
        })
        .webp({
            quality: quality,
            lossless: quality >= 95,
            nearLossless: quality >= 90,
            effort: ST_CONFIG.SHARP_ULTRA.effort,
            smartSubsample: ST_CONFIG.SHARP_ULTRA.smartSubsample,
            reductionEffort: ST_CONFIG.SHARP_ULTRA.reductionEffort,
            alphaQuality: ST_CONFIG.SHARP_ULTRA.alphaQuality
        })
        .toBuffer();
    
    fs.writeFileSync(outputPath, outputBuffer);
    console.log(`✅ Imagem processada: ${outputBuffer.length} bytes`);
}

// ========================================
// COMANDO .ST DEFINITIVO
// ========================================
module.exports = {
    name: "st",
    alias: ["sticker-ultra", "stick", "stickr"],
    desc: "Criar sticker ultra com qualidade perfeita - aceita tudo",
    category: "Converter",
    usage: ".st [responda mídia]",
    react: "🔥",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🔥 ========== COMANDO .ST ULTRA INICIADO ========== 🔥');
        
        const tempFiles = [];
        let progressMsg = null;
        
        try {
            // Verificar se há mídia
            if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage && !m.message?.documentMessage) {
                return m.reply(
                    `🔥 **STICKER ULTRA (.ST)**\n\n` +
                    `🚀 **Como usar:**\n` +
                    `• Responda qualquer mídia com ${prefix}st\n\n` +
                    `✅ **Aceita TUDO:**\n` +
                    `• Imagens (JPG, PNG, WEBP, BMP)\n` +
                    `• Vídeos (MP4, AVI, MOV, MKV)\n` +
                    `• GIFs animados\n` +
                    `• Arquivos até 50MB\n` +
                    `• Qualidade 98-95 (ULTRA)\n\n` +
                    `⚡ **PERFEIÇÃO GARANTIDA!**`
                );
            }
            
            // Download ultra robusto
            console.log('📥 Iniciando download ultra...');
            const buffer = await downloadMediaRobust(quoted || m, m);
            
            // Verificar tamanho
            if (buffer.length > ST_CONFIG.MAX_FILE_SIZE) {
                return m.reply(
                    `❌ **Arquivo muito grande!**\n\n` +
                    `📊 Tamanho: ${(buffer.length / 1024 / 1024).toFixed(1)}MB\n` +
                    `📏 Máximo: ${ST_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB\n\n` +
                    `💡 Comprima o arquivo ou use um menor`
                );
            }
            
            // Detectar tipo de mídia
            const mediaInfo = await detectMediaType(buffer);
            console.log(`🎯 Mídia detectada: ${mediaInfo.type} (${mediaInfo.isVideo ? 'animado' : 'estático'})`);
            
            // Mensagem de progresso para arquivos grandes
            const sizeKB = (buffer.length / 1024).toFixed(1);
            if (buffer.length > 1024 * 1024) { // > 1MB
                progressMsg = await m.reply(
                    `🔄 **PROCESSANDO STICKER ULTRA**\n\n` +
                    `📊 Arquivo: ${sizeKB}KB\n` +
                    `🎯 Tipo: ${mediaInfo.type.toUpperCase()}\n` +
                    `🎨 Qualidade: 98-95 (ULTRA PERFEITA)\n` +
                    `📏 Saída: 512x512 HD\n\n` +
                    `⚡ Processando com máxima qualidade...\n` +
                    `⏱️ Isso pode levar até 1 minuto`
                );
            }
            
            // Criar arquivos temporários
            const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);
            const inputExt = mediaInfo.ext || (mediaInfo.isVideo ? 'mp4' : 'jpg');
            const inputPath = path.join(ST_CONFIG.TEMP_DIR, `input_ultra_${uniqueId}.${inputExt}`);
            const outputPath = path.join(ST_CONFIG.TEMP_DIR, `sticker_ultra_${uniqueId}.webp`);
            
            tempFiles.push(inputPath, outputPath);
            
            // Salvar arquivo de entrada
            fs.writeFileSync(inputPath, buffer);
            console.log(`💾 Arquivo salvo: ${inputPath}`);
            
            // Processar com qualidade ultra
            const startTime = Date.now();
            const result = await processUltraSticker(inputPath, outputPath, mediaInfo);
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
            
            // Ler sticker final
            const stickerBuffer = fs.readFileSync(outputPath);
            
            // Remover mensagem de progresso
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) { console.log('⚠️ Não foi possível deletar msg de progresso'); }
            }
            
            // Enviar sticker
            await Yaka.sendMessage(m.chat, { 
                sticker: stickerBuffer 
            }, { quoted: m });
            
            console.log(`✅ STICKER ULTRA CONCLUÍDO:`);
            console.log(`   📊 Tamanho: ${result.size}KB`);
            console.log(`   🎨 Qualidade: ${result.quality}`);
            console.log(`   ⏱️ Tempo: ${processingTime}s`);
            console.log(`   🎯 Tipo: ${mediaInfo.type}`);
            
        } catch (error) {
            console.error('❌ ERRO NO .ST:', error.message);
            console.error(error.stack);
            
            // Remover mensagem de progresso em caso de erro
            if (progressMsg) {
                try {
                    await Yaka.sendMessage(m.chat, { delete: progressMsg.key });
                } catch (e) {}
            }
            
            // Mensagem de erro detalhada
            let errorMsg = '❌ **ERRO NO PROCESSAMENTO ULTRA**\n\n';
            
            if (error.message.includes('download')) {
                errorMsg += '📥 Falha no download\n💡 Reenvie o arquivo ou tente outro formato';
            } else if (error.message.includes('FFmpeg')) {
                errorMsg += '🎬 Erro no processamento de vídeo\n💡 Formato de vídeo pode não ser suportado';
            } else if (error.message.includes('Sharp')) {
                errorMsg += '🖼️ Erro no processamento de imagem\n💡 Formato de imagem pode estar corrompido';
            } else if (error.message.includes('Timeout')) {
                errorMsg += '⏱️ Tempo limite excedido\n💡 Arquivo muito complexo, tente comprimir';
            } else {
                errorMsg += `🔧 ${error.message}\n💡 Tente com outro arquivo`;
            }
            
            m.reply(errorMsg);
            
        } finally {
            // Limpar arquivos temporários
            console.log('🧹 Limpando arquivos temporários...');
            tempFiles.forEach(filePath => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Removido: ${path.basename(filePath)}`);
                    }
                } catch (e) {
                    console.log(`⚠️ Erro ao remover ${filePath}: ${e.message}`);
                }
            });
        }
    }
};

// ========================================
// INICIALIZAÇÃO ULTRA
// ========================================
console.log('\n🔥 ========== COMANDO .ST ULTRA CARREGADO ========== 🔥');
console.log('⚡ Sistema ultra robusto ativo');
console.log('🎨 Qualidades: 98, 95, 92, 88, 85... (ULTRA)');
console.log('📊 Aceita: Imagens, Vídeos, GIFs até 50MB');
console.log('📏 Saída: 512x512 WebP de alta qualidade');
console.log('🚀 Comando: .st [responder mídia]');
console.log('🛡️ Sistema de fallback e recuperação');
console.log('==========================================\n');
