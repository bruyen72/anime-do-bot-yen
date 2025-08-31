const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const smartStickerConverter = require('../../lib/SmartStickerConverter');

// ==================== CONFIGURAÇÕES COMPATÍVEIS COM TODOS DISPOSITIVOS ====================
const MAX_STICKER_SIZE = 512; // Máximo WhatsApp
const MAX_ANIMATION_SIZE = 512; // Máximo para vídeos
const ANIMATION_FPS = 15; // FPS reduzido para menor arquivo
const MAX_VIDEO_DURATION = 6; // Duração reduzida para menor arquivo
const TEMP_DIR = path.join(tmpdir(), 'yaka_stickers');
const WEBP_QUALITY = 75; // Qualidade reduzida para compatibilidade
const MIN_STICKER_SIZE = 430; // Seu valor pedido
const MAX_FILE_SIZE_KB = 500; // Máximo 500KB para compatibilidade iPhone/Android

// Garantir que o diretório temporário exista
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`[✅] Diretório temporário criado: ${TEMP_DIR}`);
} else {
    console.log(`[ℹ️] Diretório temporário já existe: ${TEMP_DIR}`);
}

module.exports = {
    name: "s",
    alias: [],
    desc: "Converte imagem/vídeo/gif para figurinha 512x512 sem bordas",
    category: "Search",
    usage: ".s [responda uma mídia]",
    react: "🖼️",
    start: async (Yaka, m, { prefix, quoted, mime, body }) => {
        console.log(`[🚀] Comando .s iniciado!`);
        console.log(`[📋] Parâmetros recebidos:`, {
            body: body,
            prefix: prefix,
            hasQuoted: !!quoted,
            mime: mime,
            messageType: m.mtype || 'undefined'
        });

        // Inicializar variáveis para limpeza
        const filesToCleanup = [];
        let processingMsg = null;

        try {
            // Validação do comando - ignora comandos como .sticker
            console.log(`[🔍] Verificando comando...`);
            if (body && !body.toLowerCase().startsWith('.s')) {
                console.log(`[❌] Comando inválido: ${body}`);
                return;
            }
            console.log(`[✅] Comando válido!`);

            // Validação da mídia
            console.log(`[🔍] Verificando mídia quotada...`);
            if (!quoted) {
                console.log(`[❌] Nenhuma mídia quotada encontrada`);
                return m.reply(`⚠️ Envie ou responda uma imagem/vídeo com ${prefix}s`);
            }
            console.log(`[✅] Mídia quotada encontrada!`);

            // Log detalhado do objeto quoted
            console.log(`[📊] Estrutura do objeto quoted:`, {
                hasQuoted: !!quoted,
                hasFakeObj: !!quoted.fakeObj,
                quotedMtype: quoted.mtype || 'undefined',
                quotedKeys: quoted ? Object.keys(quoted) : 'N/A'
            });

            // Verificar o tipo MIME
            console.log(`[🔍] Verificando tipo MIME: ${mime}`);
            if (!mime?.startsWith('image/') && !mime?.startsWith('video/')) {
                console.log(`[❌] Tipo MIME inválido: ${mime}`);
                return m.reply(`⚠️ Envie ou responda uma imagem/vídeo com ${prefix}s`);
            }
            console.log(`[✅] Tipo MIME válido: ${mime}`);

            // Verificar se temos ALGUM objeto para download
            console.log(`[🔍] Verificando objetos de mídia...`);
            
            // Verificar múltiplas possibilidades
            const downloadSources = [
                { name: 'fakeObj', obj: quoted.fakeObj },
                { name: 'message', obj: quoted.message },
                { name: 'quoted direto', obj: quoted }
            ];
            
            let hasValidSource = false;
            downloadSources.forEach(source => {
                if (source.obj) {
                    console.log(`[✅] ${source.name} disponível:`, Object.keys(source.obj));
                    hasValidSource = true;
                } else {
                    console.log(`[❌] ${source.name} não disponível`);
                }
            });
            
            if (!hasValidSource) {
                console.error("[❌] Nenhuma fonte de mídia encontrada");
                console.log(`[📊] Estrutura completa do quoted:`, JSON.stringify(quoted, null, 2));
                return m.reply("❌ Não consegui acessar os dados da mídia. Estrutura de dados inválida.");
            }
            
            console.log(`[✅] Pelo menos uma fonte de mídia encontrada!`);

            // Mensagem de processamento
            console.log(`[📤] Enviando mensagem de processamento...`);
            processingMsg = await m.reply('⏳ Criando figurinha 512x512 MÁXIMA...');
            console.log(`[✅] Mensagem de processamento enviada!`);

            // Função para limpeza de arquivos
            const cleanupFiles = () => {
                console.log(`[🧹] Iniciando limpeza de ${filesToCleanup.length} arquivos...`);
                filesToCleanup.forEach(file => {
                    if (fs.existsSync(file)) {
                        try {
                            fs.unlinkSync(file);
                            console.log(`[✅] Arquivo removido: ${file}`);
                        } catch (e) {
                            console.warn(`[⚠️] Falha ao remover: ${file}`, e);
                        }
                    }
                });
            };

            // Remover mensagem de processamento
            const removeProcessingMsg = async () => {
                if (processingMsg) {
                    try {
                        await Yaka.sendMessage(m.from || m.chat, { delete: processingMsg.key });
                        console.log(`[✅] Mensagem de processamento removida`);
                    } catch (e) {
                        console.warn("[⚠️] Não consegui apagar a mensagem 'processando'.", e);
                    }
                }
            };

            // Baixar a mídia com MÚLTIPLAS TENTATIVAS
            console.log(`[⬇️] Iniciando download da mídia...`);
            let buffer;
            try {
                // TENTATIVA 1: Usar fakeObj (método original)
                console.log(`[🔄] Tentativa 1: downloadMediaMessage com fakeObj`);
                try {
                    buffer = await downloadMediaMessage(quoted.fakeObj, 'buffer', {}, {
                        logger: {
                            info: msg => console.log(`[ℹ️] ${msg}`),
                            error: msg => console.error(`[❌] ${msg}`)
                        },
                        timeout: 60000
                    });
                    
                    if (buffer && buffer.length > 0) {
                        console.log(`[✅] Sucesso com fakeObj! Tamanho: ${buffer.length} bytes`);
                    } else {
                        throw new Error('Buffer vazio com fakeObj');
                    }
                } catch (fakeObjError) {
                    console.log(`[⚠️] FakeObj falhou: ${fakeObjError.message}`);
                    
                    // TENTATIVA 2: Usar objeto quoted diretamente
                    console.log(`[🔄] Tentativa 2: downloadMediaMessage direto`);
                    try {
                        buffer = await downloadMediaMessage(quoted, 'buffer', {}, {
                            logger: {
                                info: msg => console.log(`[ℹ️] ${msg}`),
                                error: msg => console.error(`[❌] ${msg}`)
                            },
                            timeout: 60000
                        });
                        
                        if (buffer && buffer.length > 0) {
                            console.log(`[✅] Sucesso com quoted direto! Tamanho: ${buffer.length} bytes`);
                        } else {
                            throw new Error('Buffer vazio com quoted direto');
                        }
                    } catch (quotedError) {
                        console.log(`[⚠️] Quoted direto falhou: ${quotedError.message}`);
                        
                        // TENTATIVA 3: Usar message do quoted
                        console.log(`[🔄] Tentativa 3: usando quoted.message`);
                        if (quoted.message) {
                            try {
                                buffer = await downloadMediaMessage(quoted.message, 'buffer', {}, {
                                    timeout: 60000
                                });
                                
                                if (buffer && buffer.length > 0) {
                                    console.log(`[✅] Sucesso com quoted.message! Tamanho: ${buffer.length} bytes`);
                                } else {
                                    throw new Error('Buffer vazio com quoted.message');
                                }
                            } catch (messageError) {
                                console.log(`[⚠️] Quoted.message falhou: ${messageError.message}`);
                                throw new Error('Todas as tentativas de download falharam');
                            }
                        } else {
                            throw new Error('Nenhum método de download disponível');
                        }
                    }
                }
                
                if (!buffer || buffer.length === 0) {
                    throw new Error('Buffer final vazio ou inválido');
                }

                console.log(`[✅] Download concluído! Tamanho final: ${buffer.length} bytes`);
                
            } catch (e) {
                console.error("[❌] TODOS os métodos de download falharam:", e);
                console.log(`[🔍] Estrutura do quoted para debug:`, {
                    hasFakeObj: !!quoted.fakeObj,
                    hasMessage: !!quoted.message,
                    quotedKeys: Object.keys(quoted),
                    fakeObjKeys: quoted.fakeObj ? Object.keys(quoted.fakeObj) : 'N/A'
                });
                
                await m.reply("❌ Não consegui baixar essa mídia. Possíveis soluções:\n• Tente reenviar a imagem\n• Use outro formato (JPG/PNG)\n• Verifique se a imagem não está corrompida");
                await removeProcessingMsg();
                return;
            }

            // Detectar tipo do arquivo
            console.log(`[🔍] Detectando tipo do arquivo...`);
            let fileInfo;
            try {
                fileInfo = await fileType.fromBuffer(buffer);
                if (!fileInfo) throw new Error('Não foi possível detectar o tipo de mídia');
                console.log(`[✅] Tipo detectado:`, fileInfo);
            } catch (e) {
                console.error("[❌] Erro ao detectar tipo do arquivo:", e);
                await m.reply("❌ Formato de mídia não reconhecido.");
                await removeProcessingMsg();
                return;
            }

            // Validar tipo de mídia
            console.log(`[🔍] Validando tipo de mídia: ${fileInfo.mime}`);
            if (!fileInfo.mime.startsWith('image/') && !fileInfo.mime.startsWith('video/')) {
                console.warn("[⚠️] Tipo MIME inválido:", fileInfo.mime);
                await m.reply("❌ A mídia não é uma imagem ou vídeo suportado.");
                await removeProcessingMsg();
                return;
            }
            console.log(`[✅] Tipo de mídia válido!`);

            // Preparar arquivos
            const ext = fileInfo.ext || (fileInfo.mime.startsWith('image/') ? 'png' : 'mp4');
            const isVideo = fileInfo.mime.startsWith('video/');
            const isGif = isVideo && (
                quoted.message?.videoMessage?.gifPlayback ||
                m.message?.videoMessage?.gifPlayback
            );

            console.log(`[📊] Informações do arquivo:`, {
                extension: ext,
                isVideo: isVideo,
                isGif: isGif,
                mime: fileInfo.mime
            });

            // Gerar nomes de arquivos únicos
            const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
            const tempFile = path.join(TEMP_DIR, `media_${uniqueId}.${ext}`);
            const outputWebp = path.join(TEMP_DIR, `sticker_${uniqueId}.webp`);

            console.log(`[📁] Arquivos temporários:`, {
                tempFile: tempFile,
                outputWebp: outputWebp
            });

            // Adicionar à lista de limpeza
            filesToCleanup.push(tempFile, outputWebp);

            // Salvar buffer para arquivo
            console.log(`[💾] Salvando buffer em arquivo temporário...`);
            try {
                fs.writeFileSync(tempFile, buffer);
                console.log(`[✅] Arquivo temporário salvo: ${tempFile}`);

                // Verificar se o arquivo foi criado corretamente
                const stats = fs.statSync(tempFile);
                console.log(`[📊] Tamanho do arquivo salvo: ${stats.size} bytes`);

                // Liberar memória
                buffer = null;
            } catch (e) {
                console.error("[❌] Erro ao salvar arquivo temporário:", e);
                await m.reply("❌ Erro ao processar a mídia.");
                await removeProcessingMsg();
                cleanupFiles();
                return;
            }

            // Checar dimensões da mídia
            console.log(`[🔍] Verificando dimensões da mídia...`);
            try {
                const { stdout } = await execPromise(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${tempFile}"`);
                const [width, height] = stdout.trim().split('x').map(Number);
                console.log(`[📊] Dimensões originais: ${width}x${height}`);

                // Se a imagem for muito pequena, aplicar um escalonamento melhor
                if (width < MIN_STICKER_SIZE || height < MIN_STICKER_SIZE) {
                    console.log(`[⚠️] Imagem pequena detectada (${width}x${height}), aplicando escalonamento melhorado`);
                    // Preparar um arquivo intermediário com escala melhorada
                    const enhancedFile = path.join(TEMP_DIR, `enhanced_${uniqueId}.${ext}`);
                    filesToCleanup.push(enhancedFile);

                    // Aplicar escalonamento de alta qualidade SIMPLES
                    await execPromise(`ffmpeg -i "${tempFile}" -vf "scale=512:512:force_original_aspect_ratio=increase:flags=lanczos" "${enhancedFile}" -y`);

                    // Se bem sucedido, substituir o arquivo original pelo melhorado
                    if (fs.existsSync(enhancedFile) && fs.statSync(enhancedFile).size > 0) {
                        fs.copyFileSync(enhancedFile, tempFile);
                        console.log(`[✅] Imagem melhorada aplicada!`);
                    }
                }
            } catch (e) {
                // Ignorar erros aqui, continuar com o arquivo original
                console.warn("[⚠️] Não foi possível verificar/melhorar dimensões da mídia:", e);
            }

            // Configurar comando FFmpeg com QUALIDADE ADAPTATIVA
            console.log(`[⚙️] Configurando comando FFmpeg compatível...`);
            let ffmpegCmd;
            
            // Calcular qualidade baseada no tamanho original
            const originalSizeKB = fs.statSync(tempFile).size / 1024;
            let adaptiveQuality = WEBP_QUALITY;
            let adaptiveFPS = ANIMATION_FPS;
            
            console.log(`[📊] Tamanho original: ${originalSizeKB.toFixed(1)}KB`);
            
            // Sistema adaptativo para garantir compatibilidade
            if (originalSizeKB > 2000) { // > 2MB
                adaptiveQuality = 60;
                adaptiveFPS = 12;
                console.log(`[⚡] Arquivo muito grande - usando qualidade 60% e 12fps`);
            } else if (originalSizeKB > 1000) { // > 1MB
                adaptiveQuality = 70;
                adaptiveFPS = 14;
                console.log(`[⚡] Arquivo grande - usando qualidade 70% e 14fps`);
            } else if (originalSizeKB > 500) { // > 500KB
                adaptiveQuality = 75;
                adaptiveFPS = 15;
                console.log(`[⚡] Arquivo médio - usando qualidade 75% e 15fps`);
            } else {
                console.log(`[✅] Arquivo pequeno - mantendo qualidade ${adaptiveQuality}%`);
            }

            if (isVideo || isGif) {
                // Comando para vídeos SEM BORDAS - igual imagem 2
                ffmpegCmd = `ffmpeg -i "${tempFile}" -vf "fps=${adaptiveFPS},scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -lossless 0 -compression_level 4 -q:v ${adaptiveQuality} -method 4 -loop 0 -preset default -an -vsync 0 -ss 00:00:00 -t 00:00:${MAX_VIDEO_DURATION} "${outputWebp}" -y`;
                console.log(`[📹] Comando vídeo SEM BORDAS configurado - Q${adaptiveQuality}% FPS${adaptiveFPS}`);
            } else {
                // Comando para imagens SEM BORDAS - igual imagem 2
                ffmpegCmd = `ffmpeg -i "${tempFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -compression_level 4 -q:v ${adaptiveQuality} -method 4 "${outputWebp}" -y`;
                console.log(`[🖼️] Comando imagem SEM BORDAS configurado - Q${adaptiveQuality}%`);
            }

            console.log(`[⚙️] Comando FFmpeg: ${ffmpegCmd}`);

            // Executar FFmpeg com tratamento de erros melhorado
            console.log(`[⚡] Executando conversão FFmpeg...`);
            try {
                const { stdout, stderr } = await execPromise(ffmpegCmd);
                console.log(`[📤] FFmpeg stdout:`, stdout);
                if (stderr) console.log(`[⚠️] FFmpeg stderr:`, stderr);

                if (!fs.existsSync(outputWebp) || fs.statSync(outputWebp).size === 0) {
                    throw new Error("Arquivo WebP não gerado corretamente.");
                }

                // Verificar o arquivo WebP gerado e VALIDAR TAMANHO
                const webpStats = fs.statSync(outputWebp);
                const webpSizeKB = webpStats.size / 1024;
                console.log(`[✅] WebP gerado! Tamanho: ${webpSizeKB.toFixed(1)}KB`);
                
                // VALIDAÇÃO DE COMPATIBILIDADE
                if (webpSizeKB > MAX_FILE_SIZE_KB) {
                    console.log(`[⚠️] Arquivo muito grande (${webpSizeKB.toFixed(1)}KB > ${MAX_FILE_SIZE_KB}KB) - incompatível com iPhone/alguns Androids`);
                    throw new Error(`Arquivo muito grande: ${webpSizeKB.toFixed(1)}KB`);
                } else if (webpSizeKB > 300) {
                    console.log(`[⚠️] Arquivo grande (${webpSizeKB.toFixed(1)}KB) - pode ter problemas em alguns dispositivos`);
                } else {
                    console.log(`[✅] Tamanho PERFEITO (${webpSizeKB.toFixed(1)}KB) - compatível com todos dispositivos!`);
                }

                // Ler o arquivo WebP
                const webpBuffer = fs.readFileSync(outputWebp);
                console.log(`[📖] WebP lido em buffer: ${webpBuffer.length} bytes`);

                // Enviar sticker
                console.log(`[📤] Enviando sticker compatível...`);
                await Yaka.sendMessage(
                    m.from || m.chat,
                    { sticker: webpBuffer },
                    { quoted: m }
                );

                console.log(`[✅] Sticker enviado com sucesso!`);
                
                // Mensagem de sucesso com informações
                await m.reply(`🎉 Sticker 512x512 criado!\n📊 Tamanho: ${webpSizeKB.toFixed(1)}KB\n${webpSizeKB <= 300 ? '✅ Compatível com todos dispositivos!' : webpSizeKB <= MAX_FILE_SIZE_KB ? '⚠️ Grande, mas deve funcionar' : '❌ Muito grande - pode falhar'}`);

                // Limpar
                await removeProcessingMsg();
                cleanupFiles();

            } catch (err) {
                console.error("[❌] Erro ao converter com FFmpeg:", err);
                
                // Método alternativo ULTRA COMPATÍVEL
                console.log(`[🔄] Tentando método ULTRA COMPATÍVEL...`);
                try {
                    // Comando ultra compatível SEM BORDAS - igual imagem 2
                    const ultraCompatibleCmd = isVideo || isGif
                        ? `ffmpeg -i "${tempFile}" -vf "fps=10,scale=512:512:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -compression_level 6 -q:v 50 -method 1 -t 00:00:04 "${outputWebp}" -y`
                        : `ffmpeg -i "${tempFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=fast_bilinear,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -compression_level 6 -q:v 50 -method 1 "${outputWebp}" -y`;

                    console.log(`[⚙️] Comando ULTRA COMPATÍVEL SEM BORDAS: igual imagem 2`);
                    
                    const { stdout: altStdout, stderr: altStderr } = await execPromise(ultraCompatibleCmd);
                    console.log(`[📤] FFmpeg ultra compatível concluído`);
                    if (altStderr) console.log(`[ℹ️] Avisos:`, altStderr.slice(0, 200));

                    if (fs.existsSync(outputWebp) && fs.statSync(outputWebp).size > 0) {
                        const finalStats = fs.statSync(outputWebp);
                        const finalSizeKB = finalStats.size / 1024;
                        
                        console.log(`[✅] Método ultra compatível funcionou! Tamanho: ${finalSizeKB.toFixed(1)}KB`);
                        
                        if (finalSizeKB <= MAX_FILE_SIZE_KB) {
                            const webpBuffer = fs.readFileSync(outputWebp);
                            
                            await Yaka.sendMessage(
                                m.from || m.chat,
                                { sticker: webpBuffer },
                                { quoted: m }
                            );
                            
                            await m.reply(`✅ Sticker COMPATÍVEL criado!\n📊 Tamanho: ${finalSizeKB.toFixed(1)}KB\n💪 Qualidade reduzida mas funciona em TODOS dispositivos!`);
                            
                            console.log(`[✅] Sticker ultra compatível enviado!`);
                            await removeProcessingMsg();
                            cleanupFiles();
                            return;
                        } else {
                            console.log(`[❌] Mesmo método ultra compatível gerou arquivo grande: ${finalSizeKB.toFixed(1)}KB`);
                            throw new Error(`Arquivo ainda muito grande: ${finalSizeKB.toFixed(1)}KB`);
                        }
                    } else {
                        throw new Error("Método ultra compatível não gerou arquivo válido");
                    }
                } catch (fallbackErr) {
                    console.error("[❌] Método ultra compatível falhou:", fallbackErr);
                    await m.reply(`❌ Arquivo muito complexo para conversão compatível.\n\n💡 **Soluções:**\n• Use imagem mais simples\n• Tente vídeo mais curto\n• Use arquivo menor\n\n🔍 **Problema:** ${fallbackErr.message}`);
                    await removeProcessingMsg();
                    cleanupFiles();
                }
            }

        } catch (err) {
            console.error("[🔥] ERRO FATAL NO .s:", err);
            console.error("[🔥] Stack trace:", err.stack);
            await m.reply("❌ Um erro inesperado ocorreu ao gerar a figurinha.");

            // Garantir limpeza mesmo em caso de erro
            if (processingMsg) {
                try {
                    await Yaka.sendMessage(m.from || m.chat, { delete: processingMsg.key });
                } catch {}
            }

            // Limpar arquivos temporários
            filesToCleanup.forEach(file => {
                if (fs.existsSync(file)) {
                    try {
                        fs.unlinkSync(file);
                    } catch {}
                }
            });
        }
    }
};