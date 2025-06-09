const puppeteer = require("puppeteer");
const axios = require("axios");

class PinterestImageScraper {
  constructor() {
    this.browserInstances = [];
    this.maxBrowsers = 3; // Reduzido já que API não precisa de muitos browsers
    this.imagemCache = {};
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.retryAttempts = 3;
    this.maxConcurrentRequests = 5;
    this.activeRequests = 0;
    
    // 🚀 PINTEREST API OFICIAL - SÓ PRECISA DO TOKEN
    this.pinterestAPI = {
      token: "pina_AMA72OYXAASGSBAAGAAN4DRMPDUVJFYBACGSOQ5QJ4XQKYKNWBQ4EB7MYJEMUQ45CFUZLR2VFY7OVRD5PYHX4QEXVF5PLMQA",
      baseURL: "https://api.pinterest.com/v5",
      rateLimit: {
        trial: 1000, // 1000 requests per day
        perSecond: 100 // 100 requests per second
      },
      requestCount: 0,
      lastReset: Date.now(),
      enabled: true // Flag para ativar/desativar API
    };
    
    // ❌ LOGIN SÓ USADO COMO BACKUP (quando API falhar)
    this.backupLogin = {
      email: "brunoruthes92@gmail.com",
      password: "BRPO@hulk1",
      useOnlyWhenAPIFails: true
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
    this.initAPIRateLimit();
    // Browsers só criados quando necessário (backup)
  }

  // 🚀 Sistema de rate limit da API
  initAPIRateLimit() {
    setInterval(() => {
      this.pinterestAPI.requestCount = 0;
      this.pinterestAPI.lastReset = Date.now();
      console.log("[API] Rate limit diário resetado");
    }, 24 * 60 * 60 * 1000);
  }

  // 🚀 BUSCA PRIORITÁRIA: Pinterest API (SEM LOGIN)
  async searchWithPinterestAPI(searchTerm, count = 1) {
    try {
      // Verifica se API está ativa
      if (!this.pinterestAPI.enabled) {
        console.log("[API] API desabilitada, usando scraping");
        return null;
      }

      // Verifica rate limit diário
      if (this.pinterestAPI.requestCount >= this.pinterestAPI.rateLimit.trial) {
        console.log("[API] ⚠️ Rate limit diário atingido, usando scraping");
        return null;
      }

      console.log(`[API] 🚀 Buscando "${searchTerm}" via Pinterest API oficial (sem login)...`);
      
      const startTime = Date.now();
      const response = await axios.get(`${this.pinterestAPI.baseURL}/pins/search`, {
        headers: {
          'Authorization': `Bearer ${this.pinterestAPI.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Pinterest-Bot/1.0'
        },
        params: {
          q: searchTerm,
          limit: Math.min(count * 3, 25) // Busca mais para ter variedade
        },
        timeout: 10000 // 10 segundos timeout
      });

      this.pinterestAPI.requestCount++;
      const responseTime = Date.now() - startTime;
      
      console.log(`[API] ✅ Resposta em ${responseTime}ms. Requests: ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}`);

      if (response.data && response.data.items && response.data.items.length > 0) {
        const pins = response.data.items;
        const imageUrls = pins
          .map(pin => {
            // Extrai melhor qualidade da imagem
            if (pin.media && pin.media.images) {
              const images = pin.media.images;
              return images.originals?.url || 
                     images['736x']?.url || 
                     images['564x']?.url || 
                     images['474x']?.url ||
                     null;
            }
            return null;
          })
          .filter(url => url && url.includes('pinimg.com'))
          .slice(0, count);

        if (imageUrls.length > 0) {
          console.log(`[API] ✅ ${imageUrls.length} imagens HD via API oficial (SEM LOGIN)`);
          return imageUrls;
        }
      }

      console.log("[API] Nenhuma imagem na resposta, tentando scraping");
      return null;

    } catch (error) {
      console.log(`[API] ❌ Erro na API: ${error.message}`);
      
      // Se token inválido, desabilita API temporariamente
      if (error.response && [401, 403].includes(error.response.status)) {
        console.log("[API] ⚠️ Token inválido, desabilitando API por 1 hora");
        this.pinterestAPI.enabled = false;
        setTimeout(() => {
          this.pinterestAPI.enabled = true;
          console.log("[API] ✅ API reabilitada");
        }, 60 * 60 * 1000); // 1 hora
      }
      
      return null;
    }
  }

  // 🚀 MÉTODO PRINCIPAL: API primeiro, scraping como backup
  async searchImagesInternal(searchTerm, count = 1, isCustomSearch = false) {
    try {
      // 1º: Verifica cache
      const cachedImages = this.getMultipleImages(searchTerm, count);
      if (cachedImages && cachedImages.length >= count) {
        console.log(`[CACHE] ✅ ${cachedImages.length} imagens do cache`);
        return cachedImages.slice(0, count);
      }

      // 2º: Tenta Pinterest API OFICIAL (SEM LOGIN)
      const apiImages = await this.searchWithPinterestAPI(searchTerm, count);
      if (apiImages && apiImages.length >= count) {
        console.log(`[API] ✅ Sucesso via API oficial - SEM LOGIN necessário!`);
        this.updateCache(searchTerm, apiImages);
        return apiImages.slice(0, count);
      }

      // 3º: Backup scraping (COM login) - só se API falhar
      console.log("[SCRAPING] 🔄 API falhou, usando scraping como backup...");
      return await this.scrapingBackup(searchTerm, count, isCustomSearch);

    } catch (error) {
      console.error(`[ERRO] Falha na busca: ${error.message}`);
      throw error;
    }
  }

  // 🔄 BACKUP: Scraping com login (só quando API falhar)
  async scrapingBackup(searchTerm, count = 1, isCustomSearch = false) {
    let browserInstance = null;
    let page = null;

    try {
      console.log("[BACKUP] 🔄 Iniciando scraping backup...");
      
      // Só agora cria browser se necessário
      browserInstance = await this.acquireBrowser();
      console.log(`[BACKUP] Browser ${browserInstance.id} adquirido`);
      
      // Login só no backup
      const loginSuccess = await this.ensureLogin(browserInstance);
      if (!loginSuccess) {
        throw new Error("Falha no login do Pinterest (backup)");
      }

      page = await browserInstance.browser.newPage();
      
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      
      await page.setViewport({ width: 1366, height: 768 });
      
      // Bloqueia recursos para acelerar
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      const encodedQuery = encodeURIComponent(searchTerm);
      const searchUrl = isCustomSearch 
        ? `https://br.pinterest.com/search/pins/?q=${encodedQuery}`
        : this.termToUrl[searchTerm] || `https://br.pinterest.com/search/pins/?q=${encodedQuery}`;

      console.log(`[BACKUP] Navegando para: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 45000
      });

      await this.delay(3000);

      // Scroll para carregar mais
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 1.5);
        });
        await this.delay(i < 2 ? 2000 : 1500);
      }

      // Extração de imagens
      const imgs = await page.evaluate(() => {
        const extractBestUrl = (img) => {
          if (img.getAttribute("srcset")) {
            const srcset = img.getAttribute("srcset");
            const urls = srcset
              .split(",")
              .map((s) => s.trim().split(" ")[0])
              .filter((u) => u && u.includes("pinimg.com"));
            
            const priorityOrder = ["originals", "736x", "564x", "474x"];
            for (const priority of priorityOrder) {
              const found = urls.find(url => url.includes(priority));
              if (found) return found;
            }
            
            return urls.length ? urls[urls.length - 1] : null;
          }
          return img.getAttribute("src");
        };

        const selectors = [
          'img[srcset*="originals"]',
          'img[srcset*="736x"]',
          'img[srcset*="564x"]',
          'img[srcset*="474x"]',
          "img[srcset]",
          'img[src*="pinimg.com"]',
        ];

        let allImgs = [];
        for (const sel of selectors) {
          const imgs = Array.from(document.querySelectorAll(sel));
          allImgs = allImgs.concat(imgs);
          if (allImgs.length > 100) break;
        }

        const validUrls = [...new Set(allImgs.map(extractBestUrl))]
          .filter((url) => {
            if (!url || !url.includes("pinimg.com")) return false;
            const match = url.match(/(\d+)x(\d+)/);
            if (!match) return true;
            const width = parseInt(match[1], 10);
            return width >= 200;
          })
          .slice(0, 120);

        console.log(`[BACKUP] Extraídas ${validUrls.length} imagens`);
        return validUrls;
      });

      await page.close();
      this.releaseBrowser(browserInstance.id);

      if (!imgs || imgs.length === 0) {
        throw new Error(`Nenhuma imagem encontrada via backup para "${searchTerm}"`);
      }

      console.log(`[BACKUP] ✅ ${imgs.length} imagens via scraping backup`);
      this.updateCache(searchTerm, imgs);
      return this.getMultipleImages(searchTerm, count) || imgs.slice(0, count);

    } catch (error) {
      if (page) await page.close().catch(() => {});
      if (browserInstance) this.releaseBrowser(browserInstance.id);
      throw error;
    }
  }

  // Métodos de browser/login mantidos para backup
  async acquireBrowser() {
    // Cria browser lazy (só quando necessário)
    if (this.browserInstances.length === 0) {
      console.log("[BROWSER] Criando primeiro browser para backup...");
      const instance = await this.createBrowserInstance();
      this.browserInstances.push(instance);
    }

    const availableBrowser = this.browserInstances.find(instance => !instance.inUse);
    
    if (availableBrowser) {
      availableBrowser.inUse = true;
      availableBrowser.lastUsed = Date.now();
      return availableBrowser;
    }

    if (this.browserInstances.length < this.maxBrowsers) {
      const instance = await this.createBrowserInstance();
      instance.inUse = true;
      this.browserInstances.push(instance);
      return instance;
    }

    // Espera por browser disponível
    let waitTime = 0;
    while (waitTime < 30000) {
      await this.delay(1000);
      waitTime += 1000;
      
      const browser = this.browserInstances.find(instance => !instance.inUse);
      if (browser) {
        browser.inUse = true;
        browser.lastUsed = Date.now();
        return browser;
      }
    }

    throw new Error("Timeout: Nenhum navegador disponível para backup");
  }

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
        "--disable-gpu"
      ],
      defaultViewport: { width: 1366, height: 768 },
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

  releaseBrowser(instanceId) {
    const instance = this.browserInstances.find(i => i.id === instanceId);
    if (instance) {
      instance.inUse = false;
      instance.lastUsed = Date.now();
    }
  }

  // Login methods mantidos para backup (código original)
  async ensureLogin(browserInstance) {
    if (browserInstance.loginStatus === 'logged') return true;
    
    browserInstance.loginStatus = 'logging';
    
    try {
      const page = await browserInstance.browser.newPage();
      
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      
      const loginSuccess = await this.performRobustLogin(page);
      
      if (loginSuccess) {
        browserInstance.loginStatus = 'logged';
        console.log(`[LOGIN] ✅ Backup login sucesso`);
      } else {
        browserInstance.loginStatus = 'failed';
      }
      
      await page.close();
      return loginSuccess;
      
    } catch (error) {
      browserInstance.loginStatus = 'failed';
      console.error(`[LOGIN] ❌ Erro no backup login:`, error.message);
      return false;
    }
  }

  async performRobustLogin(page) {
    try {
      await page.goto("https://br.pinterest.com/login/", { 
        waitUntil: "networkidle2", 
        timeout: 30000 
      });

      await this.delay(2000);

      // Sistema de login simplificado para backup
      const emailInput = await page.waitForSelector('input[name="id"], input[type="email"]', { 
        timeout: 10000 
      });
      const passwordInput = await page.waitForSelector('input[type="password"]', { 
        timeout: 10000 
      });

      if (!emailInput || !passwordInput) {
        throw new Error("Campos de login não encontrados");
      }

      await emailInput.type(this.backupLogin.email, { delay: 100 });
      await passwordInput.type(this.backupLogin.password, { delay: 100 });

      const submitButton = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
      
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20000 }),
        submitButton.click()
      ]);

      await this.delay(2000);
      const currentUrl = page.url();
      
      return currentUrl.includes('pinterest.com') && !currentUrl.includes('/login');
      
    } catch (error) {
      console.error("[LOGIN] Erro no backup login:", error.message);
      return false;
    }
  }

  // Sistema de cache mantido
  updateCache(termo, imagens) {
    if (!this.imagemCache[termo]) {
      this.imagemCache[termo] = {
        urls: [],
        enviadas: {},
        lastUsed: Date.now(),
        totalFetched: 0,
        source: 'unknown'
      };
    }
    
    const cache = this.imagemCache[termo];
    const newUrls = imagens.filter(url => !cache.urls.includes(url));
    
    cache.urls = [...cache.urls, ...newUrls];
    cache.lastUsed = Date.now();
    cache.totalFetched += newUrls.length;
    cache.source = 'api'; // Marca como API
    
    if (cache.urls.length > 150) {
      cache.urls = cache.urls.slice(-100);
      const urlsSet = new Set(cache.urls);
      for (const url in cache.enviadas) {
        if (!urlsSet.has(url)) {
          delete cache.enviadas[url];
        }
      }
    }
    
    console.log(`[CACHE] ✅ "${termo}": ${cache.urls.length} URLs (${cache.source})`);
  }

  getMultipleImages(termo, count) {
    if (!this.imagemCache[termo] || !this.imagemCache[termo].urls.length) {
      return null;
    }
    
    const cache = this.imagemCache[termo];
    cache.lastUsed = Date.now();
    
    const availableImages = cache.urls.filter(url => !cache.enviadas[url]);
    
    if (availableImages.length < count) {
      const resetCount = Math.min(30, Object.keys(cache.enviadas).length);
      const oldestSent = Object.entries(cache.enviadas)
        .sort(([,a], [,b]) => a - b)
        .slice(0, resetCount)
        .map(([url]) => url);
      
      oldestSent.forEach(url => delete cache.enviadas[url]);
    }
    
    const urlsToUse = availableImages.length >= count ? availableImages : cache.urls;
    const shuffled = [...urlsToUse].sort(() => Math.random() - 0.5);
    
    const selectedImages = [];
    const timestamp = Date.now();
    
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const img = shuffled[i];
      selectedImages.push(img);
      cache.enviadas[img] = timestamp;
    }
    
    return selectedImages;
  }

  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const termo in this.imagemCache) {
        const cache = this.imagemCache[termo];
        if (cache.lastUsed && (now - cache.lastUsed) > 30 * 60 * 1000) {
          delete this.imagemCache[termo];
          console.log(`[CACHE] Limpo: ${termo}`);
        }
      }
    }, 10 * 60 * 1000);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async addToQueue(request) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    const promises = [];
    
    while (this.requestQueue.length > 0 && promises.length < this.maxConcurrentRequests) {
      const { request, resolve, reject } = this.requestQueue.shift();
      
      const promise = this.executeRequest(request)
        .then(resolve)
        .catch(reject);
      
      promises.push(promise);
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    this.isProcessingQueue = false;
    
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 200);
    }
  }

  async executeRequest(request) {
    const { searchTerm, count, isCustomSearch } = request;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.searchImagesInternal(searchTerm, count, isCustomSearch);
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw error;
        }
        await this.delay(attempt * 1000);
      }
    }
  }

  async searchImages(searchTerm, count = 1, isCustomSearch = false) {
    return this.addToQueue({ searchTerm, count, isCustomSearch });
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

  async handlePinterestCommand(Yaka, m, { args, body, prefix }) {
    try {
      const isPintSearch = body && body.toLowerCase().startsWith('.pinterest');
      
      if (isPintSearch) {
        const fullQuery = body.slice(10).trim();
        
        if (!fullQuery) {
          return Yaka.sendMessage(m.from, { 
            text: "❌ Digite um termo para pesquisar:\n\n*Exemplo:* .pinterest goku#5\n\n🚀 *Pinterest API Oficial* - SEM login necessário!\n📊 Requests: " + this.pinterestAPI.requestCount + "/" + this.pinterestAPI.rateLimit.trial 
          }, { quoted: m });
        }
        
        const parts = fullQuery.split('#');
        const searchQuery = parts[0].trim();
        const count = parts[1] ? Math.min(Math.max(parseInt(parts[1]), 1), 10) : 1;
        
        console.log(`[COMMAND] Pinterest search: "${searchQuery}" x${count}`);
        
        const statusEmoji = this.pinterestAPI.enabled ? "🚀" : "🔄";
        const method = this.pinterestAPI.enabled ? "API Oficial" : "Scraping Backup";
        
        await Yaka.sendMessage(m.from, { 
          text: `${statusEmoji} Buscando ${count} imagem(ns): "${searchQuery}"\n📡 Método: ${method}\n⏱️ Aguarde...` 
        }, { quoted: m });
        
        const images = await this.searchImages(searchQuery, count, true);
        
        for (let i = 0; i < images.length; i++) {
          try {
            const apiStatus = this.pinterestAPI.enabled ? "🚀 API" : "🔄 Backup";
            await Yaka.sendMessage(
              m.from,
              { 
                image: { url: images[i] }, 
                caption: count > 1 
                  ? `✨ ${searchQuery} (${i + 1}/${count})\n${apiStatus} | Requests: ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}` 
                  : `✨ ${searchQuery}\n${apiStatus} | Requests: ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}`
              },
              { quoted: m }
            );
            
            if (i < images.length - 1) await this.delay(600);
          } catch (sendError) {
            console.error(`[SEND] Erro imagem ${i + 1}:`, sendError.message);
          }
        }
        
        return;
      }
      
      if (!args.length) {
        const termosList = Object.keys(this.shortToFullTerm)
          .map(key => `• *${key}* → ${this.shortToFullTerm[key]}`)
          .join("\n");
        
        const apiStatus = this.pinterestAPI.enabled 
          ? `🚀 *API Ativa* - SEM login!\n📊 ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial} requests`
          : `🔄 *Backup Mode* - usando scraping`;
          
        return Yaka.sendMessage(m.from, { 
          text: `📌 *Termos Disponíveis:*\n\n${termosList}\n\n*Uso:*\n• .pin <termo>\n• .pin <termo>#<1-10>\n• .pinterest <busca>#<1-10>\n\n${apiStatus}` 
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
      
      console.log(`[COMMAND] Pinterest preset: "${fullTerm}" x${count}`);
      
      const method = this.pinterestAPI.enabled ? "🚀 API Oficial" : "🔄 Scraping";
      await Yaka.sendMessage(m.from, { 
        text: `🔍 Buscando ${count}x *${fullTerm}*\n${method} (SEM login)\n⏱️ Processando...` 
      }, { quoted: m });
      
      const images = await this.searchImages(fullTerm, count, false);
      
      for (let i = 0; i < images.length; i++) {
        try {
          const source = this.pinterestAPI.enabled ? "🚀 API" : "🔄 Backup";
          await Yaka.sendMessage(
            m.from,
            { 
              image: { url: images[i] }, 
              caption: count > 1 
                ? `✨ *${fullTerm}*\n📷 ${i + 1}/${count} | 🔖 ${shortTerm}\n${source} | ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}` 
               : `✨ *${fullTerm}*\n🔖 ${shortTerm}\n${source} | ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}`
           },
           { quoted: m }
         );
         
         if (i < images.length - 1) await this.delay(600);
       } catch (sendError) {
         console.error(`[SEND] Erro imagem ${i + 1}:`, sendError.message);
       }
     }

   } catch (error) {
     console.error("[COMMAND] Erro:", error);
     
     let errorMessage = "❌ Erro na busca.";
     if (error.message.includes("timeout")) {
       errorMessage = "❌ Timeout. Tente novamente.";
     } else if (error.message.includes("Nenhuma imagem")) {
       errorMessage = "❌ Nenhuma imagem encontrada.";
     } else if (error.message.includes("login")) {
       errorMessage = "❌ Erro no backup login.";
     }
     
     const status = this.pinterestAPI.enabled ? "🚀 API" : "🔄 Backup";
     await Yaka.sendMessage(m.from, { 
       text: `${errorMessage}\n\n${status} | ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial} requests\n💡 Tente outro termo.` 
     }, { quoted: m });
   }
 }

 async closeAllBrowsers() {
   console.log("[CLEANUP] Fechando browsers backup...");
   
   const promises = this.browserInstances.map(async (instance) => {
     try {
       await instance.browser.close();
       console.log(`[CLEANUP] Browser ${instance.id} fechado`);
     } catch (error) {
       console.error(`[CLEANUP] Erro ao fechar ${instance.id}:`, error.message);
     }
   });
   
   await Promise.allSettled(promises);
   this.browserInstances = [];
   console.log("[CLEANUP] Cleanup completo");
 }

 getStats() {
   return {
     totalBrowsers: this.browserInstances.length,
     activeBrowsers: this.browserInstances.filter(b => b.inUse).length,
     queueSize: this.requestQueue.length,
     cacheTerms: Object.keys(this.imagemCache).length,
     apiEnabled: this.pinterestAPI.enabled,
     apiRequests: this.pinterestAPI.requestCount,
     apiLimit: this.pinterestAPI.rateLimit.trial,
     maxConcurrent: this.maxConcurrentRequests
   };
 }
}

const pinterestScraper = new PinterestImageScraper();

process.on('SIGTERM', async () => {
 console.log("[SHUTDOWN] Fechando...");
 await pinterestScraper.closeAllBrowsers();
 process.exit(0);
});

process.on('SIGINT', async () => {
 console.log("[SHUTDOWN] Interrompido...");
 await pinterestScraper.closeAllBrowsers();
 process.exit(0);
});

module.exports = {
 name: "pinterest",
 alias: ["pin"],
 desc: "Pinterest API oficial (SEM login) + scraping backup inteligente",
 category: "Search",
 usage: "pin <termo> | pin <termo>#<1-10> | .pinterest <busca>#<1-10>",
 react: "🖼️",
 start: async (Yaka, m, { args, body, prefix }) => {
   await pinterestScraper.handlePinterestCommand(Yaka, m, { args, body, prefix });
 },
 stats: () => pinterestScraper.getStats(),
 cleanup: () => pinterestScraper.closeAllBrowsers()
};
