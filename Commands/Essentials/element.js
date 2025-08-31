const pTable = require("ptable");
const npt   = require("node-periodic-table");

module.exports = {
  name: "element",
  alias: ["elementinfo"],
  desc: "Obter informações de um elemento da tabela periódica",
  usage: "element br",
  react: "👹",
  category: "Essentials",

  start: async (Yaka, m, { pushName, prefix, args, text }) => {
    if (!args[0])
      return m.reply(`Use o comando assim: ${prefix}element br`);

    const query  = args.join(" ");
    const search = await pTable(query);

    if (search === undefined)
      return m.reply(
        `Elemento inválido. Consulte a lista aqui:\nhttps://pt.wikipedia.org/wiki/Tabela_peri%C3%B3dica`
      );

    const response = await npt.getByNumber(search.number);

    let caption  = "";
    caption += "              *『  Detalhes do Elemento 』*\n\n";
    caption += `🔴 *Elemento:* ${response.name}\n`;
    caption += `⬜ *Número Atômico:* ${response.number}\n`;
    caption += `🟡 *Massa Atômica:* ${response.atomic_mass}\n`;
    caption += `⬛ *Símbolo:* ${response.symbol}\n`;
    caption += `❓ *Aparência:* ${response.apearance}\n`;
    caption += `🟢 *Fase:* ${response.phase}\n`;
    caption += `♨️ *Ponto de Ebulição:* ${response.boil} K\n`;
    caption += `💧 *Ponto de Fusão:* ${response.melt} K\n`;
    caption += `🟣 *Densidade:* ${response.density} g/mL\n`;
    caption += `⚫ *Camadas Eletrônicas:* ${response.shells.join(", ")}\n`;
    caption += `🌐 *URL:* ${response.source}\n\n`;
    caption += `💬 *Resumo:* ${response.summary}\n`;

    await Yaka.sendMessage(
      m.from,
      { image: { url: botImage1 }, caption },
      { quoted: m }
    );
  },
};
