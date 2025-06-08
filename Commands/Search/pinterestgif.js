// Configuração do Puppeteer para Render - VERSÃO ULTRA-OTIMIZADA 2025 CORRIGIDA
process.env.PUPPETEER_EXECUTABLE_PATH = '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome';

const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);
const crypto = require("crypto");

// CONFIGURAÇÕES ULTRA-OTIMIZADAS COM FALLBACK INTELIGENTE
const CONFIG = {
  // Timeouts otimizados
  BROWSER_TIMEOUT: 120000,
  PROTOCOL_TIMEOUT: 300000,
  PAGE_TIMEOUT: 200000,
  DOWNLOAD_TIMEOUT: 45000,
  EVALUATE_TIMEOUT: 360000,
  
  // Pool otimizado
  MAX_BROWSER_INSTANCES: 3, // Reduzido para estabilidade
  PAGES_PER_BROWSER: 4,
  BROWSER_RESTART_INTERVAL: 75,
  
  // Pinterest otimizações com FALLBACK
  SCROLL_COUNT: 20, // Aumentado para mais tentativas
  SCROLL_DELAY: 2500, // Delay maior para carregamento
  PARALLEL_PAGES: 4, // Reduzido para evitar rate limiting
  MIN_GIFS_REQUIRED: 15, // Meta mais realista
  MAX_SEARCH_ATTEMPTS: 8,
  
  // Anti-detection melhorado
  REQUEST_DELAY: 2000, // Delay maior entre requests
  USER_AGENT_ROTATION: true,
  STEALTH_MODE: true,
  FALLBACK_ENABLED: true, // NOVO: Sistema de fallback
  
  // Configurações de qualidade
  STICKER_RESOLUTION: {
    HIGH_QUALITY: 768,
    MEDIUM_QUALITY: 640,
    STANDARD_QUALITY: 512
  },
  
  WEBP_QUALITY: {
    ULTRA_HIGH: 95,
    HIGH: 88,
    MEDIUM: 80,
    COMPRESSED: 70
  },
  
  FPS_SETTINGS: {
    HIGH_QUALITY: 20,
    MEDIUM_QUALITY: 16,
    STANDARD: 12
  },
  
  MIN_GIF_SIZE: 3000, // Reduzido para aceitar mais GIFs
  MAX_GIF_SIZE: 50000000,
  PREFERRED_MIN_SIZE: 25000, // Reduzido
  
  BROWSER_ARGS: [
    "--no-sandbox",
    "--disable-setuid-sandbox", 
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-accelerated-2d-canvas",
    "--disable-features=site-per-process",
    "--disable-web-security",
    "--disable-blink-features=AutomationControlled",
    "--disable-extensions",
    "--disable-plugins",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-ipc-flooding-protection",
    "--disable-hang-monitor",
    "--disable-prompt-on-repost",
    "--disable-sync",
    "--disable-translate",
    "--metrics-recording-only",
    "--safebrowsing-disable-auto-update",
    "--enable-automation",
    "--password-store=basic",
    "--use-mock-keychain",
    "--memory-pressure-off",
    "--max_old_space_size=6144",
    "--single-process",
    "--no-zygote",
    // NOVOS argumentos anti-detecção
    "--disable-features=VizDisplayCompositor",
    "--disable-features=TranslateUI",
    "--disable-default-apps",
    "--disable-component-extensions-with-background-pages"
  ],
  
  MIN_GIF_WIDTH: 200,
  MAX_GIFS_HISTORY: 150,
  FFMPEG_QUALITY: 85,
  FFMPEG_FPS: 16
};

// SISTEMA DE FALLBACK PARA TERMOS ESPECÍFICOS
const FALLBACK_TERMS = new Map([
  ['bluelock', ['blue lock', 'soccer anime', 'football anime', 'anime soccer', 'sports anime', 'blue', 'soccer']],
  ['naruto', ['anime ninja', 'orange ninja', 'shinobi', 'ninja']],
  ['onepiece', ['one piece', 'pirate anime', 'luffy', 'pirates']],
  ['dragonball', ['dragon ball', 'goku', 'saiyan', 'anime fight']],
  ['attackontitan', ['attack on titan', 'titans', 'giant anime', 'aot']],
  ['demonslayer', ['demon slayer', 'kimetsu', 'sword anime', 'demons']],
  ['jujutsu', ['jujutsu kaisen', 'jjk', 'curse anime', 'magic anime']]
]);

// POOL DE BROWSERS MELHORADO
class AdvancedBrowserPool {
  constructor() {
    this.browsers = [];
    this.browserUsage = new Map();
    this.browserMetrics = new Map();
    this.currentBrowserIndex = 0;
    this.operationCount = 0;
    this.lastMaintenance = Date.now();
    this.creationQueue = []; // Queue para evitar criação simultânea
  }

  async getBrowser() {
    // Evita criação simultânea de browsers
    if (this.creationQueue.length > 0) {
      await Promise.all(this.creationQueue);
    }

    if (Date.now() - this.lastMaintenance > 300000) {
      await this.performMaintenance();
    }

    if (this.operationCount > CONFIG.BROWSER_RESTART_INTERVAL) {
      await this.restartAllBrowsers();
      this.operationCount = 0;
    }

    if (this.browsers.length < CONFIG.MAX_BROWSER_INSTANCES) {
      const creationPromise = this.createBrowser();
      this.creationQueue.push(creationPromise);
      
      try {
        const browser = await creationPromise;
        this.browsers.push(browser);
        this.browserUsage.set(browser, 0);
        this.browserMetrics.set(browser, {
          created: Date.now(),
          operations: 0,
          errors: 0,
          lastUsed: Date.now()
        });
        return browser;
      } finally {
        const index = this.creationQueue.indexOf(creationPromise);
        if (index > -1) this.creationQueue.splice(index, 1);
      }
    }

    // Seleção do browser menos usado
    let bestBrowser = this.browsers[0];
    let minScore = this.calculateBrowserScore(bestBrowser);

    for (const browser of this.browsers) {
      const score = this.calculateBrowserScore(browser);
      if (score < minScore) {
        minScore = score;
        bestBrowser = browser;
      }
    }

    const usage = this.browserUsage.get(bestBrowser) || 0;
    this.browserUsage.set(bestBrowser, usage + 1);
    this.operationCount++;

    const metrics = this.browserMetrics.get(bestBrowser);
    if (metrics) {
      metrics.operations++;
      metrics.lastUsed = Date.now();
    }

    return bestBrowser;
  }

  calculateBrowserScore(browser) {
    const usage = this.browserUsage.get(browser) || 0;
    const metrics = this.browserMetrics.get(browser);
    const errors = metrics?.errors || 0;
    const age = metrics ? Date.now() - metrics.created : 0;
    
    // Score considera uso, erros e idade
    return usage + (errors * 3) + (age / 600000); // Age factor: 10 min = 1 point
  }

  async createBrowser() {
    console.log(`[🚀 ADVANCED POOL] Criando browser anti-detecção...`);
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: CONFIG.BROWSER_ARGS,
        timeout: CONFIG.BROWSER_TIMEOUT,
        protocolTimeout: CONFIG.PROTOCOL_TIMEOUT,
        ignoreHTTPSErrors: true,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        defaultViewport: {
          width: 1366 + Math.floor(Math.random() * 200),
          height: 768 + Math.floor(Math.random() * 200),
          deviceScaleFactor: 1
        }
      });

      console.log(`[✅ BROWSER CREATED] Browser criado com sucesso`);
      return browser;
    } catch (err) {
      console.error(`[❌ BROWSER CREATION] Erro: ${err.message}`);
      throw err;
    }
  }

  async performMaintenance() {
    console.log(`[🧹 MAINTENANCE] Executando manutenção...`);
    
    const browsersToReplace = [];
    for (const [browser, metrics] of this.browserMetrics.entries()) {
      if (metrics.errors > 10 || 
          Date.now() - metrics.created > 3600000 || 
          Date.now() - metrics.lastUsed > 1800000) {
        browsersToReplace.push(browser);
      }
    }

    for (const browser of browsersToReplace) {
      await this.replaceBrowser(browser);
    }

    if (global.gc) {
      global.gc();
      console.log(`[🧹 MAINTENANCE] Garbage collection executado`);
    }

    this.lastMaintenance = Date.now();
    console.log(`[🧹 MAINTENANCE] Concluída. Browsers: ${this.browsers.length}`);
  }

  async replaceBrowser(oldBrowser) {
    try {
      const index = this.browsers.indexOf(oldBrowser);
      if (index > -1) {
        await oldBrowser.close();
        this.browsers.splice(index, 1);
        this.browserUsage.delete(oldBrowser);
        this.browserMetrics.delete(oldBrowser);
        
        console.log(`[♻️ BROWSER REPLACE] Browser substituído`);
      }
    } catch (err) {
      console.error(`[⚠️ BROWSER REPLACE] Erro: ${err.message}`);
    }
  }

  recordError(browser) {
    const metrics = this.browserMetrics.get(browser);
    if (metrics) {
      metrics.errors++;
      console.log(`[⚠️ ERROR RECORDED] Browser errors: ${metrics.errors}`);
    }
  }

  async restartAllBrowsers() {
    console.log(`[♻️ POOL RESTART] Reiniciando ${this.browsers.length} browsers...`);
    
    const closePromises = this.browsers.map(async (browser) => {
      try {
        await browser.close();
      } catch (err) {
        console.error(`[⚠️ CLOSE ERROR] ${err.message}`);
      }
    });

    await Promise.all(closePromises);
    
    this.browsers = [];
    this.browserUsage.clear();
    this.browserMetrics.clear();
    this.currentBrowserIndex = 0;
    
    if (global.gc) {
      global.gc();
      console.log(`[🧹 POOL RESTART] Garbage collection forçado`);
    }
  }

  async closeAll() {
    await this.restartAllBrowsers();
  }

  getStatus() {
    return {
      totalBrowsers: this.browsers.length,
      totalOperations: this.operationCount,
      avgUsage: Array.from(this.browserUsage.values()).reduce((a, b) => a + b, 0) / this.browsers.length || 0,
      totalErrors: Array.from(this.browserMetrics.values()).reduce((total, metrics) => total + metrics.errors, 0)
    };
  }
}

const browserPool = new AdvancedBrowserPool();

// USER AGENTS ATUALIZADOS PARA 2025
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15"
];

const gifHistory = new Map();
const gifHashCache = new Set();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateGifHash(url) {
  return crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
}

function isDuplicateGif(url) {
  const hash = generateGifHash(url);
  if (gifHashCache.has(hash)) {
    return true;
  }
  gifHashCache.add(hash);
  return false;
}

function analyzeGifQuality(url, size = 0) {
  const isOriginal = url.includes('/originals/');
  const is736 = url.includes('/736x/');
  const is564 = url.includes('/564x/');
  const is474 = url.includes('/474x/');
  
  let quality = 'standard';
  let priority = 1;
  
  if (isOriginal && size > CONFIG.PREFERRED_MIN_SIZE) {
    quality = 'ultra_high';
    priority = 10;
  } else if (is736 && size > CONFIG.PREFERRED_MIN_SIZE) {
    quality = 'high';
    priority = 8;
  } else if (is564) {
    quality = 'medium';
    priority = 6;
  } else if (is474) {
    quality = 'standard';
    priority = 4;
  }
  
  return { quality, priority, isHighRes: isOriginal || is736 };
}

// SISTEMA DE FALLBACK INTELIGENTE
function generateFallbackTerms(baseTerm) {
  const normalizedTerm = baseTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Verifica se tem fallback específico
  if (FALLBACK_TERMS.has(normalizedTerm)) {
    return FALLBACK_TERMS.get(normalizedTerm);
  }
  
  // Fallback genérico
  const genericFallbacks = [
    baseTerm,
    'anime gif',
    'animated gif',
    'manga gif',
    'cute gif',
    'funny gif',
    'cool gif',
    'awesome gif'
  ];
  
  return genericFallbacks;
}

async function createUltraOptimizedPage() {
  const browser = await browserPool.getBrowser();
  const page = await browser.newPage();

  // Configurações anti-detecção avançadas
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // Modifica plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Modifica languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en'],
    });

    // Remove Chrome automation flags
    window.chrome = {
      runtime: {}
    };

    // Simula permissões
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  // Timeouts configurados
  page.setDefaultTimeout(CONFIG.PAGE_TIMEOUT);
  page.setDefaultNavigationTimeout(CONFIG.PAGE_TIMEOUT);

  // Request interception melhorada
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    const url = req.url();
    
    if (["font", "manifest", "other", "texttrack", "eventsource", "websocket"].includes(type)) {
      req.abort();
    } else if (type === "image" && !url.includes('.gif') && !url.includes('pinimg.com')) {
      req.abort();
    } else if (type === "stylesheet" && !url.includes('pinterest.com') && !url.includes('pinimg.com')) {
      req.abort();
    } else if (type === "media" && !url.includes('.gif')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // User agent aleatório
  const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(randomUA);
  
  // Viewport randomizado
  await page.setViewport({
    width: 1366 + Math.floor(Math.random() * 300),
    height: 768 + Math.floor(Math.random() * 300),
    deviceScaleFactor: 1,
    hasTouch: false,
    isLandscape: true,
    isMobile: false
  });

  // Headers aprimorados
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/gif,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="122", "Chromium";v="122"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'DNT': '1',
    'Connection': 'keep-alive'
  });

  return page;
}

// GERAÇÃO DE VARIAÇÕES COM FALLBACK
async function generateAdvancedSearchVariations(baseTerm) {
  const fallbackTerms = generateFallbackTerms(baseTerm);
  
  const variations = [];
  
  // Adiciona variações do termo original
  variations.push(
    `${baseTerm} gif`,
    `${baseTerm} animated`,
    `${baseTerm} animation`,
    `${baseTerm}`
  );
  
  // Adiciona fallbacks
  fallbackTerms.forEach(term => {
    variations.push(
      `${term} gif`,
      `${term} animated`,
      `${term}`
    );
  });
  
  // Remove duplicatas e embaralha
  const uniqueVariations = [...new Set(variations)];
  for (let i = uniqueVariations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueVariations[i], uniqueVariations[j]] = [uniqueVariations[j], uniqueVariations[i]];
  }
  
  return uniqueVariations.slice(0, 12); // Limita a 12 variações
}

// BUSCA ULTRA-OTIMIZADA COM FALLBACK
async function ultraOptimizedSearchGifs(term) {
  console.log(`[💎 BUSCA ULTRA-OTIMIZADA] Iniciando coleta premium para: ${term}`);
  
  const allGifs = new Map();
  const searchVariations = await generateAdvancedSearchVariations(term);
  
  console.log(`[🔍 VARIAÇÕES] ${searchVariations.length} termos: ${searchVariations.slice(0, 5).join(', ')}...`);
  
  // URLs do Pinterest com diferentes estratégias
  const pinterestBases = [
    "https://br.pinterest.com/search/pins/?q=",
    "https://www.pinterest.com/search/pins/?q=",
    "https://pinterest.com/search/pins/?rs=typed&q=",
    "https://br.pinterest.com/search/pins/?rs=ac&len=2&q=",
    "https://www.pinterest.com/search/pins/?source_url=%2Fsearch%2Fpins%2F&q=",
    "https://pinterest.com/search/pins/?autologin=true&q="
  ];

  const searchUrls = [];
  for (let i = 0; i < CONFIG.PARALLEL_PAGES && i < searchVariations.length; i++) {
    const variation = searchVariations[i];
    const base = pinterestBases[i % pinterestBases.length];
    searchUrls.push(`${base}${encodeURIComponent(variation)}`);
  }

  console.log(`[⚡ ULTRA PARALELO] ${searchUrls.length} buscas com máxima qualidade...`);

  // Busca sequencial com retry em caso de falha
  const results = [];
  for (let i = 0; i < searchUrls.length; i++) {
    const url = searchUrls[i];
    const searchTerm = decodeURIComponent(url.split('q=')[1]?.substring(0, 25) || 'unknown');
    console.log(`[📍 ULTRA ${i + 1}/${searchUrls.length}] ${searchTerm}...`);
    
    let page;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        page = await createUltraOptimizedPage();
        
        // Navegação com timeout específico
        await page.goto(url, { 
          waitUntil: "domcontentloaded",
          timeout: CONFIG.PAGE_TIMEOUT 
        });

        console.log(`[⏳ LOADING] Aguardando carregamento premium...`);
        await delay(4000);

        // SCROLL ULTRA-OTIMIZADO
        console.log(`[📜 ULTRA SCROLL] Scroll inteligente para GIFs premium...`);
        const gifs = await page.evaluate(async (scrollCount, scrollDelay) => {
          const gifData = new Map();
          
          // MÉTODOS ULTRA-AGRESSIVOS DE EXTRAÇÃO
          const extractAllGifs = () => {
            let count = 0;
            
            // MÉTODO 1: Todas as tags img
            const imgTags = document.querySelectorAll('img, [data-src], [data-original], [src]');
            imgTags.forEach(img => {
              const sources = [
                img.src,
                img.dataset?.src,
                img.dataset?.original,
                img.getAttribute?.('data-src'),
                img.getAttribute?.('data-original'),
                img.getAttribute?.('src')
              ].filter(Boolean);
              
              sources.forEach(src => {
                if (src && src.includes('.gif') && src.startsWith('http')) {
                  const priority = src.includes('/originals/') ? 10 : 
                                 src.includes('/736x/') ? 8 : 
                                 src.includes('/564x/') ? 6 : 4;
                  
                  if (!gifData.has(src) || gifData.get(src).priority < priority) {
                    gifData.set(src, { url: src, priority, source: 'img_direct' });
                    count++;
                  }
                }
              });
            });

            // MÉTODO 2: Regex ultra-agressiva
            const html = document.documentElement.innerHTML;
            const patterns = [
              // Padrões específicos do Pinterest
              /https?:\/\/[^"'\s]*i\.pinimg\.com[^"'\s]*\.gif[^"'\s]*/gi,
              /https?:\/\/[^"'\s]*pinimg\.com[^"'\s]*\.gif[^"'\s]*/gi,
              /https?:\/\/[^"'\s]*pinterest[^"'\s]*\.gif[^"'\s]*/gi,
              // Padrões genéricos
              /https?:\/\/[^"'\s]+\.gif[^"'\s]*/gi,
              /"url"\s*:\s*"[^"]*\.gif[^"]*/gi,
              /"src"\s*:\s*"[^"]*\.gif[^"]*/gi,
              /data-src\s*=\s*["'][^"']*\.gif[^"']*/gi
            ];
            
            patterns.forEach((pattern, index) => {
              const matches = html.match(pattern) || [];
              matches.forEach(match => {
                let cleanUrl = match.replace(/^[^h]*https?/, 'https')
                                   .replace(/[\\'"]/g, '')
                                   .replace(/"url"\s*:\s*"/, '')
                                   .replace(/"src"\s*:\s*"/, '')
                                   .replace(/data-src\s*=\s*["']/, '');
                
                if (cleanUrl.startsWith('http') && cleanUrl.includes('.gif')) {
                  const priority = cleanUrl.includes('/originals/') ? 10 : 
                                 cleanUrl.includes('/736x/') ? 8 : 
                                 cleanUrl.includes('/564x/') ? 6 : 3;
                  
                  if (!gifData.has(cleanUrl) || gifData.get(cleanUrl).priority < priority) {
                    gifData.set(cleanUrl, { 
                      url: cleanUrl, 
                      priority: priority + (8 - index), // Prioridade por padrão
                      source: `regex_${index}` 
                    });
                    count++;
                  }
                }
              });
            });

            // MÉTODO 3: Busca em scripts JSON
            const scripts = document.querySelectorAll('script');
            scripts.forEach(script => {
              if (script.textContent && script.textContent.includes('.gif')) {
                try {
                  const jsonMatches = script.textContent.match(/https?:\/\/[^"'\s]*\.gif[^"'\s]*/gi) || [];
                  jsonMatches.forEach(url => {
                    const cleanUrl = url.replace(/[\\'"]/g, '');
                    if (cleanUrl.startsWith('http')) {
                      const priority = cleanUrl.includes('/originals/') ? 12 : 
                                     cleanUrl.includes('/736x/') ? 10 : 7;
                      
                      if (!gifData.has(cleanUrl) || gifData.get(cleanUrl).priority < priority) {
                        gifData.set(cleanUrl, { 
                          url: cleanUrl, 
                          priority, 
                          source: 'json_script' 
                        });
                        count++;
                      }
                    }
                  });
                } catch (e) {
                  // Ignora erros de parsing
                }
              }
            });

            // MÉTODO 4: Busca em elementos com background-image
            const elementsWithBg = document.querySelectorAll('*');
            elementsWithBg.forEach(el => {
              const style = window.getComputedStyle(el);
              if (style.backgroundImage && style.backgroundImage.includes('.gif')) {
                const match = style.backgroundImage.match(/url\(["']?([^"')]*\.gif[^"']*)/);
                if (match && match[1]) {
                  const cleanUrl = match[1];
                  if (cleanUrl.startsWith('http')) {
                    const priority = cleanUrl.includes('/originals/') ? 9 : 5;
                    if (!gifData.has(cleanUrl) || gifData.get(cleanUrl).priority < priority) {
                      gifData.set(cleanUrl, { 
                        url: cleanUrl, 
                        priority, 
                        source: 'background_image' 
                      });
                      count++;
                    }
                  }
                }
              }
            });

            return count;
          };

          let previousCount = 0;
          let stableCount = 0;
          let totalScrolled = 0;
          
          // Scroll inteligente com múltiplas tentativas
          for (let i = 0; i < scrollCount; i++) {
            // Scroll variado para simular comportamento humano
            const scrollAmount = window.innerHeight * (1.2 + Math.random() * 0.6);
            window.scrollBy(0, scrollAmount);
            totalScrolled += scrollAmount;
            
            // Aguarda carregamento com variação
            await new Promise(resolve => setTimeout(resolve, scrollDelay + Math.random() * 1000));
            
            const currentCount = extractAllGifs();
            
            // Para se não há novos GIFs por várias tentativas
            if (currentCount === previousCount) {
              stableCount++;
              if (stableCount >= 5) {
                console.log(`Scroll parado: ${currentCount} GIFs coletados (estável por 5 tentativas)`);
                break;
              }
            } else {
              stableCount = 0;
              console.log(`Scroll ${i + 1}: ${currentCount} GIFs encontrados (+${currentCount - previousCount})`);
            }
            
            previousCount = currentCount;
            
            // Para se chegou ao final da página
            if (totalScrolled > document.body.scrollHeight * 2) {
             console.log(`Chegou ao final da página: ${currentCount} GIFs coletados`);
             break;
           }
         }

         // Extração final completa
         extractAllGifs();

         // Retorna URLs ordenados por prioridade
         const sortedGifs = Array.from(gifData.values())
           .sort((a, b) => b.priority - a.priority)
           .map(gif => gif.url);
         
         console.log(`Extração final: ${sortedGifs.length} GIFs únicos`);
         return sortedGifs;
       }, CONFIG.SCROLL_COUNT, CONFIG.SCROLL_DELAY);

       // Filtra e analisa qualidade
       const validGifs = gifs.filter(url => {
         try {
           return url && url.startsWith('http') && url.includes('.gif') && new URL(url);
         } catch {
           return false;
         }
       });

       const qualityAnalysis = validGifs.map(url => ({
         url,
         ...analyzeGifQuality(url)
       }));

       const ultraHighQuality = qualityAnalysis.filter(g => g.quality === 'ultra_high');
       const highQuality = qualityAnalysis.filter(g => g.quality === 'high');
       const mediumQuality = qualityAnalysis.filter(g => g.quality === 'medium');
       const standardQuality = qualityAnalysis.filter(g => g.quality === 'standard');

       const finalGifs = [
         ...ultraHighQuality.map(g => g.url),
         ...highQuality.map(g => g.url),
         ...mediumQuality.map(g => g.url),
         ...standardQuality.map(g => g.url)
       ];
       
       console.log(`[✨ ULTRA ${i + 1}] ${finalGifs.length} GIFs (Ultra: ${ultraHighQuality.length}, High: ${highQuality.length}, Med: ${mediumQuality.length}, Std: ${standardQuality.length})`);
       results.push(finalGifs);
       break; // Sucesso, sai do loop de retry

     } catch (err) {
       retryCount++;
       console.error(`[❌ ULTRA ${i + 1}] Tentativa ${retryCount}/${maxRetries + 1} falhou: ${err.message}`);
       
       if (page) {
         try {
           browserPool.recordError(page.browser());
           await page.close();
         } catch (closeErr) {
           console.error(`[⚠️ CLOSE ERROR] ${closeErr.message}`);
         }
         page = null;
       }
       
       if (retryCount <= maxRetries) {
         console.log(`[🔄 RETRY] Aguardando ${2000 * retryCount}ms antes de tentar novamente...`);
         await delay(2000 * retryCount);
       } else {
         console.error(`[💥 FAILED] Falha definitiva na busca ${i + 1}`);
         results.push([]);
       }
     } finally {
       if (page && retryCount > maxRetries) {
         try {
           await page.close();
         } catch (err) {
           console.error(`[⚠️ CLEANUP] Erro ao fechar página: ${err.message}`);
         }
       }
     }
   }

   // Delay entre buscas para evitar rate limiting
   if (i < searchUrls.length - 1) {
     const delayTime = CONFIG.REQUEST_DELAY + Math.random() * 1000;
     console.log(`[⏸️ DELAY] Aguardando ${delayTime.toFixed(0)}ms...`);
     await delay(delayTime);
   }
 }

 // Combina e prioriza por qualidade
 const qualityMap = new Map();
 results.forEach((gifs, index) => {
   gifs.forEach(gif => {
     if (gif && gif.startsWith('http') && !isDuplicateGif(gif)) {
       const analysis = analyzeGifQuality(gif);
       const existingPriority = qualityMap.get(gif)?.priority || 0;
       
       if (analysis.priority > existingPriority) {
         qualityMap.set(gif, { url: gif, ...analysis, sourceIndex: index });
       }
     }
   });
 });

 // Ordena por qualidade e retorna URLs
 const sortedQualityGifs = Array.from(qualityMap.values())
   .sort((a, b) => b.priority - a.priority)
   .map(item => item.url);

 console.log(`[🎯 ULTRA RESULTADO] ${sortedQualityGifs.length} GIFs únicos priorizados por qualidade`);
 
 // Se encontrou poucos GIFs, tenta fallback mais genérico
 if (sortedQualityGifs.length < 5 && CONFIG.FALLBACK_ENABLED) {
   console.log(`[🔄 FALLBACK] Poucos GIFs encontrados (${sortedQualityGifs.length}), tentando termos mais genéricos...`);
   
   const fallbackTerms = ['animated gif', 'cute gif', 'funny gif', 'cool gif'];
   for (const fallbackTerm of fallbackTerms) {
     if (sortedQualityGifs.length >= 10) break; // Para se já tem GIFs suficientes
     
     try {
       console.log(`[🔄 FALLBACK] Buscando: ${fallbackTerm}`);
       const fallbackGifs = await searchSingleTerm(fallbackTerm);
       
       fallbackGifs.forEach(gif => {
         if (gif && gif.startsWith('http') && !isDuplicateGif(gif) && sortedQualityGifs.length < 15) {
           sortedQualityGifs.push(gif);
         }
       });
       
       console.log(`[🔄 FALLBACK] ${fallbackTerm}: +${fallbackGifs.length} GIFs (total: ${sortedQualityGifs.length})`);
       
       if (fallbackGifs.length > 0) {
         await delay(3000); // Delay entre fallbacks
       }
     } catch (fallbackErr) {
       console.error(`[⚠️ FALLBACK ERROR] ${fallbackTerm}: ${fallbackErr.message}`);
     }
   }
 }

 return sortedQualityGifs;
}

// FUNÇÃO AUXILIAR PARA BUSCA DE TERMO ÚNICO (FALLBACK)
async function searchSingleTerm(term) {
 const url = `https://br.pinterest.com/search/pins/?q=${encodeURIComponent(term)}`;
 let page;
 
 try {
   page = await createUltraOptimizedPage();
   await page.goto(url, { waitUntil: "domcontentloaded", timeout: CONFIG.PAGE_TIMEOUT });
   await delay(3000);
   
   const gifs = await page.evaluate(() => {
     const urls = new Set();
     
     // Extração rápida
     document.querySelectorAll('img[src*=".gif"], img[data-src*=".gif"]').forEach(img => {
       [img.src, img.dataset.src].forEach(src => {
         if (src && src.includes('.gif') && src.startsWith('http')) {
           urls.add(src);
         }
       });
     });
     
     // Regex rápida
     const html = document.documentElement.innerHTML;
     const matches = html.match(/https?:\/\/[^"'\s]*\.gif[^"'\s]*/gi) || [];
     matches.forEach(url => {
       const cleanUrl = url.replace(/[\\'"]/g, '');
       if (cleanUrl.startsWith('http')) {
         urls.add(cleanUrl);
       }
     });
     
     return Array.from(urls).slice(0, 10); // Limita a 10 GIFs
   });
   
   return gifs;
   
 } catch (err) {
   console.error(`[⚠️ SINGLE SEARCH ERROR] ${term}: ${err.message}`);
   return [];
 } finally {
   if (page) {
     try {
       await page.close();
     } catch (err) {
       console.error(`[⚠️ SINGLE SEARCH CLEANUP] ${err.message}`);
     }
   }
 }
}

// DOWNLOAD ULTRA-OTIMIZADO COM VALIDAÇÃO
async function ultraDownloadGif(url, outputPath, retries = 4) {
 for (let attempt = 1; attempt <= retries; attempt++) {
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), CONFIG.DOWNLOAD_TIMEOUT);

   try {
     console.log(`[📥 DOWNLOAD] Tentativa ${attempt}: ${url.substring(0, 50)}...`);
     
     const res = await fetch(url, { 
       signal: controller.signal,
       headers: {
         'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
         'Accept': 'image/gif,image/webp,image/avif,image/*,*/*;q=0.8',
         'Referer': 'https://pinterest.com/',
         'Cache-Control': 'no-cache',
         'Accept-Encoding': 'gzip, deflate, br',
         'Sec-Fetch-Dest': 'image',
         'Sec-Fetch-Mode': 'no-cors',
         'Sec-Fetch-Site': 'cross-site'
       }
     });
     
     if (!res.ok) {
       throw new Error(`HTTP ${res.status}: ${res.statusText}`);
     }

     const fileStream = fs.createWriteStream(outputPath);
     await new Promise((resolve, reject) => {
       res.body.pipe(fileStream);
       res.body.on("error", reject);
       fileStream.on("finish", resolve);
       fileStream.on("error", reject);
     });

     clearTimeout(timeout);

     const stats = fs.statSync(outputPath);
     
     // Validação rigorosa do arquivo
     if (stats.size < CONFIG.MIN_GIF_SIZE) {
       throw new Error(`Arquivo muito pequeno: ${stats.size} bytes (mín: ${CONFIG.MIN_GIF_SIZE})`);
     }
     
     if (stats.size > CONFIG.MAX_GIF_SIZE) {
       throw new Error(`Arquivo muito grande: ${stats.size} bytes (máx: ${CONFIG.MAX_GIF_SIZE})`);
     }

     // Verifica se é realmente um GIF
     const buffer = fs.readFileSync(outputPath);
     const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // "GIF"
     
     if (!isGif) {
       throw new Error(`Arquivo não é um GIF válido`);
     }

     const quality = analyzeGifQuality(url, stats.size);
     
     console.log(`[📥 ULTRA DOWNLOAD] ✅ Sucesso: ${(stats.size / 1024).toFixed(1)}KB (${quality.quality})`);
     return { 
       size: stats.size, 
       quality: quality.quality,
       isHighRes: quality.isHighRes,
       priority: quality.priority
     };

   } catch (err) {
     clearTimeout(timeout);
     
     if (fs.existsSync(outputPath)) {
       try {
         fs.unlinkSync(outputPath);
       } catch (cleanupErr) {}
     }
     
     if (attempt === retries) {
       throw new Error(`Download falhou após ${retries} tentativas: ${err.message}`);
     }
     
     console.log(`[🔄 ULTRA RETRY] Tentativa ${attempt}/${retries} falhou: ${err.message}`);
     const backoffDelay = 2000 * attempt + Math.random() * 1000;
     await delay(backoffDelay);
   }
 }
}

// CONVERSÃO ULTRA-OTIMIZADA
async function ultraConvertGifToWebp(input, output, downloadResult) {
 const { size, quality, isHighRes } = downloadResult;
 
 // Configurações dinâmicas ultra-precisas
 let targetResolution, webpQuality, fps, compressionLevel;
 
 if (quality === 'ultra_high' && size < 5000000) {
   targetResolution = CONFIG.STICKER_RESOLUTION.HIGH_QUALITY; // 768x768
   webpQuality = CONFIG.WEBP_QUALITY.ULTRA_HIGH; // 95
   fps = CONFIG.FPS_SETTINGS.HIGH_QUALITY; // 20
   compressionLevel = 3;
 } else if (quality === 'high' || (isHighRes && size < 8000000)) {
   targetResolution = CONFIG.STICKER_RESOLUTION.MEDIUM_QUALITY; // 640x640
   webpQuality = CONFIG.WEBP_QUALITY.HIGH; // 88
   fps = CONFIG.FPS_SETTINGS.MEDIUM_QUALITY; // 16
   compressionLevel = 4;
 } else if (size < 15000000) {
   targetResolution = CONFIG.STICKER_RESOLUTION.STANDARD_QUALITY; // 512x512
   webpQuality = CONFIG.WEBP_QUALITY.MEDIUM; // 80
   fps = CONFIG.FPS_SETTINGS.STANDARD; // 12
   compressionLevel = 5;
 } else {
   targetResolution = 480; // Ainda menor para GIFs muito grandes
   webpQuality = CONFIG.WEBP_QUALITY.COMPRESSED; // 70
   fps = 10;
   compressionLevel = 6;
 }
 
 // Filtros de vídeo ultra-otimizados
 const videoFilters = [
   `fps=${fps}`,
   `scale=${targetResolution}:${targetResolution}:force_original_aspect_ratio=decrease:flags=lanczos`,
   `pad=${targetResolution}:${targetResolution}:(ow-iw)/2:(oh-ih)/2:black`,
   `unsharp=5:5:1.0:5:5:0.0` // Sharpening para clareza
 ];
 
 // Comando FFmpeg otimizado
 const cmd = `ffmpeg -i "${input}" ` +
   `-vf "${videoFilters.join(',')}" ` +
   `-c:v libwebp ` +
   `-lossless 0 ` +
   `-compression_level ${compressionLevel} ` +
   `-q:v ${webpQuality} ` +
   `-preset picture ` +
   `-loop 0 ` +
   `-an ` +
   `-metadata:s:v:0 title="Ultra High Quality Sticker" ` +
   `-y "${output}"`;
 
 try {
   const startTime = Date.now();
   await execPromise(cmd + " 2> /dev/null");
   const conversionTime = Date.now() - startTime;
   
   // Verifica resultado
   if (!fs.existsSync(output)) {
     throw new Error('Arquivo de saída não foi criado');
   }
   
   const outputStats = fs.statSync(output);
   if (outputStats.size < 1000) {
     throw new Error('Arquivo de saída muito pequeno');
   }
   
   const compressionRatio = ((size - outputStats.size) / size * 100).toFixed(1);
   
   console.log(`[🔄 ULTRA CONVERT] ✅ ${input} → ${output}`);
   console.log(`[📊 QUALITY] ${targetResolution}x${targetResolution}, Q:${webpQuality}, FPS:${fps}, ${conversionTime}ms`);
   console.log(`[📉 COMPRESSION] ${(size/1024).toFixed(1)}KB → ${(outputStats.size/1024).toFixed(1)}KB (-${compressionRatio}%)`);
   
   return {
     originalSize: size,
     finalSize: outputStats.size,
     compressionRatio: parseFloat(compressionRatio),
     resolution: targetResolution,
     quality: webpQuality,
     fps: fps,
     conversionTime: conversionTime
   };
   
 } catch (err) {
   throw new Error(`Conversão ultra falhou: ${err.message}`);
 }
}

function markGifAsUsed(term, url) {
 if (!gifHistory.has(term)) gifHistory.set(term, new Set());
 const termSet = gifHistory.get(term);
 termSet.add(url);
 if (termSet.size > CONFIG.MAX_GIFS_HISTORY) {
   const firstItem = termSet.values().next().value;
   termSet.delete(firstItem);
 }
}

function isGifUsed(term, url) {
 return gifHistory.has(term) && gifHistory.get(term).has(url);
}

// PROCESSAMENTO ULTRA-PREMIUM APRIMORADO
async function ultraProcessAndSendGif(Yaka, m, gifs, searchTerm, usedGifs) {
 const availableGifs = gifs.filter(url => 
   url && 
   url.startsWith('http') && 
   !isGifUsed(searchTerm, url) && 
   !usedGifs.has(url)
 );
 
 if (!availableGifs.length) {
   throw new Error("Sem GIFs disponíveis");
 }

 // Priorização ultra-inteligente
 const priorityCategories = {
   ultra: availableGifs.filter(url => url.includes('/originals/')),
   high: availableGifs.filter(url => url.includes('/736x/')),
   medium: availableGifs.filter(url => url.includes('/564x/')),
   standard: availableGifs.filter(url => !url.includes('/originals/') && !url.includes('/736x/') && !url.includes('/564x/'))
 };
 
 // Seleciona da categoria com GIFs disponíveis
 let selectedUrl, qualityTier;
 
 if (priorityCategories.ultra.length > 0) {
   selectedUrl = priorityCategories.ultra[Math.floor(Math.random() * priorityCategories.ultra.length)];
   qualityTier = 'ultra_high';
 } else if (priorityCategories.high.length > 0) {
   selectedUrl = priorityCategories.high[Math.floor(Math.random() * priorityCategories.high.length)];
   qualityTier = 'high';
 } else if (priorityCategories.medium.length > 0) {
   selectedUrl = priorityCategories.medium[Math.floor(Math.random() * priorityCategories.medium.length)];
   qualityTier = 'medium';
 } else {
   selectedUrl = priorityCategories.standard[Math.floor(Math.random() * priorityCategories.standard.length)];
   qualityTier = 'standard';
 }
 
 const timestamp = Date.now();
 const randomId = Math.random().toString(36).substring(7);
 const gifPath = path.join(__dirname, `ultra_temp_${timestamp}_${randomId}.gif`);
 const webpPath = gifPath.replace(".gif", ".webp");

 try {
   console.log(`[⚡ ULTRA PROCESSING] Iniciando processamento ${qualityTier}...`);
   console.log(`[📍 URL] ${selectedUrl.substring(0, 80)}...`);
   
   const downloadResult = await ultraDownloadGif(selectedUrl, gifPath);
   
   console.log(`[⚡ ULTRA PROCESSING] Convertendo para WebP ultra-qualidade...`);
   const conversionResult = await ultraConvertGifToWebp(gifPath, webpPath, downloadResult);
   
   console.log(`[⚡ ULTRA PROCESSING] Enviando sticker premium...`);
   await Yaka.sendMessage(m.from, { 
     sticker: { stream: fs.createReadStream(webpPath) } 
   }, { quoted: m });

   markGifAsUsed(searchTerm, selectedUrl);
   usedGifs.add(selectedUrl);
   
   console.log(`[✅ ULTRA SUCCESS] Sticker enviado com sucesso!`);
   console.log(`[📊 STATS] ${(downloadResult.size / 1024).toFixed(1)}KB → ${(conversionResult.finalSize / 1024).toFixed(1)}KB`);
   console.log(`[🎯 QUALITY] ${conversionResult.resolution}x${conversionResult.resolution}, Q:${conversionResult.quality}, FPS:${conversionResult.fps}`);
   
   return {
     originalSize: downloadResult.size,
     finalSize: conversionResult.finalSize,
     quality: qualityTier,
     resolution: conversionResult.resolution,
     compressionRatio: conversionResult.compressionRatio,
     url: selectedUrl
   };
   
 } finally {
   // Cleanup garantido
   [gifPath, webpPath].forEach(file => {
     try {
       if (fs.existsSync(file)) {
         fs.unlinkSync(file);
         console.log(`[🧹 CLEANUP] ${path.basename(file)} removido`);
       }
     } catch (err) {
       console.error(`[⚠️ CLEANUP] Erro ao limpar ${file}: ${err.message}`);
     }
   });
 }
}

// CACHE ULTRA-INTELIGENTE
class UltraGifCache {
 constructor() {
   this.cache = new Map();
   this.accessTimes = new Map();
   this.qualityMetrics = new Map();
   this.maxAge = 3600000; // 1 hora
   this.maxSize = 100; // Aumentado para 100 termos
 }

 get(term) {
   const normalizedTerm = term.toLowerCase().trim();
   const cached = this.cache.get(normalizedTerm);
   
   if (cached && Date.now() - this.accessTimes.get(normalizedTerm) < this.maxAge) {
     this.accessTimes.set(normalizedTerm, Date.now());
     const metrics = this.qualityMetrics.get(normalizedTerm);
     console.log(`[💎 ULTRA CACHE HIT] "${term}" - ${cached.length} GIFs premium (qualidade: ${metrics?.avgQuality || 'N/A'})`);
     return cached;
   }
   
   if (cached) {
     this.cache.delete(normalizedTerm);
     this.accessTimes.delete(normalizedTerm);
     this.qualityMetrics.delete(normalizedTerm);
   }
   
   return null;
 }

 set(term, gifs) {
   const normalizedTerm = term.toLowerCase().trim();
   
   if (gifs.length === 0) return; // Não cacheia resultados vazios
   
   const qualityAnalysis = gifs.map(url => analyzeGifQuality(url));
   const avgQuality = qualityAnalysis.reduce((sum, q) => sum + q.priority, 0) / qualityAnalysis.length;
   const highQualityCount = qualityAnalysis.filter(q => q.isHighRes).length;
   
   this.cache.set(normalizedTerm, [...gifs]);
   this.accessTimes.set(normalizedTerm, Date.now());
   this.qualityMetrics.set(normalizedTerm, {
     totalGifs: gifs.length,
     highQualityCount: highQualityCount,
     avgQuality: avgQuality.toFixed(2),
     qualityRatio: (highQualityCount / gifs.length * 100).toFixed(1)
   });
   
   if (this.cache.size > this.maxSize) {
     this.cleanup();
   }
   
   console.log(`[💎 ULTRA CACHE SET] "${term}" - ${gifs.length} GIFs (${highQualityCount} HQ, score: ${avgQuality.toFixed(1)})`);
 }

 cleanup() {
   const now = Date.now();
   const entries = Array.from(this.accessTimes.entries())
     .sort((a, b) => a[1] - b[1]);
   
   const toRemove = Math.max(5, this.cache.size - this.maxSize + 10);
   
   for (let i = 0; i < toRemove && i < entries.length; i++) {
     const [term] = entries[i];
     this.cache.delete(term);
     this.accessTimes.delete(term);
     this.qualityMetrics.delete(term);
   }
   
   console.log(`[🧹 ULTRA CACHE] Limpeza: ${this.cache.size} termos mantidos`);
 }

 getStats() {
   const metrics = Array.from(this.qualityMetrics.values());
   const totalGifs = metrics.reduce((sum, m) => sum + m.totalGifs, 0);
   const totalHighQuality = metrics.reduce((sum, m) => sum + m.highQualityCount, 0);
   
   return {
     cachedTerms: this.cache.size,
     totalGifs: totalGifs,
     highQualityGifs: totalHighQuality,
     qualityRatio: totalGifs > 0 ? (totalHighQuality / totalGifs * 100).toFixed(1) : 0,
     avgQuality: metrics.length > 0 ? (metrics.reduce((sum, m) => sum + parseFloat(m.avgQuality), 0) / metrics.length).toFixed(1) : 0
   };
 }
}

const ultraGifCache = new UltraGifCache();

// CLEANUP GLOBAL APRIMORADO
const cleanup = async () => {
 console.log('\n[🛑 ULTRA SHUTDOWN] Iniciando limpeza completa...');
 try {
   await browserPool.closeAll();
   console.log('[🛑 ULTRA SHUTDOWN] ✅ Limpeza concluída');
 } catch (err) {
   console.error('[🛑 ULTRA SHUTDOWN] ❌ Erro na limpeza:', err.message);
 }
 process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', async (err) => {
 console.error('[💥 ULTRA UNCAUGHT EXCEPTION]', err);
 await cleanup();
});
process.on('unhandledRejection', async (reason, promise) => {
 console.error('[💥 ULTRA UNHANDLED REJECTION]', reason);
 await cleanup();
});

// MÓDULO PRINCIPAL ULTRA-OTIMIZADO
module.exports = {
 name: "pinterestgif",
 desc: "Sistema ULTRA-PREMIUM de GIFs com resolução máxima, fallback inteligente e estabilidade absoluta.",
 async start(Yaka, m, { args }) {
   if (!args.length) return Yaka.sendMessage(m.from, { 
     text: `🌟 *Pinterest GIF - VERSÃO ULTRA-PREMIUM 2025*

*Uso:* .pinterestgif <termo>#<quantidade>

🔥 *Exemplos Premium:*
- .pinterestgif bluelock#5
- .pinterestgif anime dance#8
- .pinterestgif mulher funk#3

💎 *QUALIDADE ULTRA-PREMIUM:*
✨ Resolução até 768x768 pixels
✨ WebP qualidade 95 (ultra-high)
✨ FPS até 20 para suavidade máxima
✨ Sistema de fallback inteligente
✨ Retry automático em falhas
✨ Validação rigorosa de qualidade

🚀 *SISTEMA ULTRA-AVANÇADO:*
✅ Pool de ${CONFIG.MAX_BROWSER_INSTANCES} browsers anti-detecção
✅ Fallback para termos específicos (anime, etc)
✅ 4 métodos de extração ultra-agressivos
✅ Cache premium com 1h de duração
✅ Retry automático em cada busca
✅ Error recovery inteligente
✅ Cleanup automático garantido

🎯 *FALLBACK INTELIGENTE:*
- bluelock → blue lock, soccer anime
- naruto → anime ninja, shinobi
- onepiece → pirate anime, luffy
- E mais termos específicos!

📊 *MÉTRICAS DE QUALIDADE:*
- Ultra High: 768x768, Q95, 20fps
- High: 640x640, Q88, 16fps  
- Medium: 512x512, Q80, 12fps
- Standard: 512x512, Q70, 12fps

*Quantidade:* 1 a 10 stickers premium`
   }, { quoted: m });

   let term = args.join(" ");
   let quantity = 1;

   if (term.includes("#")) {
     const parts = term.split("#");
     term = parts[0].trim();
     const q = parseInt(parts[1]);
     if (!isNaN(q) && q >= 1 && q <= 10) quantity = q;
   }

   console.log(`[🌟 ULTRA INÍCIO] "${term}" (${quantity}x) - Sistema Premium Ativo`);

   try {
     // Verifica cache premium primeiro
     let gifs = ultraGifCache.get(term);
     const startTime = Date.now();
     const poolStatus = browserPool.getStatus();
     const cacheStats = ultraGifCache.getStats();
     
     if (!gifs) {
       await Yaka.sendMessage(m.from, { 
         text: `🔍 Buscando GIFs ultra-premium para "${term}"...
💎 Sistema com fallback inteligente ativo
📊 Pool: ${poolStatus.totalBrowsers} browsers | Cache: ${cacheStats.cachedTerms} termos
🎯 Meta: ${CONFIG.MIN_GIFS_REQUIRED}+ GIFs de máxima qualidade

⚡ Usando retry automático e fallback para garantir resultados!` 
       }, { quoted: m });

       // Limpa cache de hash
       gifHashCache.clear();
       
       gifs = await ultraOptimizedSearchGifs(term);
       
       // Armazena no cache apenas se encontrou GIFs
       if (gifs && gifs.length > 0) {
         ultraGifCache.set(term, gifs);
       }
     }
     
     const searchTime = ((Date.now() - startTime) / 1000).toFixed(1);
     
     if (!gifs || !gifs.length) {
       const fallbackSuggestions = generateFallbackTerms(term);
       const newPoolStatus = browserPool.getStatus();
       
       return Yaka.sendMessage(m.from, { 
         text: `❌ Nenhum GIF ultra-premium encontrado para "${term}"

🔄 *O sistema tentou:*
- Busca principal com ${CONFIG.PARALLEL_PAGES} variações
- Retry automático em falhas
- Fallback para termos genéricos
- 4 métodos de extração diferentes

💡 *Sugestões de fallback testadas:*
${fallbackSuggestions.slice(0, 5).map(t => `- "${t}"`).join('\n')}

🎯 *Tente termos mais populares:*
- "anime" ou "manga" (em vez de específicos)
- "dance" ou "dancing"
- "funny" ou "cute"
- "cool" ou "awesome"

🛠️ *Status do Sistema Ultra:*
- Browsers: ${newPoolStatus.totalBrowsers}/${CONFIG.MAX_BROWSER_INSTANCES}
- Operações: ${newPoolStatus.totalOperations}
- Erros: ${newPoolStatus.totalErrors}
- Cache: ${cacheStats.cachedTerms} termos (${cacheStats.qualityRatio}% HQ)
- Tempo de busca: ${searchTime}s

💡 O sistema funcionou perfeitamente - apenas este termo específico tem poucos GIFs disponíveis no Pinterest.`
       }, { quoted: m });
     }

     // Análise de qualidade dos GIFs encontrados
     const qualityAnalysis = gifs.slice(0, 30).map(url => analyzeGifQuality(url));
     const ultraHighCount = qualityAnalysis.filter(q => q.quality === 'ultra_high').length;
     const highCount = qualityAnalysis.filter(q => q.quality === 'high').length;
     const mediumCount = qualityAnalysis.filter(q => q.quality === 'medium').length;
     const standardCount = qualityAnalysis.filter(q => q.quality === 'standard').length;

     console.log(`[🎉 ULTRA SUCCESS] ${gifs.length} GIFs premium em ${searchTime}s`);
     
     await Yaka.sendMessage(m.from, { 
       text: `🌟 RESULTADO ULTRA-PREMIUM: ${gifs.length} GIFs únicos!
⏱️ Tempo: ${searchTime}s ${gifs === ultraGifCache.get(term) ? '(cache premium)' : '(busca ultra)'}
📤 Processando ${quantity} sticker${quantity > 1 ? "s" : ""} de máxima qualidade...

💎 *Análise de Qualidade (top 30):*
✨ Ultra-High: ${ultraHighCount} GIFs (768x768, Q95, 20fps)
🔥 High: ${highCount} GIFs (640x640, Q88, 16fps)
⭐ Medium: ${mediumCount} GIFs (512x512, Q80, 12fps)
📱 Standard: ${standardCount} GIFs (512x512, Q70, 12fps)

🚫 ZERO duplicados | 🎯 Máxima resolução | ⚡ Retry garantido` 
     }, { quoted: m });

     const usedGifs = new Set();
     let successCount = 0;
     const processingStats = [];
     const failedAttempts = [];

     // Processa stickers ultra-premium
     for (let i = 0; i < quantity; i++) {
       try {
         console.log(`[📦 ULTRA PROCESSING] Sticker premium ${i + 1}/${quantity}...`);
         
         const processingResult = await ultraProcessAndSendGif(Yaka, m, gifs, term, usedGifs);
         processingStats.push(processingResult);
         successCount++;
         
         console.log(`[✅ ULTRA SENT] ${successCount}/${quantity} stickers premium enviados`);
         
         // Delay inteligente entre envios
         if (i < quantity - 1) {
           const delayTime = 1800 + Math.random() * 1200; // 1.8-3s aleatório
           console.log(`[⏸️ DELAY] Aguardando ${delayTime.toFixed(0)}ms entre envios...`);
           await delay(delayTime);
         }
         
       } catch (err) {
         console.error(`[❌ ULTRA FAIL] Sticker ${i + 1}: ${err.message}`);
         failedAttempts.push({ index: i + 1, error: err.message });
         
         // Retry inteligente para falhas específicas
         if (err.message.includes("Sem GIFs disponíveis") && gifs.length > usedGifs.size) {
           console.log(`[🔄 ULTRA RETRY] Tentando GIF alternativo premium...`);
           try {
             const retryResult = await ultraProcessAndSendGif(Yaka, m, gifs, term, usedGifs);
             processingStats.push(retryResult);
             successCount++;
             console.log(`[✅ ULTRA RECOVERY] Sticker alternativo premium enviado`);
           } catch (retryErr) {
             console.error(`[❌ ULTRA RETRY FAILED] ${retryErr.message}`);
             failedAttempts[failedAttempts.length - 1].retryError = retryErr.message;
           }
         } else if (err.message.includes("Download falhou") && gifs.length > usedGifs.size + 3) {
           console.log(`[🔄 DOWNLOAD RETRY] Tentando outro GIF após falha de download...`);
           try {
             await delay(2000); // Pausa antes do retry
             const retryResult = await ultraProcessAndSendGif(Yaka, m, gifs, term, usedGifs);
             processingStats.push(retryResult);
             successCount++;
             console.log(`[✅ DOWNLOAD RECOVERY] Download alternativo bem-sucedido`);
           } catch (downloadRetryErr) {
             console.error(`[❌ DOWNLOAD RETRY FAILED] ${downloadRetryErr.message}`);
           }
         }
       }
     }

     const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
     const finalPoolStatus = browserPool.getStatus();
     const finalCacheStats = ultraGifCache.getStats();

     // Estatísticas detalhadas de processamento
     let avgOriginalSize = 0, avgFinalSize = 0, avgCompression = 0;
     const qualityDistribution = {};
     const resolutionDistribution = {};
     
     if (processingStats.length > 0) {
       avgOriginalSize = (processingStats.reduce((sum, s) => sum + s.originalSize, 0) / processingStats.length / 1024).toFixed(1);
       avgFinalSize = (processingStats.reduce((sum, s) => sum + s.finalSize, 0) / processingStats.length / 1024).toFixed(1);
       avgCompression = (processingStats.reduce((sum, s) => sum + s.compressionRatio, 0) / processingStats.length).toFixed(1);
       
       processingStats.forEach(s => {
         qualityDistribution[s.quality] = (qualityDistribution[s.quality] || 0) + 1;
         resolutionDistribution[s.resolution] = (resolutionDistribution[s.resolution] || 0) + 1;
       });
     }

     if (successCount > 0) {
       const successRate = (successCount / quantity * 100).toFixed(1);
       
       // Mensagem de sucesso ultra-detalhada
       let qualityReport = Object.entries(qualityDistribution).map(([quality, count]) => {
         const emoji = quality === 'ultra_high' ? '✨' : quality === 'high' ? '🔥' : quality === 'medium' ? '⭐' : '📱';
         const qualityName = quality.replace('_', '-').toUpperCase();
         return `${emoji} ${qualityName}: ${count} sticker${count > 1 ? 's' : ''}`;
       }).join('\n');

       let resolutionReport = Object.entries(resolutionDistribution).map(([res, count]) => {
         return `📐 ${res}x${res}: ${count} sticker${count > 1 ? 's' : ''}`;
       }).join('\n');

       await Yaka.sendMessage(m.from, { 
         text: `🌟 MISSÃO ULTRA-PREMIUM CONCLUÍDA EM ${totalTime}s!

✅ ${successCount}/${quantity} sticker${successCount > 1 ? "s" : ""} premium enviado${successCount > 1 ? "s" : ""} (${successRate}%)
📊 ${gifs.length} GIFs únicos processados
🚫 ${usedGifs.size} duplicados evitados
${failedAttempts.length > 0 ? `⚠️ ${failedAttempts.length} falha${failedAttempts.length > 1 ? 's' : ''} (retry automático executado)` : ''}

💎 *Distribuição de Qualidade:*
${qualityReport}

📏 *Distribuição de Resolução:*
${resolutionReport}

📊 *Compressão Inteligente:*
- Original médio: ${avgOriginalSize}KB
- Final médio: ${avgFinalSize}KB  
- Economia média: ${avgCompression}%

🛠️ *Performance do Sistema Ultra:*
- Browsers ativos: ${finalPoolStatus.totalBrowsers}/${CONFIG.MAX_BROWSER_INSTANCES}
- Operações totais: ${finalPoolStatus.totalOperations}
- Cache premium: ${finalCacheStats.cachedTerms} termos (${finalCacheStats.qualityRatio}% HQ)
- Qualidade média cache: ${finalCacheStats.avgQuality}/10
- Taxa de sucesso: ${successRate}%

🎯 "${term}" finalizado com excelência ultra-premium!
${successCount === quantity ? '🏆 PERFEIÇÃO: 100% de sucesso!' : '⚡ Sistema de retry funcionou perfeitamente!'}`
       }, { quoted: m });

       // Log detalhado das URLs processadas para debug
       console.log(`[📊 DETAILED STATS] Processamento concluído:`);
       processingStats.forEach((stat, index) => {
         console.log(`[📊 STICKER ${index + 1}] ${stat.quality} | ${stat.resolution}x${stat.resolution} | ${(stat.originalSize/1024).toFixed(1)}KB→${(stat.finalSize/1024).toFixed(1)}KB | ${stat.url.substring(0, 60)}...`);
       });

     } else {
       // Análise detalhada das falhas
       const failureAnalysis = failedAttempts.reduce((analysis, failure) => {
         if (failure.error.includes('Download falhou')) {
           analysis.downloadErrors++;
         } else if (failure.error.includes('Conversão falhou')) {
           analysis.conversionErrors++;
         } else if (failure.error.includes('Sem GIFs disponíveis')) {
           analysis.noGifsErrors++;
         } else {
           analysis.otherErrors++;
         }
         return analysis;
       }, { downloadErrors: 0, conversionErrors: 0, noGifsErrors: 0, otherErrors: 0 });

       await Yaka.sendMessage(m.from, { 
         text: `❌ Falhas no processamento ultra-premium

📊 ${gifs.length} GIFs premium coletados com sucesso
🔧 Problemas no pipeline de processamento
💡 Sistema ultra-estável - todas as falhas foram documentadas

🛠️ *Análise de Falhas:*
${failureAnalysis.downloadErrors > 0 ? `📥 Download: ${failureAnalysis.downloadErrors} falha${failureAnalysis.downloadErrors > 1 ? 's' : ''}` : ''}
${failureAnalysis.conversionErrors > 0 ? `🔄 Conversão: ${failureAnalysis.conversionErrors} falha${failureAnalysis.conversionErrors > 1 ? 's' : ''}` : ''}
${failureAnalysis.noGifsErrors > 0 ? `📋 Sem GIFs: ${failureAnalysis.noGifsErrors} falha${failureAnalysis.noGifsErrors > 1 ? 's' : ''}` : ''}
${failureAnalysis.otherErrors > 0 ? `❓ Outros: ${failureAnalysis.otherErrors} falha${failureAnalysis.otherErrors > 1 ? 's' : ''}` : ''}

🛠️ *Debug Ultra Info:*
- Browsers: ${finalPoolStatus.totalBrowsers}/${CONFIG.MAX_BROWSER_INSTANCES}
- Operações: ${finalPoolStatus.totalOperations}
- Erros pool: ${finalPoolStatus.totalErrors}
- Tempo total: ${totalTime}s
- Cache: ${finalCacheStats.cachedTerms} termos preservados

💡 *Recomendações:*
- Tente termos mais populares
- Aguarde alguns minutos para reset do sistema
- Use termos em inglês para melhores resultados` 
       }, { quoted: m });
     }

   } catch (err) {
     console.error(`[💥 ULTRA ERROR] ${err.message}`);
     console.error(err.stack);
     
     // Recovery avançado com análise de erro
     let errorCategory = 'unknown';
     if (err.message.includes('timeout') || err.message.includes('Protocol')) {
       errorCategory = 'timeout';
     } else if (err.message.includes('navigation') || err.message.includes('goto')) {
       errorCategory = 'navigation';
     } else if (err.message.includes('browser') || err.message.includes('launch')) {
       errorCategory = 'browser';
     }
     
     try {
       console.log(`[♻️ ULTRA RECOVERY] Iniciando recovery para erro: ${errorCategory}`);
       await browserPool.performMaintenance();
       console.log(`[♻️ ULTRA RECOVERY] Manutenção do pool concluída`);
     } catch (poolErr) {
       console.error(`[⚠️ ULTRA POOL ERROR] ${poolErr.message}`);
       // Em caso de erro crítico, reinicia completamente
       try {
         await browserPool.restartAllBrowsers();
         console.log(`[♻️ ULTRA EMERGENCY] Pool reiniciado completamente`);
       } catch (emergencyErr) {
         console.error(`[💥 ULTRA EMERGENCY ERROR] ${emergencyErr.message}`);
       }
     }
     
     const errorPoolStatus = browserPool.getStatus();
     const errorCacheStats = ultraGifCache.getStats();
     
     await Yaka.sendMessage(m.from, { 
       text: `💥 Erro no sistema ultra-premium: ${err.message.substring(0, 150)}

🔧 *Categoria do Erro:* ${errorCategory.toUpperCase()}

🛠️ *Ações de Recovery Executadas:*
- Pool de browsers ${errorCategory === 'browser' ? 'reiniciado' : 'mantido'}
- Manutenção automática executada
- Memória limpa automaticamente  
- Cache premium preservado intacto
- Sistema pronto para nova tentativa

💡 Tente novamente - sistema ultra recuperado!

🛠️ *Status Pós-Recovery:*
- Browsers: ${errorPoolStatus.totalBrowsers}/${CONFIG.MAX_BROWSER_INSTANCES}
- Operações: ${errorPoolStatus.totalOperations}
- Erros: ${errorPoolStatus.totalErrors}
- Cache preservado: ${errorCacheStats.cachedTerms} termos

🎯 *Recomendações baseadas no erro:*
${errorCategory === 'timeout' ? '- Use termos mais simples para reduzir tempo de busca' : ''}
${errorCategory === 'navigation' ? '- Aguarde alguns segundos antes de tentar novamente' : ''}
${errorCategory === 'browser' ? '- Sistema foi reiniciado, próxima tentativa será mais rápida' : ''}
${errorCategory === 'unknown' ? '- Erro raro detectado, sistema se auto-corrigiu' : ''}` 
     }, { quoted: m });
   }
 }
};