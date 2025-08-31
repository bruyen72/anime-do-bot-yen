const { hentai } = require('../../lib/scrapper2.js')

module.exports = {
  name: "hentaivideo",
  alias: ["hvideo"],
  desc: "Get a hetai video", 
  category: "NSFW",
  usage: `hvideo`,
  react: "👹",
  start: async (Yaka, m, {
    try {
 prefix,NSFWstatus }) => {

    // ✅ Verificação removida - Core.js controla automaticamentensfw*`);
    m.reply(mess.waiting)

    hvid = await hentai()
    res = hvid[Math.floor(Math.random(), hvid.length)]
    Yaka.sendMessage(m.from, { video: { url: res.video_1 }, caption: `\n*Title :* ${res.title}\n\n*Category :* ${res.category}\n\n*Media Url :* ${res.video_1}\n` }, { quoted: m })
  
    } catch (error) {
      console.error("Erro no comando NSFW:", error);
      m.reply("❌ Erro ao executar comando!");
    }
  }
}
