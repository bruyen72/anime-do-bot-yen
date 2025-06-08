const axios = require("axios");

module.exports = {
  name: "cum",
  alias: ["nsfwcum"],
  desc: "Hentai picture of cumming waifu", 
  category: "NSFW",
  usage: `cum`,
  react: "👹",
  start: async (Yaka, m, { prefix,NSFWstatus }) => {

    // ✅ Verificação removida - Core.js controla automaticamentensfw*`);
    m.reply(mess.waiting)
    let buff= await axios.get(`https://fantox-apis.vercel.app/cum`)
    let imgURL = buff.data.url
    

    let Button = [];
    
    let bmffg = {
      image: {url: imgURL},
      caption: `\n* Here What you are looking for 👀..*\n`,
      footer: `*${botName}*`,
      buttons: Button,
      headerType: 4,
    };
    
    await Yaka.sendMessage(m.from, bmffg, { quoted: m }).catch((err) => {
      return "Error!";
    });
  },
};
