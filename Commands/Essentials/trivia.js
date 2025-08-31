const axios = require("axios");

module.exports = {
  name: "trivia",
  alias: ["question"],
  desc: "Obter perguntas e respostas aleatórias",
  usage: "question easy/medium/hard",
  react: "🍁",
  category: "Essentials",

  start: async (Yaka, m, { pushName, prefix, args, text }) => {
    if (!args[0])
      return m.reply(
        `Por favor, use o comando assim: ${prefix}question easy/medium/hard`
      );

    const query = args.join(" ").toLowerCase(); // easy | medium | hard

    try {
      const { data } = await axios.get(
        `https://opentdb.com/api.php?amount=1&difficulty=${query}&type=multiple`
      );

      const q = data.results[0];

      const caption = `*『  Pergunta e Resposta 』*\n\n🎀  *Categoria:* ${q.category}\n❄  *Dificuldade:* ${q.difficulty}\n\n📒  *Pergunta:* ${q.question}\n\n🎋  *Resposta:* ${q.correct_answer}\n`;

      const buttonMessage = {
        image: { url: botImage3 },
        caption,
        footer: `*${botName}*`,
        headerType: 4,
      };

      await Yaka.sendMessage(m.from, buttonMessage, { quoted: m });
    } catch (err) {
      console.error(err);
      m.reply(
        `Ocorreu um erro ao buscar a pergunta. Tente novamente com: ${prefix}question easy/medium/hard`
      );
    }
  },
};
