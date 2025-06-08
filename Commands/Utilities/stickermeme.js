const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { TelegraPh } = require("../../lib/uploader");
const fs = require("fs");

module.exports = {
    name: "stickermeme",
    alias: ["smeme"],
    desc: "Para fazer sticker meme",
    category: "Utilitários",
    usage: "smeme <responder à imagem>",
    react: "👹",
    start: async (Yaka, m, { text, prefix, quoted, pushName, mime, body }) => {
        let midia;
        try {
            // Verificar se há imagem citada
            if (!quoted) {
                return m.reply(`Por favor, responda a uma *imagem* e digite *${prefix}smeme <texto>* para criar sticker meme.`);
            }

            // Verificar se é imagem
            const tipoQuotado = quoted.mtype || '';
            if (!tipoQuotado.includes('image') && !/image/.test(mime)) {
                return m.reply(`Por favor, mencione uma *imagem* e digite *${prefix}smeme <texto>* para criar sticker meme.`);
            }

            // Verificar se há texto
            if (!text || text.trim() === '') {
                return m.reply(`Por favor, forneça texto para o meme! Uso: ${prefix}smeme <seu texto>`);
            }

            await m.reply(`Criando sticker meme...`);
            
            // Download da imagem
            midia = await Yaka.downloadAndSaveMediaMessage(quoted);
            
            if (!midia || !fs.existsSync(midia)) {
                return m.reply('Falha ao baixar a imagem!');
            }

            // Upload para Telegraph
            const mem = await TelegraPh(midia);
            
            if (!mem) {
                throw new Error('Falha ao fazer upload para Telegraph');
            }
            
            // Preparar texto para URL
            const textoLimpo = text.replace(/[^\w\s-]/g, '').trim();
            const textoCodificado = encodeURIComponent(textoLimpo);
            
            // Criar URL do meme
            const urlMeme = `https://api.memegen.link/images/custom/-/${textoCodificado}.png?background=${mem}`;
            
            // Criar sticker
            const stickerMsg = new Sticker(urlMeme, {
                pack: 'Stickers Meme',
                author: pushName || 'Usuário Bot',
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                id: '12345',
                quality: 70,
                background: 'transparent'
            });
            
            const bufferSticker = await stickerMsg.toBuffer();
            await Yaka.sendMessage(m.from, { sticker: bufferSticker }, { quoted: m });
            
        } catch (error) {
            console.error('Erro no stickermeme:', error);
            await m.reply('Ocorreu um erro ao criar o sticker meme!');
        } finally {
            // Limpar arquivo temporário
            if (midia && fs.existsSync(midia)) {
                try {
                    fs.unlinkSync(midia);
                } catch (erroLimpeza) {
                    console.error('Erro de limpeza:', erroLimpeza);
                }
            }
        }
    }
};