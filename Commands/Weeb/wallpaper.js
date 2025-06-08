const axios = require("axios");

module.exports = {
  name: "wallpaper",
  alias: ["animewallpaper", "aw", "wall"],
  desc: "Busca wallpapers de anime via Wallhaven",
  category: "Weeb",
  usage: "wallpaper <termo>#<quantidade>",
  react: "🖼️",

  start: async (Yaka, m, { args, prefix }) => {
    if (!args[0]) {
      return Yaka.sendMessage(m.from, {
        text: `❗ Use assim: ${prefix}wallpaper naruto#3`,
      }, { quoted: m });
    }

    const input = args.join(" ");
    const split = input.split("#");
    const query = split[0].trim();
    const count = Math.min(parseInt(split[1]) || 1, 5);

    await Yaka.sendMessage(m.from, {
      text: `🔍 Buscando *${count}* wallpaper(s) para: *${query}*`,
    }, { quoted: m });

    try {
      const res = await axios.get(`https://wallhaven.cc/api/v1/search`, {
        params: {
          q: query,
          categories: "010",  // apenas anime
          purity: "100",      // apenas SFW
          sorting: "random",
          page: 1,
        }
      });

      const wallpapers = res.data?.data;

      if (!wallpapers || wallpapers.length === 0) {
        return Yaka.sendMessage(m.from, {
          text: `❌ Nenhum wallpaper encontrado para: *${query}*`,
        }, { quoted: m });
      }

      const limited = wallpapers.slice(0, count);

      for (let i = 0; i < limited.length; i++) {
        const img = limited[i].path;

        await Yaka.sendMessage(m.from, {
          image: { url: img },
          caption: `🖼️ *${query}* - Resultado ${i + 1} de ${limited.length}`,
        }, { quoted: m });

        if (i < limited.length - 1) {
          await new Promise(res => setTimeout(res, 1000));
        }
      }

    } catch (err) {
      console.error("❌ Erro ao buscar na Wallhaven API:", err.message);
      return Yaka.sendMessage(m.from, {
        text: `❌ Ocorreu um erro ao buscar wallpapers. Tente novamente mais tarde.`,
      }, { quoted: m });
    }
  }
};
