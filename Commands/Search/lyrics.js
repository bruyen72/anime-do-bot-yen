const { lyrics, lyricsv2 } = require("@bochilteam/scraper");
const fs = require('fs');
const path = require('path');

// Sistema de limitação de taxa
const rateLimits = {};

function checkRateLimit(key, cooldownMs = 10000) {
    const now = Date.now();
    const lastExecution = rateLimits[key] || 0;
    
    if (now - lastExecution < cooldownMs) {
        return false; // Ainda em cooldown
    }
    
    // Atualiza o timestamp da última execução
    rateLimits[key] = now;
    return true;
}

function getRemainingTime(key, cooldownMs = 10000) {
    const now = Date.now();
    const lastExecution = rateLimits[key] || 0;
    const remaining = (lastExecution + cooldownMs - now) / 1000;
    
    return remaining > 0 ? Math.ceil(remaining) : 0;
}

module.exports = {
  name: "lyrics",  // mantenha o nome original
  alias: ["letra", "letras"], // mantenha os aliases originais
  desc: "Pesquisa letras de músicas",
  category: "Search",
  usage: `lyrics <nome da música>`,
  react: "🎵",
  start: async (Yaka, m, { text, prefix, args }) => {
    if (!args[0]) return m.reply(`Por favor, forneça o nome de uma música para pesquisar!`);
    
    // Verificar rate limit (limitação por grupo/usuário)
    const userId = m.sender;
    const groupId = m.from;
    const rateLimitKey = `lyrics-${groupId}-${userId}`;
    
    // Verificar limitação de taxa (10 segundos entre solicitações)
    if (!checkRateLimit(rateLimitKey, 10000)) {
      const remainingTime = getRemainingTime(rateLimitKey, 10000);
      return m.reply(`⏳ Por favor, aguarde ${remainingTime} segundos antes de fazer outra pesquisa de letra.`);
    }
    
    // Mensagem de espera para o usuário
    await m.reply(`🔍 Procurando letra de "${args.join(" ")}", por favor aguarde...`);
    
    try {
      // Tente primeiro com lyrics v2
      const lyricsResult = await lyricsv2(args.join(" ")).catch(async () => {
        // Se falhar, tente com lyrics regular
        return await lyrics(args.join(" ")).catch((err) => {
          console.error("Erro ao buscar letra:", err);
          throw err; // Repassar erro para ser tratado no catch externo
        });
      });
      
      // Se conseguir obter resultados
      if (lyricsResult) {
        const { title, artist, lyrics: lyricText } = lyricsResult;
        
        // Formatar a resposta
        const response = `
📌 *Música:* ${title || "Não encontrado"}
👤 *Artista:* ${artist || "Não encontrado"}

📝 *LETRA:*
${lyricText || "Letra não encontrada"}

🔎 *Pesquisado por:* ${m.pushName}
        `;
        
        // Enviar resposta
        await m.reply(response);
      } else {
        await m.reply(`❌ Letra não encontrada para "${args.join(" ")}". Tente uma busca mais específica, incluindo o nome do artista.`);
      }
    } catch (error) {
      console.error("Erro completo:", error);
      
      // Verificar se é um erro de limitação de taxa (429)
      if (error.message && error.message.includes('429')) {
        await m.reply(`⚠️ Muitas solicitações foram feitas recentemente. Por favor, tente novamente em alguns minutos.`);
      } else {
        await m.reply(`❌ Ocorreu um erro ao buscar a letra: ${error.message || "Erro desconhecido"}\nTente novamente mais tarde.`);
      }
    }
  },
};