const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
    name: "stickercrop",
    alias: ["scrop", "squaresticker"],
    desc: "To make square sized sticker",
    category: "Utilities",
    usage: "scrop <reply to image>",
    react: "👹",
    start: async (Yaka, m, { text, prefix, quoted, pushName, mime, body }) => {
        // Verificar se há mídia quotada
        if (!quoted) {
            return Yaka.sendMessage(
                m.from,
                { text: `Please mention an *image/video* and type *${prefix}scrop* to create cropped sticker.` },
                { quoted: m }
            );
        }

        try {
            if (/image/.test(mime)) {
                let mediaMess = await quoted.download();
                
                let stickerMess = new Sticker(mediaMess, {
                    pack: 'Cropped Stickers', // Define um nome padrão
                    author: pushName || 'Bot User',
                    type: StickerTypes.CROPPED,
                    categories: ['🤩', '🎉'],
                    id: '12345',
                    quality: 70,
                    background: 'transparent'
                });
                
                const stickerBuffer = await stickerMess.toBuffer();
                await Yaka.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m });
                
            } else if (/video/.test(mime)) {
                // Verificar duração do vídeo
                if ((quoted.msg || quoted).seconds > 15) {
                    return Yaka.sendMessage(
                        m.from,
                        { text: 'Please send video less than 15 seconds.' },
                        { quoted: m }
                    );
                }
                
                let mediaMess = await quoted.download();
                
                let stickerMess = new Sticker(mediaMess, {
                    pack: 'Cropped Stickers',
                    author: pushName || 'Bot User',
                    type: StickerTypes.CROPPED,
                    categories: ['🤩', '🎉'],
                    id: '12345',
                    quality: 70,
                    background: 'transparent'
                });
                
                const stickerBuffer2 = await stickerMess.toBuffer();
                await Yaka.sendMessage(m.from, { sticker: stickerBuffer2 }, { quoted: m });
                
            } else {
                Yaka.sendMessage(
                    m.from,
                    { text: `Please mention an *image/video* and type *${prefix}scrop* to create cropped sticker.` },
                    { quoted: m }
                );
            }
        } catch (error) {
            console.error('Error in stickercrop:', error);
            m.reply('An error occurred while creating the cropped sticker!');
        }
    }
};