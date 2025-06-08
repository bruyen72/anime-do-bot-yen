require("../../config.js");
require("../../Core.js");

module.exports = {
  name: "demote",
  alias: ["dem"],
  desc: "Rebaixar um membro (remover status de admin)",
  category: "Group",
  usage: "demote @usuario",
  react: "👹",

  start: async (
    Yaka,
    m,
    { text, prefix, isBotAdmin, isAdmin, mentionByTag, pushName, groupAdmin }
  ) => {
    // o autor precisa ser admin
    if (!isAdmin) {
      return Yaka.sendMessage(m.from, { text: mess.useradmin }, { quoted: m });
    }

    // identificar o usuário mencionado
    let mentionedUser;
    if (!text && !m.quoted) {
      return Yaka.sendMessage(
        m.from,
        { text: "Por favor, marque um usuário para *rebaixar*!" },
        { quoted: m }
      );
    } else if (m.quoted) {
      mentionedUser = m.quoted.sender;
    } else {
      mentionedUser = mentionByTag[0];
    }

    const userId = mentionedUser || m.msg.contextInfo.participant;

    // conferir se o alvo é realmente admin
    if (!groupAdmin.includes(userId)) {
      return Yaka.sendMessage(
        m.from,
        {
          text: `@${
            mentionedUser.split("@")[0]
          } não é *Admin* neste grupo!`,
          mentions: [mentionedUser],
        },
        { quoted: m }
      );
    }

    // tenta rebaixar
    try {
      await Yaka.groupParticipantsUpdate(m.from, [userId], "demote");

      await Yaka.sendMessage(
        m.from,
        {
          text: `@${
            mentionedUser.split("@")[0]
          } foi *rebaixado* pelo administrador.`,
          mentions: [mentionedUser],
        },
        { quoted: m }
      );
    } catch (err) {
      // caso o bot não seja admin
      return Yaka.sendMessage(
        m.from,
        { text: mess.botadmin },
        { quoted: m }
      );
    }
  },
};
