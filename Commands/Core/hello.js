module.exports = {
  name: "hi",
  alias: ["hello", "moshimoshi", "yoo", "konichiwa", "konnichiwa"],
  desc: "Diga olá ao bot.",
  react: "💜",
  category: "Core",

  start: async (
    Yaka,
    m,
    { prefix, pushName, args, commands, text, uptime }
  ) => {
    const pad = (s) => (s < 10 ? "0" : "") + s;

    const now = new Date();
    const hour = now.getHours();
    let greeting;

    if (hour >= 0 && hour < 12) greeting = "Ohayō";       // Bom-dia
    else if (hour >= 12 && hour < 18) greeting = "Konnichiwa"; // Boa-tarde
    else greeting = "Konbanwa";                            // Boa-noite

    /* ——— Informações de um comando específico ——— */
    if (args[0]) {
      let data = [];
      const name = args[0].toLowerCase();
      const cmd =
        commands.get(name) ||
        Array.from(commands.values()).find((v) => v.alias.includes(name));

      if (!cmd || cmd.type === "hide")
        return m.reply("Nenhum comando encontrado.");

      data.push(`👹Comando : ${cmd.name.replace(/^\w/, (c) => c.toUpperCase())}`);
      if (cmd.alias) data.push(`👾Atalhos : ${cmd.alias.join(", ")}`);
      if (cmd.cool) data.push(`⏱️Tempo de espera : ${cmd.cool}`);
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
          buttonText: { displayText: "Ajuda" },
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
    }

    /* ——— Saudação padrão ——— */
    let textHelpMenu = `| • ━━━━━━━━━━━━━━━━━━━━\n`;
    textHelpMenu += `| • ${greeting} ~ ${pushName}-kun ❤️‍🔥 !!\n`;
    textHelpMenu += `| • ━━━━━━━━━━━━━━━━━━━━\n`;
    textHelpMenu += `| • Eu sou o bot *${botName}*.\n`;
    textHelpMenu += `| • ━━━━━━━━━━━━━━━━━━━━\n`;
    textHelpMenu += `| • Digite ${prefix}help para ver a lista de comandos.\n`;
    textHelpMenu += `| • ━━━━━━━━━━━━━━━━━━━━\n`;

    await Yaka.sendMessage(
      m.from,
      {
        video: { url: "https://media.tenor.com/7J5qrMbAAAYAAAPo/zero-two-dance.mp4" },
        caption: textHelpMenu,
        gifPlayback: true,
      },
      { quoted: m }
    );
  },
};
