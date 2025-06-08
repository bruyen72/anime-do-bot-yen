module.exports = {
  name: "grpc",
  alias: ["grpc", "grpcommands"],
  desc: "Exibe a lista de comandos de ajuda",
  react: "⭕",
  category: "Menu de Ajuda",
  start: async (Yaka, m, { prefix, pushName, args, commands, text }) => {

    if (args[0]) {
      let data = [];
      let name = args[0].toLowerCase();
      let cmd =
        commands.get(name) ||
        Array.from(commands.values()).find((v) => v.alias.includes(name));

      if (!cmd || cmd.type == "hide")
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

Aqui está a lista de comandos de Grupo:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •⭕️ ${prefix}ᴀᴅᴍɪɴꜱ - marcar todos os administradores.
╠ •⭕️ ${prefix}ᴀɴɴᴏᴜɴᴄᴇ - anunciar uma mensagem.
╠ •⭕️ ${prefix}ᴀɴᴛɪʟɪɴᴋɢᴄ - ativar anti-link (remove links compartilhados).
╠ •⭕️ ${prefix}ᴄʜᴀɴɢᴇɢᴄɴᴀᴍᴇ - alterar o nome do grupo.
╠ •⭕️ ${prefix}ᴄʜᴀᴛʙᴏᴛɢᴄ - chatbot.
╠ •⭕️ ${prefix}ᴅᴇʟᴇᴛᴇ - excluir uma mensagem.
╠ •⭕️ ${prefix}ɢʀᴏᴜᴘ - informações sobre o grupo.
╠ •⭕️ ${prefix}ɢᴄʟɪɴᴋ - link do grupo.
╠ •⭕️ ${prefix}ʙᴏᴛꜱᴡɪᴛᴄʜ - ativar/desativar o bot no grupo.
╠ •⭕️ ${prefix}ᴘʀᴏᴍᴏᴛᴇ - promover um usuário com @.
╠ •⭕️ ${prefix}ᴅᴇᴍᴏᴛᴇ - rebaixar um usuário com @.
╠ •⭕️ ${prefix}ɢʀᴏᴜᴘɪɴꜰᴏ - descrição do grupo.
╠ •⭕️ ${prefix}ɴꜱꜰᴡ - ativar/desativar NSFW.
╠ •⭕️ ${prefix}ʀᴇᴍᴏᴠᴇ - remover um usuário.
╠ •⭕️ ${prefix}ʀᴇᴠᴏᴋᴇ - revogar o link do grupo.
╠ •⭕️ ${prefix}ꜱᴇᴛɢᴄᴅᴇꜱᴄ - definir descrição do grupo.
╠ •⭕️ ${prefix}ꜱᴇᴛᴘᴘɢᴄ - definir imagem do grupo.
╠ •⭕️ ${prefix}ᴛᴀɢᴀʟʟ - marcar todos.
╠ •⭕️ ${prefix}ᴡᴇʟᴄᴏᴍᴇ - dar boas-vindas a um usuário.
╠ •
| • ━━━━━━━━━━━━━━

*✨ _Menu de Ajuda por:_ ${botName} ✨*

☞ _Proprietário:_ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎`;

      const buttons = [];

      const buttonMessage = {
        image: { url: botImage6 },
        caption: textHelpMenu,
        footer: `*${botName}*`,
        headerType: 4,
      };

      await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
    }
  },
};
