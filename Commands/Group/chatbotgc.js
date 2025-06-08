const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mk } = require("../../Database/dataschema.js");

module.exports = {
    name: "chatbotgc",
    alias: ["autochat", "autoreply", "chatbotgroup"],
    desc: "Ativar ou desativar o chatbot no grupo",
    category: "Group",
    usage: "chatbotgc [on/off]",
    react: "🍃",
    start: async (Yaka, m, { args, isBotAdmin, isAdmin, isCreator, reply, prefix, pushName }) => {
        try {
            // Verificar permissões do usuário
            if (!isAdmin && !isCreator) {
                return await Yaka.sendMessage(m.from, {
                    text: `*${pushName}*, você precisa ser Admin para gerenciar o Chatbot!`,
                }, { quoted: m });
            }

            // Buscar dados do grupo no banco de dados híbrido
            let checkdata;
            try {
                checkdata = await mk.findOne({ id: m.from });
            } catch (dbError) {
                console.error("Erro no banco de dados:", dbError);
                return await Yaka.sendMessage(m.from, {
                    text: "❌ Erro temporário no banco de dados. Tente novamente em alguns segundos.",
                }, { quoted: m });
            }

            // Verificar se é um chat em grupo e obter metadados com proteção
            let mems = [];
            const isGroup = m.from.endsWith('@g.us');
            
            if (isGroup) {
                try {
                    const groupe = await Promise.race([
                        Yaka.groupMetadata(m.from),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Group metadata timeout')), 8000)
                        )
                    ]);
                    
                    mems = groupe.participants.map((p) => 
                        p.id.replace("c.us", "s.whatsapp.net")
                    );
                } catch (groupError) {
                    console.log("Aviso: Não foi possível obter metadados do grupo, continuando sem mencionar membros...");
                    // Comando continua funcionando mesmo sem os metadados
                }
            }

            /* ─────── ATIVAR ─────── */
            if (args[0]?.toLowerCase() === "on") {
                try {
                    // Verificar se já está ativado
                    if (checkdata && (checkdata.chatBot === "true" || checkdata.chatBot === true)) {
                        return await Yaka.sendMessage(m.from, {
                            text: "*O Chatbot já está ativado!* ✅\n\n" +
                                  `Para conversar, use: ${prefix}yenchat sua mensagem`
                        }, { quoted: m });
                    }

                    // Ativar o chatbot usando o sistema híbrido
                    await mk.findOneAndUpdate(
                        { id: m.from }, 
                        { $set: { chatBot: "true" } }, 
                        { upsert: true, new: true }
                    );

                    return await Yaka.sendMessage(m.from, {
                        text: "*Chatbot do grupo ATIVADO com sucesso!* ✅\n\n" +
                              `Para conversar, use: ${prefix}yenchat sua mensagem\n\n` +
                              `Exemplo: ${prefix}yenchat Olá, como você está?`,
                        contextInfo: mems.length > 0 ? { mentionedJid: mems } : {}
                    }, { quoted: m });
                    
                } catch (saveError) {
                    console.error("Erro ao ativar chatbot:", saveError);
                    return await Yaka.sendMessage(m.from, {
                        text: "*❌ Erro ao ativar o chatbot!*\n\nTente novamente em alguns segundos."
                    }, { quoted: m });
                }
            }

            /* ─────── DESATIVAR ─────── */
            if (args[0]?.toLowerCase() === "off") {
                try {
                    // Verificar se já está desativado
                    if (checkdata && (checkdata.chatBot === "false" || checkdata.chatBot === false || !checkdata.chatBot)) {
                        return await Yaka.sendMessage(m.from, {
                            text: "*O Chatbot já está desativado.* ❌"
                        }, { quoted: m });
                    }

                    // Desativar o chatbot usando o sistema híbrido
                    await mk.findOneAndUpdate(
                        { id: m.from }, 
                        { $set: { chatBot: "false" } }, 
                        { upsert: true, new: true }
                    );

                    return await Yaka.sendMessage(m.from, {
                        text: "*Chatbot do grupo DESATIVADO!* ❌"
                    }, { quoted: m });
                    
                } catch (saveError) {
                    console.error("Erro ao desativar chatbot:", saveError);
                    return await Yaka.sendMessage(m.from, {
                        text: "*❌ Erro ao desativar o chatbot!*\n\nTente novamente em alguns segundos."
                    }, { quoted: m });
                }
            }

            /* ─────── MENU DE STATUS ─────── */
            // Determinar status atual (compatível com string e boolean)
            const isChatbotActive = checkdata && 
                (checkdata.chatBot === "true" || checkdata.chatBot === true);
            const statusAtual = isChatbotActive ? "✅ LIGADO" : "❌ DESLIGADO";
            
            // Verificar se a variável botImage4 existe, senão usar uma imagem padrão
            let imagemUrl;
            try {
                imagemUrl = typeof botImage4 !== 'undefined' && botImage4 ? 
                           botImage4 : 'https://i.ibb.co/FzJ5Yt6/chatbot.png';
            } catch (error) {
                imagemUrl = 'https://i.ibb.co/FzJ5Yt6/chatbot.png';
            }

            await Yaka.sendMessage(m.from, {
                image: { url: imagemUrl },
                caption: `*「 CONFIGURAÇÃO DO CHATBOT 」*\n\n` +
                        `O Chatbot responde automaticamente quando você usa o comando yenchat.\n\n` +
                        `*Comandos disponíveis:*\n` +
                        `• ${prefix}chatbotgc on - Ativa o chatbot\n` +
                        `• ${prefix}chatbotgc off - Desativa o chatbot\n` +
                        `• ${prefix}yenchat - Conversar com o chatbot\n\n` +
                        `*Status atual:* ${statusAtual}\n\n` +
                        `*DICA:* Quando ativado, use ${prefix}yenchat seguido da sua mensagem para conversar!`
            }, { quoted: m });

            // Se o chatbot estiver ativado, enviar um exemplo após delay
            if (isChatbotActive) {
                setTimeout(async () => {
                    try {
                        await Yaka.sendMessage(m.from, {
                            text: `*Exemplo:* ${prefix}yenchat Olá, como você está?`
                        }, { quoted: m });
                    } catch (error) {
                        console.error("Erro ao enviar mensagem de exemplo:", error);
                    }
                }, 1000);
            }

        } catch (error) {
            console.error("Erro geral no comando chatbotgc:", error);
            
            // Enviar mensagem de erro para o usuário
            try {
                await Yaka.sendMessage(m.from, {
                    text: "*❌ Erro interno do sistema!*\n\n" +
                          "Tente novamente em alguns instantes ou contate o administrador do bot."
                }, { quoted: m });
            } catch (sendError) {
                console.error("Erro ao enviar mensagem de erro:", sendError);
            }
        }
    }
};