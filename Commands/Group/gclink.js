require("../../config.js");
require("../../Core.js");

module.exports = {
  name: "grouplink",
  alias: ["gclink"],
  desc: "Obter o link atual do grupo",
  category: "Group",
  usage: "gclink",
  react: "👹",

  start: async (
    Yaka,
    m,
    { prefix, isBotAdmin, isAdmin, metadata, mime }
  ) => {
    // o usuário precisa ser admin
    if (!isAdmin)
      return Yaka.sendMessage(m.from, { text: mess.useradmin }, { quoted: m });

    // captura o código de convite
    let link;
    try {
      link = await Yaka.groupInviteCode(m.from);
    } catch {
      return Yaka.sendMessage(
        m.from,
        { text: mess.botadmin },      // caso o bot não seja admin
        { quoted: m }
      );
    }

    const linkCode = `https://chat.whatsapp.com/${link}`;

    // foto do grupo (fallback)
    let ppgc;
    try {
      ppgc = await Yaka.profilePictureUrl(m.from, "image");
    } catch {
      ppgc = botImage1;
    }

    // envia o link
    await Yaka.sendMessage(
      m.from,
      {
        image: { url: ppgc, mimetype: "image/jpeg" },
        caption:
          `🍃 *Nome do grupo:* ${metadata.subject}\n\n` +
          `🔷 *Link do grupo:*\n${linkCode}`,
      },
      { quoted: m }
    );
  },
};
