module.exports = {
  name: "tiktokvideo",
  alias: ["tiktokmp4", "tt", "tiktok", "tk"],
  desc: "Para baixar um vídeo do TikTok",
  category: "Media",
  usage: `tiktokvideo <link>`,
  react: "🎬",
  start: async (Yaka, m, { args, botName }) => {
    // Verificar se um link foi fornecido
    if (!args[0]) {
      return Yaka.sendMessage(
        m.from,
        { text: `Por favor, forneça um link de vídeo do TikTok!` },
        { quoted: m }
      );
    }
    
    // Importar axios
    const axios = require('axios');
    
    // Função para limpar URL do TikTok
    function cleanTikTokUrl(url) {
      try {
        // Remove parâmetros da URL (como is_from_webapp, etc)
        if (url.includes('?')) {
          url = url.split('?')[0];
        }
        
        // Lidar com URLs curtas
        if (url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com')) {
          return url;
        }
        
        // URLs normais
        const parsedUrl = new URL(url);
        return `${parsedUrl.origin}${parsedUrl.pathname}`;
      } catch {
        return null;
      }
    }
    
    const cleanedUrl = cleanTikTokUrl(args[0]);
    if (!cleanedUrl) {
      return m.reply("Por favor, forneça um link válido do TikTok!");
    }
    
    // Verificar se a URL é do TikTok
    const tiktokUrlPattern = /^https?:\/\/(www\.|vt\.|vm\.)?tiktok\.com\/.+$/;
    if (!tiktokUrlPattern.test(cleanedUrl)) {
      return m.reply("Por favor, forneça um link válido do TikTok!");
    }
    
    // Mensagem de processamento
    const processingMsg = await m.reply("⏳ Baixando vídeo...");
    
    // Lista de APIs para tentar, começando com a que funcionou (TikWM)
    const methods = [
      tryTikwm,  // Prioridade para este método que funcionou
      trySnaptik,
      tryTikmateNew,
      trySsstikNew,
      tryTikdown
    ];

    // Flag para rastrear se algum método teve sucesso
    let success = false;
    
    // Tentar cada API em sequência até que uma funcione
    for (const method of methods) {
      try {
        success = await method(cleanedUrl);
        if (success) break; // Se um método funcionou, sai do loop
      } catch (error) {
        console.log(`[TikTok] Método falhou: ${error.message || error}`);
        // Continua para o próximo método
      }
    }
    
    // Se nenhum método funcionou, informa ao usuário
    if (!success) {
      await Yaka.sendMessage(
        m.from,
        { text: "❌ Não foi possível baixar o vídeo do TikTok. Por favor, tente outro link." },
        { quoted: m }
      );
    }
    
    // API PRINCIPAL - TikWM (que funcionou no teste)
    async function tryTikwm(url) {
      try {
        console.log("[TikTok] Tentando API alternativa TikWM...");
        
        // Configurar a requisição com múltiplos User-Agents para evitar bloqueios
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15'
        ];
        
        // Escolher um User-Agent aleatório
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        const options = {
          method: 'GET',
          url: 'https://tikwm.com/api/',
          params: { url },
          headers: {
            'User-Agent': randomUserAgent,
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 segundos de timeout
        };
        
        const response = await axios.request(options);
        
        if (!response.data || response.data.code !== 0) {
          throw new Error("Falha na API: " + (response.data?.message || "Resposta inválida"));
        }
        
        // Obter URL do vídeo
        const videoUrl = response.data.data.play;
        
        // Enviar o vídeo
        await Yaka.sendMessage(
          m.from,
          { 
            video: { url: videoUrl }, 
            caption: `✅ Baixado por: ${botName}\n\n📌 Link: ${url}`,
            gifPlayback: false
          },
          { quoted: m }
        );
        
        console.log("[TikTok] Download bem-sucedido via TikWM!");
        return true;
      } catch (error) {
        console.error("[TikTok] Erro ao usar TikWM:", error);
        throw error;
      }
    }
    
    // API Alternativa 1 - Snaptik
    async function trySnaptik(url) {
      try {
        console.log("[TikTok] Tentando API Snaptik...");
        
        const options = {
          method: 'GET',
          url: 'https://api.snaptik.guru/video',
          params: { url },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
          },
          timeout: 8000
        };
        
        const response = await axios.request(options);
        
        if (!response.data || !response.data.data || !response.data.data.url) {
          throw new Error("Formato de resposta inválido");
        }
        
        const videoUrl = response.data.data.url;
        
        // Enviar o vídeo
        await Yaka.sendMessage(
          m.from,
          { 
            video: { url: videoUrl }, 
            caption: `✅ Baixado por: ${botName}\n\n📌 Link: ${url}`,
            gifPlayback: false
          },
          { quoted: m }
        );
        
        console.log("[TikTok] Download bem-sucedido via Snaptik!");
        return true;
      } catch (error) {
        console.error("[TikTok] Erro ao usar Snaptik:", error);
        throw error;
      }
    }
    
    // API Alternativa 2 - TikMate (nova implementação)
    async function tryTikmateNew(url) {
      try {
        console.log("[TikTok] Tentando nova API TikMate...");
        
        const options = {
          method: 'GET',
          url: 'https://tikmateapp.io/api',
          params: { url },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
          },
          timeout: 8000
        };
        
        const response = await axios.request(options);
        
        if (!response.data || !response.data.success || !response.data.data || !response.data.data.no_watermark) {
          throw new Error("Formato de resposta inválido");
        }
        
        const videoUrl = response.data.data.no_watermark;
        
        // Enviar o vídeo
        await Yaka.sendMessage(
          m.from,
          { 
            video: { url: videoUrl }, 
            caption: `✅ Baixado por: ${botName}\n\n📌 Link: ${url}`,
            gifPlayback: false
          },
          { quoted: m }
        );
        
        console.log("[TikTok] Download bem-sucedido via TikMate!");
        return true;
      } catch (error) {
        console.error("[TikTok] Erro ao usar TikMate:", error);
        throw error;
      }
    }
    
    // API Alternativa 3 - SSSTIK (nova implementação)
    async function trySsstikNew(url) {
      try {
        console.log("[TikTok] Tentando nova API SSSTIK...");
        
        const options = {
          method: 'GET',
          url: 'https://ssstik.io/api/v1/download',
          params: { url },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
          },
          timeout: 8000
        };
        
        const response = await axios.request(options);
        
        if (!response.data || !response.data.video_url) {
          throw new Error("Formato de resposta inválido");
        }
        
        const videoUrl = response.data.video_url;
        
        // Enviar o vídeo
        await Yaka.sendMessage(
          m.from,
          { 
            video: { url: videoUrl }, 
            caption: `✅ Baixado por: ${botName}\n\n📌 Link: ${url}`,
            gifPlayback: false
          },
          { quoted: m }
        );
        
        console.log("[TikTok] Download bem-sucedido via SSSTIK!");
        return true;
      } catch (error) {
        console.error("[TikTok] Erro ao usar SSSTIK:", error);
        throw error;
      }
    }
    
    // API Alternativa 4 - TikDown
    async function tryTikdown(url) {
      try {
        console.log("[TikTok] Tentando API TikDown...");
        
        const options = {
          method: 'GET',
          url: 'https://tikdown.org/api',
          params: { url },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
          },
          timeout: 8000
        };
        
        const response = await axios.request(options);
        
        if (!response.data || !response.data.videoUrl) {
          throw new Error("Formato de resposta inválido");
        }
        
        const videoUrl = response.data.videoUrl;
        
        // Enviar o vídeo
        await Yaka.sendMessage(
          m.from,
          { 
            video: { url: videoUrl }, 
            caption: `✅ Baixado por: ${botName}\n\n📌 Link: ${url}`,
            gifPlayback: false
          },
          { quoted: m }
        );
        
        console.log("[TikTok] Download bem-sucedido via TikDown!");
        return true;
      } catch (error) {
        console.error("[TikTok] Erro ao usar TikDown:", error);
        throw error;
      }
    }
  },
};