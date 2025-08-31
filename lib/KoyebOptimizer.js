// Otimizações específicas para ambiente Koyeb
const os = require('os');

class KoyebOptimizer {
  constructor() {
    this.isKoyeb = this.detectKoyebEnvironment();
    this.init();
  }

  // Detecta se está rodando no Koyeb
  detectKoyebEnvironment() {
    return !!(
      process.env.KOYEB ||
      process.env.KOYEB_PUBLIC_DOMAIN ||
      process.env.PORT ||
      process.env.NODE_ENV === 'production'
    );
  }

  // Inicialização das otimizações
  init() {
    if (this.isKoyeb) {
      console.log('🚀 Detectado ambiente Koyeb - Aplicando otimizações...');
      
      this.optimizeNodeJS();
      this.optimizeMemory();
      this.optimizeNetwork();
      this.optimizeGC();
      
      console.log('✅ Otimizações Koyeb aplicadas com sucesso!');
    }
  }

  // Otimizações do Node.js
  optimizeNodeJS() {
    // Aumenta o pool de threads para I/O
    process.env.UV_THREADPOOL_SIZE = '16';
    
    // Otimiza DNS
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + 
      ' --dns-result-order=ipv4first --max-old-space-size=1024';
    
    // Desabilita warnings desnecessários em produção
    process.env.NODE_NO_WARNINGS = '1';
    
    // Otimiza TLS
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  }

  // Otimizações de memória
  optimizeMemory() {
    // Força garbage collection mais agressivo
    if (global.gc) {
      setInterval(() => {
        global.gc();
      }, 30 * 1000); // A cada 30 segundos
    }

    // Monitora uso de memória
    setInterval(() => {
      const usage = process.memoryUsage();
      const totalMB = Math.round(usage.rss / 1024 / 1024);
      
      if (totalMB > 800) { // Se usar mais que 800MB
        console.warn(`⚠️ Alto uso de memória: ${totalMB}MB`);
        if (global.gc) global.gc();
      }
    }, 60 * 1000); // A cada minuto
  }

  // Otimizações de rede
  optimizeNetwork() {
    // Aumenta limites de sockets
    require('http').globalAgent.maxSockets = 50;
    require('https').globalAgent.maxSockets = 50;
    
    // Keep-alive para conexões HTTP
    require('http').globalAgent.keepAlive = true;
    require('https').globalAgent.keepAlive = true;
    
    // Timeout para keep-alive
    require('http').globalAgent.keepAliveMsecs = 30000;
    require('https').globalAgent.keepAliveMsecs = 30000;
  }

  // Otimizações de Garbage Collection
  optimizeGC() {
    // Configura GC para ser mais eficiente em cloud
    const v8 = require('v8');
    
    // Aumenta heap se disponível
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    console.log(`💾 Memória total: ${Math.round(totalMemory / 1024 / 1024)}MB`);
    console.log(`🆓 Memória livre: ${Math.round(freeMemory / 1024 / 1024)}MB`);
  }

  // Otimizações para Puppeteer no Koyeb
  getPuppeteerConfig() {
    return {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Importante para Koyeb
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI,VizDisplayCompositor',
        '--memory-pressure-off',
        '--disable-ipc-flooding-protection',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-client-side-phishing-detection'
      ],
      executablePath: this.findChromePath(),
      headless: true,
      defaultViewport: { width: 1366, height: 768 },
      timeout: 20000 // Timeout reduzido para Koyeb
    };
  }

  // Busca Chrome no Koyeb
  findChromePath() {
    const fs = require('fs');
    
    const paths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/app/.cache/puppeteer/chrome/linux-*/chrome-linux*/chrome',
      process.env.CHROME_EXECUTABLE_PATH
    ].filter(Boolean);

    for (const path of paths) {
      if (path.includes('*')) {
        // Para paths com wildcards, usar glob pattern
        const glob = require('glob');
        const matches = glob.sync(path);
        if (matches.length > 0) return matches[0];
      } else if (fs.existsSync(path)) {
        return path;
      }
    }

    return undefined; // Deixa Puppeteer decidir
  }

  // Configurações de HTTP otimizadas para Koyeb
  getHttpConfig() {
    return {
      timeout: 12000,        // Timeout reduzido para Koyeb
      connectTimeout: 6000,  // Conexão mais rápida
      responseTimeout: 10000, // Resposta mais rápida
      
      // Pool de conexões otimizado
      maxSockets: 20,
      keepAlive: true,
      keepAliveMsecs: 15000, // Keep-alive menor
      
      // Retry config para Koyeb
      maxRetries: 1,         // Menos retries
      retryDelay: 1000,      // Delay menor
      
      // Headers otimizados
      headers: {
        'User-Agent': 'YakaBot/2.0 (Koyeb Cloud)',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=15, max=100'
      }
    };
  }

  // Status das otimizações
  getStatus() {
    const usage = process.memoryUsage();
    
    return {
      isKoyeb: this.isKoyeb,
      environment: process.env.NODE_ENV || 'development',
      memory: {
        rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB'
      },
      uptime: Math.round(process.uptime()) + 's',
      pid: process.pid,
      nodeVersion: process.version
    };
  }
}

// Instância global
const koyebOptimizer = new KoyebOptimizer();

module.exports = koyebOptimizer;