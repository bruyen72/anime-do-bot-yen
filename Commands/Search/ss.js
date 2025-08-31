const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn, execSync } = require('child_process');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const smartStickerConverter = require('../../lib/SmartStickerConverter');

// ==================== CONFIGURAÇÕES OTIMIZADAS ====================
const MAX_STICKER_SIZE = 512;
const TEMP_DIR = path.join(tmpdir(), 'yaka_stickers');
const MAX_FILE_SIZE_MB = 50;
const TARGET_MAX_KB = 500;

// Caminhos do FFmpeg (prioridade para variáveis de ambiente)
const FFMPEG_PRIORITY_PATHS = [
    process.env.FFMPEG_PATH,           // Variável de ambiente
    '/usr/bin/ffmpeg',                 // Instalação padrão Linux (Dockerfile)
    '/usr/local/bin/ffmpeg',           // Alternativa Linux
    'ffmpeg',                          // PATH do sistema
    path.join(process.cwd(), 'ffmpeg.exe'),    // Windows local
    path.join(process.cwd(), 'ffmpeg'),        // Linux local
];

const FFPROBE_PRIORITY_PATHS = [
    process.env.FFPROBE_PATH,          // Variável de ambiente
    '/usr/bin/ffprobe',                // Instalação padrão Linux (Dockerfile)
    '/usr/local/bin/ffprobe',          // Alternativa Linux
    'ffprobe',                         // PATH do sistema
];

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ==================== DETECTOR DE FFMPEG AVANÇADO ====================
class AdvancedFFmpegDetector {
    static findFFmpegExecutables() {
        let ffmpegPath = null;
        let ffprobePath = null;

        // Encontrar FFmpeg
        for (const testPath of FFMPEG_PRIORITY_PATHS) {
            if (!testPath) continue;
            
            try {
                execSync(`"${testPath}" -version`, { 
                    stdio: 'ignore', 
                    timeout: 3000 
                });
                ffmpegPath = testPath;
                console.log(`[✅] FFmpeg encontrado: ${testPath}`);
                break;
            } catch (error) {
                continue;
            }
        }

        // Encontrar FFprobe
        for (const testPath of FFPROBE_PRIORITY_PATHS) {
            if (!testPath) continue;
            
            try {
                execSync(`"${testPath}" -version`, { 
                    stdio: 'ignore', 
                    timeout: 3000 
                });
                ffprobePath = testPath;
                console.log(`[✅] FFprobe encontrado: ${testPath}`);
                break;
            } catch (error) {
                continue;
            }
        }

        return { 
            ffmpeg: ffmpegPath, 
            ffprobe: ffprobePath,
            available: !!ffmpegPath,
            complete: !!(ffmpegPath && ffprobePath)
        };
    }

    static async getSystemInfo() {
        const executables = this.findFFmpegExecutables();
        
        let systemInfo = {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            ...executables
        };

        if (executables.ffmpeg) {
            try {
                const ffmpegVersion = execSync(`"${executables.ffmpeg}" -version`, { 
                    encoding: 'utf8', 
                    timeout: 3000 
                });
                systemInfo.ffmpegVersion = ffmpegVersion.split('\n')[0];
            } catch (error) {
                systemInfo.ffmpegVersion = 'Erro ao obter versão';
            }
        }

        console.log(`[🔧] Sistema: ${systemInfo.platform}-${systemInfo.arch}, Node ${systemInfo.nodeVersion}`);
        console.log(`[🔧] FFmpeg: ${systemInfo.available ? '✅' : '❌'} ${systemInfo.ffmpegVersion || 'N/A'}`);
        console.log(`[🔧] FFprobe: ${systemInfo.ffprobe ? '✅' : '❌'}`);

        return systemInfo;
    }
}

// ==================== PROCESSADOR DE VÍDEO AVANÇADO ====================
class AdvancedVideoProcessor {
    static calculateOptimalSettings(sizeKB, duration = null) {
        const sizeMB = sizeKB / 1024;
        
        // Configurações baseadas no tamanho e duração estimada
        if (sizeMB >= 20) return { quality: 15, size: 300, maxDuration: 2, fps: 1 };
        if (sizeMB >= 10) return { quality: 25, size: 350, maxDuration: 2, fps: 2 };
        if (sizeMB >= 5) return { quality: 35, size: 400, maxDuration: 3, fps: 3 };
        if (sizeMB >= 2) return { quality: 45, size: 450, maxDuration: 3, fps: 5 };
        if (sizeKB >= 1000) return { quality: 55, size: 480, maxDuration: 3, fps: 8 };
        
        return { quality: 65, size: 512, maxDuration: 3, fps: 10 };
    }

    static async extractVideoFrame(videoBuffer, ffmpegPath, settings) {
        const tempVideoPath = path.join(TEMP_DIR, `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`);
        const tempFramePath = path.join(TEMP_DIR, `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`);
        
        try {
            // Salvar vídeo temporário
            fs.writeFileSync(tempVideoPath, videoBuffer);
            console.log(`[📹] Vídeo temp salvo: ${(videoBuffer.length / 1024).toFixed(1)}KB`);
            
            // Comando FFmpeg otimizado para extração de frame
            const args = [
                '-y',                           // Sobrescrever arquivo
                '-i', tempVideoPath,            // Input
                '-ss', '00:00:01',              // Pular para 1 segundo (evita frames pretos)
                '-vframes', '1',                // Apenas 1 frame
                '-vf', [
                    `scale=${settings.size}:${settings.size}:force_original_aspect_ratio=decrease`,
                    `pad=${settings.size}:${settings.size}:(ow-iw)/2:(oh-ih)/2:color=black`
                ].join(','),
                '-q:v', '2',                    // Qualidade alta para o frame
                '-f', 'image2',                 // Formato de saída
                tempFramePath                   // Output
            ];
            
            console.log(`[⚡] Executando FFmpeg: ${path.basename(ffmpegPath)} ${args.slice(2).join(' ')}`);
            
            // Executar FFmpeg com controle robusto
            await new Promise((resolve, reject) => {
                const ffmpeg = spawn(ffmpegPath, args, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    windowsHide: true,
                    detached: false
                });
                
                let stdout = '';
                let stderr = '';
                
                ffmpeg.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                
                ffmpeg.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                
                const timeout = setTimeout(() => {
                    ffmpeg.kill('SIGKILL');
                    reject(new Error('FFmpeg timeout (15s)'));
                }, 15000);
                
                ffmpeg.on('close', (code) => {
                    clearTimeout(timeout);
                    if (code === 0) {
                        console.log(`[✅] FFmpeg concluído com sucesso`);
                        resolve();
                    } else {
                        const error = stderr.slice(0, 300) || `Código de saída: ${code}`;
                        console.log(`[⚠️] FFmpeg erro: ${error}`);
                        reject(new Error(`FFmpeg falhou: ${error}`));
                    }
                });
                
                ffmpeg.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`Erro ao executar FFmpeg: ${error.message}`));
                });
            });
            
            // Verificar se o frame foi criado
            if (fs.existsSync(tempFramePath)) {
                const frameBuffer = fs.readFileSync(tempFramePath);
                const frameSizeKB = frameBuffer.length / 1024;
                console.log(`[✅] Frame extraído: ${frameSizeKB.toFixed(1)}KB`);
                
                if (frameSizeKB > 0) {
                    return frameBuffer;
                } else {
                    throw new Error('Frame vazio');
                }
            } else {
                throw new Error('Arquivo de frame não foi criado');
            }
            
        } catch (error) {
            console.log(`[⚠️] Extração de frame falhou: ${error.message}`);
            throw error;
        } finally {
            // Limpeza rigorosa
            const filesToClean = [tempVideoPath, tempFramePath];
            for (const file of filesToClean) {
                try {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                        console.log(`[🧹] Removido: ${path.basename(file)}`);
                    }
                } catch (cleanupError) {
                    console.log(`[⚠️] Erro ao remover ${path.basename(file)}: ${cleanupError.message}`);
                }
            }
        }
    }
}

// ==================== COMANDO PRINCIPAL OTIMIZADO ====================
module.exports = {
    name: "ss",
    alias: ["sticker", "stiker"],
    desc: "Conversor avançado de mídia para sticker com FFmpeg integrado",
    category: "Search", 
    usage: ".ss [responda uma mídia]",
    react: "🔥",
    start: async (Yaka, m, { prefix, quoted, mime, body }) => {
        console.log(`[🚀] === STICKER CONVERTER AVANÇADO INICIADO ===`);

        let processingMsg = null;
        const startTime = Date.now();

        try {
            // Validação de comando
            const validCommands = ['.ss', '.sticker', '.stiker'];
            const isValidCommand = validCommands.some(cmd => body?.toLowerCase().startsWith(cmd));
            
            if (body && !isValidCommand) {
                console.log(`[⚠️] Comando inválido ignorado: ${body}`);
                return;
            }

            if (!quoted) {
                const helpMsg = `⚠️ Responda uma **MÍDIA** com ${prefix}ss\n\n🚀 **SUPORTE AVANÇADO:**\n• 🖼️ Imagens (JPG/PNG/WEBP/GIF)\n• 🎬 Vídeos (MP4/MOV/AVI/MKV)\n• 🔧 FFmpeg integrado\n• ⚡ Compressão inteligente\n• 🎯 Múltiplos fallbacks\n• 📊 Até ${MAX_FILE_SIZE_MB}MB suportado`;
                return m.reply(helpMsg);
            }

            // Verificar mídia citada
            const hasMedia = quoted.message?.imageMessage || 
                            quoted.message?.videoMessage || 
                            quoted.message?.stickerMessage ||
                            quoted.fakeObj?.message?.imageMessage ||
                            quoted.fakeObj?.message?.videoMessage;

            if (!hasMedia) {
                console.log(`[⚠️] Nenhuma mídia válida encontrada`);
                return m.reply(`❌ **Nenhuma mídia encontrada!**\n\nResponda uma **imagem** ou **vídeo** com ${prefix}ss`);
            }

            console.log(`[✅] Mídia detectada, iniciando análise do sistema...`);
            
            // Análise do sistema
            const systemInfo = await AdvancedFFmpegDetector.getSystemInfo();

            processingMsg = await m.reply(`🔥 **PROCESSADOR AVANÇADO ATIVADO**\n\n🔧 **Sistema:** ${systemInfo.platform}-${systemInfo.arch}\n🎯 **FFmpeg:** ${systemInfo.available ? '✅ Disponível' : '❌ Não encontrado'}\n⚙️ **FFprobe:** ${systemInfo.ffprobe ? '✅' : '❌'}\n⏳ **Status:** Iniciando download...`);

            // ==================== DOWNLOAD ROBUSTO ====================
            console.log(`[⬇️] Iniciando download robusto...`);
            let buffer;

            try {
                const downloadStart = Date.now();
                
                const downloadPromise = quoted.fakeObj ? 
                    downloadMediaMessage(quoted.fakeObj, 'buffer', {}, {}) :
                    downloadMediaMessage(quoted, 'buffer', {}, {});

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Download timeout (30s)')), 30000)
                );

                buffer = await Promise.race([downloadPromise, timeoutPromise]);

                if (!buffer || buffer.length === 0) {
                    throw new Error('Buffer de download vazio');
                }

                const downloadTime = Date.now() - downloadStart;
                const sizeKB = buffer.length / 1024;
                const sizeMB = sizeKB / 1024;
                
                console.log(`[✅] Download concluído: ${sizeKB.toFixed(1)}KB (${sizeMB.toFixed(2)}MB) em ${downloadTime}ms`);

                if (sizeMB > MAX_FILE_SIZE_MB) {
                    return m.reply(`❌ **Arquivo muito grande!**\n\n📏 **Tamanho:** ${sizeMB.toFixed(2)}MB\n📏 **Máximo:** ${MAX_FILE_SIZE_MB}MB\n\n💡 **Comprima o arquivo antes de enviar**`);
                }

            } catch (downloadError) {
                console.error(`[❌] Falha no download: ${downloadError.message}`);
                return m.reply(`❌ **Falha no download**\n\n🔧 **Erro:** ${downloadError.message}\n\n💡 **Tente reenviar a mídia**`);
            }

            // ==================== ANÁLISE DE MÍDIA ====================
            let detectedType;
            try {
                detectedType = await fileType.fromBuffer(buffer);
            } catch (e) {
                detectedType = { mime: mime || 'image/jpeg', ext: 'jpg' };
            }

            const mimeType = detectedType?.mime || mime || 'image/jpeg';
            const isVideo = mimeType.startsWith('video/');
            const isImage = mimeType.startsWith('image/');
            const originalSizeKB = buffer.length / 1024;
            
            console.log(`[📊] Análise da mídia:`);
            console.log(`    • Tipo: ${mimeType}`);
            console.log(`    • Categoria: ${isVideo ? 'VÍDEO' : isImage ? 'IMAGEM' : 'OUTRO'}`);
            console.log(`    • Tamanho: ${originalSizeKB.toFixed(1)}KB`);

            const settings = AdvancedVideoProcessor.calculateOptimalSettings(originalSizeKB);
            console.log(`[🎯] Configurações otimizadas: ${settings.quality}% qualidade, ${settings.size}px, max ${settings.maxDuration}s`);

            // ==================== PROCESSAMENTO INTELIGENTE ====================
            let finalBuffer = null;
            let processingMethod = '';
            let processingStart = Date.now();

            // Atualizar status com informações detalhadas
            await Yaka.sendMessage(m.from || m.chat, { 
                edit: processingMsg.key,
                text: `🎯 **PROCESSANDO ${isVideo ? 'VÍDEO' : 'IMAGEM'}**\n\n📁 **Arquivo:** ${(originalSizeKB/1024).toFixed(2)}MB\n📝 **Tipo:** ${mimeType}\n🔧 **FFmpeg:** ${systemInfo.available ? '✅ Ativo' : '❌ N/A'}\n⚙️ **Config:** ${settings.quality}%, ${settings.size}px\n⏳ **Processando...**`
            });

            // ESTRATÉGIA 1: VÍDEOS COM FFMPEG
            if (isVideo && systemInfo.available) {
                try {
                    console.log(`[🎬] === PROCESSAMENTO DE VÍDEO COM FFMPEG ===`);
                    const frameBuffer = await AdvancedVideoProcessor.extractVideoFrame(
                        buffer, 
                        systemInfo.ffmpeg, 
                        settings
                    );
                    
                    // Compressão do frame com Sharp
                    console.log(`[🔧] Comprimindo frame com Sharp...`);
                    const sharp = require('sharp');
                    const compressedFrame = await sharp(frameBuffer)
                        .resize(settings.size, settings.size, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .webp({ 
                            quality: settings.quality,
                            effort: 3 // Boa compressão
                        })
                        .toBuffer();
                    
                    finalBuffer = compressedFrame;
                    processingMethod = 'FFmpeg + Sharp';
                    console.log(`[✅] Vídeo processado com sucesso: ${(finalBuffer.length / 1024).toFixed(1)}KB`);
                    
                } catch (ffmpegError) {
                    console.log(`[⚠️] Processamento FFmpeg falhou: ${ffmpegError.message}`);
                    processingMethod += ' (FFmpeg falhou)';
                    
                    // FALLBACK IMEDIATO: SmartStickerConverter
                    if (isImage && !finalBuffer) {
                        try {
                            console.log(`[🔄] Tentando SmartStickerConverter...`);
                            finalBuffer = await smartStickerConverter.createSticker(buffer, {
                                quality: settings.quality,
                                width: settings.size,
                                height: settings.size
                            });
                            processingMethod += ' → SmartConverter';
                            console.log(`[✅] SmartStickerConverter sucesso: ${(finalBuffer.length/1024).toFixed(1)}KB`);
                        } catch (smartError) {
                            console.log(`[⚠️] SmartStickerConverter falhou: ${smartError.message}`);
                        }
                    }
                }
            }

            // ESTRATÉGIA 2: WA-STICKER (FALLBACK UNIVERSAL)
            if (!finalBuffer) {
                try {
                    console.log(`[🔄] === USANDO WA-STICKER COMO FALLBACK ===`);
                    const { Sticker } = require('wa-sticker-formatter');
                    
                    const sticker = new Sticker(buffer, {
                        pack: 'YakaBot',
                        author: 'Advanced',
                        type: 'default',
                        quality: Math.min(settings.quality, 50) // Limitar qualidade para WA-Sticker
                    });

                    const waBuffer = await Promise.race([
                        sticker.toBuffer(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('WA-Sticker timeout (15s)')), 15000)
                        )
                    ]);
                    
                    if (waBuffer && waBuffer.length > 0) {
                        finalBuffer = waBuffer;
                        processingMethod = processingMethod ? `${processingMethod} → WA-Sticker` : 'WA-Sticker';
                        console.log(`[✅] WA-Sticker processou: ${(finalBuffer.length / 1024).toFixed(1)}KB`);
                    }

                } catch (waError) {
                    console.log(`[⚠️] WA-Sticker falhou: ${waError.message}`);
                    processingMethod += ' (WA-Sticker falhou)';
                }
            }

            // ESTRATÉGIA 3: SHARP DIRETO (ÚLTIMA OPÇÃO PARA IMAGENS)
            if (!finalBuffer && isImage) {
                try {
                    console.log(`[🔧] === USANDO SHARP DIRETO (ÚLTIMO RECURSO) ===`);
                    const sharp = require('sharp');
                    
                    const sharpBuffer = await sharp(buffer, { 
                        failOnError: false,
                        limitInputPixels: false 
                    })
                        .resize(settings.size, settings.size, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .webp({ quality: settings.quality })
                        .toBuffer();

                    if (sharpBuffer && sharpBuffer.length > 0) {
                        finalBuffer = sharpBuffer;
                        processingMethod = processingMethod ? `${processingMethod} → Sharp` : 'Sharp';
                        console.log(`[✅] Sharp processou: ${(finalBuffer.length / 1024).toFixed(1)}KB`);
                    }

                } catch (sharpError) {
                    console.log(`[⚠️] Sharp direto falhou: ${sharpError.message}`);
                    processingMethod += ' (Sharp falhou)';
                }
            }

            const processingTime = Date.now() - processingStart;

            // ==================== VERIFICAÇÃO FINAL ====================
            if (!finalBuffer) {
                const totalTime = Date.now() - startTime;
                console.log(`[❌] === TODOS OS MÉTODOS FALHARAM ===`);
                console.log(`    • Tempo total: ${totalTime}ms`);
                console.log(`    • Métodos tentados: ${processingMethod}`);
                
                let errorMsg = `❌ **PROCESSAMENTO FALHOU**\n\n📁 **Arquivo:** ${(originalSizeKB/1024).toFixed(2)}MB\n📝 **Tipo:** ${mimeType}\n🔧 **FFmpeg:** ${systemInfo.available ? 'Disponível mas falhou' : 'Não disponível'}\n⏱️ **Tempo:** ${totalTime}ms\n🔄 **Tentativas:** ${processingMethod}\n\n`;
                
                if (isVideo && !systemInfo.available) {
                    errorMsg += `🎬 **Para vídeos sem FFmpeg:**\n• Tire um screenshot do vídeo\n• Envie como imagem JPG/PNG\n• Use vídeo menor (<2MB)\n\n`;
                }
                
                errorMsg += `💡 **Soluções:**\n• Use arquivo menor\n• Tente formato mais simples (JPG/PNG)\n• Comprima antes de enviar\n• Para vídeos: tire screenshot`;

                await m.reply(errorMsg);
                return;
            }

            // ==================== ENVIO DO RESULTADO ====================
            console.log(`[📤] === ENVIANDO RESULTADO ===`);
            
            try {
                const sendStart = Date.now();
                
                await Yaka.sendMessage(
                    m.from || m.chat,
                    { sticker: finalBuffer },
                    { quoted: m }
                );

                const sendTime = Date.now() - sendStart;
                const totalTime = Date.now() - startTime;
                const finalSizeKB = finalBuffer.length / 1024;
                const compressionRatio = ((originalSizeKB - finalSizeKB) / originalSizeKB * 100).toFixed(1);
                
                const quality = finalSizeKB <= 50 ? '🌟 PERFEITA' : 
                               finalSizeKB <= 100 ? '🔥 EXCELENTE' : 
                               finalSizeKB <= 200 ? '✅ MUITO BOA' : 
                               finalSizeKB <= 350 ? '👍 BOA' : '⚡ FUNCIONAL';

                const successMsg = `🎉 **STICKER CRIADO COM SUCESSO!**\n\n📊 **Resultado:**\n• **Final:** ${finalSizeKB.toFixed(1)}KB\n• **Original:** ${(originalSizeKB/1024).toFixed(2)}MB\n• **Compressão:** ${compressionRatio}%\n\n🏆 **Qualidade:** ${quality}\n⚙️ **Método:** ${processingMethod}\n🔧 **FFmpeg:** ${systemInfo.available ? '✅ Usado' : '❌ N/A'}\n🎯 **Config:** ${settings.size}px, ${settings.quality}%\n⏱️ **Tempo:** ${totalTime}ms\n\n🚀 **YakaBot Advanced - Sempre funciona!**`;

                await m.reply(successMsg);

                console.log(`[🎉] === SUCESSO TOTAL ===`);
                console.log(`    • Método: ${processingMethod}`);
                console.log(`    • Tamanho final: ${finalSizeKB.toFixed(1)}KB`);
                console.log(`    • Compressão: ${compressionRatio}%`);
                console.log(`    • Tempo processamento: ${processingTime}ms`);
                console.log(`    • Tempo envio: ${sendTime}ms`);
                console.log(`    • Tempo total: ${totalTime}ms`);

            } catch (sendError) {
                console.error(`[❌] Erro no envio: ${sendError.message}`);
                await m.reply(`❌ **Erro ao enviar sticker**\n\n🎯 **Sticker criado:** ${(finalBuffer.length / 1024).toFixed(1)}KB\n🔧 **Erro:** ${sendError.message}\n\n💡 **O sticker foi criado mas falhou no envio. Tente novamente.**`);
            }

        } catch (fatalError) {
            const totalTime = Date.now() - startTime;
            console.error(`[💥] === ERRO FATAL ===`);
            console.error(`    • Erro: ${fatalError.message}`);
            console.error(`    • Stack: ${fatalError.stack}`);
            console.error(`    • Tempo até erro: ${totalTime}ms`);
            
            await m.reply(`❌ **ERRO FATAL**\n\n🔧 **Erro:** ${fatalError.message}\n⏱️ **Tempo:** ${totalTime}ms\n\n💡 **Tente:**\n• Arquivo menor\n• Formato mais simples\n• Reenviar mídia\n• Aguardar e tentar novamente`);