module.exports = {
  name: "economycommands",
  alias: ["economyc", "economycommands", "economy"],
  desc: "Exibe lista de comandos de economia",
  react: "⭕",
  category: "Menu de Ajuda",
  start: async (Yaka, m, { prefix, pushName, args, commands, text }) => {

    /* ▸ DETALHES DE UM COMANDO ESPECÍFICO ------------------------- */
    if (args[0]) {
      let data = [];
      const name = args[0].toLowerCase();
      const cmd =
        commands.get(name) ||
        Array.from(commands.values()).find((v) => v.alias.includes(name));

      if (!cmd || cmd.type === "hide")
        return m.reply("Nenhum comando encontrado");

      data.push(`👹Comando : ${cmd.name.replace(/^\w/, (c) => c.toUpperCase())}`);
      if (cmd.alias) data.push(`👾Atalhos  : ${cmd.alias.join(", ")}`);
      if (cmd.cool)  data.push(`⏱️Tempo de espera : ${cmd.cool}`);
      if (cmd.desc)  data.push(`🧾Descrição : ${cmd.desc}`);
      if (cmd.usage)
        data.push(
          `⭕Exemplo : ${cmd.usage
            .replace(/%prefix/gi, prefix)
            .replace(/%command/gi, cmd.name)
            .replace(/%text/gi, text)}`
        );

      const buttonss = [
        { buttonId: `${prefix}help`, buttonText: { displayText: "Ajuda" }, type: 1 },
      ];
      const buth = {
        text: `ℹ️Informações do Comando\n\n${data.join("\n")}`,
        footer: `${botName}`,
        buttons: buttonss,
        headerType: 1,
      };
      return Yaka.sendMessage(m.from, buth, { quoted: m });
    }

    /* ▸ MENU COMPLETO --------------------------------------------- */
    let textHelpMenu = `Olá, eu sou o *${botName}* Bot.

Aqui está a lista de comandos de *Economia*:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •🔖 ${prefix}ʙᴀɴᴋ         – Banco YAKA: saldo geral.
╠ •🔖 ${prefix}ᴄᴀᴘᴀᴄɪᴛʏ     – ver limite da conta.
╠ •🔖 ${prefix}ᴅᴀɪʟʏ        – coletar \$500 diários.
╠ •🔖 ${prefix}ᴅᴇᴘᴏꜱɪᴛ      – depositar no banco.
╠ •🔖 ${prefix}ɢᴀᴍʙʟᴇ       – apostar (sex–dom).
╠ •🔖 ${prefix}ʟʙ           – top 10 usuários mais ricos.
╠ •🔖 ${prefix}ʀᴏʙ          – roubar outro usuário.
╠ •🔖 ${prefix}ꜱʟᴏᴛ         – máquina caça-níquel.
╠ •🔖 ${prefix}ᴛʀᴀɴꜱꜰᴇʀ     – transferir dinheiro a alguém.
╠ •🔖 ${prefix}ᴡᴀʟʟᴇᴛ      – ver sua carteira.
╠ •🔖 ${prefix}ᴡɪᴛʜᴅʀᴀᴡ    – sacar do banco.
╠ •
| • ━━━━━━━━━━━━━━

*✨ _Menu de Ajuda por:_ ${botName} ✨*

☞ _Proprietário:_ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎`;

    const buttons = [];

    const buttonMessage = {
      image: { url: botImage3 },
      caption: textHelpMenu,
      footer: `*${botName}*`,
      headerType: 4,
    };

    await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
  },
};
