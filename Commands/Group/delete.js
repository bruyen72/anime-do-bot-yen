module.exports = {
  name: "delete",
  alias: ["del"],
  desc: "Excluir uma mensagem",
  category: "Group",
  usage: "Marque uma mensagem e digite *del*",
  react: "👹",

  start: async (Yaka, m, { isAdmin, isBotAdmin, pushName }) => {
    // precisa citar a mensagem
    if (!m.quoted)
      return Yaka.sendMessage(
        m.from,
        { text: "Por favor, marque a mensagem que deseja excluir!" },
        { quoted: m }
      );

    // bot e usuário precisam ser admins
    if (!isAdmin && !isBotAdmin)
      return Yaka.sendMessage(
        m.from,
        {
          text: `O bot e *${pushName}* precisam ser administradores para usar este comando!`,
        },
        { quoted: m }
      );

    // apaga
    const key = {
      remoteJid: m.from,
      fromMe: false,
      id: m.quoted.id,
      participant: m.quoted.sender,
    };

    await Yaka.sendMessage(m.from, { delete: key });
  },
};
