module.exports = {
  name: "reactioncommands",
  alias: ["reactionc", "reactionscommands"],
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
        { buttonId: `${prefix}help`, buttonText: { displayText: `Ajuda` }, type: 1 },
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

Aqui está a lista de comandos de *Reação*:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •👽 ${prefix}ʙᴇʜᴀᴘᴘʏ  – GIF de comemoração / anime o chat.
╠ •👽 ${prefix}ʙɪᴛᴇ      – “Dar uma mordida” de forma fofa.
╠ •👽 ${prefix}ʙᴏɴᴋ      – Bonk do martelinho (repreensão meme).
╠ •👽 ${prefix}ʙᴜʟʟʏ     – Zoar/brincar com alguém.
╠ •👽 ${prefix}ᴄʀʏ       – Expressar tristeza/draminha.
╠ •👽 ${prefix}ᴅᴀɴᴄᴇ     – Dançar para celebrar algo.
╠ •👽 ${prefix}ʜᴀɴᴅʜᴏɴᴅ  – Segurar as mãos (apoio/carinho).
╠ •👽 ${prefix}ʜᴀᴘᴘʏ     – Mostrar alegria (sorriso/pulo).
╠ •👽 ${prefix}ʜɪɢʜꜰɪᴠᴇ  – Toca aqui / parabéns conjunto.
╠ •👽 ${prefix}ʜᴜɢ       – Mandar um abraço.
╠ •👽 ${prefix}ᴋɪᴄᴋ      – Chute amistoso / repreensão divertida.
╠ •👽 ${prefix}ᴋɪʟʟ      – Humor negro “foi de base”.
╠ •👽 ${prefix}ᴋɪꜱꜱ      – Enviar um beijo (afeto).
╠ •👽 ${prefix}ᴘᴀᴛ       – Cafuné / carinho na cabeça.
╠ •👽 ${prefix}ꜱʟᴀᴘ      – Tapinha cômico (zoeira).
╠ •👽 ${prefix}ꜱᴍɪʟᴇ     – Enviar um sorriso simpático.
╠ •👽 ${prefix}ᴡᴀᴠᴇ      – Acenar (oi/tchau).
╠ •👽 ${prefix}ᴡɪɴᴋ      – Piscadela de cumplicidade/flirte.
╠ •👽 ${prefix}ʏᴇᴇᴛ      – Arremessar/“mandar longe” (meme).
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
    }
  },
};
