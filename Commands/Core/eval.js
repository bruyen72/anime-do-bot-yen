require("../../config.js");

module.exports = {
  name: "eval",
  alias: ["evaluate"],
  usage: `${prefa}eval <código>`,
  react: "👾",
  desc: "Avalia código JavaScript",
  category: "Mods",

  start: async (
    Yaka,
    m,
    { text, ban, pushName, mentionByTag, isCreator, args, body, quoted, mime }
  ) => {
    if (!isCreator)
      return Yaka.sendMessage(
        m.from,
        { text: "*Apenas moderadores podem usar este comando.*" },
        { quoted: m }
      );

    try {
      const result = eval(text);
      const out = JSON.stringify(result, null, "\t") || "JavaScript avaliado";
      return m.reply(out);
    } catch (error) {
      return m.reply(error.message);
    }
  },
};
