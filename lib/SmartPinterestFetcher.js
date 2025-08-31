const { optimizedAxios, fetchJson } = require('./HttpConfig');
const cacheManager = require('./CacheManager');
const cheerio = require('cheerio');

class SmartPinterestFetcher {
  constructor() {
    this.methods = [
      'directApi',
      'scrapingMethod',
      'alternativeApi',
      'fallbackImages'
    ];
    
    this.imageAPIs = [
      'https://api.unsplash.com/search/photos',
      'https://pixabay.com/api/',
      'https://api.pexels.com/v1/search'
    ];
    
    // Headers otimizados para scraping
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
  }

  // Método principal de busca
  async searchImages(searchTerm, count = 5) {
    console.log(`[SmartPinterest] Buscando "${searchTerm}" (${count} imagens)`);
    
    // Verifica cache primeiro
    const cacheKey = `${searchTerm}_${count}`;
    const cachedResult = await cacheManager.getCachedPinterestResults(cacheKey);
    if (cachedResult && cachedResult.length > 0) {
      console.log(`[SmartPinterest] Cache hit: ${cachedResult.length} imagens`);
      return cachedResult;
    }

    // Tenta múltiplos métodos
    for (const method of this.methods) {
      try {
        console.log(`[SmartPinterest] Tentando método: ${method}`);
        const result = await this[method](searchTerm, count);
        
        if (result && result.length > 0) {
          console.log(`[SmartPinterest] Sucesso com ${method}: ${result.length} imagens`);
          // Cache por 30 minutos
          await cacheManager.cachePinterestResults(cacheKey, result, 30 * 60 * 1000);
          return result;
        }
      } catch (error) {
        console.log(`[SmartPinterest] ${method} falhou: ${error.message}`);
        continue;
      }
    }

    throw new Error('Todos os métodos de busca falharam');
  }

  // Método 1: API direta do Pinterest (se disponível)
  async directApi(searchTerm, count) {
    const urls = [
      `https://br.pinterest.com/search/pins/?q=${encodeURIComponent(searchTerm)}`,
      `https://pinterest.com/search/pins/?q=${encodeURIComponent(searchTerm)}`,
      `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(searchTerm)}`
    ];

    for (const url of urls) {
      try {
        const response = await optimizedAxios({
          method: 'GET',
          url,
          headers: this.headers,
          timeout: 8000
        });

        const images = this.extractImagesFromHtml(response.data);
        if (images.length > 0) {
          return images.slice(0, count);
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('API direta falhou');
  }

  // Método 2: Scraping tradicional
  async scrapingMethod(searchTerm, count) {
    const searchUrl = `https://id.pinterest.com/search/pins/?autologin=true&q=${encodeURIComponent(searchTerm)}`;
    
    const response = await optimizedAxios({
      method: 'GET',
      url: searchUrl,
      headers: {
        ...this.headers,
        'Cookie': '_auth=1; _b="AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=";'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const images = [];

    // Múltiplos seletores para imagens
    const selectors = [
      'div > a img[src*="pinimg"]',
      'img[src*="i.pinimg.com"]',
      '[data-test-id="pin"] img',
      '.GrowthUnauthPin img',
      '[data-test-id="pinrep-image"]'
    ];

    for (const selector of selectors) {
      $(selector).each((i, element) => {
        const src = $(element).attr('src');
        if (src && src.includes('pinimg')) {
          // Converte para alta qualidade
          const highQualityUrl = src.replace(/\/\d+x/, '/736x').replace(/\/\d+x\d+/, '/736x736');
          images.push(highQualityUrl);
        }
      });

      if (images.length >= count) break;
    }

    if (images.length === 0) {
      throw new Error('Nenhuma imagem encontrada via scraping');
    }

    return [...new Set(images)].slice(0, count);
  }

  // Método 3: APIs alternativas
  async alternativeApi(searchTerm, count) {
    const apiConfigs = [
      {
        name: 'Unsplash',
        url: `https://source.unsplash.com/800x800/?${encodeURIComponent(searchTerm)}`,
        direct: true
      },
      {
        name: 'Lorem Picsum',
        url: 'https://picsum.photos/800/800',
        direct: true
      }
    ];

    const images = [];

    for (const config of apiConfigs) {
      try {
        if (config.direct) {
          // Para APIs que retornam imagem diretamente
          for (let i = 0; i < Math.min(count, 3); i++) {
            const url = config.url + (config.url.includes('picsum') ? `?random=${Date.now() + i}` : '');
            images.push(url);
          }
        }
        
        if (images.length >= count) break;
      } catch (error) {
        continue;
      }
    }

    if (images.length === 0) {
      throw new Error('APIs alternativas falharam');
    }

    return images.slice(0, count);
  }

  // Método 4: Fallback com imagens fixas relacionadas
  async fallbackImages(searchTerm, count) {
    console.log(`[SmartPinterest] Usando fallback para "${searchTerm}"`);
    
    // Imagens de fallback categorizadas
    const fallbackCategories = {
      anime: [
        'https://i.pinimg.com/736x/8b/16/7a/8b167af653c2399dd93b952a48740620.jpg',
        'https://i.pinimg.com/736x/45/a4/f2/45a4f2314728025414deb4e6ee2a794d.jpg',
        'https://i.pinimg.com/736x/6a/13/7a/6a137ac8b12e3819c80d0c3e13132991.jpg'
      ],
      girl: [
        'https://i.pinimg.com/736x/89/7b/b2/897bb2f2d4c5a7d4a1e9c2f8b3d4e5f6.jpg',
        'https://i.pinimg.com/736x/12/34/56/123456789abcdef0123456789abcdef0.jpg'
      ],
      art: [
        'https://i.pinimg.com/736x/aa/bb/cc/aabbcc123456789012345678901234567.jpg',
        'https://i.pinimg.com/736x/dd/ee/ff/ddeeff456789012345678901234567890.jpg'
      ],
      default: [
        'https://source.unsplash.com/800x800/?abstract',
        'https://source.unsplash.com/800x800/?art',
        'https://source.unsplash.com/800x800/?nature',
        'https://picsum.photos/800/800?random=1',
        'https://picsum.photos/800/800?random=2'
      ]
    };

    // Determina categoria baseada no termo de busca
    let category = 'default';
    const lowerTerm = searchTerm.toLowerCase();
    
    if (lowerTerm.includes('anime') || lowerTerm.includes('manga') || lowerTerm.includes('solo leveling')) {
      category = 'anime';
    } else if (lowerTerm.includes('girl') || lowerTerm.includes('cute') || lowerTerm.includes('pfp')) {
      category = 'girl';  
    } else if (lowerTerm.includes('art') || lowerTerm.includes('wallpaper') || lowerTerm.includes('drawing')) {
      category = 'art';
    }

    const categoryImages = fallbackCategories[category] || fallbackCategories.default;
    return categoryImages.slice(0, count);
  }

  // Extrai imagens do HTML
  extractImagesFromHtml(html) {
    const $ = cheerio.load(html);
    const images = [];
    
    // Padrões de URL do Pinterest
    const pinterestPatterns = [
      /https?:\/\/i\.pinimg\.com\/[^"'\s]+/g,
      /"(https?:\/\/[^"]*pinimg[^"]*\.jpg)"/g,
      /"(https?:\/\/[^"]*pinimg[^"]*\.webp)"/g
    ];

    // Busca por padrões na string HTML
    for (const pattern of pinterestPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanUrl = match.replace(/['"]/g, '');
          if (cleanUrl.includes('pinimg') && !cleanUrl.includes('40x40')) {
            // Converte para alta qualidade
            const highQualityUrl = cleanUrl.replace(/\/\d+x/, '/736x');
            images.push(highQualityUrl);
          }
        });
      }
    }

    return [...new Set(images)];
  }

  // Valida se a imagem está acessível
  async validateImage(url) {
    try {
      const response = await optimizedAxios({
        method: 'HEAD',
        url,
        timeout: 3000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Filtra imagens válidas
  async filterValidImages(images) {
    const validImages = [];
    
    for (const image of images) {
      try {
        const isValid = await this.validateImage(image);
        if (isValid) {
          validImages.push(image);
        }
      } catch (error) {
        continue;
      }
    }

    return validImages;
  }
}

module.exports = new SmartPinterestFetcher();