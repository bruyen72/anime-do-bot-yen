const axios = require("axios");

module.exports = {
  name: "bully",
  alias: ["animebully"],
  desc: "To bully for user",
  category: "Reaction",
  usage: `bully para si mesmo\nbully @user para outra pessoa\nbully (respondendo mensagem)`,
  react: "😣",
  start: async (Yaka, m, { text, mentionByTag, messageText, fullText }) => {
    try {
      // Debug para entender as entradas
      console.log("\n=== DEBUG BULLY ===");
      console.log("mentionByTag:", mentionByTag);
      console.log("m.quoted:", !!m.quoted);
      console.log("messageText:", messageText);
      console.log("=================\n");

      // Buscar GIF da API
      const { data } = await axios.get('https://api.waifu.pics/sfw/bully');
      
      if (!data.url) {
        console.log("Erro: API não retornou URL válida");
        return m.reply("❌ Erro ao buscar o GIF. Tente novamente.");
      }
      
      const user1 = m.sender;
      let user2;
      
      // Captura de usuário alvo com prioridades
      if (Array.isArray(mentionByTag) && mentionByTag.length > 0) {
        user2 = mentionByTag[0];
      } 
      else if (m.quoted && m.quoted.sender) {
        user2 = m.quoted.sender;
      } 
      else {
        // Tenta extrair do texto
        const texts = [fullText, messageText, text].filter(Boolean);
        
        for (const txt of texts) {
          const mentionMatch = txt.match(/@(\d+)/);
          if (mentionMatch) {
            user2 = mentionMatch[1] + '@s.whatsapp.net';
            break;
          }
        }
      }
      
      console.log("User1:", user1);
      console.log("User2:", user2 || "nenhum");
      
      // Preparar mensagem
      let caption;
      let mentions;
      
      if (user2) {
        caption = `@${user1.split('@')[0]} está importunando @${user2.split('@')[0]}`;
        mentions = [user1, user2];
      } else {
        caption = `@${user1.split('@')[0]} está se importunando`;
        mentions = [user1];
      }
      
      console.log("Caption:", caption);
      
      // Enviar GIF diretamente pela URL
      await Yaka.sendMessage(
        m.from,
        {
          image: { url: data.url },
          caption: caption,
          mentions: mentions,
          gifPlayback: true
        },
        { quoted: m }
      );
      
      console.log("Bully GIF enviado com sucesso!\n");
      
    } catch (error) {
      console.error("ERRO no comando bully:", error);
      console.error("Stack trace:", error.stack);
      m.reply("⚠️ Ocorreu um erro ao enviar o GIF.");
    }
  }
};