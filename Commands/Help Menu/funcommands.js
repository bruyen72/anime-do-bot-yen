module.exports = {
  name: "funcommands",
  alias: ["func", "funcommands", "func"],
  desc: "Exibe lista de comandos de diversão",
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

Aqui está a lista de comandos de *Diversão*:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •✨ ${prefix}ᴀᴡꜱᴏᴍᴇᴄʜᴇᴄᴋ        – marque um usuário!
╠ •✨ ${prefix}ᴄʜᴀʀᴀᴄᴛᴇʀᴄʜᴇᴄᴋ      – marque um usuário!
╠ •✨ ${prefix}ᴄᴜᴛᴇᴄʜᴇᴄᴋ          – marque um usuário!
╠ •✨ ${prefix}ɢᴀʏᴄʜᴇᴄᴋ            – marque um usuário!
╠ •✨ ${prefix}ɢʀᴇᴀᴛᴄʜᴇᴄᴋ          – marque um usuário!
╠ •✨ ${prefix}ʜᴀɴᴅꜱᴏᴍᴇᴄʜᴇᴄᴋ       – marque um usuário!
╠ •✨ ${prefix}ʜᴏʀɴʏᴄʜᴇᴄᴋ          – marque um usuário!
╠ •✨ ${prefix}ʟᴇꜱʙɪᴀɴᴄʜᴇᴄᴋ        – marque um usuário!
╠ •✨ ${prefix}ᴍᴀᴛᴜʀᴇᴄʜᴇᴄᴋ         – marque um usuário!
╠ •✨ ${prefix}ᴘᴇʀᴠᴇʀᴛᴄʜᴇᴄᴋ        – marque um usuário!
╠ •✨ ${prefix}ᴘʀᴇᴛᴛʏᴄʜᴇᴄᴋ         – marque um usuário!
╠ •✨ ${prefix}ꜱᴛᴀᴍɪɴᴀᴄʜᴇᴄᴋ        – marque um usuário!
╠ •✨ ${prefix}ꜱᴛʀᴀɪɢʜᴛᴄʜᴇᴄᴋ       – marque um usuário!
╠ •✨ ${prefix}ᴜɢʟʏᴄʜᴇᴄᴋ           – marque um usuário!
╠ •✨ ${prefix}ᴄᴏɪɴꜰʟɪᴘ            – cara ou coroa!
╠ •✨ ${prefix}ᴅɪᴄᴇ                – rolar um dado!
╠ •✨ ${prefix}ᴛʀᴜᴛʜ               – verdade?
╠ •✨ ${prefix}ꜰᴀᴄᴛ                – receber um fato aleatório!
╠ •✨ ${prefix}ꜰᴜɴ <texto>         – digite algo após o prefixo e veja a mágica! Ex.: ${prefix}gay, ${prefix}mf
╠ •
| • ━━━━━━━━━━━━━━

*✨ _Menu de Ajuda por:_ ${botName} ✨*

☞ _Proprietário:_ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎`;

    const buttons = [];

    const buttonMessage = {
      image: { url: botImage5 },
      caption: textHelpMenu,
      footer: `*${botName}*`,
      headerType: 4,
    };

    await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
  },
};
