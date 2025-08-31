const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
    name: "steal",
    alias: ["stickersteal"],
    desc: "Para roubar um sticker",
    category: "Utilitários",
    usage: "steal <responder ao sticker>",
    react: "👹",
    start: async (Yaka, m, { text, prefix, quoted, pushName, mime, args }) => {
        try {
            // Verificar se há mensagem citada/respondida
            if (!quoted) {
                return Yaka.sendMessage(
                    m.from,
                    { text: `❌ *Como usar:*\n\n1️⃣ Responda a um sticker\n2️⃣ Digite: *${prefix}steal*\n3️⃣ Ou: *${prefix}steal nome*\n4️⃣ Ou: *${prefix}steal pacote | autor*\n\n📝 *Exemplo:*\n${prefix}steal bruno\n${prefix}steal bruno | yen` },
                    { quoted: m }
                );
            }

            // Configurar nomes do pacote e autor
            let nomePacote = 'Sticker Roubado';
            let nomeAutor = pushName || 'Usuário Bot';
            
            if (args && args.length > 0) {
                const textoCompleto = args.join(" ");
                if (textoCompleto.includes("|")) {
                    const partes = textoCompleto.split("|");
                    nomePacote = partes[0].trim() || 'Sticker Roubado';
                    nomeAutor = partes[1].trim() || pushName || 'Usuário Bot';
                } else {
                    nomePacote = textoCompleto.trim();
                    nomeAutor = pushName || 'Usuário Bot';
                }
            }

            // Informar que está processando
            await m.reply(`🔄 Roubando sticker...\n📦 Pacote: *${nomePacote}*\n👤 Autor: *${nomeAutor}*`);

            // MÉTODO SIMPLIFICADO DE DOWNLOAD
            let midiaBuffer;
            
            try {
                // Método 1: Usando downloadAndSaveMediaMessage
                if (Yaka.downloadAndSaveMediaMessage) {
                    const fs = require('fs');
                    const caminhoArquivo = await Yaka.downloadAndSaveMediaMessage(quoted);
                    midiaBuffer = fs.readFileSync(caminhoArquivo);
                    fs.unlinkSync(caminhoArquivo); // Limpar arquivo temporário
                }
                // Método 2: Usando downloadMediaMessage  
                else if (Yaka.downloadMediaMessage) {
                    midiaBuffer = await Yaka.downloadMediaMessage(quoted);
                }
                // Método 3: Usando método quoted.download
                else if (quoted.download) {
                    midiaBuffer = await quoted.download();
                }
                // Método 4: Fallback manual
                else {
                    throw new Error('Método de download não disponível');
                }
                
            } catch (downloadError) {
                console.error('Erro no download:', downloadError);
                
                // TENTATIVA ALTERNATIVA - usando key da mensagem
                try {
                    const msgKey = {
                        remoteJid: m.from,
                        fromMe: false,
                        id: quoted.id || quoted.key?.id
                    };
                    
                    midiaBuffer = await Yaka.downloadMediaMessage({
                        key: msgKey,
                        message: quoted.message || quoted.msg
                    });
                    
                } catch (alternativeError) {
                    console.error('Erro no método alternativo:', alternativeError);
                    return m.reply('❌ Falha ao baixar o sticker! Tente com outro sticker.');
                }
            }
            
            if (!midiaBuffer || midiaBuffer.length === 0) {
                return m.reply('❌ Sticker baixado está vazio! Tente com outro sticker.');
            }
            
            // Criar novo sticker
            const stickerConfig = {
                pack: nomePacote,
                author: nomeAutor,
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                id: Date.now().toString(),
                quality: 70,
                background: 'transparent'
            };

            const novoSticker = new Sticker(midiaBuffer, stickerConfig);
            const bufferSticker = await novoSticker.toBuffer();
            
            // Enviar o novo sticker
            await Yaka.sendMessage(m.from, { 
                sticker: bufferSticker 
            }, { 
                quoted: m 
            });

            // Confirmar sucesso
            await m.reply(`✅ *Sticker roubado com sucesso!*\n📦 Pacote: *${nomePacote}*\n👤 Autor: *${nomeAutor}*`);
            
        } catch (error) {
            console.error('Erro completo no comando steal:', error);
            
            // Diagnóstico detalhado
            console.log('Informações de debug:');
            console.log('- quoted existe:', !!quoted);
            console.log('- quoted.mtype:', quoted?.mtype);
            console.log('- mime:', mime);
            console.log('- pushName:', pushName);
            console.log('- args:', args);
            
            await m.reply(`❌ *Erro ao processar sticker!*\n\n🔧 *Tente:*\n1️⃣ Responder a um sticker mais recente\n2️⃣ Certificar que o sticker não está corrompido\n3️⃣ Usar um sticker diferente\n\n💡 *Erro técnico:* ${error.message}`);
        }
    }
};