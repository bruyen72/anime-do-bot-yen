const { mku } = require("../../Database/dataschema.js");

module.exports = {
  name: "owner",
  desc: "Ver a lista de Mods atuais",
  alias: ["modlist", "mods", "mod"],
  category: "Core",
  usage: "owner",
  react: "🏅",

  start: async (Yaka, m, { text, prefix }) => {
    try {
      const modlist = await mku.find({ addedMods: "true" });
      const ownerList = global.owner;

      let mention = modlist.map((mod) => mod.id);
      let xy = modlist.map((mod) => mod.id);
      let yz = ownerList.map((owner) => owner + "@s.whatsapp.net");
      let xyz = xy.concat(yz);

      let textM = `    🧣  *Mods do ${botName}*  🧣\n\n`;

      if (ownerList.length === 0 && modlist.length === 0) {
        textM = "*Nenhum mod adicionado!*";
      } else {
        // Proprietários
        ownerList.forEach((own) => {
          textM += `\n〽️ @${own}\n`;
        });

        // Mods
        modlist.forEach((mod) => {
          textM += `\n🎀 @${mod.id.split("@")[0]}\n`;
        });

        textM += `\n\n📛 *Não faça spam para evitar bloqueio!*`;
        textM += `\n🎀 Para ajuda, digite *${prefix}support* e peça no grupo.`;
        textM += `\n\n*💫 Obrigado por usar ${botName}. 💫*\n`;
      }

      await Yaka.sendMessage(
        m.from,
        {
          video: { url: botVideo },
          gifPlayback: true,
          caption: textM,
          mentions: xyz,
        },
        { quoted: m }
      );
    } catch (err) {
      console.error(err);
      return Yaka.sendMessage(
        m.from,
        { text: "Ocorreu um erro interno ao buscar a lista de mods." },
        { quoted: m }
      );
    }
  },
};
