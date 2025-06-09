const puppeteer = require("puppeteer");
const axios = require("axios");

class PinterestImageScraper {
  constructor() {
    this.browserInstances = [];
    this.maxBrowsers = 3;
    this.imagemCache = {};
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.retryAttempts = 2;
    this.maxConcurrentRequests = 3;
    this.activeRequests = 0;
    
    // 🔧 API DESABILITADA - SÓ SCRAPING OTIMIZADO
    this.pinterestAPI = {
      enabled: false // API desabilitada para evitar problemas
    };
    
    this.loginCredentials = {
      email: "brunoruthes92@gmail.com",
      password: "BRPO@hulk1"
    };

    // Seus mapeamentos mantidos
    this.shortToFullTerm = {
      sung: "sung jinwoo monster",
      solo: "solo leveling",
      goth: "cute goth girl pfp",
      girlpfp: "girl animes pfp",
      malepfp: "male animes pfp",
      girlart: "girl art wallpaper",
      samurai: "girl art samurai wallpaper",
      femaleart: "female artwork art",
      maleart: "male artwork art",
      kimetsu: "kimetsu no yaiba wallpaper",
      nezuko: "nezuko wallpaper cute",
      tanjiro: "tanjiro kamado wallpaper",
      bachira: "bachira meguru wallpaper",
      gojo: "gojo satoru",
      tojiblack: "toji black",
    };

    this.termToUrl = {
      "sung jinwoo monster": "https://br.pinterest.com/search/pins/?q=Sung%20Jinwoo%20monster&rs=typed",
      "solo leveling": "https://br.pinterest.com/search/pins/?q=solo%20leveling&rs=typed",
      "cute goth girl pfp": "https://br.pinterest.com/search/pins/?q=cute%20goth%20girl%20pfp&rs=typed",
      "girl animes pfp": "https://br.pinterest.com/search/pins/?q=girl%20animes%20pfp&rs=typed",
      "male animes pfp": "https://br.pinterest.com/search/pins/?q=male%20animes%20pfp&rs=typed",
      "girl art wallpaper": "https://br.pinterest.com/search/pins/?q=girl%20art%20wallpaper&rs=typed",
      "girl art samurai wallpaper": "https://br.pinterest.com/search/pins/?q=girl%20art%20samurai%20wallpaper&rs=typed",
      "female artwork art": "https://br.pinterest.com/search/pins/?q=female%20artwork%20art&rs=typed",
      "male artwork art": "https://br.pinterest.com/search/pins/?q=male%20artwork%20art&rs=typed",
      "kimetsu no yaiba wallpaper": "https://br.pinterest.com/search/pins/?q=kimetsu%20no%20yaiba%20wallpaper&rs=typed",
      "nezuko wallpaper cute": "https://br.pinterest.com/search/pins/?q=nezuko%20wallpaper%20cute&rs=typed",
      "tanjiro kamado wallpaper": "https://br.pinterest.com/search/pins/?q=tanjiro%20kamado%20wallpaper&rs=typed",
      "bachira meguru wallpaper": "https://br.pinterest.com/search/pins/?q=bachira%20meguru%20wallpaper&rs=typed",
      "gojo satoru": "https://br.pinterest.com/search/pins/?q=gojo%20satoru&rs=typed",
      "toji black": "https://br.pinterest.com/search/pins/?q=toji%20black&rs=typed",
    };

    this.startCacheCleanup();
    this.startBrowserMaintenance();
    console.log("[INIT] 🔧 Pinterest Scraper simplificado inicializado");
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Sistema de cache otimizado
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      for (const termo in this.imagemCache) {
        const cache = this.imagemCache[termo];
        if (cache.lastUsed && (now - cache.lastUsed) > 20 * 60 * 1000) { // 20 minutos
          delete this.imagemCache[termo];
          cleanedCount++;
        }
      }
      if (cleanedCount > 0) {
        console.log(`[CACHE] 🧹 ${cleanedCount} termos limpos`);
      }
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  // Manutenção de browsers
  startBrowserMaintenance() {
    setInterval(async () => {
      await this.closeIdleBrowsers();
    }, 3 * 60 * 1000); // A cada 3 minutos
  }

  // Browser otimizado para Railway
  async createBrowserInstance() {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--single-process", // Importante para Railway
        "--no-first-run",
        "--disable-default-apps",
        "--disable-extensions"
      ],
      defaultViewport: { width: 1280, height: 720 },
      timeout: 60000 // 60 segundos para criar browser
    });
    
    return {
      browser,
      inUse: false,
      id: Date.now() + Math.random(),
      created: Date.now(),
      lastUsed: Date.now(),
      loginStatus: 'none'
    };
  }

  // Sistema simplificado de browser
  async acquireBrowser() {
    // Tenta usar browser existente
    const availableBrowser = this.browserInstances.find(instance => !instance.inUse);
    
    if (availableBrowser) {
      availableBrowser.inUse = true;
      availableBrowser.lastUsed = Date.now();
      console.log(`[BROWSER] ✅ Reutilizando browser: ${availableBrowser.id}`);
      return availableBrowser;
    }

    // Cria novo se necessário
    if (this.browserInstances.length < this.maxBrowsers) {
      try {
        console.log(`[BROWSER] 🔧 Criando browser ${this.browserInstances.length + 1}/${this.maxBrowsers}`);
        const instance = await this.createBrowserInstance();
        instance.inUse = true;
        this.browserInstances.push(instance);
        return instance;
      } catch (error) {
        console.error("[BROWSER] ❌ Erro ao criar browser:", error.message);
        throw new Error("Falha ao criar browser");
      }
    }

    throw new Error("Nenhum browser disponível");
  }

  releaseBrowser(instanceId) {
    const instance = this.browserInstances.find(i => i.id === instanceId);
    if (instance) {
      instance.inUse = false;
      instance.lastUsed = Date.now();
      console.log(`[BROWSER] 🔄 Browser ${instanceId} liberado`);
    }
  }

  // Login simplificado SEM timeouts
  async performSimpleLogin(page) {
    try {
      console.log("[LOGIN] 🔐 Iniciando login simplificado...");
      
      // Vai direto para página de busca sem login
      const searchUrl = "https://br.pinterest.com/search/pins/?q=test";
      
      console.log("[LOGIN] 🔄 Testando acesso sem login...");
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 60000 
      });

      await this.delay(3000);

      // Verifica se precisa de login
      const needsLogin = await page.evaluate(() => {
        return document.URL.includes('/login') || 
               document.querySelector('input[type="password"]') !== null;
      });

      if (!needsLogin) {
        console.log("[LOGIN] ✅ Acesso sem login funcionando!");
        return true;
      }

      // Se precisa de login, tenta método rápido
      console.log("[LOGIN] 🔐 Login necessário, tentando método rápido...");
      
      await page.goto("https://br.pinterest.com/login/", { 
        waitUntil: "domcontentloaded", 
        timeout: 60000 
      });

      await this.delay(2000);

      // Preenche campos rapidamente
      try {
        await page.type('input[name="id"], input[type="email"]', this.loginCredentials.email, { delay: 50 });
        await this.delay(500);
        await page.type('input[type="password"]', this.loginCredentials.password, { delay: 50 });
        await this.delay(500);
        
        // Submete
        await page.click('button[type="submit"]');
        await this.delay(5000);
        
        const currentUrl = page.url();
        const success = !currentUrl.includes('/login');
        
        if (success) {
          console.log("[LOGIN] ✅ Login rápido realizado!");
        } else {
          console.log("[LOGIN] ⚠️ Login pode ter falhado, continuando...");
        }
        
        return true; // Continua mesmo se login falhar
        
      } catch (loginError) {
        console.log("[LOGIN] ⚠️ Erro no login, continuando sem autenticação...");
        return true; // Continua mesmo com erro
      }

    } catch (error) {
      console.log("[LOGIN] ⚠️ Erro geral, continuando:", error.message);
      return true; // Sempre continua
    }
  }

  // Busca principal SIMPLIFICADA
  async searchImagesInternal(searchTerm, count = 1, isCustomSearch = false) {
    let browserInstance = null;
    let page = null;

    try {
      // 1. Verifica cache
      const cachedImages = this.getMultipleImages(searchTerm, count);
      if (cachedImages && cachedImages.length >= count) {
        console.log(`[CACHE] ✅ ${cachedImages.length} imagens do cache para "${searchTerm}"`);
        return cachedImages.slice(0, count);
      }

      console.log(`[SEARCH] 🔍 Iniciando busca para "${searchTerm}" (${count} imagens)`);

      // 2. Adquire browser
      browserInstance = await this.acquireBrowser();
      page = await browserInstance.browser.newPage();

      // 3. Configurações básicas
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // 4. Login simplificado
      const loginSuccess = await this.performSimpleLogin(page);
      if (!loginSuccess) {
        console.log("[LOGIN] ⚠️ Continuando sem login...");
      }

      // 5. Vai para busca
      const encodedQuery = encodeURIComponent(searchTerm);
      const searchUrl = isCustomSearch 
        ? `https://br.pinterest.com/search/pins/?q=${encodedQuery}`
        : this.termToUrl[searchTerm] || `https://br.pinterest.com/search/pins/?q=${encodedQuery}`;

      console.log(`[SEARCH] 🌐 Navegando: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 60000 
      });

      await this.delay(4000);

      // 6. Scroll simples
      console.log("[SEARCH] 📜 Carregando mais imagens...");
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.delay(1500);
      }

      // 7. Extração de imagens
      console.log("[SEARCH] 🖼️ Extraindo imagens...");
      const imgs = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'))
          .map(img => {
            // Pega src ou srcset
            const src = img.src || img.getAttribute('data-src');
            if (src && src.includes('pinimg.com')) {
              return src;
            }
            
            const srcset = img.getAttribute('srcset');
            if (srcset) {
              const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
              const pinterestUrl = urls.find(url => url.includes('pinimg.com'));
              if (pinterestUrl) return pinterestUrl;
            }
            
            return null;
          })
          .filter(url => url && url.includes('pinimg.com'))
          .filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicatas
          .slice(0, 50);

        console.log(`Encontradas ${images.length} imagens`);
        return images;
      });

      await page.close();
      this.releaseBrowser(browserInstance.id);

      if (!imgs || imgs.length === 0) {
        throw new Error(`Nenhuma imagem encontrada para "${searchTerm}"`);
      }

      console.log(`[SUCCESS] ✅ ${imgs.length} imagens extraídas para "${searchTerm}"`);

      // 8. Atualiza cache
      this.updateCache(searchTerm, imgs);
      return imgs.slice(0, count);

    } catch (error) {
      if (page) await page.close().catch(() => {});
      if (browserInstance) this.releaseBrowser(browserInstance.id);
      
      console.error(`[ERRO] ❌ Falha na busca para "${searchTerm}":`, error.message);
      throw error;
    }
  }

  // Sistema de fila simplificado
  async addToQueue(request) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { request, resolve, reject } = this.requestQueue.shift();
      
      try {
        const result = await this.executeRequest(request);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  async executeRequest(request) {
    const { searchTerm, count, isCustomSearch } = request;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`[LOG] 🔄 Tentativa ${attempt}/${this.retryAttempts} para "${searchTerm}"`);
        return await this.searchImagesInternal(searchTerm, count, isCustomSearch);
      } catch (error) {
        console.error(`[ERRO] ❌ Tentativa ${attempt} falhou:`, error.message);
        
        if (attempt === this.retryAttempts) {
          throw error;
        }
        
        await this.delay(attempt * 2000);
      }
    }
  }

  async searchImages(searchTerm, count = 1, isCustomSearch = false) {
    return this.addToQueue({ searchTerm, count, isCustomSearch });
  }

  // Cache methods
  updateCache(termo, imagens) {
    if (!this.imagemCache[termo]) {
      this.imagemCache[termo] = {
        urls: [],
        enviadas: {},
        lastUsed: Date.now()
      };
    }
    
    const cache = this.imagemCache[termo];
    const newUrls = imagens.filter(url => !cache.urls.includes(url));
    
    cache.urls = [...cache.urls, ...newUrls];
    cache.lastUsed = Date.now();
    
    if (cache.urls.length > 100) {
      cache.urls = cache.urls.slice(-80);
    }
    
    console.log(`[CACHE] ✅ "${termo}": ${cache.urls.length} URLs`);
  }

  getMultipleImages(termo, count) {
    if (!this.imagemCache[termo] || !this.imagemCache[termo].urls.length) {
      return null;
    }
    
    const cache = this.imagemCache[termo];
    cache.lastUsed = Date.now();
    
    const availableImages = cache.urls.filter(url => !cache.enviadas[url]);
    
    if (availableImages.length < count) {
      // Reset algumas imagens
      const toReset = Object.keys(cache.enviadas).slice(0, 20);
      toReset.forEach(url => delete cache.enviadas[url]);
    }
    
    const urlsToUse = availableImages.length >= count ? availableImages : cache.urls;
    const shuffled = [...urlsToUse].sort(() => Math.random() - 0.5);
    
    const selectedImages = [];
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const img = shuffled[i];
      selectedImages.push(img);
      cache.enviadas[img] = Date.now();
    }
    
    return selectedImages;
  }

  async closeIdleBrowsers() {
    const now = Date.now();
    const idleTime = 5 * 60 * 1000; // 5 minutos

    for (let i = this.browserInstances.length - 1; i >= 0; i--) {
      const instance = this.browserInstances[i];
      
      if (!instance.inUse && (now - instance.lastUsed) > idleTime) {
        try {
          await instance.browser.close();
          this.browserInstances.splice(i, 1);
          console.log(`[MAINTENANCE] 🧹 Browser idle fechado`);
        } catch {}
      }
    }
  }

  extractCountFromArgs(args) {
    const lastArg = args[args.length - 1];
    const match = lastArg?.match(/^#?(\d+)$/);
    
    if (match) {
      const count = parseInt(match[1], 10);
      if (count >= 1 && count <= 10) {
        return { count, newArgs: args.slice(0, -1) };
      }
    }
    
    return { count: 1, newArgs: args };
  }

  // COMANDO PRINCIPAL SIMPLIFICADO
  async handlePinterestCommand(Yaka, m, { args, body, prefix }) {
    try {
      const isPintSearch = body && body.toLowerCase().startsWith('.pinterest');
      
      if (isPintSearch) {
        const fullQuery = body.slice(10).trim();
        
        if (!fullQuery) {
          return Yaka.sendMessage(m.from, { 
            text: "❌ Digite um termo:\n\n*Exemplo:* .pinterest goku#5\n*Limite:* 1-10 imagens\n\n🔧 *Sistema simplificado ativo*" 
          }, { quoted: m });
        }
        
        const parts = fullQuery.split('#');
        const searchQuery = parts[0].trim();
        const count = parts[1] ? Math.min(Math.max(parseInt(parts[1]), 1), 10) : 1;
        
        console.log(`[COMMAND] 🎯 Pinterest search: "${searchQuery}" x${count}`);
        
        await Yaka.sendMessage(m.from, { 
          text: `🔍 Buscando ${count}x "${searchQuery}"\n🔧 Sistema otimizado\n⏱️ Aguarde...` 
        }, { quoted: m });
        
        const images = await this.searchImages(searchQuery, count, true);
        
        for (let i = 0; i < images.length; i++) {
          try {
            await Yaka.sendMessage(
              m.from,
              { 
                image: { url: images[i] }, 
                caption: count > 1 
                  ? `✨ ${searchQuery} (${i + 1}/${count})\n🔧 Scraping otimizado` 
                  : `✨ ${searchQuery}\n🔧 Scraping otimizado`
              },
              { quoted: m }
            );
            
            if (i < images.length - 1) await this.delay(600);
          } catch (sendError) {
            console.error(`[SEND] ❌ Erro imagem ${i + 1}:`, sendError.message);
          }
        }
        
        return;
      }
      
      if (!args.length) {
        const termosList = Object.keys(this.shortToFullTerm)
          .map(key => `• *${key}* → ${this.shortToFullTerm[key]}`)
          .join("\n");
        
        return Yaka.sendMessage(m.from, { 
          text: `📌 *Termos:*\n\n${termosList}\n\n*Uso:*\n• .pin <termo>\n• .pin <termo>#<1-10>\n• .pinterest <busca>#<1-10>\n\n🔧 *Sistema simplificado e estável*` 
        }, { quoted: m });
      }

      const { count, newArgs } = this.extractCountFromArgs(args);
      const shortTerm = newArgs[0]?.toLowerCase();

      if (!this.shortToFullTerm[shortTerm]) {
        const availableTerms = Object.keys(this.shortToFullTerm).slice(0, 5).join(', ');
        return Yaka.sendMessage(m.from, { 
          text: `❌ Termo "${shortTerm}" não encontrado.\n\n*Alguns:* ${availableTerms}\n\nUse *.pin* para ver todos.` 
        }, { quoted: m });
      }

      const fullTerm = this.shortToFullTerm[shortTerm];
      
      console.log(`[COMMAND] 🎯 Pinterest preset: "${fullTerm}" x${count}`);
      
      await Yaka.sendMessage(m.from, { 
        text: `🔍 Buscando ${count}x *${fullTerm}*\n🔧 Sistema otimizado\n⏱️ Processando...` 
      }, { quoted: m });
      
      const images = await this.searchImages(fullTerm, count, false);
      
      for (let i = 0; i < images.length; i++) {
        try {
          await Yaka.sendMessage(
            m.from,
            { 
              image: { url: images[i] }, 
              caption: count > 1 
                ? `✨ *${fullTerm}*\n📷 ${i + 1}/${count} | 🔖 ${shortTerm}\n🔧 Pinterest otimizado` 
                : `✨ *${fullTerm}*\n🔖 ${shortTerm}\n🔧 Pinterest otimizado`
            },
            { quoted: m }
          );
          
          if (i < images.length - 1) await this.delay(600);
        } catch (sendError) {
          console.error(`[SEND] ❌ Erro imagem ${i + 1}:`, sendError.message);
        }
      }

    } catch (error) {
      console.error("[COMMAND] ❌ Erro:", error);
      
      await Yaka.sendMessage(m.from, { 
        text: `❌ Erro na busca.\n\n🔧 Sistema otimizado ativo\n💡 Tente novamente em alguns segundos.` 
      }, { quoted: m });
    }
  }

  async closeAllBrowsers() {
    console.log("[CLEANUP] 🧹 Fechando browsers...");
    
    for (const instance of this.browserInstances) {
      try {
        await instance.browser.close();
      } catch {}
    }
    
    this.browserInstances = [];
    console.log("[CLEANUP] ✅ Cleanup completo");
  }

  getStats() {
    return {
      totalBrowsers: this.browserInstances.length,
      activeBrowsers: this.browserInstances.filter(b => b.inUse).length,
      cacheTerms: Object.keys(this.imagemCache).length,
      queueSize: this.requestQueue.length
    };
  }
}

const pinterestScraper = new PinterestImageScraper();

process.on('SIGTERM', async () => {
  await pinterestScraper.closeAllBrowsers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await pinterestScraper.closeAllBrowsers();
  process.exit(0);
});

module.exports = {
  name: "pinterest",
  alias: ["pin"],
  desc: "Pinterest scraper otimizado e simplificado - sem timeouts",
  category: "Search",
  usage: "pin <termo> | pin <termo>#<1-10> | .pinterest <busca>#<1-10>",
  react: "🖼️",
  start: async (Yaka, m, { args, body, prefix }) => {
    await pinterestScraper.handlePinterestCommand(Yaka, m, { args, body, prefix });
  },
  stats: () => pinterestScraper.getStats(),
  cleanup: () => pinterestScraper.closeAllBrowsers()
};
