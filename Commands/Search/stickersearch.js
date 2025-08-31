// Commands/Search/stickersearch.js
module.exports = {
  name: "stickersearch",
  alias: ["g", "searchsticker"],
  desc: "To search any sticker",
  category: "Search",
  usage: `stickersearch <search term>`,
  react: "🔥",
  start: async (Yaka, m, { text, prefix, args, pushName }) => {
      if (!args[0])
          return Yaka.sendMessage(
              m.from,
              { text: `Please provide a Search Term !` },
              { quoted: m }
          );
      
      var gifSearchTerm = args.join(" ").toLowerCase();
      
      // Emojis baseados no termo de busca
      const emojis = {
          naruto: '🍥',
          sasuke: '⚡️',
          dragon: '🐉',
          anime: '👀',
          default: '🔥'
      };
      
      const searchEmoji = emojis[gifSearchTerm] || emojis.default;
      
      const response = `🔍 *Sticker Search*

Termo buscado: *${gifSearchTerm}*
Emoji relacionado: ${searchEmoji}

Para converter em sticker, envie uma imagem com o comando:
*${prefix}sticker* ou *${prefix}s*`;
      
      await Yaka.sendMessage(m.from, {
          text: response
      }, { quoted: m });
  },
};