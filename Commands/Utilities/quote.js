const axios = require("axios");
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require("fs");

module.exports = {
    name: "quote",
    alias: ["q", "quotes"],
    desc: "Para transformar qualquer texto em citação",
    category: "Pesquisa",
    usage: `q <Sua linha>`,
    react: "👀",
    start: async (Yaka, m, { text, prefix, args, pushName }) => {
        let nomeArquivo;
        try {
            // Verificar se há texto ou mensagem citada
            if (!args || (args.length === 0 && !m.quoted)) {
                return m.reply(`Por favor, forneça um texto (Digite ou mencione uma mensagem)! Uso: ${prefix}q <seu texto>`);
            }

            let fotoUsuario;
            const avatarPadrao = "https://i.ibb.co/3Fh9V6p/avatar-contact.png";
            
            // Obter foto de perfil
            try {
                if (m.quoted && m.quoted.sender) {
                    fotoUsuario = await Yaka.profilePictureUrl(m.quoted.sender, "image");
                } else {
                    fotoUsuario = await Yaka.profilePictureUrl(m.sender, "image");
                }
            } catch (e) {
                fotoUsuario = avatarPadrao;
            }

            // Obter nome e texto
            const nomeUsuarioWa = pushName || 'Usuário';
            let textoCitacao = '';
            
            if (m.quoted) {
                textoCitacao = m.quoted.body || m.quoted.text || m.quoted.conversation || '';
            }
            
            if (!textoCitacao && args && args.length > 0) {
                textoCitacao = args.join(" ");
            }
            
            if (!textoCitacao.trim()) {
                return m.reply('Nenhum texto encontrado para criar citação!');
            }

            // Preparar dados para API
            const jsonCitacao = {
                type: "quote",
                format: "png",
                backgroundColor: "#FFFFFF",
                width: 700,
                height: 580,
                scale: 2,
                messages: [
                    {
                        entities: [],
                        avatar: true,
                        from: {
                            id: 1,
                            name: nomeUsuarioWa,
                            photo: {
                                url: fotoUsuario,
                            },
                        },
                        text: textoCitacao,
                        replyMessage: {},
                    },
                ],
            };

            await m.reply('Criando sticker de citação...');

            // Fazer requisição para API
            const respostaCitacao = await axios.post("https://bot.lyo.su/quote/generate", jsonCitacao, {
                headers: { "Content-Type": "application/json" },
                timeout: 30000
            });

            if (!respostaCitacao.data || !respostaCitacao.data.result || !respostaCitacao.data.result.image) {
                return m.reply('Falha ao gerar imagem de citação!');
            }

            // Salvar imagem
            nomeArquivo = `citacao_${Date.now()}.png`;
            fs.writeFileSync(nomeArquivo, respostaCitacao.data.result.image, "base64");

            // Criar sticker
            const stickerMsg = new Sticker(nomeArquivo, {
                pack: 'Stickers Citação',
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
            console.error('Erro no comando quote:', error);
            await m.reply("Ocorreu um erro ao criar a citação!");
        } finally {
            // Limpar arquivo temporário
            if (nomeArquivo && fs.existsSync(nomeArquivo)) {
                try {
                    fs.unlinkSync(nomeArquivo);
                } catch (erroLimpeza) {
                    console.error('Erro de limpeza:', erroLimpeza);
                }
            }
        }
    },
};