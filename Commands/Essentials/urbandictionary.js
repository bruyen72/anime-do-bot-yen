const axios = require("axios");

module.exports = {
  name: "urbandictionary",
  alias: ["udictionary"],
  desc: "Pesquisar um termo no Urban Dictionary",
  usage: "udictionary <texto>",
  react: "📚",
  category: "Essentials",

  start: async (Yaka, m, { pushName, prefix, args, text }) => {
    if (!args[0])
      return m.reply(
        "Por favor, forneça um termo para pesquisar no Urban Dictionary!"
      );

    const query = args.join(" ");

    try {
      const res = await axios.get(
        `https://api.urbandictionary.com/v0/define?term=${query}`
      );

      const entry = res.data.list[0];
      if (!entry)
        return m.reply("Nenhuma definição encontrada para esse termo.");

      const caption = `         *『  Urban Dictionary 』*\n\n📚 *Termo pesquisado:* ${query}\n\n📖 *Definição:* ${entry.definition
        .replace(/\[/g, "")
        .replace(/\]/g, "")}\n\n💬 *Exemplo:* ${entry.example
        .replace(/\[/g, "")
        .replace(/\]/g, "")}`;

      await Yaka.sendMessage(
        m.from,
        { image: { url: botImage1 }, caption },
        { quoted: m }
      );
    } catch (err) {
      console.error(err);
      m.reply("Ocorreu um erro ao buscar a definição. Tente novamente.");
    }
  },
};
