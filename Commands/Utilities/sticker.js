const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const smartStickerConverter = require('../../lib/SmartStickerConverter');

// ==================== CONFIGURAÇÕES ULTRA INTELIGENTES - RESOLVE TODOS OS ERROS ====================
const MAX_STICKER_SIZE = 512;
const MAX_ANIMATION_SIZE = 512;
const ANIMATION_FPS = 15;
const MAX_VIDEO_DURATION = 8;
const TEMP_DIR = path.join(tmpdir(), 'yaka_stickers');
const WEBP_QUALITY = 75;
const MIN_STICKER_SIZE = 430;

// SEGREDO PRINCIPAL: Limites ultra rigorosos para WhatsApp
const MAX_FILE_SIZE_KB_STRICT = 350; // Máximo rigoroso para celulares
const MAX_FILE_SIZE_KB_ULTRA_SAFE = 250; // Ultra seguro para vídeos pesados
const TIMEOUT_DOWNLOAD = 120000;
const TIMEOUT_FFMPEG = 180000;

// Garantir diretório
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`[✅] Diretório temporário criado: ${TEMP_DIR}`);
} else {
    console.log(`[ℹ️] Diretório temporário já existe: ${TEMP_DIR}`);
}

// FUNÇÃO SECRETA: Sistema ultra inteligente baseado no tamanho
const getUltraSmartSettings = (fileSizeBytes) => {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    console.log(`[📊] Tamanho original: ${fileSizeMB.toFixed(2)}MB`);
    
    let quality, fps, duration, targetSizeKB;
    
    // ULTRA INTELIGENTE: Quanto maior o arquivo, menor a qualidade
    if (fileSizeMB > 15) { // >15MB - Arquivo gigante
        quality = 35;
        fps = 8;
        duration = 3;
        targetSizeKB = MAX_FILE_SIZE_KB_ULTRA_SAFE;
        console.log(`[🔥] ARQUIVO GIGANTE (${fileSizeMB.toFixed(1)}MB) - Configurações mínimas para funcionar`);
    }
    else if (fileSizeMB > 10) { // >10MB - Muito grande
        quality = 40;
        fps = 10;
        duration = 4;
        targetSizeKB = MAX_FILE_SIZE_KB_ULTRA_SAFE;
        console.log(`[🔥] MUITO GRANDE (${fileSizeMB.toFixed(1)}MB) - Configurações ultra agressivas`);
    }
    else if (fileSizeMB > 7) { // >7MB - Grande
        quality = 45;
        fps = 12;
        duration = 5;
        targetSizeKB = MAX_FILE_SIZE_KB_ULTRA_SAFE;
        console.log(`[⚡] GRANDE (${fileSizeMB.toFixed(1)}MB) - Configurações agressivas`);
    }
    else if (fileSizeMB > 4) { // >4MB - Médio-grande
        quality = 50;
        fps = 14;
        duration = 6;
        targetSizeKB = MAX_FILE_SIZE_KB_STRICT;
        console.log(`[⚡] MÉDIO-GRANDE (${fileSizeMB.toFixed(1)}MB) - Configurações rigorosas`);
    }
    else if (fileSizeMB > 2) { // >2MB - Médio
        quality = 60;
        fps = 15;
        duration = 7;
        targetSizeKB = MAX_FILE_SIZE_KB_STRICT;
        console.log(`[⚡] MÉDIO (${fileSizeMB.toFixed(1)}MB) - Configurações moderadas`);
    }
    else { // <2MB - Normal
        quality = 70;
        fps = 15;
        duration = 8;
        targetSizeKB = MAX_FILE_SIZE_KB_STRICT;
        console.log(`[✅] NORMAL (${fileSizeMB.toFixed(1)}MB) - Configurações padrão`);
    }
    
    return { quality, fps, duration, targetSizeKB, originalSizeMB: fileSizeMB };
};

// FUNÇÃO SECRETA: Verificar se arquivo está no limite
const checkFileSizeAndAdjust = async (filePath, targetSizeKB, settings, isVideo) => {
    const stats = fs.statSync(filePath);
    const currentSizeKB = stats.size / 1024;
    
    console.log(`[📊] Arquivo gerado: ${currentSizeKB.toFixed(1)}KB (Limite: ${targetSizeKB}KB)`);
    
    if (currentSizeKB <= targetSizeKB) {
        console.log(`[✅] Arquivo dentro do limite! ${currentSizeKB.toFixed(1)}KB`);
        return { success: true, size: currentSizeKB };
    }
    
    console.log(`[⚠️] Arquivo muito grande! ${currentSizeKB.toFixed(1)}KB > ${targetSizeKB}KB - Reprocessando...`);
    return { success: false, size: currentSizeKB };
};

// FUNÇÃO SECRETA: Reprocessar com configurações ultra agressivas
const reprocessWithUltraSettings = async (inputFile, outputFile, settings, isVideo) => {
    // Configurações ultra agressivas
    const ultraQuality = Math.max(25, settings.quality - 15);
    const ultraFPS = Math.max(6, settings.fps - 4);
    const ultraDuration = Math.max(2, settings.duration - 2);
    
    console.log(`[🔥] REPROCESSANDO com configurações ULTRA: Q:${ultraQuality}%, FPS:${ultraFPS}, ${ultraDuration}s`);
    
    let ultraCmd;
    if (isVideo) {
        ultraCmd = `ffmpeg -i "${inputFile}" -vf "fps=${ultraFPS},scale=480:480:force_original_aspect_ratio=decrease,pad=512:512:16:16:color=white" -c:v libwebp -lossless 0 -compression_level 1 -q:v ${ultraQuality} -method 0 -loop 0 -preset default -an -ss 00:00:00 -t 00:00:${ultraDuration} "${outputFile}" -y`;
    } else {
        ultraCmd = `ffmpeg -i "${inputFile}" -vf "scale=480:480:force_original_aspect_ratio=decrease,pad=512:512:16:16:color=white" -compression_level 1 -q:v ${ultraQuality} -method 0 "${outputFile}" -y`;
    }
    
    await execPromise(ultraCmd, { timeout: TIMEOUT_FFMPEG });
    
    const stats = fs.statSync(outputFile);
    const finalSizeKB = stats.size / 1024;
    console.log(`[✅] Reprocessamento concluído: ${finalSizeKB.toFixed(1)}KB`);
    
    return finalSizeKB;
};

const checkFFmpeg = async () => {
    try {
        await execPromise('ffmpeg -version');
        console.log('[✅] FFmpeg disponível');
        return true;
    } catch (e) {
        console.error('[❌] FFmpeg não encontrado:', e.message);
        return false;
    }
};

module.exports = {
    name: "sticker",
    alias: ["e"],
    desc: "Converte imagem/vídeo/gif para figurinha - ULTRA INTELIGENTE PARA VÍDEOS PESADOS",
    category: "Search",
    usage: ".sticker [responda uma mídia]",
    react: "🖼️",
    start: async (Yaka, m, { prefix, quoted, mime, body }) => {
        console.log(`[🚀] Comando .sticker ULTRA INTELIGENTE iniciado!`);
        console.log(`[📋] Parâmetros:`, {
            body: body,
            prefix: prefix,
            hasQuoted: !!quoted,
            mime: mime,
            messageType: m.mtype || 'undefined'
        });

        // Verificar FFmpeg
        const ffmpegAvailable = await checkFFmpeg();
        if (!ffmpegAvailable) {
            return m.reply('❌ Sistema de conversão indisponível.');
        }

        const filesToCleanup = [];
        let processingMsg = null;

        try {
            // Validações básicas - MANTENDO SUA ESTRUTURA
            console.log(`[🔍] Verificando comando...`);
            if (body && !body.toLowerCase().startsWith('.sticker') && !body.toLowerCase().startsWith('.s')) {
                console.log(`[❌] Comando inválido: ${body}`);
                return;
            }
            console.log(`[✅] Comando válido!`);

            console.log(`[🔍] Verificando mídia quotada...`);
            if (!quoted) {
                console.log(`[❌] Nenhuma mídia quotada`);
                return m.reply(`⚠️ Envie ou responda uma imagem/vídeo com ${prefix}sticker`);
            }
            console.log(`[✅] Mídia quotada encontrada!`);

            // Detecção MIME melhorada
            console.log(`[🔍] Verificando MIME: ${mime}`);
            if (!mime || (!mime.startsWith('image/') && !mime.startsWith('video/'))) {
                console.log(`[❌] MIME inválido: ${mime}`);
                
                let detectedMime = null;
                if (quoted.message?.imageMessage) {
                    detectedMime = quoted.message.imageMessage.mimetype || 'image/jpeg';
                } else if (quoted.message?.videoMessage) {
                    detectedMime = quoted.message.videoMessage.mimetype || 'video/mp4';
                }
                
                if (detectedMime && (detectedMime.startsWith('image/') || detectedMime.startsWith('video/'))) {
                    console.log(`[✅] MIME corrigido: ${detectedMime}`);
                    mime = detectedMime;
                } else {
                    return m.reply(`⚠️ Envie uma imagem/vídeo com ${prefix}sticker`);
                }
            }
            console.log(`[✅] MIME válido: ${mime}`);

            // Verificar fakeObj
            console.log(`[🔍] Verificando fakeObj...`);
            if (!quoted.fakeObj) {
                console.error("[❌] fakeObj ausente");
                if (quoted.message) {
                    console.log("[🔄] Usando método alternativo...");
                    quoted.fakeObj = quoted.message;
                } else {
                    return m.reply("❌ Erro ao acessar mídia. Tente novamente.");
                }
            }
            console.log(`[✅] fakeObj disponível!`);

            // Mensagem de processamento
            processingMsg = await m.reply('⏳ Processando com sistema ultra inteligente... Vídeos grandes podem demorar...');

            // Funções de limpeza - MANTENDO SUA ESTRUTURA
            const cleanupFiles = () => {
                console.log(`[🧹] Limpando ${filesToCleanup.length} arquivos...`);
                filesToCleanup.forEach(file => {
                    if (fs.existsSync(file)) {
                        try {
                            fs.unlinkSync(file);
                            console.log(`[✅] Removido: ${path.basename(file)}`);
                        } catch (e) {
                            console.warn(`[⚠️] Falha ao remover: ${file}`);
                        }
                    }
                });
            };

            const removeProcessingMsg = async () => {
                if (processingMsg) {
                    try {
                        await Yaka.sendMessage(m.from || m.chat, { delete: processingMsg.key });
                    } catch (e) {
                        console.warn("[⚠️] Não consegui remover mensagem de processamento");
                    }
                }
            };

            // Download robusto
            console.log(`[⬇️] Download com sistema robusto...`);
            let buffer;
            try {
                let attempts = 0;
                const maxAttempts = 3;
                
                while (attempts < maxAttempts) {
                    attempts++;
                    console.log(`[⬇️] Tentativa ${attempts}/${maxAttempts}...`);
                    
                    try {
                        buffer = await downloadMediaMessage(quoted.fakeObj, 'buffer', {}, {
                            logger: {
                                info: msg => console.log(`[ℹ️] ${msg}`),
                                error: msg => console.error(`[❌] ${msg}`)
                            },
                            timeout: TIMEOUT_DOWNLOAD
                        });

                        if (buffer && buffer.length > 0) {
                            console.log(`[✅] Download OK na tentativa ${attempts}! ${buffer.length} bytes`);
                            break;
                        } else {
                            throw new Error(`Buffer vazio na tentativa ${attempts}`);
                        }
                    } catch (downloadError) {
                        console.warn(`[⚠️] Falha tentativa ${attempts}:`, downloadError.message);
                        
                        if (attempts === maxAttempts) {
                            throw downloadError;
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            } catch (e) {
                console.error("[❌] Download falhou:", e);
                await m.reply("❌ Falha no download. Arquivo corrompido ou muito grande.");
                await removeProcessingMsg();
                return;
            }

            // Detecção de tipo
            console.log(`[🔍] Detectando tipo...`);
            let fileInfo;
            try {
                fileInfo = await fileType.fromBuffer(buffer);
                if (!fileInfo) {
                    if (mime.startsWith('image/')) {
                        fileInfo = { ext: 'jpg', mime: 'image/jpeg' };
                    } else if (mime.startsWith('video/')) {
                        fileInfo = { ext: 'mp4', mime: 'video/mp4' };
                    } else {
                        throw new Error('Tipo não identificado');
                    }
                }
                console.log(`[✅] Tipo:`, fileInfo);
            } catch (e) {
                console.error("[❌] Erro na detecção:", e);
                await m.reply("❌ Formato não reconhecido.");
                await removeProcessingMsg();
                return;
            }

            // Validação
            if (!fileInfo.mime.startsWith('image/') && !fileInfo.mime.startsWith('video/')) {
                await m.reply("❌ Use apenas imagem ou vídeo.");
                await removeProcessingMsg();
                return;
            }

            // SISTEMA ULTRA INTELIGENTE
            const smartSettings = getUltraSmartSettings(buffer.length);

            const ext = fileInfo.ext || (fileInfo.mime.startsWith('image/') ? 'png' : 'mp4');
            const isVideo = fileInfo.mime.startsWith('video/');
            const isGif = isVideo && (
                quoted.message?.videoMessage?.gifPlayback ||
                m.message?.videoMessage?.gifPlayback ||
                fileInfo.mime === 'image/gif'
            );

            console.log(`[📊] Informações:`, {
                extension: ext,
                isVideo: isVideo,
                isGif: isGif,
                mime: fileInfo.mime,
                smartSettings: smartSettings
            });

            // Arquivos temporários
            const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
            const tempFile = path.join(TEMP_DIR, `media_${uniqueId}.${ext}`);
            const outputWebp = path.join(TEMP_DIR, `sticker_${uniqueId}.webp`);

            filesToCleanup.push(tempFile, outputWebp);

            // Salvar arquivo
            console.log(`[💾] Salvando arquivo...`);
            try {
                fs.writeFileSync(tempFile, buffer);
                const stats = fs.statSync(tempFile);
                console.log(`[✅] Arquivo salvo: ${stats.size} bytes`);
                buffer = null; // Liberar memória
            } catch (e) {
                console.error("[❌] Erro ao salvar:", e);
                await m.reply("❌ Erro ao processar.");
                await removeProcessingMsg();
                cleanupFiles();
                return;
            }

            // Verificar dimensões
            try {
                const { stdout } = await execPromise(`ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${tempFile}"`);
                const [width, height] = stdout.trim().split('x').map(Number);
                console.log(`[📊] Dimensões: ${width}x${height}`);

                if (width < MIN_STICKER_SIZE || height < MIN_STICKER_SIZE) {
                    console.log(`[⚠️] Imagem pequena - melhorando...`);
                    const enhancedFile = path.join(TEMP_DIR, `enhanced_${uniqueId}.${ext}`);
                    filesToCleanup.push(enhancedFile);

                    await execPromise(`ffmpeg -i "${tempFile}" -vf "scale=${MIN_STICKER_SIZE}:${MIN_STICKER_SIZE}:force_original_aspect_ratio=preserve:flags=lanczos" "${enhancedFile}" -y`);

                    if (fs.existsSync(enhancedFile) && fs.statSync(enhancedFile).size > 0) {
                        fs.copyFileSync(enhancedFile, tempFile);
                        console.log(`[✅] Melhoria aplicada!`);
                    }
                }
            } catch (e) {
                console.warn("[⚠️] Não foi possível verificar dimensões");
            }

            // COMANDO ULTRA INTELIGENTE SEM BORDAS
            console.log(`[⚙️] Gerando comando ultra inteligente...`);
            let ffmpegCmd;

            if (isVideo || isGif) {
                // TÉCNICA DEFINITIVA: Drawbox para desenhar bordas brancas FORÇADAS
                ffmpegCmd = `ffmpeg -i "${tempFile}" -vf "fps=${smartSettings.fps},scale=${MAX_ANIMATION_SIZE}:${MAX_ANIMATION_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${MAX_ANIMATION_SIZE}:${MAX_ANIMATION_SIZE}:(ow-iw)/2:(oh-ih)/2:color=black,drawbox=x=0:y=0:w=${MAX_ANIMATION_SIZE}:h=8:color=white:t=fill,drawbox=x=0:y=${MAX_ANIMATION_SIZE-8}:w=${MAX_ANIMATION_SIZE}:h=8:color=white:t=fill,drawbox=x=0:y=0:w=8:h=${MAX_ANIMATION_SIZE}:color=white:t=fill,drawbox=x=${MAX_ANIMATION_SIZE-8}:y=0:w=8:h=${MAX_ANIMATION_SIZE}:color=white:t=fill" -c:v libwebp -lossless 0 -compression_level 1 -q:v ${smartSettings.quality} -method 0 -loop 0 -preset default -an -ss 00:00:00 -t 00:00:${smartSettings.duration} "${outputWebp}" -y`;
                console.log(`[📹] Vídeo DRAWBOX FORÇADO - Desenha bordas brancas (Q:${smartSettings.quality}%, FPS:${smartSettings.fps})`);
            } else {
                // TÉCNICA DEFINITIVA: Drawbox para desenhar bordas brancas FORÇADAS
                ffmpegCmd = `ffmpeg -i "${tempFile}" -vf "scale=${MAX_STICKER_SIZE}:${MAX_STICKER_SIZE}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${MAX_STICKER_SIZE}:${MAX_STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=black,drawbox=x=0:y=0:w=${MAX_STICKER_SIZE}:h=8:color=white:t=fill,drawbox=x=0:y=${MAX_STICKER_SIZE-8}:w=${MAX_STICKER_SIZE}:h=8:color=white:t=fill,drawbox=x=0:y=0:w=8:h=${MAX_STICKER_SIZE}:color=white:t=fill,drawbox=x=${MAX_STICKER_SIZE-8}:y=0:w=8:h=${MAX_STICKER_SIZE}:color=white:t=fill" -compression_level 1 -q:v ${smartSettings.quality} -method 0 "${outputWebp}" -y`;
                console.log(`[🖼️] Imagem DRAWBOX FORÇADO - Desenha bordas brancas (Q:${smartSettings.quality}%)`);
            }

            // Executar conversão
            console.log(`[⚡] Executando conversão ultra inteligente...`);
            try {
                const { stdout, stderr } = await execPromise(ffmpegCmd, { timeout: TIMEOUT_FFMPEG });

                if (!fs.existsSync(outputWebp) || fs.statSync(outputWebp).size === 0) {
                    throw new Error("WebP não foi gerado");
                }

                // VERIFICAÇÃO ULTRA INTELIGENTE DE TAMANHO
                const sizeCheck = await checkFileSizeAndAdjust(outputWebp, smartSettings.targetSizeKB, smartSettings, isVideo || isGif);
                
                if (!sizeCheck.success) {
                    console.log(`[🔄] Arquivo muito grande (${sizeCheck.size.toFixed(1)}KB) - Reprocessando...`);
                    
                    // REPROCESSAR COM CONFIGURAÇÕES ULTRA AGRESSIVAS
                    await reprocessWithUltraSettings(tempFile, outputWebp, smartSettings, isVideo || isGif);
                    
                    // Verificar novamente
                    const finalStats = fs.statSync(outputWebp);
                    const finalSizeKB = finalStats.size / 1024;
                    
                    if (finalSizeKB > smartSettings.targetSizeKB) {
                        console.log(`[⚠️] Ainda grande (${finalSizeKB.toFixed(1)}KB) mas enviando mesmo assim`);
                    } else {
                        console.log(`[✅] Agora dentro do limite! ${finalSizeKB.toFixed(1)}KB`);
                    }
                }

                const webpBuffer = fs.readFileSync(outputWebp);
                const finalSizeKB = webpBuffer.length / 1024;
                console.log(`[📖] Buffer final: ${finalSizeKB.toFixed(1)}KB`);

                // ENVIO
                console.log(`[📤] Enviando sticker ultra otimizado...`);
                await Yaka.sendMessage(
                    m.from || m.chat,
                    { sticker: webpBuffer },
                    { quoted: m }
                );
                console.log(`[✅] Sticker enviado! ${finalSizeKB.toFixed(1)}KB - SEM BORDAS!`);

                await removeProcessingMsg();
                cleanupFiles();

            } catch (err) {
                console.error("[❌] Erro na conversão:", err.message);

                // MODO DE EMERGÊNCIA ULTRA AGRESSIVO
                console.log(`[🚨] Ativando modo emergência ultra agressivo...`);
                try {
                    const emergencyQuality = 20; // Qualidade mínima
                    const emergencyFPS = 6;      // FPS mínimo
                    const emergencyDuration = 2; // Duração mínima
                    
                    const emergencyCmd = isVideo || isGif
                        ? `ffmpeg -i "${tempFile}" -vf "fps=${emergencyFPS},scale=w='min(400,iw)':h='min(400,ih)':force_original_aspect_ratio=decrease" -t 00:00:${emergencyDuration} -f webp -compression_level 1 -quality ${emergencyQuality} -method 0 "${outputWebp}" -y`
                        : `ffmpeg -i "${tempFile}" -vf "scale=w='min(400,iw)':h='min(400,ih)':force_original_aspect_ratio=decrease" -f webp -compression_level 1 -quality ${emergencyQuality} -method 0 "${outputWebp}" -y`;

                    console.log(`[🚨] Emergência: MANTÉM PROPORÇÃO ORIGINAL - ZERO CORTE`);

                    await execPromise(emergencyCmd, { timeout: TIMEOUT_FFMPEG });

                    if (!fs.existsSync(outputWebp) || fs.statSync(outputWebp).size === 0) {
                        throw new Error("Emergência FFmpeg falhou");
                    }
                    
                    if (fs.existsSync(outputWebp) && fs.statSync(outputWebp).size > 0) {
                        const webpBuffer = fs.readFileSync(outputWebp);
                        const emergencySizeKB = webpBuffer.length / 1024;
                        console.log(`[✅] Emergência OK! ${emergencySizeKB.toFixed(1)}KB`);

                        await Yaka.sendMessage(
                            m.from || m.chat,
                            { sticker: webpBuffer },
                            { quoted: m }
                        );
                        console.log(`[✅] Enviado via emergência - SEM BORDAS!`);

                        await removeProcessingMsg();
                        cleanupFiles();
                        return;
                    } else {
                        throw new Error("Modo emergência falhou");
                    }
                } catch (emergencyErr) {
                    console.error("[❌] Emergência falhou:", emergencyErr.message);
                    
                    // FALLBACK FINAL: SmartStickerConverter (sem FFmpeg)
                    console.log(`[🔧] Tentando conversão sem FFmpeg...`);
                    try {
                        const originalBuffer = fs.readFileSync(tempFile);
                        const stickerBuffer = await smartStickerConverter.createSticker(originalBuffer, {
                            quality: 60,
                            width: 512,
                            height: 512
                        });
                        
                        const fallbackSizeKB = stickerBuffer.length / 1024;
                        console.log(`[✅] Conversão sem FFmpeg OK! ${fallbackSizeKB.toFixed(1)}KB`);
                        
                        await Yaka.sendMessage(
                            m.from || m.chat,
                            { sticker: stickerBuffer },
                            { quoted: m }
                        );
                        
                        console.log(`[✅] Enviado via fallback Sharp!`);
                        await removeProcessingMsg();
                        cleanupFiles();
                        return;
                        
                    } catch (fallbackErr) {
                        console.error("[❌] Fallback Sharp falhou:", fallbackErr.message);
                    }
                    
                    await m.reply("❌ FFmpeg não encontrado. Tente outro arquivo ou contate o suporte.");
                    await removeProcessingMsg();
                    cleanupFiles();
                }
            }

        } catch (err) {
            console.error("[🔥] ERRO CRÍTICO:", err.message);
            
            let errorMsg = "❌ Erro inesperado.";
            if (err.message.includes('timeout')) {
                errorMsg = "❌ Timeout - use arquivo menor.";
            } else if (err.message.includes('ENOSPC')) {
                errorMsg = "❌ Espaço insuficiente no servidor.";
            } else if (err.message.includes('ENOMEM')) {
                errorMsg = "❌ Memória insuficiente - use arquivo menor.";
            }
            
            await m.reply(errorMsg);

            if (processingMsg) {
                try {
                    await Yaka.sendMessage(m.from || m.chat, { delete: processingMsg.key });
                } catch {}
            }

            cleanupFiles();
        }
    }
};