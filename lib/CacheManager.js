const fs = require('fs').promises;
const path = require('path');

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.cacheDir = path.join(__dirname, '../cache');
    this.maxMemoryCacheSize = 100; // máximo de itens na cache de memória
    this.defaultTTL = 10 * 60 * 1000; // 10 minutos padrão
    
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('[Cache] Erro ao criar diretório:', error.message);
    }
  }

  // Gera chave única para cache
  generateKey(prefix, params) {
    const paramsStr = typeof params === 'object' ? JSON.stringify(params) : String(params);
    return `${prefix}:${Buffer.from(paramsStr).toString('base64')}`;
  }

  // Cache em memória (mais rápido)
  setMemory(key, data, ttl = this.defaultTTL) {
    // Remove itens antigos se cache estiver cheio
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Busca cache em memória
  getMemory(key) {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    // Verifica se expirou
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Cache persistente em arquivo
  async setFile(key, data, ttl = this.defaultTTL) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl
      };
      await fs.writeFile(filePath, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[Cache] Erro ao salvar arquivo:', error.message);
    }
  }

  // Busca cache em arquivo
  async getFile(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      const fileData = await fs.readFile(filePath, 'utf8');
      const cached = JSON.parse(fileData);

      // Verifica se expirou
      if (Date.now() - cached.timestamp > cached.ttl) {
        await this.deleteFile(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      return null; // Arquivo não existe ou erro de leitura
    }
  }

  // Remove cache de arquivo
  async deleteFile(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignora erros de arquivo não encontrado
    }
  }

  // Método universal para buscar cache (memória primeiro, depois arquivo)
  async get(key) {
    // Tenta memória primeiro
    const memoryResult = this.getMemory(key);
    if (memoryResult) return memoryResult;

    // Tenta arquivo
    const fileResult = await this.getFile(key);
    if (fileResult) {
      // Coloca de volta na memória para próximas buscas
      this.setMemory(key, fileResult);
      return fileResult;
    }

    return null;
  }

  // Método universal para salvar cache (memória e arquivo)
  async set(key, data, ttl = this.defaultTTL, persistToFile = true) {
    this.setMemory(key, data, ttl);
    
    if (persistToFile) {
      await this.setFile(key, data, ttl);
    }
  }

  // Cache específico para Pinterest
  async cachePinterestResults(searchTerm, results, ttl = 30 * 60 * 1000) { // 30 min
    const key = this.generateKey('pinterest', searchTerm.toLowerCase());
    await this.set(key, results, ttl, true);
  }

  async getCachedPinterestResults(searchTerm) {
    const key = this.generateKey('pinterest', searchTerm.toLowerCase());
    return await this.get(key);
  }

  // Cache para APIs externas (anime, weather, etc)
  async cacheApiResult(apiName, params, result, ttl = 15 * 60 * 1000) { // 15 min
    const key = this.generateKey(`api_${apiName}`, params);
    await this.set(key, result, ttl, true);
  }

  async getCachedApiResult(apiName, params) {
    const key = this.generateKey(`api_${apiName}`, params);
    return await this.get(key);
  }

  // Cache para uploads (TelegraphPh, etc)
  async cacheUploadResult(filename, url, ttl = 60 * 60 * 1000) { // 1 hora
    const key = this.generateKey('upload', filename);
    await this.set(key, url, ttl, true);
  }

  async getCachedUploadResult(filename) {
    const key = this.generateKey('upload', filename);
    return await this.get(key);
  }

  // Limpeza de cache antigo
  async cleanExpiredCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      let cleaned = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          try {
            const fileData = await fs.readFile(filePath, 'utf8');
            const cached = JSON.parse(fileData);

            if (Date.now() - cached.timestamp > cached.ttl) {
              await fs.unlink(filePath);
              cleaned++;
            }
          } catch (error) {
            // Remove arquivos corrompidos
            await fs.unlink(filePath);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`[Cache] ${cleaned} arquivos de cache expirados removidos`);
      }
    } catch (error) {
      console.error('[Cache] Erro na limpeza:', error.message);
    }
  }

  // Estatísticas do cache
  async getStats() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const fileCount = files.filter(f => f.endsWith('.json')).length;

      return {
        memoryItems: this.memoryCache.size,
        fileItems: fileCount,
        maxMemoryItems: this.maxMemoryCacheSize,
        cacheDir: this.cacheDir
      };
    } catch (error) {
      return {
        memoryItems: this.memoryCache.size,
        fileItems: 0,
        maxMemoryItems: this.maxMemoryCacheSize,
        cacheDir: this.cacheDir,
        error: error.message
      };
    }
  }
}

// Instância global
const cacheManager = new CacheManager();

// Limpeza automática a cada 30 minutos
setInterval(() => {
  cacheManager.cleanExpiredCache();
}, 30 * 60 * 1000);

module.exports = cacheManager;