module.exports = {
  name: "logomakercommands",
  alias: ["logomakerc", "logomakercommands", "logomaker", "logomakersc"],
  desc: "Exibe lista de comandos de ajuda",
  react: "⭕",
  category: "Menu de Ajuda",
  start: async (Yaka, m, { prefix, pushName, args, commands, text }) => {

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
        {
          buttonId: `${prefix}help`,
          buttonText: { displayText: `Ajuda` },
          type: 1,
        },
      ];
      const buth = {
        text: `ℹ️Informações do Comando\n\n${data.join("\n")}`,
        footer: `${botName}`,
        buttons: buttonss,
        headerType: 1,
      };
      return Yaka.sendMessage(m.from, buth, { quoted: m });
    } else {
      let textHelpMenu = `Olá, eu sou o *${botName}* Bot.

Aqui está a lista de comandos de Criação de Logo:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •🖼 ${prefix}3ᴅᴄʜʀɪꜱᴛᴍᴀꜱ
╠ •🖼 ${prefix}3ᴅɴᴇᴏɴ
╠ •🖼 ${prefix}3ᴅꜱᴘᴀᴄᴇ
╠ •🖼 ${prefix}3ᴅꜱᴛᴏɴᴇ
╠ •🖼 ${prefix}ʙᴇᴀʀ
╠ •🖼 ${prefix}ʙʟᴀᴄᴋᴘɪɴᴋ
╠ •🖼 ${prefix}ʙʟᴏᴏᴅ
╠ •🖼 ${prefix}ʙᴏᴋᴇʜ
╠ •🖼 ${prefix}ᴄᴀɴᴅʏ
╠ •🖼 ${prefix}ᴄᴀʀʙᴏɴ
╠ •🖼 ${prefix}ᴄʜᴏᴄᴏʟᴀᴛᴇ
╠ •🖼 ${prefix}ᴄʜʀɪꜱᴛᴍᴀꜱ
╠ •🖼 ${prefix}ᴄɪʀᴄᴜɪᴛ
╠ •🖼 ${prefix}ᴄʟᴏᴜᴅ
╠ •🖼 ${prefix}ᴅᴇᴇᴘꜱᴇᴀ
╠ •🖼 ${prefix}ᴅᴇᴍᴏɴ
╠ •🖼 ${prefix}ᴅʀᴏᴘᴡᴀᴛᴇʀ
╠ •🖼 ${prefix}ɢʟɪᴛᴄʜ
╠ •🖼 ${prefix}ɢʟɪᴛᴄʜ2
╠ •🖼 ${prefix}ɢʟɪᴛᴄʜ3
╠ •🖼 ${prefix}ɢʀᴀꜰꜰɪᴛɪ
╠ •🖼 ${prefix}ʜᴏʟʟᴏɢʀᴀᴘʜɪᴄ
╠ •🖼 ${prefix}ᴊᴏᴋᴇʀ
╠ •🖼 ${prefix}ʟɪᴏɴ
╠ •🖼 ${prefix}ᴍᴀɢᴍᴀ
╠ •🖼 ${prefix}ᴍᴀᴛʀɪx
╠ •🖼 ${prefix}ɴᴇᴏɴ
╠ •🖼 ${prefix}ɴᴇᴏɴᴅᴇᴠɪʟ
╠ •🖼 ${prefix}ɴᴇᴏɴɢʀᴇᴇɴ
╠ •🖼 ${prefix}ɴᴇᴏɴʟɪɢʜᴛ
╠ •🖼 ${prefix}ᴘᴀᴘᴇʀᴄᴜᴛ
╠ •🖼 ${prefix}ᴘᴇɴᴄɪʟ
╠ •🖼 ${prefix}ᴘᴏʀɴʜᴜʙ
╠ •🖼 ${prefix}ꜱᴄɪꜰɪ
╠ •🖼 ${prefix}ꜱᴘᴀʀᴋʟᴇᴄʜʀɪꜱᴛᴍᴀꜱ
╠ •🖼 ${prefix}ᴛʜᴜɴᴅᴇʀ
╠ •🖼 ${prefix}ᴛʜᴜɴᴅᴇʀ2
╠ •🖼 ${prefix}ᴛʀᴀɴꜱꜰᴏʀᴍᴇʀ
╠ •🖼 ${prefix}ᴡᴀʟʟ
╠ •🖼 ${prefix}ᴡᴏʟꜰ
╠ •🖼 ${prefix}ʙᴜʀɢᴇʀ
| • ━━━━━━━━━━━━━━

*✨ _Menu de Ajuda por:_ ${botName} ✨*

☞ _Proprietário:_ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎 `;

      const buttons = [];

      const buttonMessage = {
        image: { url: botImage2 },
        caption: textHelpMenu,
        footer: `*${botName}*`,
        headerType: 4,
      };

      await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
    }
  },
};
