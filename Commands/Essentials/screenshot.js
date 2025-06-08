const { getBuffer } = require("../../lib/myfunc");

module.exports = {
  name: "screenshot",
  alias: ["ss"],
  desc: "Tire um screenshot de um site sem precisar visitá-lo.",
  usage: "ss <link>",
  react: "📷",
  category: "Essentials",

  start: async (Yaka, m, { pushName, prefix, args, text }) => {
    if (!args[0])
      return m.reply(`Por favor, forneça um link para eu capturar!`);

    let lookupURL;
    if (!args[0].includes("http")) {
      lookupURL = `https://${args[0]}`;
    } else {
      lookupURL = args[0];
    }

    try {
      const resImage = await getBuffer(
        `https://api.popcat.xyz/screenshot?url=${lookupURL}`
      );

      await Yaka.sendMessage(
        m.from,
        {
          image: resImage,
          caption: `_Veja como este URL aparece:_\n${args[0]}`,
        },
        { quoted: m }
      );
    } catch (error) {
      m.reply(
        `Ocorreu um erro ao processar sua solicitação!\n\nVerifique o link e tente novamente.`
      );
    }
  },
};
