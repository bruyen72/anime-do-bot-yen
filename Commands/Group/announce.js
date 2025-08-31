require("../../config.js");
require("../../Core.js");

module.exports = {
  name: "announce",
  alias: ["anounce", "announ"],
  desc: "Marcar todo o grupo sem usar @",
  category: "Group",
  usage: "announce <sua mensagem>",
  react: "👹",

  start: async (
    Yaka,
    m,
    { text, prefix, isAdmin, participants, args, buttonId }
  ) => {
    // mensagem padrão
    let message = "*『 Atenção 』*";

    if (m.quoted) {
      message = "*『 Atenção 』*";
    } else if (!text && m.quoted) {
      message = `${m.quoted ? m.quoted.msg : ""}`;
    }

    if (m.buttonId) {
      message = m.buttonId;
    } else if (args[0]) {
      message = args.join(" ");
    } else if (text === "") {
      message = "*『 Atenção 』*";
    }

    await Yaka.sendMessage(
      m.from,
      { text: message, mentions: participants.map((a) => a.id) },
      { quoted: m }
    );
  },
};
