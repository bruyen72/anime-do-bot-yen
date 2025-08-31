const { optimizedAxios, fetchJson, HTTP_CONFIG } = require('./HttpConfig');
const cacheManager = require('./CacheManager');

class UltraRobustFetcher {
  constructor() {
    this.retryDelays = [1000, 2000, 5000]; // Delays progressivos
    this.fallbackUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    ];
  }

  // Fetch ultra-robusto com múltiplos fallbacks
  async ultraFetch(url, options = {}) {
    const cacheKey = `fetch_${Buffer.from(url).toString('base64')}`;
    
    // Verifica cache primeiro
    if (options.useCache !== false) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        console.log(`[UltraFetch] Cache hit para ${url}`);
        return cached;
      }
    }

    const methods = [
      () => this.primaryFetch(url, options),
      () => this.fallbackFetch(url, options),
      () => this.proxyFetch(url, options),
      () => this.alternateFetch(url, options)
    ];

    let lastError;

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`[UltraFetch] Tentativa ${i + 1}/${methods.length} para ${url}`);
        const result = await methods[i]();
        
        // Cache sucesso (se não for muito grande)
        if (options.useCache !== false && JSON.stringify(result).length < 100000) {
          await cacheManager.set(cacheKey, result, options.cacheTTL || 10 * 60 * 1000);
        }
        
        return result;
      } catch (error) {
        console.log(`[UltraFetch] Método ${i + 1} falhou: ${error.message}`);
        lastError = error;
        
        // Delay antes da próxima tentativa
        if (i < methods.length - 1) {
          await this.delay(this.retryDelays[Math.min(i, this.retryDelays.length - 1)]);
        }
      }
    }

    throw new Error(`Todos os métodos falharam. Último erro: ${lastError?.message}`);
  }

  // Método primário otimizado
  async primaryFetch(url, options) {
    return await optimizedAxios({
      method: options.method || 'GET',
      url,
      data: options.data,
      headers: {
        'User-Agent': this.fallbackUserAgents[0],
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        ...options.headers
      },
      timeout: options.timeout || HTTP_CONFIG.timeout,
      responseType: options.responseType || 'json',
      validateStatus: () => true // Não rejeita por status HTTP
    });
  }

  // Fallback com User-Agent diferente
  async fallbackFetch(url, options) {
    return await optimizedAxios({
      method: options.method || 'GET',
      url,
      data: options.data,
      headers: {
        'User-Agent': this.fallbackUserAgents[1],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        ...options.headers
      },
      timeout: (options.timeout || HTTP_CONFIG.timeout) + 5000, // Timeout maior
      responseType: options.responseType || 'json',
      maxRedirects: 5
    });
  }

  // Método com proxy/diferentes headers
  async proxyFetch(url, options) {
    return await optimizedAxios({
      method: options.method || 'GET',
      url,
      data: options.data,
      headers: {
        'User-Agent': this.fallbackUserAgents[2],
        'Accept': '*/*',
        'Referer': 'https://www.google.com/',
        'Origin': 'https://www.google.com',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        ...options.headers
      },
      timeout: (options.timeout || HTTP_CONFIG.timeout) * 1.5, // 50% mais tempo
      responseType: options.responseType || 'json'
    });
  }

  // Método alternativo com configurações mínimas
  async alternateFetch(url, options) {
    const axios = require('axios');
    
    return await axios({
      method: options.method || 'GET',
      url,
      data: options.data,
      headers: {
        'User-Agent': this.fallbackUserAgents[3],
        ...options.headers
      },
      timeout: 20000, // 20s timeout
      responseType: options.responseType || 'json',
      validateStatus: () => true
    });
  }

  // Fetch para APIs específicas com configurações otimizadas
  async fetchAPI(apiName, url, options = {}) {
    const apiConfigs = {
      jikan: {
        baseURL: 'https://api.jikan.moe/v4',
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
        rateLimit: 1000 // 1 req/segundo
      },
      github: {
        baseURL: 'https://api.github.com',
        timeout: 8000,
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      },
      weather: {
        timeout: 12000,
        headers: { 'Accept': 'application/json' }
      },
      unsplash: {
        timeout: 15000,
        headers: { 'Accept': 'application/json' }
      }
    };

    const config = apiConfigs[apiName] || {};
    const mergedOptions = {
      ...config,
      ...options,
      headers: { ...config.headers, ...options.headers }
    };

    // Rate limiting
    if (config.rateLimit) {
      await this.delay(config.rateLimit);
    }

    const fullUrl = config.baseURL ? `${config.baseURL}${url}` : url;
    return await this.ultraFetch(fullUrl, mergedOptions);
  }

  // Fetch para imagens com validação
  async fetchImage(url, options = {}) {
    try {
      const response = await this.ultraFetch(url, {
        ...options,
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/*,*/*;q=0.8',
          'User-Agent': this.fallbackUserAgents[0],
          ...options.headers
        }
      });

      // Valida se é realmente uma imagem
      if (response.headers['content-type']?.startsWith('image/')) {
        return {
          data: response.data,
          contentType: response.headers['content-type'],
          size: response.data?.length || 0
        };
      } else {
        throw new Error('URL não retorna uma imagem válida');
      }
    } catch (error) {
      console.error(`[UltraFetch] Erro ao buscar imagem ${url}:`, error.message);
      throw error;
    }
  }

  // Upload robusto com retry
  async uploadFile(url, formData, options = {}) {
    const uploadMethods = [
      () => this.primaryUpload(url, formData, options),
      () => this.fallbackUpload(url, formData, options)
    ];

    for (const method of uploadMethods) {
      try {
        return await method();
      } catch (error) {
        console.log(`[UltraFetch] Upload method failed:`, error.message);
        continue;
      }
    }

    throw new Error('Todos os métodos de upload falharam');
  }

  async primaryUpload(url, formData, options) {
    return await optimizedAxios({
      method: 'POST',
      url,
      data: formData,
      headers: {
        ...formData.getHeaders?.(),
        'User-Agent': this.fallbackUserAgents[0],
        ...options.headers
      },
      timeout: options.timeout || 30000, // 30s para uploads
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024
    });
  }

  async fallbackUpload(url, formData, options) {
    const fetch = require('node-fetch');
    
    return await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': this.fallbackUserAgents[1],
        ...options.headers
      },
      timeout: options.timeout || 30000
    });
  }

  // Utility functions
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Status do sistema
  getStatus() {
    return {
      userAgents: this.fallbackUserAgents.length,
      retryDelays: this.retryDelays,
      maxTimeout: Math.max(...this.retryDelays) + HTTP_CONFIG.timeout,
      cacheEnabled: true
    };
  }
}

// Instância global
const ultraRobustFetcher = new UltraRobustFetcher();

module.exports = ultraRobustFetcher;