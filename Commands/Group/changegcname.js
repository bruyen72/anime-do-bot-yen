const fs   = require("fs");
const Jimp = require("jimp");
require("../../Core.js");

module.exports = {
  name: "setgcname",
  alias: ["setnamegc", "changegcname", "setgroupname", "changegroupname"],
  desc: "Alterar o nome do grupo",
  category: "Group",
  usage: "setgcname <novo nome>",
  react: "👹",

  start: async (
    Yaka,
    m,
    { text, prefix, isBotAdmin, isAdmin, pushName, metadata, args, mime }
  ) => {
    // Bot e usuário precisam ser admins
    if (!isAdmin && !isBotAdmin)
      return Yaka.sendMessage(
        m.from,
        { text: `*${pushName}* e o *bot* precisam ser administradores para usar este comando!` },
        { quoted: m }
      );

    if (!args[0])
      return Yaka.sendMessage(
        m.from,
        { text: "Por favor, informe o novo nome do grupo." },
        { quoted: m }
      );

    const novoNome = args.join(" ");
    const nomeAntigo = metadata.subject;

    // foto do grupo (fallback caso não haja)
    let ppgc;
    try {
      ppgc = await Yaka.profilePictureUrl(m.from, "image");
    } catch {
      ppgc = "https://wallpapercave.com/wp/wp10524580.jpg";
    }

    try {
      await Yaka.groupUpdateSubject(m.from, novoNome);

      await Yaka.sendMessage(
        m.from,
        {
          image: { url: ppgc, mimetype: "image/jpeg" },
          caption:
            `*『 Nome do Grupo Alterado 』*\n\n` +
            `🔶 *Nome antigo:*\n${nomeAntigo}\n\n` +
            `🔷 *Nome novo:*\n${novoNome}`,
        },
        { quoted: m }
      );
    } catch (err) {
      console.error(err);
      m.reply("Ocorreu um erro ao alterar o nome do grupo.");
    }
  },
};
