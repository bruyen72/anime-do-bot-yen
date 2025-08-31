const axios = require('axios');
const koyebOptimizer = require('./KoyebOptimizer');

// Configuração otimizada para Koyeb
const HTTP_CONFIG = koyebOptimizer.isKoyeb ? koyebOptimizer.getHttpConfig() : {
  // Configuração padrão para desenvolvimento
  timeout: 15000,           // 15s - timeout geral 
  connectTimeout: 8000,     // 8s - timeout de conexão
  responseTimeout: 12000,   // 12s - timeout de resposta
  
  // Headers otimizados
  headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
  },
  
  // Configurações de retry
  maxRetries: 2,
  retryDelay: 1500,
  
  // Pool de conexões para reutilização
  maxSockets: 15,
  keepAlive: true,
  keepAliveMsecs: 30000
};

// Instância axios otimizada global
const createOptimizedAxios = (customConfig = {}) => {
  const instance = axios.create({
    timeout: HTTP_CONFIG.timeout,
    headers: { ...HTTP_CONFIG.headers, ...customConfig.headers },
    maxContentLength: 50 * 1024 * 1024, // 50MB
    maxBodyLength: 50 * 1024 * 1024,
    validateStatus: (status) => status < 500, // Não rejeita 4xx
    ...customConfig
  });

  // Interceptor para retry automático
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      
      if (!config || !config.retry) config.retry = 0;
      
      // Retry apenas para erros de rede/timeout
      if (config.retry < HTTP_CONFIG.maxRetries && 
          (error.code === 'ECONNABORTED' || 
           error.code === 'ENOTFOUND' ||
           error.code === 'ECONNRESET' ||
           error.response?.status >= 500)) {
        
        config.retry++;
        console.log(`[HTTP] Retry ${config.retry}/${HTTP_CONFIG.maxRetries} para ${config.url}`);
        
        await new Promise(resolve => setTimeout(resolve, HTTP_CONFIG.retryDelay * config.retry));
        return instance(config);
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

// Instância padrão otimizada
const optimizedAxios = createOptimizedAxios();

// Função de fetch com timeout personalizado
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || HTTP_CONFIG.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...HTTP_CONFIG.headers,
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout após ${options.timeout || HTTP_CONFIG.timeout}ms`);
    }
    throw error;
  }
};

// Buffer fetch otimizado
const fetchBuffer = async (url, options = {}) => {
  try {
    const response = await optimizedAxios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      timeout: options.timeout || HTTP_CONFIG.timeout,
      headers: options.headers || {}
    });
    return response.data;
  } catch (error) {
    console.error(`[HTTP] Erro ao buscar buffer de ${url}:`, error.message);
    throw error;
  }
};

// Request JSON ultra-robusto
const fetchJson = async (url, options = {}) => {
  try {
    const ultraFetcher = require('./UltraRobustFetcher');
    const response = await ultraFetcher.ultraFetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response.data;
  } catch (error) {
    console.error(`[HTTP] Erro ao buscar JSON de ${url}:`, error.message);
    
    // Fallback para método original
    try {
      const response = await optimizedAxios({
        method: options.method || 'GET',
        url,
        data: options.data,
        timeout: options.timeout || HTTP_CONFIG.timeout,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      return response.data;
    } catch (fallbackError) {
      throw error; // Retorna erro original
    }
  }
};

// Upload otimizado
const uploadFile = async (url, formData, options = {}) => {
  try {
    const response = await optimizedAxios({
      method: 'POST',
      url,
      data: formData,
      timeout: options.timeout || 30000, // 30s para uploads
      headers: {
        ...formData.getHeaders?.(),
        ...options.headers
      }
    });
    return response.data;
  } catch (error) {
    console.error(`[HTTP] Erro ao fazer upload para ${url}:`, error.message);
    throw error;
  }
};

module.exports = {
  HTTP_CONFIG,
  optimizedAxios,
  createOptimizedAxios,
  fetchWithTimeout,
  fetchBuffer,
  fetchJson,
  uploadFile,
  // Acesso ao UltraRobustFetcher para uso avançado
  get ultraFetcher() {
    return require('./UltraRobustFetcher');
  }
};