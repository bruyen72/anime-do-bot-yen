/**
 * ig — Instagram Downloader FINAL OTIMIZADO
 * Baseado no código que funciona + otimizações máximas
 * npm install ruhend-scraper axios cheerio
 */

const { igdl } = require("ruhend-scraper");
const axios = require("axios");
const cheerio = require("cheerio");

// Cache otimizado
const cache = new Map();
const CACHE_LIMIT = 200;

// Axios configurado para velocidade
const http = axios.create({
  timeout: 10000,
  maxContentLength: 20 * 1024 * 1024, // 20MB max
  headers: { 
    'User-Agent': 'Instagram 300.0.0.0.0 Android',
    'Accept-Encoding': 'gzip'
  }
});

module.exports = {
  name: "ig",
  alias: ["igdl", "instagram", "insta", "igreel", "i"],
  desc: "Download Instagram ultra rápido",
  category: "Media",
  usage: "ig <link>",
  react: "⚡",
  
  start: async (Yaka, m, { args, botName }) => {
    // Validação rápida
    if (!args.length || !args[0].includes('instagram.com')) {
      return;
    }
    
    // Anti-spam otimizado
    const msgId = m.key?.id;
    if (cache.has(msgId)) return;
    
    cache.set(msgId, true);
    if (cache.size > CACHE_LIMIT) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    const url = args[0].split("?")[0]; // Limpa URL
    
    // Reação instantânea (sem await)
    Yaka.sendMessage(m.from, { react: { text: "⚡", key: m.key } });
    
    try {
      // Estratégia 1: Ruhend (mais confiável)
      const data = await Promise.race([
        igdl(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 12000))
      ]);
      
      if (data?.data?.[0]) {
        const media = data.data[0];
        const mediaUrl = media.url;
        
        // Detecta tipo rapidamente
        const isVideo = media.type === 'video' || 
                       mediaUrl.includes('.mp4') ||
                       url.includes('/reel/');
        
        // Envia sem caption para economizar bytes
        await Yaka.sendMessage(m.from,
          isVideo 
            ? { video: { url: mediaUrl }, gifPlayback: false }
            : { image: { url: mediaUrl } },
          { quoted: m }
        );
        
        // React sucesso (sem await)
        Yaka.sendMessage(m.from, { react: { text: "✅", key: m.key } });
        return;
      }
    } catch (e) {
      // Continua para fallback
    }
    
    // Estratégia 2: Scraping direto (fallback rápido)
    try {
      const { data: html } = await http.get(url);
      
      // Busca otimizada com uma única regex
      const match = html.match(/"(?:video_url|contentUrl|playbackUrl)":"([^"]+)"|meta[^>]+property="og:video"[^>]+content="([^"]+)"/);
      
      if (match) {
        const mediaUrl = (match[1] || match[2]).replace(/\\u0026/g, '&');
        
        await Yaka.sendMessage(m.from,
          { video: { url: mediaUrl }, gifPlayback: false },
          { quoted: m }
        );
        
        Yaka.sendMessage(m.from, { react: { text: "✅", key: m.key } });
        return;
      }
      
      // Tenta imagem se não achou vídeo
      const $ = cheerio.load(html);
      const imageUrl = $('meta[property="og:image"]').attr('content');
      
      if (imageUrl) {
        await Yaka.sendMessage(m.from,
          { image: { url: imageUrl } },
          { quoted: m }
        );
        
        Yaka.sendMessage(m.from, { react: { text: "✅", key: m.key } });
        return;
      }
      
    } catch {
      // Falha silenciosa
    }
    
    // Se tudo falhar, apenas muda reação
    Yaka.sendMessage(m.from, { react: { text: "❌", key: m.key } });
    
    // Limpa cache após 3 minutos
    setTimeout(() => cache.delete(msgId), 180000);
  }
};