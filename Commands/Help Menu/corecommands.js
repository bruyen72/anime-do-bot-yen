const axios = require("axios");

module.exports = {
  name: "core",
  alias: ["core", "corecommands", "corec"],
  desc: "Exibe lista de comandos principais",
  react: "⭕",
  category: "Menu de Ajuda",
  start: async (Yaka, m, { prefix, pushName, args, commands, text }) => {
    try {
      // ────── Função para testar URLs de imagem ──────
      const testImageUrl = async (urls) => {
        if (!Array.isArray(urls)) urls = [urls];

        for (let url of urls) {
          try {
            const response = await axios.head(url, {
              timeout: 5000,
              validateStatus: (status) => status === 200,
            });
            return url; // URL válida encontrada
          } catch (err) {
            console.log(`URL inválida: ${url}`);
          }
        }
        return null;
      };

      /* ────── Detalhes de um comando específico ────── */
      if (args[0]) {
        let data = [];
        const name = args[0].toLowerCase();
        const cmd =
          commands.get(name) ||
          Array.from(commands.values()).find((v) => v.alias.includes(name));

        if (!cmd || cmd.type === "hide")
          return m.reply("Nenhum comando encontrado.");

        data.push(
          `👹Comando : ${cmd.name.replace(/^\w/, (c) => c.toUpperCase())}`
        );
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

      /* ────── Menu principal ────── */
      let textHelpMenu = `Olá, eu sou o *${botName}* Bot.

Aqui está a lista de comandos *Core*:\n
| • ━━━━━━━━━━━━━━
╠ •
╠ •🎐 ${prefix}ʜɪ            – dê um “oi” ao bot.
╠ •🎐 ${prefix}ɪɴꜰᴏ          – relatório de informações do bot.
╠ •🎐 ${prefix}ʜᴇʟᴘ          – lista de comandos.
╠ •🎐 ${prefix}ᴄᴏᴜᴨʟᴇᴘᴘ      – foto de casal (ele & ela).
╠ •🎐 ${prefix}ᴏᴡɴᴇʀ        – proprietário(s) do bot.
╠ •🎐 ${prefix}ꜱᴄʀɪᴘᴛ        – obter o script do bot.
╠ •🎐 ${prefix}ꜱᴛᴀʟᴋ         – stalkeia um número do WhatsApp.
╠ •🎐 ${prefix}ʀᴀɴᴋ          – veja seu rank.
╠ •
| • ━━━━━━━━━━━━━━

*✨ _Menu de Ajuda por:_ ${botName} ✨*

☞ _Proprietário:_ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎`;

      // URLs de imagem (principal + backups)
      const imageUrls = [
        botImage2, // principal
        botImage1, // backup 1
        "https://graph.org/file/9117a82d3253658682ae3.jpg", // backup 2
      ];

      const validImageUrl = await testImageUrl(imageUrls);

      const buttonMessage = {
        ...(validImageUrl ? { image: { url: validImageUrl } } : {}),
        caption: textHelpMenu,
        footer: `*${botName}*`,
        headerType: validImageUrl ? 4 : 1,
      };

      await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
    } catch (error) {
      console.error("Erro no comando core:", error);

      // Mensagem de erro amigável
      try {
        await Yaka.sendMessage(
          m.from,
          {
            text: "Desculpe, ocorreu um erro ao processar o comando. Verifique sua conexão.",
            footer: `*${botName}*`,
          },
          { quoted: m }
        );
      } catch (sendErr) {
        console.error("Erro ao enviar mensagem de erro:", sendErr);
      }
    }
  },
};
