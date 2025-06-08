module.exports = {
  name: "gimage",
  alias: ["imagesearch", "googleimage", "googleimagesearch", "gig", "gis", "animewp"],
  desc: "Busca wallpapers de Blue Lock",
  category: "Search",
  usage: `gig <termo de busca>`,
  react: "👹",
  start: async (Yaka, m, { text, prefix, args, botName }) => {
    // Informa ao usuário que a busca está em andamento
    await Yaka.sendMessage(
      m.from,
      { text: `🔍 Buscando wallpapers de anime... Aguarde um momento.` },
      { quoted: m }
    );
    
    try {
      // URL base do pic.re
      const imageUrl = "https://pic.re/image";
      
      // Formata a legenda
      const caption = `『 Wallpaper de Anime 』\n\n🎭\n🔍 *Fonte:* pic.re\n\n✨ Use ${prefix}gimage para ver mais wallpapers!`;
      
      // Envia o wallpaper
      await Yaka.sendMessage(
        m.from,
        {
          image: { url: imageUrl },
          caption: caption,
        },
        { quoted: m }
      ).catch(async (err) => {
        console.error("Erro ao enviar wallpaper:", err);
        
        // Se falhar, tenta com um URL alternativo
        try {
          // URL alternativa mais estável
          const backupUrl = "https://staticg.sportskeeda.com/editor/2022/12/e8dcd-16714057796980-1920.jpg";
          
          await Yaka.sendMessage(
            m.from,
            {
              image: { url: backupUrl },
              caption: caption,
            },
            { quoted: m }
          );
        } catch (finalErr) {
          console.error("Erro final:", finalErr);
          await Yaka.sendMessage(
            m.from,
            { text: `❌ Não foi possível enviar wallpapers. Tente novamente mais tarde.` },
            { quoted: m }
          );
        }
      });
    } catch (error) {
      console.error("Erro na busca de wallpapers:", error);
      await Yaka.sendMessage(
        m.from,
        { text: `❌ Erro ao buscar wallpapers. Tente novamente mais tarde.` },
        { quoted: m }
      );
    }
  },
};