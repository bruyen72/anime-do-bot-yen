module.exports = {
  name: "group",
  alias: ["gc", "group open"],
  desc: "Altera as configurações do grupo (abrir/fechar).",
  category: "Group",
  usage: "Marque uma imagem e digite -setppgc",
  react: "👹",

  start: async (
    Yaka,
    m,
    { text, prefix, isBotAdmin, isAdmin, mentionByTag, args, pushName, mime, quoted }
  ) => {
    // precisa que o usuário e o bot sejam admins
    if (!isAdmin && !isBotAdmin)
      return Yaka.sendMessage(
        m.from,
        {
          text: `O bot e *${pushName}* precisam ser administradores para usar este comando!`,
        },
        { quoted: m }
      );

    if (args[0] === "close") {
      await Yaka.groupSettingUpdate(m.from, "announcement").then(() =>
        m.reply("Grupo foi fechado!")
      );
    } else if (args[0] === "open") {
      await Yaka.groupSettingUpdate(m.from, "not_announcement").then(() =>
        m.reply("Grupo foi aberto!")
      );
    } else {
      const buttons = [
        {
          buttonId: `${prefix}group open`,
          buttonText: { displayText: "Abrir" },
          type: 1,
        },
        {
          buttonId: `${prefix}group close`,
          buttonText: { displayText: "Fechar" },
          type: 1,
        },
      ];

      const buttonMessage = {
        text: `*「 ${global.botName} 」*\n\n_Ferramenta para alterar configurações do grupo_:`,
        footer: `${botName}`,
        buttons,
        headerType: 4,
      };

      Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
    }
  },
};
