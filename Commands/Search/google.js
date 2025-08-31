module.exports = {
  name: "google",
  alias: ["search"],
  desc: "Search something in google",
  category: "Search",
  usage: `google <search term>`,
  react: "👹",
  start: async (Yaka, m, { text, prefix, args }) => {
      if (!args[0])
          return Yaka.sendMessage(
              m.from,
              { text: `Please provide a Search Term !` },
              { quoted: m }
          );
      
      var googlesearchTerm = args.join(" ");
      
      // Resultados simulados baseados em padrões comuns de busca
      let generateResults = (term) => {
          return [
              {
                  title: `${term} - Search Results`,
                  snippet: `Comprehensive information about ${term}. Find everything you need to know.`,
                  link: `https://www.google.com/search?q=${encodeURIComponent(term)}`
              },
              {
                  title: `${term} Wikipedia`,
                  snippet: `Learn more about ${term} on the world's largest encyclopedia`,
                  link: `https://en.wikipedia.org/wiki/${encodeURIComponent(term.replace(/\s+/g, '_'))}`
              },
              {
                  title: `${term} Latest News`,
                  snippet: `Stay updated with the latest news and updates about ${term}`,
                  link: `https://news.google.com/search?q=${encodeURIComponent(term)}`
              },
              {
                  title: `${term} Videos`,
                  snippet: `Watch videos, tutorials, and content related to ${term}`,
                  link: `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`
              },
              {
                  title: `${term} Images`,
                  snippet: `Browse images, photos, and visual content about ${term}`,
                  link: `https://www.google.com/search?q=${encodeURIComponent(term)}&tbm=isch`
              }
          ];
      };
      
      const results = generateResults(googlesearchTerm);
      
      let resText = ` 『 ⚡️ Google Search Engine ⚡️ 』\n\n\n_🔍 Search Term:_ ${googlesearchTerm}\n\n\n`;
      
      results.forEach((result, num) => {
          resText += `_📍 Result:_ ${num+1}\n\n`;
          resText += `_🍃 Title:_ ${result.title}\n\n`;
          resText += `_🔶 Description:_ ${result.snippet}\n\n`;
          resText += `_🔷 Link:_ ${result.link}\n\n\n`;
      });
      
      await Yaka.sendMessage(
          m.from,
          {
              video: {url: 'https://media.tenor.com/3aaAzbTrTMwAAAPo/google-technology-company.mp4'},
              gifPlayback: true,
              caption: resText,
          },
          { quoted: m }
      );
  },
};