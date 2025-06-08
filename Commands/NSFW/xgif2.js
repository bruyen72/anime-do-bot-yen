const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);

module.exports = {
    name: "xvgif",
    alias: ["pgif", "adultgif"],
    desc: "Busca e envia figurinha animada NSFW no privado",
    category: "NSFW",
    usage: ".xgif <termo>",
    react: "🔞",
    start: async (Yaka, m, { prefix, NSFWstatus, args }) => {
        const termo = args.join(" ").trim();
        if (!termo) return m.reply(`❗ Forneça um termo. Ex: *${prefix}xgif ass*`);

        // ✅ Se for grupo, avisar que enviará no privado
        if (m.isGroup) {
            await m.reply(`🔞 *Comando NSFW detectado!*\n\n📱 Enviando resultado no seu privado para manter o grupo limpo...\n\n⏳ Processando: *${termo}*`);
        }

        // ✅ Enviar no privado do usuário
        const targetChat = m.sender; // Sempre enviar no DM do usuário
        
        try {
            await Yaka.sendMessage(targetChat, {
                text: `🔍 Buscando figurinha animada para: *${termo}*...\n\n⏳ Isso pode demorar alguns segundos...`
            });
        } catch (err) {
            return m.reply(`❌ Não consegui enviar mensagem no seu privado.\n\n💡 *Solução:* Me chame no privado primeiro, depois use o comando.`);
        }

        let gifUrl = null;
        const allGifs = [];

        // ✅ FONTE 1: redgifs.com (NOVA - PRINCIPAL)
        try {
            const searchUrl1 = `https://www.redgifs.com/search?query=${encodeURIComponent(termo)}`;
            console.log(`[xgif] Buscando em redgifs.com: ${searchUrl1}`);
            
            await Yaka.sendMessage(targetChat, {
                text: `🌐 Buscando em RedGifs.com...`
            });

            const res1 = await axios.get(searchUrl1, {
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Referer": "https://www.redgifs.com/"
                },
                timeout: 20000,
            });

            const $1 = cheerio.load(res1.data);
            
            // Buscar GIFs no RedGifs
            $1("video source[src*='.mp4'], img[src*='.gif'], img[data-src*='.gif'], .gif-video source, video[src*='.mp4']").each((_, el) => {
                const src = $1(el).attr("src") || $1(el).attr("data-src");
                if (src && (src.includes(".gif") || src.includes(".mp4"))) {
                    const fullUrl = src.startsWith("http") ? src : (src.startsWith("//") ? "https:" + src : "https://www.redgifs.com" + src);
                    allGifs.push(fullUrl);
                }
            });

            // Buscar também por data attributes específicos do RedGifs
            $1("[data-gif], [data-video-src], [data-mp4]").each((_, el) => {
                const src = $1(el).attr("data-gif") || $1(el).attr("data-video-src") || $1(el).attr("data-mp4");
                if (src) {
                    const fullUrl = src.startsWith("http") ? src : "https:" + src;
                    allGifs.push(fullUrl);
                }
            });

            console.log(`[xgif] Encontrados ${allGifs.length} gifs/videos em redgifs.com`);

        } catch (err) {
            console.error("[xgif] Erro ao buscar em redgifs.com:", err.message);
            await Yaka.sendMessage(targetChat, {
                text: `⚠️ RedGifs.com indisponível, tentando outras fontes...`
            });
        }

        // ✅ FONTE 2: porngifs.com
        try {
            const searchUrl2 = `https://porngifs.com/tag/${encodeURIComponent(termo.toLowerCase().replace(/\s+/g, '%20'))}`;
            console.log(`[xgif] Buscando em porngifs.com: ${searchUrl2}`);
            
            await Yaka.sendMessage(targetChat, {
                text: `🌐 Buscando em PornGifs.com...`
            });

            const res2 = await axios.get(searchUrl2, {
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://porngifs.com/"
                },
                timeout: 15000,
            });

            const $2 = cheerio.load(res2.data);
            
            $2("img[src*='.gif'], img[data-src*='.gif'], .gif-container img, .post-thumbnail img").each((_, el) => {
                const src = $2(el).attr("src") || $2(el).attr("data-src");
                if (src && src.includes(".gif")) {
                    const fullUrl = src.startsWith("http") ? src : (src.startsWith("//") ? "https:" + src : "https://porngifs.com" + src);
                    allGifs.push(fullUrl);
                }
            });

            console.log(`[xgif] Total após porngifs.com: ${allGifs.length}`);

        } catch (err) {
            console.error("[xgif] Erro ao buscar em porngifs.com:", err.message);
        }

        // ✅ FONTE 3: porngipfy.com (backup)
        try {
            const searchUrl3 = `https://porngipfy.com/page/1/?s=${encodeURIComponent(termo)}`;
            console.log(`[xgif] Buscando em porngipfy.com: ${searchUrl3}`);
            
            const res3 = await axios.get(searchUrl3, {
                headers: { "User-Agent": "Mozilla/5.0" },
                timeout: 15000,
            });

            const $3 = cheerio.load(res3.data);
            
            $3(".thumb-image img, .gif-item img").each((_, el) => {
                const src = $3(el).attr("data-gif") || $3(el).attr("src");
                if (src && src.includes(".gif")) {
                    const fullUrl = src.startsWith("http") ? src : "https://porngipfy.com" + src;
                    allGifs.push(fullUrl);
                }
            });

            console.log(`[xgif] Total final: ${allGifs.length}`);

        } catch (err) {
            console.error("[xgif] Erro ao buscar em porngipfy.com:", err.message);
        }

        // ✅ FONTE 4: Termos expandidos para RedGifs
        const redgifsTerms = {
            'ass': ['big-ass', 'round-ass', 'thick-ass', 'booty'],
            'boobs': ['big-tits', 'busty', 'breasts', 'boobies'],
            'sexy': ['hot-babe', 'sexy-girl', 'beautiful'],
            'anal': ['anal-sex', 'anal-fuck', 'ass-fuck'],
            'pussy': ['wet-pussy', 'pink-pussy', 'tight-pussy']
        };

        if (redgifsTerms[termo.toLowerCase()]) {
            try {
                const extraTerms = redgifsTerms[termo.toLowerCase()];
                
                await Yaka.sendMessage(targetChat, {
                    text: `🎯 Expandindo busca com termos relacionados...`
                });
                
                for (const extraTerm of extraTerms.slice(0, 2)) { // Apenas 2 termos extras para não demorar muito
                    const extraUrl = `https://www.redgifs.com/search?query=${encodeURIComponent(extraTerm)}`;
                    console.log(`[xgif] Termo extra no RedGifs: ${extraTerm}`);
                    
                    const resExtra = await axios.get(extraUrl, {
                        headers: { 
                            "User-Agent": "Mozilla/5.0",
                            "Referer": "https://www.redgifs.com/"
                        },
                        timeout: 12000,
                    });

                    const $Extra = cheerio.load(resExtra.data);
                    
                    $Extra("video source, img[src*='.gif'], [data-gif]").each((_, el) => {
                        const src = $Extra(el).attr("src") || $Extra(el).attr("data-gif");
                        if (src && (src.includes(".gif") || src.includes(".mp4"))) {
                            const fullUrl = src.startsWith("http") ? src : "https:" + src;
                            allGifs.push(fullUrl);
                        }
                    });
                }
                
                console.log(`[xgif] Total após termos extras: ${allGifs.length}`);
                
            } catch (err) {
                console.error("[xgif] Erro ao buscar termos extras:", err.message);
            }
        }

        // ✅ Verificar se encontrou conteúdo
        if (allGifs.length === 0) {
            return await Yaka.sendMessage(targetChat, {
                text: `❌ Nenhum resultado encontrado para *${termo}*\n\n💡 *Termos populares que funcionam:*\n• *ass* / *booty* - bundas\n• *boobs* / *tits* - seios\n• *sexy* / *hot* - garotas sexy\n• *anal* - anal\n• *pussy* - vaginas\n• *blowjob* - oral\n• *fuck* - sexo\n\n🔄 Tente um termo diferente!`
            });
        }

        // ✅ Remover duplicatas e selecionar conteúdo aleatório
        const uniqueContent = [...new Set(allGifs)];
        const selectedContent = uniqueContent[Math.floor(Math.random() * uniqueContent.length)];
        
        console.log(`[xgif] ${uniqueContent.length} itens únicos encontrados`);
        console.log(`[xgif] Selecionado: ${selectedContent}`);

        await Yaka.sendMessage(targetChat, {
            text: `✅ Encontrados *${uniqueContent.length}* resultados!\n\n⬇️ Baixando conteúdo...`
        });

        // ✅ Verificar se é vídeo MP4 ou GIF
        const isVideo = selectedContent.includes('.mp4');

        if (isVideo) {
            // ✅ PROCESSAR VÍDEO MP4
            try {
                const response = await axios.get(selectedContent, {
                    responseType: "arraybuffer",
                    timeout: 30000,
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Referer": selectedContent.includes("redgifs.com") ? "https://www.redgifs.com/" : "https://porngifs.com/"
                    },
                    maxContentLength: 100 * 1024 * 1024 // 100MB max
                });

                await Yaka.sendMessage(targetChat, {
                    text: `🔄 Processando vídeo para figurinha...`
                });

                // Salvar vídeo temporário
                const tempDir = path.join(os.tmpdir(), "yaka_videos");
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                
                const inputVideo = path.join(tempDir, `video_${Date.now()}.mp4`);
                const outputWebp = path.join(tempDir, `sticker_${Date.now()}.webp`);

                fs.writeFileSync(inputVideo, Buffer.from(response.data));

                // Converter vídeo para sticker animado
                const ffmpegCmd = `ffmpeg -i "${inputVideo}" -vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease:eval=frame,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -compression_level 6 -q:v 75 -loop 0 -preset default -an -vsync 0 -t 8 "${outputWebp}" -y`;

                await execPromise(ffmpegCmd);

                if (fs.existsSync(outputWebp)) {
                    const stickerBuffer = fs.readFileSync(outputWebp);
                    const stats = fs.statSync(outputWebp);
                    
                    await Yaka.sendMessage(targetChat, { 
                        sticker: stickerBuffer 
                    });

                    await Yaka.sendMessage(targetChat, {
                        text: `✅ *Figurinha animada enviada!*\n\n📊 *Estatísticas:*\n• Tamanho: ${Math.round(stats.size/1024)}KB\n• Fonte: ${selectedContent.includes('redgifs.com') ? 'RedGifs.com' : 'Outros'}\n• Resultados encontrados: ${uniqueContent.length}\n• Termo: *${termo}*\n\n🔞 *Conteúdo NSFW*`
                    });
                } else {
                    throw new Error("Falha na conversão do vídeo");
                }

                // Limpeza
                setTimeout(() => {
                    [inputVideo, outputWebp].forEach(file => {
                        try {
                            if (fs.existsSync(file)) fs.unlinkSync(file);
                        } catch (e) {}
                    });
                }, 5000);

            } catch (err) {
                console.error("[xgif] Erro ao processar vídeo:", err.message);
                await Yaka.sendMessage(targetChat, {
                    text: `❌ Erro ao processar vídeo: ${err.message}\n\n🔄 Tentando outro resultado...`
                });
                
                // Tentar com GIF se vídeo falhar
                const gifBackup = uniqueContent.find(url => url.includes('.gif'));
                if (gifBackup) {
                    selectedContent = gifBackup;
                    // Continuar para processamento de GIF abaixo
                } else {
                    return;
                }
            }
        }

        // ✅ PROCESSAR GIF (ou fallback do vídeo)
        if (!isVideo || selectedContent.includes('.gif')) {
            const tempDir = path.join(os.tmpdir(), "yaka_gifs");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const inputGif = path.join(tempDir, `gif_${Date.now()}.gif`);
            const outputWebp = path.join(tempDir, `sticker_${Date.now()}.webp`);

            try {
                const response = await axios.get(selectedContent, {
                    responseType: "arraybuffer",
                    timeout: 25000,
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Referer": selectedContent.includes("redgifs.com") ? "https://www.redgifs.com/" : 
                                  selectedContent.includes("porngifs.com") ? "https://porngifs.com/" : 
                                  "https://porngipfy.com/"
                    },
                    maxContentLength: 50 * 1024 * 1024
                });

                fs.writeFileSync(inputGif, Buffer.from(response.data));

                await Yaka.sendMessage(targetChat, {
                    text: `🔄 Convertendo GIF para figurinha...`
                });

                const ffmpegCmd = `ffmpeg -i "${inputGif}" -vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease:eval=frame,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -compression_level 6 -q:v 80 -loop 0 -preset default -an -vsync 0 -t 6 "${outputWebp}" -y`;

                await execPromise(ffmpegCmd);

                if (fs.existsSync(outputWebp)) {
                    const stats = fs.statSync(outputWebp);
                    
                    // Recomprimir se muito grande
                    if (stats.size > 2 * 1024 * 1024) {
                        const ffmpegCmd2 = `ffmpeg -i "${inputGif}" -vf "fps=12,scale=256:256:force_original_aspect_ratio=decrease:eval=frame,format=rgba,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -compression_level 6 -q:v 60 -loop 0 -preset default -an -vsync 0 -t 4 "${outputWebp}" -y`;
                        await execPromise(ffmpegCmd2);
                    }

                    const stickerBuffer = fs.readFileSync(outputWebp);
                    const finalStats = fs.statSync(outputWebp);
                    
                    await Yaka.sendMessage(targetChat, { 
                        sticker: stickerBuffer 
                    });

                    await Yaka.sendMessage(targetChat, {
                        text: `✅ *Figurinha animada enviada!*\n\n📊 *Estatísticas:*\n• Tamanho: ${Math.round(finalStats.size/1024)}KB\n• Fonte: ${selectedContent.includes('redgifs.com') ? '🔴 RedGifs.com' : selectedContent.includes('porngifs.com') ? '🟠 PornGifs.com' : '🟡 PornGipfy.com'}\n• Resultados encontrados: ${uniqueContent.length}\n• Termo pesquisado: *${termo}*\n\n🔞 *Conteúdo NSFW enviado no privado*`
                    });

                    // ✅ Confirmar no grupo se foi enviado lá
                    if (m.isGroup) {
                        await m.reply(`✅ Figurinha NSFW de "*${termo}*" foi enviada no seu privado!\n\n📱 Verifique suas mensagens privadas.`);
                    }

                } else {
                    throw new Error("Falha na conversão");
                }

                // Limpeza
                setTimeout(() => {
                    [inputGif, outputWebp].forEach(file => {
                        try {
                            if (fs.existsSync(file)) fs.unlinkSync(file);
                        } catch (e) {}
                    });
                }, 5000);

            } catch (err) {
                console.error("[xgif] Erro ao processar GIF:", err.message);
                
                await Yaka.sendMessage(targetChat, {
                    text: `❌ Erro ao processar: ${err.message}\n\n🔄 Tente outro termo ou tente novamente mais tarde.`
                });
            }
        }
    },
};