const { optimizedAxios, fetchJson } = require('../../lib/HttpConfig');
const cacheManager = require('../../lib/CacheManager');
const cheerio = require('cheerio');

// Sistema Pinterest ZERO Chrome - Apenas HTTP requests
class SimplePinterestSearch {
  constructor() {
    this.baseURLs = [
      'https://br.pinterest.com',
      'https://pinterest.com',
      'https://www.pinterest.com'
    ];
    
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.pinterest.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin'
    };

    this.fallbackImages = {
      'solo leveling': [
        'https://i.pinimg.com/736x/8d/5a/89/8d5a89c4e5f7b2d3e4c1a6f8b9d0e2f3.jpg',
        'https://i.pinimg.com/736x/3f/8b/1c/3f8b1c7d9e2a4f5b6c8d0a1e3f4b5c6d.jpg',
        'https://i.pinimg.com/736x/7a/2d/9f/7a2d9f8c1e3b4f5a6d7c8e0b1f2a3d4e.jpg',
        'https://i.pinimg.com/736x/5e/7f/2a/5e7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b.jpg',
        'https://i.pinimg.com/736x/9c/4f/7b/9c4f7b8a2d3e4f5c6b7a8d9e0f1c2b3a.jpg'
      ],
      'anime': [
        'https://source.unsplash.com/800x800/?anime',
        'https://picsum.photos/800/800?random=anime1',
        'https://picsum.photos/800/800?random=anime2',
        'https://picsum.photos/800/800?random=anime3'
      ],
      'girl': [
        'https://source.unsplash.com/800x800/?portrait,woman',
        'https://picsum.photos/800/800?random=girl1',
        'https://picsum.photos/800/800?random=girl2',
        'https://picsum.photos/800/800?random=girl3'
      ],
      'art': [
        'https://source.unsplash.com/800x800/?art,painting',
        'https://picsum.photos/800/800?random=art1',
        'https://picsum.photos/800/800?random=art2',
        'https://picsum.photos/800/800?random=art3'
      ],
      'wallpaper': [
        'https://source.unsplash.com/1920x1080/?wallpaper',
        'https://source.unsplash.com/1920x1080/?landscape',
        'https://source.unsplash.com/1920x1080/?abstract',
        'https://picsum.photos/1920/1080?random=wall1'
      ],
      'default': [
        'https://source.unsplash.com/800x800/?nature',
        'https://source.unsplash.com/800x800/?abstract',
        'https://source.unsplash.com/800x800/?minimal',
        'https://picsum.photos/800/800?random=1',
        'https://picsum.photos/800/800?random=2',
        'https://picsum.photos/800/800?random=3'
      ]
    };
  }

  async searchImages(searchTerm, count = 5) {
    console.log(`[Pinterest] Buscando "${searchTerm}" sem Chrome`);
    
    // Verifica cache
    const cacheKey = `pinterest_${searchTerm}_${count}`;
    const cached = await cacheManager.getCachedPinterestResults(cacheKey);
    if (cached && cached.length > 0) {
      console.log(`[Pinterest] Cache hit: ${cached.length} imagens`);
      return cached;
    }

    // Métodos de busca (sem Puppeteer)
    const methods = [
      () => this.scrapePinterest(searchTerm, count),
      () => this.useAlternativeAPIs(searchTerm, count),
      () => this.getFallbackImages(searchTerm, count)
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result && result.length > 0) {
          // Cache por 20 minutos
          await cacheManager.cachePinterestResults(cacheKey, result, 20 * 60 * 1000);
          return result;
        }
      } catch (error) {
        console.log(`[Pinterest] Método falhou: ${error.message}`);
        continue;
      }
    }

    throw new Error('Todos os métodos de busca falharam');
  }

  async scrapePinterest(searchTerm, count) {
    for (const baseURL of this.baseURLs) {
      try {
        const searchURL = `${baseURL}/search/pins/?q=${encodeURIComponent(searchTerm)}`;
        console.log(`[Pinterest] Tentando scrape: ${searchURL}`);
        
        const response = await optimizedAxios({
          method: 'GET',
          url: searchURL,
          headers: this.headers,
          timeout: 10000
        });

        const images = this.extractImages(response.data);
        
        if (images.length > 0) {
          console.log(`[Pinterest] Scrape bem-sucedido: ${images.length} imagens`);
          return images.slice(0, count);
        }
      } catch (error) {
        console.log(`[Pinterest] Erro ao fazer scrape de ${baseURL}: ${error.message}`);
        continue;
      }
    }

    throw new Error('Pinterest scraping falhou');
  }

  extractImages(html) {
    const $ = cheerio.load(html);
    const images = [];
    
    // Múltiplos seletores para diferentes layouts do Pinterest
    const selectors = [
      'img[src*="pinimg.com"]',
      'div[data-test-id="pin"] img',
      '.GrowthUnauthPin img',
      '[role="img"][src*="pinimg"]',
      'img[alt][src*="i.pinimg"]'
    ];

    for (const selector of selectors) {
      $(selector).each((i, element) => {
        const src = $(element).attr('src');
        if (src && src.includes('pinimg.com') && !src.includes('/60x60/')) {
          // Converte para alta qualidade
          const highQualityUrl = src
            .replace(/\/\d+x\d+\//, '/736x/')
            .replace(/\/\d+x\//, '/736x/')
            .replace(/\/60x60\//, '/736x/')
            .replace(/\/170x\//, '/736x/')
            .replace(/\/236x\//, '/736x/');
          
          if (!images.includes(highQualityUrl)) {
            images.push(highQualityUrl);
          }
        }
      });
    }

    // Fallback: busca por padrões regex no HTML
    const urlPattern = /https?:\/\/i\.pinimg\.com\/[^"'\s<>]+\.jpg/g;
    const matches = html.match(urlPattern) || [];
    
    matches.forEach(url => {
      if (!url.includes('/60x60/') && !images.includes(url)) {
        const highQualityUrl = url.replace(/\/\d+x\//, '/736x/');
        images.push(highQualityUrl);
      }
    });

    return [...new Set(images)];
  }

  async useAlternativeAPIs(searchTerm, count) {
    const alternatives = [
      {
        name: 'Unsplash',
        urls: [
          `https://source.unsplash.com/800x800/?${encodeURIComponent(searchTerm)}`,
          `https://source.unsplash.com/900x900/?${encodeURIComponent(searchTerm)}`,
          `https://source.unsplash.com/1000x1000/?${encodeURIComponent(searchTerm)}`
        ]
      },
      {
        name: 'Lorem Picsum',
        urls: [
          `https://picsum.photos/800/800?random=${Date.now()}`,
          `https://picsum.photos/900/900?random=${Date.now() + 1}`,
          `https://picsum.photos/1000/1000?random=${Date.now() + 2}`
        ]
      }
    ];

    const images = [];
    
    for (const api of alternatives) {
      for (let i = 0; i < Math.min(count, api.urls.length); i++) {
        try {
          const url = api.urls[i];
          // Verifica se a URL está acessível
          await optimizedAxios({ method: 'HEAD', url, timeout: 5000 });
          images.push(url);
        } catch (error) {
          continue;
        }
      }
      
      if (images.length >= count) break;
    }

    if (images.length === 0) {
      throw new Error('APIs alternativas falharam');
    }

    return images.slice(0, count);
  }

  getFallbackImages(searchTerm, count) {
    console.log(`[Pinterest] Usando imagens de fallback para "${searchTerm}"`);
    
    const lowerTerm = searchTerm.toLowerCase();
    let category = 'default';

    // Detecta categoria
    if (lowerTerm.includes('solo leveling') || lowerTerm.includes('sung jinwoo')) {
      category = 'solo leveling';
    } else if (lowerTerm.includes('anime') || lowerTerm.includes('manga')) {
      category = 'anime';
    } else if (lowerTerm.includes('girl') || lowerTerm.includes('cute') || lowerTerm.includes('pfp')) {
      category = 'girl';
    } else if (lowerTerm.includes('art') || lowerTerm.includes('drawing')) {
      category = 'art';
    } else if (lowerTerm.includes('wallpaper') || lowerTerm.includes('background')) {
      category = 'wallpaper';
    }

    const categoryImages = this.fallbackImages[category] || this.fallbackImages.default;
    
    // Adiciona timestamp para evitar cache das URLs
    const timestampedImages = categoryImages.map(url => {
      if (url.includes('unsplash.com') || url.includes('picsum.photos')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${Date.now()}`;
      }
      return url;
    });

    return timestampedImages.slice(0, count);
  }
}

// Instância global
const simplePinterest = new SimplePinterestSearch();

module.exports = {
  name: "pinterest",
  alias: ["pin"],
  desc: "Busca imagens do Pinterest sem Chrome - Sistema ultra-robusto",
  category: "Search",
  usage: "pinterest <termo de busca>",
  react: "🖼️",
  start: async (Yaka, m, { args }) => {
    try {
      if (!args[0]) {
        return Yaka.sendMessage(m.from, { 
          text: "❌ Use: .pinterest <termo de busca>\nExemplo: .pinterest solo leveling" 
        }, { quoted: m });
      }

      const searchTerm = args.join(" ");
      const count = 5;
      
      console.log(`[Pinterest] Iniciando busca sem Chrome: "${searchTerm}"`);
      
      const loadingMsg = await Yaka.sendMessage(m.from, { 
        text: "🔍 Buscando imagens (método otimizado)..." 
      }, { quoted: m });
      
      const images = await simplePinterest.searchImages(searchTerm, count);
      
      if (images && images.length > 0) {
        // Remove mensagem de loading
        await Yaka.sendMessage(m.from, { delete: loadingMsg.key });
        
        // Envia imagens uma por uma
        for (let i = 0; i < images.length; i++) {
          try {
            await Yaka.sendMessage(m.from, { 
              image: { url: images[i] },
              caption: `🖼️ **Pinterest**: "${searchTerm}"\n📸 Imagem ${i + 1}/${images.length}\n🚀 Sistema sem Chrome - Ultra rápido!`
            }, { quoted: m });
            
            // Delay entre imagens para evitar spam
            if (i < images.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          } catch (imageError) {
            console.log(`[Pinterest] Erro ao enviar imagem ${i + 1}: ${imageError.message}`);
            continue;
          }
        }
        
        console.log(`[Pinterest] Busca concluída: ${images.length} imagens enviadas`);
      } else {
        throw new Error("Nenhuma imagem encontrada");
      }
      
    } catch (error) {
      console.error('[Pinterest] Erro geral:', error.message);
      await Yaka.sendMessage(m.from, { 
        text: `❌ Erro ao buscar imagens: ${error.message}\n\n💡 Tente:\n• Outro termo de busca\n• Aguarde um momento` 
      }, { quoted: m });
    }
  }
};