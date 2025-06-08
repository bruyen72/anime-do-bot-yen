const ttt = require("google-tts-api");

module.exports = {
  name: "sayjapanese",
  alias: ["speakjapanese", "sayjapanese", "sayinjapanese", "sayja"],
  desc: "Fazer o bot falar algo em japonês (TTS).",
  usage: "sayjapanese <texto>",
  react: "🔊",
  category: "Essentials",

  start: async (Yaka, m, { pushName, prefix, args, text, mime }) => {
    let message;

    if (!text && m.quoted) {
      message = `${m.quoted ? m.quoted.msg : ""}`;
    } else if (args[0]) {
      message = args.join(" ");
    } else {
      message = `Por favor, forneça um texto para eu falar, ${pushName}!`;
    }

    const ttsUrl = ttt.getAudioUrl(message, {
      lang: "ja",
      slow: false,
      host: "https://translate.google.com",
    });

    try {
      await Yaka.sendMessage(
        m.from,
        { audio: { url: ttsUrl }, mimetype: "audio/mpeg" },
        { quoted: m }
      );
    } catch (e) {
      m.reply("Ocorreu um erro ao gerar o áudio.");
    }
  },
};
