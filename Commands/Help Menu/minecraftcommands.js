module.exports = {
  name: "minecraftcommands",
  alias: ["minecraftc", "minecraftcommands", "minecraft"],
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
      let textHelpMenu = `Olá, eu sou o bot *${botName}*.

Aqui está a lista de comandos *RPG – Minecraft*:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •🎒 ${prefix}ʙᴜʏ - comprar recursos.
╠ •🎒 ${prefix}ɪɴᴠᴇɴᴛᴏʀʏ - ver o inventário.
╠ •🎒 ${prefix}ᴍɪɴᴇ - começar a mineração!
╠ •🎒 ${prefix}ꜱʜᴏᴘ - loja do ${botName}.
╠ •🎒 ${prefix}ʀᴇɢ-ɪɴᴠ - criar um novo inventário.
╠ •
| • ━━━━━━━━━━━━━━

*✨ _Menu de Ajuda por:_ ${botName} ✨*

☞ _Proprietário:_ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎 `;

      const buttons = [];

      const buttonMessage = {
        video: { url: "https://telegra.ph/file/627f47bd6f2cfb035c5c0.mp4" },
        caption: textHelpMenu,
        gifPlayback: true,
        footer: `*${botName}*`,
        headerType: 4,
      };

      await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
    }
  },
};
