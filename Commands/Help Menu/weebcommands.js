module.exports = {
  name: "weebcommands",
  alias: ["weebc", "weebcommands"],
  desc: "Exibe lista de comandos de ajuda",
  react: "⭕",
  category: "Menu de Ajuda",
  start: async (Yaka, m, { prefix, pushName, NSFWstatus, args, commands, text }) => {

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
      if (cmd.alias)  data.push(`👾Atalhos : ${cmd.alias.join(", ")}`);
      if (cmd.cool)   data.push(`⏱️Tempo de espera: ${cmd.cool}`);
      if (cmd.desc)   data.push(`🧾Descrição : ${cmd.desc}`);
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

Aqui está a lista de comandos *Weeb*:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •🧧 ${prefix}ᴀɴɪᴍᴇQᴜᴏᴛᴇ   – obter uma citação de anime aleatória.
╠ •🧧 ${prefix}ᴄᴏꜱᴘʟᴀʏ       – foto de cosplay.
╠ •🧧 ${prefix}ᴄᴏꜱᴘʟᴀʏᴠɪᴅᴇᴏ   – vídeo de cosplay.
╠ •🧧 ${prefix}ꜰᴏxɢɪʀʟ       – imagem de foxgirl.
╠ •🧧 ${prefix}ᴍᴀɪᴅ          – foto de maid de anime.
╠ •🧧 ${prefix}ᴡᴀʟʟᴘᴀᴘᴇʀ     – buscar wallpaper.
╠ •🧧 ${prefix}ᴡᴀɪꜰᴜ         – imagem de waifu.
╠ •
| • ━━━━━━━━━━━━━━\n`;

    /* ─────── MENU NSFW (opcional) ─────── */
    if (NSFWstatus === "true") {
      textHelpMenu += `Menu **NSFW**:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ • 👅💦 ᴘᴜꜱꜱʏ, ꜱᴘʀᴇᴀᴅᴘᴜꜱꜱʏ,
╠ • 👅💦 ɢᴇɴꜱʜɪɴ, ꜱQᴜɪʀᴛ,
╠ • 👅💦 ɢʟᴀꜱꜱᴇꜱ, ꜱᴜɴɢʟᴀꜱꜱᴇꜱ,
╠ • 👅💦 ꜱᴡɪᴍꜱᴜɪᴛ, ꜱᴄʜᴏᴏʟꜱᴡɪᴍꜱᴜɪᴛ,
╠ • 👅💦 ʜᴏʟᴏ ʟɪᴠᴇ, ᴀꜱꜱ,
╠ • 👅💦 ᴜɴᴅᴇʀᴡᴇᴀʀ, ɴɪᴘᴘʟᴇꜱ,
╠ • 👅💦 ᴜɴᴄᴇɴꜱᴏʀᴇᴅ, ꜱᴇx,
╠ • 👅💦 ꜱᴇx2, ꜱᴇx3,
╠ • 👅💦 ʙʟᴏɴᴅᴇ, ᴛᴡɪɴᴛᴀɪʟꜱ,
╠ • 👅💦 ʙʀᴇᴀꜱᴛꜱ, ᴛʜɪɢʜʜɪɢʜꜱ,
╠ • 👅💦 ꜱᴋɪʀᴛ, ɢᴀᴍᴇᴄɢ,
╠ • 👅💦 ᴀɴɪᴍᴀʟᴇᴀʀꜱ, ꜰᴏxɢɪʀʟ,
╠ • 👅💦 ᴅʀᴇꜱꜱ, ꜱᴄʜᴏᴏʟᴜɴɪꜰᴏʀᴍ,
╠ • 👅💦 ᴛᴡᴏɢɪʀʟꜱ, ɢʟᴏᴠᴇꜱ,
╠ • 👅💦 ᴠᴏᴄᴀʟᴏɪᴅ, ᴛᴏᴜʜᴏᴜ,
╠ • 👅💦 ᴡᴇᴀᴘᴏɴ, ᴡɪᴛʜꜰʟᴏᴡᴇʀꜱ,
╠ • 👅💦 ᴘɪɴᴋʜᴀɪʀ, ᴄʟᴏᴜᴅꜱᴠɪᴇᴡ,
╠ • 👅💦 ᴡʜɪᴛᴇ, ᴀɴɪᴍᴀʟ,
╠ • 👅💦 ᴛᴀɪʟ, ɴᴜᴅᴇ,
╠ • 👅💦 ᴘᴏɴʏᴛᴀɪʟ, ʙᴇᴅ,
╠ • 👅💦 ᴡʜɪᴛᴇ ʜᴀɪʀ, ʀɪʙʙᴏɴꜱ,
╠ • 👅💦 ᴊᴀᴘᴀɴᴇꜱᴇᴄʟᴏᴛʜꜱ,
╠ • 👅💦 ʜᴀᴛꜱᴜɴᴇᴍɪᴋᴜ,
╠ • 👅💦 ʙɪᴋɪɴɪ, ʙᴀʀᴇꜰᴏᴏᴛ,
╠ • 👅💦 ɴᴏʙʀᴀ, ꜰᴏᴏᴅ,
╠ • 👅💦 ᴡɪɴɢꜱ, ᴘᴀɴᴛʏʜᴏꜱᴇ,
╠ • 👅💦 ᴏᴘᴇɴꜱʜɪʀᴛ, ʜᴇᴀᴅʙᴀɴᴅ,
╠ • 👅💦 ᴘᴇɴɪꜱ, ᴄʟᴏꜱᴇ,
╠ • 👅💦 ᴡᴇᴛ, ᴄᴀᴛɢɪʀʟ,
╠ • 👅💦 ᴡᴏʟꜰɢɪʀʟ, ɴᴇᴋᴏ,
╠ • 👅💦 ʟᴏʟɪ, ꜱᴘʀᴇᴀᴅʟᴇɢꜱ,
╠ • 👅💦 ʙʀᴀ, ꜰᴀᴛᴇꜱᴇʀɪᴇꜱ,
╠ • 👅💦 ᴛʀᴇᴇ, ᴇʟʙᴏᴡɢʟᴏᴠᴇꜱ,
╠ • 👅💦 ɢʀᴇᴇɴʜᴀɪʀ, ʜᴏʀɴꜱ,
╠ • 👅💦 ᴡɪᴛʜᴘᴇᴛᴀʟꜱ, ᴅʀᴜɴᴋ,
╠ • 👅💦 ᴄᴜᴍ, ʜᴇᴀᴅ ᴅʀᴇꜱꜱ,
╠ • 👅💦 ᴛɪᴇ, ꜱʜᴏʀᴛꜱ,
╠ • 👅💦 ᴍᴀɪᴅ, ʜᴇᴀᴅᴘʜᴏɴᴇꜱ,
╠ • 👅💦 ᴀɴᴜꜱᴠɪᴇᴡ, ɪᴅᴏʟ,
╠ • 👅💦 ɢᴜɴ, ꜱᴛᴏᴄᴋɪɴɢꜱ,
╠ • 👅💦 ᴛᴇᴀʀꜱ, ʙʀᴇᴀꜱᴛʜᴏʟᴅ,
╠ • 👅💦 ɴᴇᴄᴋʟᴀᴄᴇ, ꜱᴇᴇᴛʜʀᴏᴜɢʜ,
╠ • 👅💦 ʙᴜɴɴʏᴇᴀʀꜱ, ʙᴜɴɴʏɢɪʀʟ,
╠ • 👅💦 ᴛᴏᴘʟᴇꜱꜱ, ʙᴇᴀᴄʜ,
╠ • 👅💦 ᴇʀᴇᴄᴛɴɪᴘᴘʟᴇꜱ, ʏᴜʀɪ,
╠ • 👅💦 ᴠᴀᴍᴘɪʀᴇ, ꜱʜɪʀᴛ,
╠ • 👅💦 ᴘᴀɴᴛʏᴘᴜʟʟ, ᴛᴏʀɴᴄʟᴏᴛʜᴇꜱ,
╠ • 👅💦 ʙᴏɴᴅᴀɢᴇ, ꜰɪɴɢᴇʀɪɴɢ,
╠ • 👅💦 ʙᴇʟʟ, ꜱʜɪʀᴛʟɪꜰᴛ,
╠ • 👅💦 ᴛᴀᴛᴛᴏᴏ, ᴄʜᴀɪɴ,
╠ • 👅💦 ꜰʟᴀᴛᴄʜᴇꜱᴛ, ᴏᴘᴘᴀɪ,
╠ •
| • ━━━━━━━━━━━━━━\n\n`;
    }

    textHelpMenu += `*✨ _Menu de Ajuda por:_ ${botName} ✨*

☞ _Proprietário:_ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎`;

    const buttons = [];

    const buttonMessage = {
      image: { url: botImage2 },
      caption: textHelpMenu,
      footer: `*${botName}*`,
      headerType: 4,
    };

    await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
  },
};
