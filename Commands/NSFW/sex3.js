const axios = require("axios");

module.exports = {
  name: "sex3",
  alias: ["nsfwsex3"],
  desc: "Hentai picture of waifu sex", 
  category: "NSFW",
  usage: `sex3`,
  react: "👹",
  start: async (Yaka, m, { prefix,NSFWstatus }) => {

    // ✅ Verificação removida - Core.js controla automaticamentensfw*`);
    m.reply(mess.waiting)
    let buff= await axios.get(`https://fantox-apis.vercel.app/sex3`)
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
