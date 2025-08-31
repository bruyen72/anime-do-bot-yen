module.exports = {
  name: "admins",
  alias: ["tagadmins", "admin"],
  desc: "Marcar todos os administradores do grupo.",
  category: "Grupo",
  usage: "admins <sua mensagem>",
  react: "👹",
  start: async (
    Yaka,
    m,
    { text, prefix, isAdmin, participants, args, groupAdmin }
  ) => {

    let message = "       『 *Atenção Administradores* 』";

    if (m.quoted) {
      message = "       『 *Atenção Administradores* 』";
    } else if (!text && m.quoted) {
      message = `${m.quoted ? m.quoted.msg : ""}`;
    } else if (args[0]) {
      message = `       『 *Atenção Administradores* 』\n\n_🍃 Mensagem:_ *${args.join(" ")}*`;
    } else if (text === "") {
      message = "       『 *Atenção Administradores* 』";
    } else {
      message = "       『 *Atenção Administradores* 』";
    }

    Yaka.sendMessage(
      m.from,
      { text: message, mentions: groupAdmin },
      { quoted: m }
    );
  },
};
