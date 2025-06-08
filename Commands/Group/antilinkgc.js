const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mk } = require("../../Database/dataschema.js");

module.exports = {
  name: "antilinkgc",
  alias: ["alinkgc", "antilink"],
  desc: "Ativa ou desativa o antilink no grupo",
  category: "Group",
  usage: "antilinkgc [on/off]",
  react: "🔐",

  start: async (
    Yaka,
    m,
    { args, isBotAdmin, isAdmin, isCreator, reply, prefix, pushName }
  ) => {
    // Bot e usuário precisam ser admins
    if (!isAdmin && !isBotAdmin)
      return Yaka.sendMessage(
        m.from,
        {
          text: `O bot e *${pushName}* precisam ser administradores para usar este comando!`,
        },
        { quoted: m }
      );

    const checkdata = await mk.findOne({ id: m.from });
    const groupe = await Yaka.groupMetadata(m.from);
    const mems = groupe.participants.map((p) =>
      p.id.replace("c.us", "s.whatsapp.net")
    );

    /* ─────── ATIVAR ─────── */
    if (args[0] === "on") {
      if (!checkdata) {
        await new mk({ id: m.from, antilink: "true" }).save();
        await Yaka.sendMessage(
          m.from,
          {
            text: "```「 Aviso 」```\n\nAntilink ativado!",
            contextInfo: { mentionedJid: mems },
          },
          { quoted: m }
        );
        return Yaka.sendMessage(
          m.from,
          { text: "*Antilink ativado com sucesso!*" },
          { quoted: m }
        );
      } else {
        if (checkdata.antilink === "true")
          return Yaka.sendMessage(
            m.from,
            { text: "*O antilink já está ativado.*" },
            { quoted: m }
          );

        await mk.updateOne({ id: m.from }, { antilink: "true" });
        return Yaka.sendMessage(
          m.from,
          { text: "*Antilink habilitado neste grupo.*" },
          { quoted: m }
        );
      }

      /* ─────── DESATIVAR ─────── */
    } else if (args[0] === "off") {
      if (!checkdata) {
        await new mk({ id: m.from, antilink: "false" }).save();
        return Yaka.sendMessage(
          m.from,
          { text: "*Antilink desativado com sucesso!*" },
          { quoted: m }
        );
      } else {
        if (checkdata.antilink === "false")
          return Yaka.sendMessage(
            m.from,
            { text: "*O antilink já está desativado.*" },
            { quoted: m }
          );

        await mk.updateOne({ id: m.from }, { antilink: "false" });
        return Yaka.sendMessage(
          m.from,
          { text: "*Antilink desabilitado neste grupo.*" },
          { quoted: m }
        );
      }

      /* ─────── MENU DE BOTÕES ─────── */
    } else {
      const buttonsAnti = [
        {
          buttonId: `${prefix}antilinkgc on`,
          buttonText: { displayText: "✅ Ativar" },
          type: 1,
        },
        {
          buttonId: `${prefix}antilinkgc off`,
          buttonText: { displayText: "❎ Desativar" },
          type: 1,
        },
      ];

      const msgButtons = {
        image: { url: botImage6 },
        caption:
          `*「 Configuração de Antilink do Grupo 」*\n\n` +
          `Clique em um botão abaixo para *Ativar* ou *Desativar*.\n\n` +
          `⚠️ *Nota:* O bot *deletará* todos os links enviados e *removerá* quem compartilhar outro ` +
          `*link de Grupo WhatsApp*.`,
        footer: `*${botName}*`,
        buttons: buttonsAnti,
        headerType: 4,
      };

      await Yaka.sendMessage(m.from, msgButtons, { quoted: m });
    }
  },
};
