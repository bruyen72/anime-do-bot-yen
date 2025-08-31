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
  start: async (
    Yaka,
    m,
    { args, isBotAdmin, isAdmin, isCreator, reply, prefix, pushName }
  ) => {
    // Verificar permissões do usuário
    if (!isAdmin && !isCreator) {
      return Yaka.sendMessage(
        m.from,
        {
          text: `*${pushName}*, você precisa ser Admin para gerenciar o Chatbot!`,
        },
        { quoted: m }
      );
    }

    // Buscar dados do grupo no banco de dados
    const checkdata = await mk.findOne({ id: m.from });
    const groupe = await Yaka.groupMetadata(m.from);
    const mems = groupe.participants.map((p) =>
      p.id.replace("c.us", "s.whatsapp.net")
    );

    /* ─────── ATIVAR ─────── */
    if (args[0]?.toLowerCase() === "on") {
      if (!checkdata) {
        await new mk({ id: m.from, chatBot: "true" }).save();
      } else if (checkdata.chatBot === "true") {
        return Yaka.sendMessage(
          m.from,
          {
            text: "*O Chatbot já está ativado!*\n\n" +
                 `Para conversar, use: ${prefix}yenchat sua mensagem`
          },
          { quoted: m }
        );
      } else {
        await mk.updateOne({ id: m.from }, { chatBot: "true" });
      }

      return Yaka.sendMessage(
        m.from,
        {
          text: "*Chatbot do grupo ATIVADO com sucesso!* ✅\n\n" +
                `Para conversar, use: ${prefix}yenchat sua mensagem\n\n` +
                `Exemplo: ${prefix}yenchat Olá, como você está?`,
          contextInfo: { mentionedJid: mems },
        },
        { quoted: m }
      );
    }

    /* ─────── DESATIVAR ─────── */
    if (args[0]?.toLowerCase() === "off") {
      if (!checkdata) {
        await new mk({ id: m.from, chatBot: "false" }).save();
      } else if (checkdata.chatBot === "false") {
        return Yaka.sendMessage(
          m.from,
          { text: "*O Chatbot já está desativado.* ❌" },
          { quoted: m }
        );
      } else {
        await mk.updateOne({ id: m.from }, { chatBot: "false" });
      }

      return Yaka.sendMessage(
        m.from,
        { text: "*Chatbot do grupo DESATIVADO!* ❌" },
        { quoted: m }
      );
    }

    /* ─────── MENU DE STATUS ─────── */
    const statusAtual = checkdata && checkdata.chatBot === "true" ? "✅ LIGADO" : "❌ DESLIGADO";
    
    // Verificar se a variável botImage4 existe, senão usar uma imagem padrão
    const imagemUrl = typeof botImage4 !== 'undefined' ? botImage4 : 'https://i.ibb.co/FzJ5Yt6/chatbot.png';
    
    await Yaka.sendMessage(
      m.from,
      {
        image: { url: imagemUrl },
        caption:
          `*「 CONFIGURAÇÃO DO CHATBOT 」*\n\n` +
          `O Chatbot responde automaticamente quando você usa o comando yenchat.\n\n` +
          `*Comandos disponíveis:*\n` +
          `• ${prefix}chatbotgc on - Ativa o chatbot\n` +
          `• ${prefix}chatbotgc off - Desativa o chatbot\n` +
          `• ${prefix}yenchat - Conversar com o chatbot\n\n` +
          `*Status atual:* ${statusAtual}\n\n` +
          `*DICA:* Quando ativado, use ${prefix}yenchat seguido da sua mensagem para conversar!`,
      },
      { quoted: m }
    );
    
    // Se o chatbot estiver ativado, enviar um exemplo
    if (checkdata && checkdata.chatBot === "true") {
      setTimeout(() => {
        Yaka.sendMessage(
          m.from,
          { 
            text: `*Exemplo:* ${prefix}yenchat Olá, como você está?` 
          },
          { quoted: m }
        );
      }, 1000);
    }
  },
};