const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mk } = require("../../Database/dataschema.js");

module.exports = {
  name: "cmd",
  alias: ["bot", "botswitch"],
  desc: "Ativar ou desativar o bot no grupo",
  category: "Group",
  usage: "cmd [on/off]",
  react: "🍃",

  start: async (
    Yaka,
    m,
    { args, isBotAdmin, isAdmin, isCreator, reply, prefix, pushName, participants }
  ) => {
    // apenas administradores podem alternar o bot
    if (!isAdmin)
      return Yaka.sendMessage(
        m.from,
        { text: `*${pushName}*, você precisa ser *Admin* para ligar ou desligar o bot!` },
        { quoted: m }
      );

    const checkdata = await mk.findOne({ id: m.from });
    const groupe = await Yaka.groupMetadata(m.from);
    const mems = groupe.participants.map((p) => p.id.replace("c.us", "s.whatsapp.net"));

    /* ───────  LIGAR  ─────── */
    if (args[0] === "on") {
      if (!checkdata) {
        await new mk({ id: m.from, botSwitch: "true" }).save();
      } else if (checkdata.botSwitch === "true") {
        return Yaka.sendMessage(
          m.from,
          { text: `*${botName}* já está ativado neste grupo!` },
          { quoted: m }
        );
      } else {
        await mk.updateOne({ id: m.from }, { botSwitch: "true" });
      }

      return Yaka.sendMessage(
        m.from,
        {
          text: `*${botName}* foi *Ativado* neste grupo!`,
          contextInfo: { mentionedJid: mems },
        },
        { quoted: m }
      );
    }

    /* ───────  DESLIGAR  ─────── */
    if (args[0] === "off") {
      if (!checkdata) {
        await new mk({ id: m.from, botSwitch: "false" }).save();
      } else if (checkdata.botSwitch === "false") {
        return Yaka.sendMessage(
          m.from,
          { text: `*${botName}* já está desativado neste grupo!` },
          { quoted: m }
        );
      } else {
        await mk.updateOne({ id: m.from }, { botSwitch: "false" });
      }

      return Yaka.sendMessage(
        m.from,
        {
          text:
            `*${botName}* foi *Desativado* neste grupo!\n` +
            `Agora apenas *Admins* podem usar o bot.`,
          contextInfo: { mentionedJid: mems },
        },
        { quoted: m }
      );
    }

    /* ───────  MENU DE BOTÕES  ─────── */
    const buttons = [
      { buttonId: `${prefix}cmd on`,  buttonText: { displayText: "✅ Ligar" },  type: 1 },
      { buttonId: `${prefix}cmd off`, buttonText: { displayText: "❎ Desligar" }, type: 1 },
    ];

    const msg = {
      image: { url: botImage2 },
      caption: "*Alternar Bot*\n\nClique em um botão para *Ligar* ou *Desligar*.",
      footer: `*${botName}*`,
      buttons,
      headerType: 4,
    };

    await Yaka.sendMessage(m.from, msg, { quoted: m });
  },
};
