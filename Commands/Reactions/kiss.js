const axios = require("axios");
module.exports = {
  name: "kiss",
  alias: ["animekiss"],
  desc: "To kiss someone",
  category: "Reaction",
  usage: `kiss para si mesmo\nkiss @user para outra pessoa\nkiss @user1 @user2 para dois usuários\nkiss (respondendo mensagem)`,
  react: "😘",
  start: async (Yaka, m, { text, mentionByTag, messageText, fullText }) => {
    try {
      // Debug para entender as entradas
      console.log("\n=== DEBUG KISS ===");
      console.log("mentionByTag:", mentionByTag);
      console.log("m.quoted:", !!m.quoted);
      console.log("messageText:", messageText);
      console.log("=================\n");
      
      // Buscar GIF da API
      const { data } = await axios.get('https://api.waifu.pics/sfw/kiss');
      if (!data.url) {
        console.log("Erro: API não retornou URL válida");
        return m.reply("❌ Erro ao buscar o GIF. Tente novamente.");
      }
      
      const user1 = m.sender;
      let user2;
      let user3;
      
      // Captura de usuário alvo com prioridades
      if (Array.isArray(mentionByTag) && mentionByTag.length > 0) {
        user2 = mentionByTag[0];
        // Adicionado: Verifica se há dois usuários mencionados
        if (mentionByTag.length > 1) {
          user3 = mentionByTag[1];
        }
      }
      else if (m.quoted && m.quoted.sender) {
        user2 = m.quoted.sender;
      }
      else {
        // Tenta extrair do texto
        const texts = [fullText, messageText, text].filter(Boolean);
        for (const txt of texts) {
          const mentionMatches = txt.match(/@(\d+)/g);
          if (mentionMatches && mentionMatches.length > 0) {
            user2 = mentionMatches[0].replace('@', '') + '@s.whatsapp.net';
            // Adicionado: Verifica segunda menção
            if (mentionMatches.length > 1) {
              user3 = mentionMatches[1].replace('@', '') + '@s.whatsapp.net';
            }
            break;
          }
        }
      }
      
      console.log("User1:", user1);
      console.log("User2:", user2 || "nenhum");
      console.log("User3:", user3 || "nenhum");
      
      // Preparar mensagem
      let caption;
      let mentions;
      
      // Adicionado: Caso com dois usuários mencionados
      if (user2 && user3) {
        caption = `@${user2.split('@')[0]} e @${user3.split('@')[0]} estão se beijando`;
        mentions = [user2, user3];
      } else if (user2) {
        caption = `@${user1.split('@')[0]} está beijando @${user2.split('@')[0]}`;
        mentions = [user1, user2];
      } else {
        caption = `@${user1.split('@')[0]} está se beijando`;
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
      
      console.log("Kiss GIF enviado com sucesso!\n");
    } catch (error) {
      console.error("ERRO no comando kiss:", error);
      console.error("Stack trace:", error.stack);
      m.reply("⚠️ Ocorreu um erro ao enviar o GIF.");
    }
  }
};