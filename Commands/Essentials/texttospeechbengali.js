const ttt = require("google-tts-api");

module.exports = {
  name: "saybengali",
  alias: [
    "speakbengali",
    "saybengali",
    "sayinbengali",
    "saybangla",
    "speakbangla",
    "sayinbangla",
  ],
  desc: "Fazer o bot falar algo em bengali (TTS).",
  usage: "saybengali <texto>",
  react: "🔊",
  category: "Essentials",

  start: async (Yaka, m, { pushName, prefix, args, text, mime }) => {
    let message;

    if (!text && m.quoted) {
      message = `${m.quoted ? m.quoted.msg : ""}`;
    } else if (args[0]) {
      message = args.join(" ");
    } else {
      message = `Por favor, forneça um texto para eu falar em bengali, ${pushName}!`;
    }

    const ttsUrl = ttt.getAudioUrl(message, {
      lang: "bn",
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
