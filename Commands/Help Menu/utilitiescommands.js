module.exports = {
  name: "utilitiescommands",
  alias: ["utilitiesc", "utilitiscommands"],
  desc: "Exibe lista de comandos de ajuda",
  react: "⭕",
  category: "Menu de Ajuda",
  start: async (Yaka, m, { prefix, pushName, args, commands, text }) => {

    /* ─────── INFO DE COMANDO INDIVIDUAL ─────── */
    if (args[0]) {
      let data = [];
      const name = args[0].toLowerCase();
      const cmd =
        commands.get(name) ||
        Array.from(commands.values()).find((v) => v.alias.includes(name));

      if (!cmd || cmd.type === "hide")
        return m.reply("Nenhum comando encontrado");

      data.push(`👹Comando : ${cmd.name.replace(/^\w/, (c) => c.toUpperCase())}`);
      if (cmd.alias) data.push(`👾Atalhos : ${cmd.alias.join(", ")}`);
      if (cmd.cool) data.push(`⏱️Tempo de espera: ${cmd.cool}`);
      if (cmd.desc) data.push(`🧾Descrição : ${cmd.desc}`);
      if (cmd.usage)
        data.push(
          `⭕Exemplo : ${cmd.usage
            .replace(/%prefix/gi, prefix)
            .replace(/%command/gi, cmd.name)
            .replace(/%text/gi, text)}`
        );

      const buttonss = [
        { buttonId: `${prefix}help`, buttonText: { displayText: `Ajuda` }, type: 1 },
      ];
      const buth = {
        text: `ℹ️Informações do Comando\n\n${data.join("\n")}`,
        footer: `${botName}`,
        buttons: buttonss,
        headerType: 1,
      };
      return Yaka.sendMessage(m.from, buth, { quoted: m });
    }

    /* ─────── MENU COMPLETO ─────── */
    let textHelpMenu = `Olá, eu sou o *${botName}* Bot.

Aqui está a lista de comandos de *Utilidades*:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •🎗 ${prefix}ᴇᴍᴏᴊɪᴍɪx        – misturar dois emojis (em desenvolvimento).
╠ •🎗 ${prefix}Qᴜᴏᴛᴇ        – criar figurinha de citação.
╠ •🎗 ${prefix}ꜱᴛɪᴄᴋᴇʀ         – gerar figurinha a partir de imagem/vídeo.
╠ •🎗 ${prefix}ꜱᴛɪᴄᴋᴇʀᴄʀᴏᴘ     – recortar uma figurinha.
╠ •🎗 ${prefix}ꜱᴛᴇᴀʟ           – “roubar” figurinha e assinar com seu nome.
╠ •🎗 ${prefix}ᴛᴏᴀᴜᴅɪᴏ          – converter vídeo em áudio.
╠ •🎗 ${prefix}ᴛᴏᴍᴘ3           – converter mídia ou link em MP3.
╠ •🎗 ${prefix}ᴛᴏᴍᴘ4           – transformar figurinha em vídeo MP4.
╠ •🎗 ${prefix}ᴛᴏᴜʀʟ           – fazer upload e gerar URL pública.
╠ •
| • ━━━━━━━━━━━━━━

*✨ _Menu de Ajuda por:_ ${botName} ✨*

☞ _Proprietário:_ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎`;

    const buttons = [];

    const buttonMessage = {
      image: { url: botImage1 },
      caption: textHelpMenu,
      footer: `*${botName}*`,
      headerType: 4,
    };

    await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
  },
};
