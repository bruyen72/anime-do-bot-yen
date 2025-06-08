const axios = require("axios");

module.exports = {
  name: "behappy",
  alias: ["animehappy"], 
  desc: "make happy someone",
  category: "Reaction",
  usage: `behappy para si mesmo\nbehappy @user para outra pessoa\nbehappy (respondendo mensagem)`,
  react: "😊",
  start: async (Yaka, m, { text, mentionByTag, messageText, fullText }) => {
    try {
      // Debug completo para entender o que está sendo recebido
      console.log("\n=== DEBUG BEHAPPY ===");
      console.log("Text (args):", text);
      console.log("Message text:", messageText);
      console.log("Full text:", fullText);
      console.log("mentionByTag:", mentionByTag);
      console.log("m.quoted:", !!m.quoted);
      console.log("m.text:", m.text);
      console.log("m.body:", m.body);
      console.log("===================\n");

      // Buscar GIF da API
      const { data } = await axios.get('https://api.waifu.pics/sfw/happy');
      
      if (!data.url) {
        console.log("Erro: API não retornou URL válida");
        return m.reply("❌ Erro ao buscar o GIF. Tente novamente.");
      }
      
      const user1 = m.sender;
      let user2;
      
      // Prioridade na captura de menções:
      // 1. mentionByTag (já processado pelo Core.js)
      // 2. m.quoted (resposta a mensagem)
      // 3. Extração do texto (fullback)
      
      if (Array.isArray(mentionByTag) && mentionByTag.length > 0) {
        user2 = mentionByTag[0];
        console.log("Usando primeira menção de mentionByTag:", user2);
      } 
      else if (m.quoted && m.quoted.sender) {
        user2 = m.quoted.sender;
        console.log("Usando mensagem citada");
      } 
      else {
        // Tenta extrair do texto usando múltiplos métodos
        const texts = [fullText, messageText, text, m.text, m.body].filter(Boolean);
        
        for (const txt of texts) {
          const mentionMatch = txt.match(/@(\d+)/);
          if (mentionMatch) {
            user2 = mentionMatch[1] + '@s.whatsapp.net';
            console.log("Número extraído do texto:", mentionMatch[1]);
            break;
          }
        }
      }
      
      console.log("User1 (remetente):", user1);
      console.log("User2 (destinatário):", user2 || "nenhum");
      
      // Preparar mensagem
      const caption = user2 
        ? `@${user1.split('@')[0]} está feliz com @${user2.split('@')[0]}` 
        : `@${user1.split('@')[0]} está feliz consigo mesmo(a)`;
      
      const mentions = user2 ? [user1, user2] : [user1];
      
      console.log("Caption:", caption);
      console.log("Mentions:", mentions);
      
      // Enviar GIF
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
      
      console.log("Gif enviado com sucesso!\n");
      
    } catch (error) {
      console.error("ERRO no comando behappy:", error);
      console.error("Stack trace:", error.stack);
      // Enviar feedback mínimo ao usuário
      m.reply("⚠️ Ocorreu um erro. Tente novamente.");
    }
  }
};