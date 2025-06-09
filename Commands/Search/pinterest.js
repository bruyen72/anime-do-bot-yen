const puppeteer = require("puppeteer");
const axios = require("axios");

class PinterestImageScraper {
  constructor() {
    this.browserInstances = [];
    this.maxBrowsers = 5; // Aumentado para 5 navegadores paralelos
    this.imagemCache = {};
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.retryAttempts = 3;
    this.maxConcurrentRequests = 5; // 5 requisições simultâneas
    this.activeRequests = 0;
    this.loginSessions = new Map(); // Cache de sessões logadas
    
    // 🚀 PINTEREST API OFICIAL - TOKEN ATUALIZADO
    this.pinterestAPI = {
      token: "pina_AMA72OYXAASGSBAAGAAN4DUZSP2VJFYBACGSP5PCNTFC3HFSM6X5XUIKCCORIHHZ2YMO77QLSXYEXSZAFXMHSSODDH7ENGQA",
      baseURL: "https://api.pinterest.com/v5",
      rateLimit: {
        trial: 1000, // 1000 requests per day
        standard: 100 // 100 requests per second
      },
      requestCount: 0,
      lastReset: Date.now(),
      enabled: true
    };
    
    this.loginCredentials = {
      email: "brunoruthes92@gmail.com",
      password: "BRPO@hulk1"
    };

    // Mapeamentos de termos curtos e URLs mantidos exatamente
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

    // Inicia sistemas automáticos
    this.startCacheCleanup();
    this.startBrowserMaintenance();
    this.preWarmBrowsers();
    this.initAPIRateLimit(); // Sistema de rate limit da API
  }

  // 🚀 NOVO: Sistema de rate limit para API
  initAPIRateLimit() {
    setInterval(() => {
      this.pinterestAPI.requestCount = 0;
      this.pinterestAPI.lastReset = Date.now();
      console.log("[API] Rate limit resetado - novo dia iniciado");
    }, 24 * 60 * 60 * 1000); // Reset diário
  }

  // 🚀 FUNÇÃO PRINCIPAL: Pinterest API oficial
  async searchWithPinterestAPI(searchTerm, count = 1) {
    try {
      // Verifica rate limit
      if (this.pinterestAPI.requestCount >= this.pinterestAPI.rateLimit.trial) {
        console.log("[API] ⚠️ Rate limit diário atingido, usando scraping como fallback");
        return null;
      }

      // Verifica se API está habilitada
      if (!this.pinterestAPI.enabled) {
        console.log("[API] API temporariamente desabilitada, usando scraping");
        return null;
      }

      console.log(`[API] 🚀 Buscando "${searchTerm}" via Pinterest API oficial...`);
      
      const startTime = Date.now();
      const response = await axios.get(`${this.pinterestAPI.baseURL}/pins/search`, {
        headers: {
          'Authorization': `Bearer ${this.pinterestAPI.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Pinterest-Bot/2.0'
        },
        params: {
          q: searchTerm,
          limit: Math.min(count * 5, 25) // Busca mais para ter variedade
        },
        timeout: 15000 // 15 segundos timeout
      });

      this.pinterestAPI.requestCount++;
      const responseTime = Date.now() - startTime;
      
      console.log(`[API] ✅ Resposta recebida em ${responseTime}ms. Requests hoje: ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}`);

      if (response.data && response.data.items && response.data.items.length > 0) {
        const pins = response.data.items;
        const imageUrls = pins
          .map(pin => {
            // Extrai URL da imagem de melhor qualidade
            if (pin.media && pin.media.images) {
              const images = pin.media.images;
              // Prioriza original > 736x > 564x > 474x
              return images.originals?.url || 
                     images['736x']?.url || 
                     images['564x']?.url || 
                     images['474x']?.url ||
                     images.orig?.url;
            }
            return null;
          })
          .filter(url => url && url.includes('pinimg.com'))
          .slice(0, count);

        if (imageUrls.length > 0) {
          console.log(`[API] ✅ ${imageUrls.length} imagens HD encontradas via API oficial!`);
          return imageUrls;
        }
      }

      console.log("[API] ⚠️ Nenhuma imagem encontrada na resposta da API, usando scraping backup");
      return null;

    } catch (error) {
      console.log(`[API] ❌ Erro na API oficial: ${error.message}`);
      
      // Tratamento específico para diferentes erros
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          console.log("[API] ❌ Token inválido ou expirado - verificar configuração");
          this.pinterestAPI.enabled = false;
          setTimeout(() => {
            this.pinterestAPI.enabled = true;
            console.log("[API] ✅ API reabilitada para nova tentativa");
          }, 30 * 60 * 1000); // 30 minutos
        } else if (status === 429) {
          console.log("[API] ⚠️ Rate limit da API atingido temporariamente");
        } else if (status === 403) {
          console.log("[API] ❌ Acesso negado - verificar permissões do token");
        }
      }
      
      console.log("[API] 🔄 Fallback para scraping ativado");
      return null;
    }
  }

  // Pré-aquece navegadores para reduzir latência
  async preWarmBrowsers() {
    try {
      console.log("[INIT] 🔥 Pré-aquecendo navegadores...");
      for (let i = 0; i < 2; i++) {
        setTimeout(async () => {
          try {
            const instance = await this.createBrowserInstance();
            this.browserInstances.push(instance);
            console.log(`[INIT] ✅ Navegador ${i + 1} pré-aquecido e pronto`);
          } catch (error) {
            console.error(`[ERRO] ❌ Falha no pré-aquecimento ${i + 1}:`, error.message);
          }
        }, i * 2000);
      }
    } catch (error) {
      console.error("[ERRO] ❌ Falha no sistema de pré-aquecimento:", error);
    }
  }

  // Sistema de fila otimizado para 5 requisições paralelas
  async addToQueue(request) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject, timestamp: Date.now() });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    // Processa até 5 requisições simultâneas
    const promises = [];
    
    while (this.requestQueue.length > 0 && promises.length < this.maxConcurrentRequests) {
      const { request, resolve, reject } = this.requestQueue.shift();
      
      const promise = this.executeRequest(request)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.activeRequests--;
        });
      
      promises.push(promise);
      this.activeRequests++;
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    this.isProcessingQueue = false;
    
    // Continue processando se ainda há itens na fila
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
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
        
        // Delay progressivo entre tentativas
        await this.delay(attempt * 1500);
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Sistema de limpeza automática melhorado
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      for (const termo in this.imagemCache) {
        const cache = this.imagemCache[termo];
        if (cache.lastUsed && (now - cache.lastUsed) > 30 * 60 * 1000) { // 30 minutos
          delete this.imagemCache[termo];
          cleanedCount++;
        }
      }
      if (cleanedCount > 0) {
        console.log(`[CACHE] 🧹 Limpeza automática: ${cleanedCount} termos removidos`);
      }
    }, 10 * 60 * 1000); // A cada 10 minutos
  }

  // Manutenção automática de navegadores
  startBrowserMaintenance() {
    setInterval(async () => {
      await this.closeIdleBrowsers();
      await this.cleanupDeadBrowsers();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  // Cria instância de navegador otimizada
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
        "--memory-pressure-off",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        "--metrics-recording-only",
        "--no-default-browser-check",
        "--safebrowsing-disable-auto-update",
        "--disable-client-side-phishing-detection"
      ],
      defaultViewport: { width: 1366, height: 768 },
    });
    
    const instanceId = Date.now() + Math.random();
    return {
      browser,
      inUse: false,
      id: instanceId,
      created: Date.now(),
      lastUsed: Date.now(),
      loginStatus: 'none' // none, logging, logged, failed
    };
  }

  // Gerenciamento inteligente de navegadores
  async acquireBrowser() {
    // Primeiro, tenta encontrar navegador logado disponível
    const loggedBrowser = this.browserInstances.find(
      instance => !instance.inUse && instance.loginStatus === 'logged'
    );
    
    if (loggedBrowser) {
      loggedBrowser.inUse = true;
      loggedBrowser.lastUsed = Date.now();
      console.log(`[BROWSER] ✅ Usando navegador logado: ${loggedBrowser.id}`);
      return loggedBrowser;
    }

    // Segundo, tenta navegador disponível qualquer
    const availableBrowser = this.browserInstances.find(instance => !instance.inUse);
    
    if (availableBrowser) {
      availableBrowser.inUse = true;
      availableBrowser.lastUsed = Date.now();
      console.log(`[BROWSER] ✅ Usando navegador disponível: ${availableBrowser.id}`);
      return availableBrowser;
    }

    // Terceiro, cria novo se possível
    if (this.browserInstances.length < this.maxBrowsers) {
      try {
        console.log(`[BROWSER] 🔄 Criando novo navegador (${this.browserInstances.length + 1}/${this.maxBrowsers})`);
        const instance = await this.createBrowserInstance();
        instance.inUse = true;
        this.browserInstances.push(instance);
        return instance;
      } catch (error) {
        console.error("[ERRO] ❌ Falha ao criar navegador:", error);
      }
    }

    // Quarto, espera por navegador disponível
    console.log("[BROWSER] ⏳ Aguardando navegador disponível...");
    let waitTime = 0;
    const maxWait = 45000; // 45 segundos
    
    while (waitTime < maxWait) {
      await this.delay(1000);
      waitTime += 1000;
      
      const availableBrowser = this.browserInstances.find(instance => !instance.inUse);
      if (availableBrowser) {
        availableBrowser.inUse = true;
        availableBrowser.lastUsed = Date.now();
        console.log(`[BROWSER] ✅ Navegador liberado após ${waitTime}ms`);
        return availableBrowser;
      }
    }

    throw new Error("Timeout: Nenhum navegador disponível após 45 segundos");
  }

  releaseBrowser(instanceId) {
    const instance = this.browserInstances.find(i => i.id === instanceId);
    if (instance) {
      instance.inUse = false;
      instance.lastUsed = Date.now();
      console.log(`[BROWSER] 🔄 Navegador ${instanceId} liberado`);
    }
  }

  // Método interno otimizado para buscar imagens com API + scraping backup
  async searchImagesInternal(searchTerm, count = 1, isCustomSearch = false) {
    let browserInstance = null;
    let page = null;

    try {
      // 1º: Verifica cache primeiro
      const cachedImages = this.getMultipleImages(searchTerm, count);
      if (cachedImages && cachedImages.length >= count) {
        console.log(`[CACHE] ✅ Usando ${cachedImages.length} imagens do cache para "${searchTerm}"`);
        return cachedImages.slice(0, count);
      }

      // 2º: Tenta Pinterest API oficial primeiro
      console.log(`[SEARCH] 🎯 Iniciando busca híbrida para "${searchTerm}" (${count} imagens)`);
      const apiImages = await this.searchWithPinterestAPI(searchTerm, count);
      if (apiImages && apiImages.length >= count) {
        console.log(`[API] ✅ Sucesso total via API oficial - ${apiImages.length} imagens HD`);
        this.updateCache(searchTerm, apiImages);
        return apiImages.slice(0, count);
      }

      // 3º: Backup com scraping (mantém toda sua lógica original)
      console.log("[SCRAPING] 🔄 API insuficiente, ativando scraping backup robusto...");
      
      // Adquire navegador
      browserInstance = await this.acquireBrowser();
      console.log(`[BROWSER] 🌐 Usando navegador ${browserInstance.id} para scraping`);
      
      // Garante que está logado
      const loginSuccess = await this.ensureLogin(browserInstance);
      if (!loginSuccess) {
        throw new Error("Falha crítica no login do Pinterest");
      }

      page = await browserInstance.browser.newPage();
      
      // Configurações otimizadas da página
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      
      await page.setViewport({ width: 1366, height: 768 });
      
      // Bloqueia recursos desnecessários para acelerar
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // URL de pesquisa
      const encodedQuery = encodeURIComponent(searchTerm);
      const searchUrl = isCustomSearch 
        ? `https://br.pinterest.com/search/pins/?q=${encodedQuery}`
        : this.termToUrl[searchTerm] || `https://br.pinterest.com/search/pins/?q=${encodedQuery}`;

      console.log(`[SEARCH] 🔍 Navegando para: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 45000 // Timeout aumentado
      });

      // Aguarda carregamento inicial
      await this.delay(3000);

      // Scroll otimizado para carregar mais imagens
      console.log("[SEARCH] 📜 Executando scroll inteligente para carregar imagens...");
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 1.5);
        });
        await this.delay(i < 3 ? 2000 : 1500); // Mais tempo nas primeiras cargas
        
        // Log de progresso
        if (i % 2 === 0) {
          console.log(`[SEARCH] 📜 Scroll ${i + 1}/8 executado`);
        }
      }

      // Extração otimizada de imagens
      console.log("[SEARCH] 🖼️ Extraindo URLs das imagens...");
      const imgs = await page.evaluate(() => {
        const extractBestUrl = (img) => {
          if (img.getAttribute("srcset")) {
            const srcset = img.getAttribute("srcset");
            const urls = srcset
              .split(",")
              .map((s) => s.trim().split(" ")[0])
              .filter((u) => u && u.includes("pinimg.com"));
            
            // Prioriza URLs de alta qualidade
            const priorityOrder = ["originals", "736x", "564x", "474x"];
            for (const priority of priorityOrder) {
              const found = urls.find(url => url.includes(priority));
              if (found) return found;
            }
            
            return urls.length ? urls[urls.length - 1] : null;
          }
          return img.getAttribute("src");
        };

        // Seletores otimizados para imagens do Pinterest
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
          if (allImgs.length > 150) break; // Limite aumentado
        }

        // Remove duplicatas e filtra URLs válidas
        const validUrls = [...new Set(allImgs.map(extractBestUrl))]
          .filter((url) => {
            if (!url || !url.includes("pinimg.com")) return false;
            
            // Aceita URLs sem dimensões específicas (geralmente originals)
            const match = url.match(/(\d+)x(\d+)/);
            if (!match) return true;
            
            const width = parseInt(match[1], 10);
            return width >= 200;
          })
          .slice(0, 200); // Limite aumentado

        console.log(`[EXTRACT] Encontradas ${validUrls.length} imagens válidas via scraping`);
        return validUrls;
      });

      await page.close();
      this.releaseBrowser(browserInstance.id);

      if (!imgs || imgs.length === 0) {
        throw new Error(`Nenhuma imagem encontrada para "${searchTerm}" via scraping backup`);
      }

      console.log(`[SUCCESS] ✅ ${imgs.length} imagens extraídas via scraping para "${searchTerm}"`);

      // Atualiza cache
      this.updateCache(searchTerm, imgs);

      // Retorna imagens solicitadas
      const selectedImages = this.getMultipleImages(searchTerm, count) || imgs.slice(0, count);
      return selectedImages;

    } catch (error) {
      if (page) {
        try {
          await page.close();
        } catch {}
      }
      if (browserInstance) {
        try {
          this.releaseBrowser(browserInstance.id);
        } catch {}
      }
      console.error(`[ERRO] ❌ Falha total na busca para "${searchTerm}":`, error.message);
      throw error;
    }
  }

  // Método público otimizado (usa sistema de fila)
  async searchImages(searchTerm, count = 1, isCustomSearch = false) {
    return this.addToQueue({ searchTerm, count, isCustomSearch });
  }

  // Sistema de cache otimizado
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
    cache.source = newUrls.length > 0 ? 'hybrid' : cache.source;
    
    // Limita cache para evitar uso excessivo de memória
    if (cache.urls.length > 250) {
      cache.urls = cache.urls.slice(-200); // Mantém as 200 mais recentes
      // Limpa histórico de enviadas para URLs removidas
      const urlsSet = new Set(cache.urls);
      for (const url in cache.enviadas) {
        if (!urlsSet.has(url)) {
          delete cache.enviadas[url];
        }
      }
    }
    
    console.log(`[CACHE] ✅ Atualizado "${termo}": ${cache.urls.length} URLs totais (${cache.source})`);
  }

  // Sistema inteligente de seleção de imagens
  getMultipleImages(termo, count) {
    if (!this.imagemCache[termo] || !this.imagemCache[termo].urls.length) {
      return null;
    }
    
    const cache = this.imagemCache[termo];
    cache.lastUsed = Date.now();
    
    // Filtra imagens não enviadas
    const availableImages = cache.urls.filter(url => !cache.enviadas[url]);
    
    // Se não há imagens suficientes não enviadas, reseta parcialmente
    if (availableImages.length < count) {
      const resetCount = Math.min(50, Object.keys(cache.enviadas).length);
      const oldestSent = Object.entries(cache.enviadas)
        .sort(([,a], [,b]) => a - b)
        .slice(0, resetCount)
        .map(([url]) => url);
      
      oldestSent.forEach(url => delete cache.enviadas[url]);
      console.log(`[CACHE] 🔄 Reset ${resetCount} imagens antigas para "${termo}"`);
    }
    
    const urlsToUse = availableImages.length >= count ? availableImages : cache.urls;
    
    // Embaralha inteligentemente (prioriza não enviadas)
    const notSent = urlsToUse.filter(url => !cache.enviadas[url]);
    const sent = urlsToUse.filter(url => cache.enviadas[url]);
    
    const shuffledNotSent = [...notSent].sort(() => Math.random() - 0.5);
    const shuffledSent = [...sent].sort(() => Math.random() - 0.5);
    
    const finalPool = [...shuffledNotSent, ...shuffledSent];
    
    const selectedImages = [];
    const timestamp = Date.now();
    
    for (let i = 0; i < Math.min(count, finalPool.length); i++) {
      const img = finalPool[i];
      selectedImages.push(img);
      cache.enviadas[img] = timestamp;
    }
    
    console.log(`[CACHE] 🎯 Selecionadas ${selectedImages.length} imagens para "${termo}"`);
    return selectedImages;
  }

  // Sistema de login ROBUSTO (mantido do código original)
  async ensureLogin(browserInstance) {
    try {
      if (browserInstance.loginStatus === 'logged') {
        console.log(`[LOGIN] ✅ Navegador ${browserInstance.id} já está logado`);
        return true;
      }
      
      if (browserInstance.loginStatus === 'logging') {
        console.log(`[LOGIN] ⏳ Aguardando login em progresso...`);
        let waitTime = 0;
        while (browserInstance.loginStatus === 'logging' && waitTime < 60000) {
          await this.delay(1000);
          waitTime += 1000;
        }
        return browserInstance.loginStatus === 'logged';
      }
      
      browserInstance.loginStatus = 'logging';
      console.log(`[LOGIN] 🔐 Iniciando processo de login para navegador ${browserInstance.id}`);
      
      try {
        const page = await browserInstance.browser.newPage();
        
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
        
        const loginSuccess = await this.performRobustLogin(page);
        
        if (loginSuccess) {
          browserInstance.loginStatus = 'logged';
          console.log(`[LOGIN] ✅ Login realizado com sucesso para navegador ${browserInstance.id}!`);
        } else {
          browserInstance.loginStatus = 'failed';
          console.error(`[LOGIN] ❌ Falha no login para navegador ${browserInstance.id}`);
        }
        
        await page.close();
        return loginSuccess;
        
      } catch (error) {
        browserInstance.loginStatus = 'failed';
        console.error(`[LOGIN] ❌ Erro crítico no login:`, error.message);
        return false;
      }
      
    } catch (error) {
     browserInstance.loginStatus = 'failed';
     console.error(`[LOGIN] ❌ Erro no ensureLogin:`, error.message);
     return false;
   }
 }

 // Sistema de login robusto (mantido da sua versão original)
 async performRobustLogin(page, maxAttempts = 3) {
   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
     try {
       console.log(`[LOGIN] 🔐 Tentativa de login ${attempt}/${maxAttempts}`);
       
       // Navega para página de login com timeout aumentado
       await page.goto("https://br.pinterest.com/login/", { 
         waitUntil: "networkidle2", 
         timeout: 45000 
       });

       // Aguarda carregamento completo
       await this.delay(3000);

       // Lida com modal de cookies se existir
       await this.handleCookiesModal(page);

       // Sistema robusto de detecção de campos
       const emailInput = await this.findLoginField(page);
       if (!emailInput) {
         throw new Error("Campo de email não encontrado após todas as tentativas");
       }

       const passwordInput = await this.findPasswordField(page);
       if (!passwordInput) {
         throw new Error("Campo de senha não encontrado");
       }

       // Preenche campos com técnica robusta
       await this.fillLoginFields(page, emailInput, passwordInput);

       // Submete formulário
       const success = await this.submitLoginForm(page);
       
       if (success) {
         console.log("[LOGIN] ✅ Login realizado com sucesso!");
         return true;
       } else {
         throw new Error("Falha na submissão do formulário");
       }

     } catch (error) {
       console.error(`[LOGIN] ❌ Tentativa ${attempt} falhou:`, error.message);
       
       if (attempt === maxAttempts) {
         throw new Error(`Login falhou após ${maxAttempts} tentativas: ${error.message}`);
       }
       
       await this.delay(attempt * 3000);
       
       try {
         await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
         await this.delay(2000);
       } catch (reloadError) {
         console.error("[LOGIN] Falha ao recarregar página:", reloadError.message);
       }
     }
   }
   
   return false;
 }

 // Lida com modal de cookies
 async handleCookiesModal(page) {
   try {
     console.log("[LOGIN] 🍪 Verificando modal de cookies...");
     
     const cookieSelectors = [
       'button[data-test-id="accept-cookies-button"]',
       'button[aria-label*="cookie" i]',
       'button:has-text("Aceitar")',
       'button:has-text("Accept")',
       'button[class*="cookie" i]',
       '[role="dialog"] button',
       '.cookie-banner button'
     ];

     for (const selector of cookieSelectors) {
       try {
         const cookieButton = await page.waitForSelector(selector, { timeout: 3000 });
         if (cookieButton && await cookieButton.isVisible()) {
           await cookieButton.click();
           await this.delay(1500);
           console.log("[LOGIN] ✅ Modal de cookies fechado");
           break;
         }
       } catch {}
     }
   } catch (error) {
     console.log("[LOGIN] 🍪 Nenhum modal de cookies detectado");
   }
 }

 // Sistema robusto para encontrar campo de email
 async findLoginField(page) {
   console.log("[LOGIN] 📧 Procurando campo de email...");
   
   const emailSelectors = [
     'input[name="id"]',
     'input[data-test-id="email"]',
     'input[data-testid="email"]',
     'input[autocomplete="username"]',
     'input[autocomplete="email"]',
     'input[name="email"]',
     'input[name="username"]',
     'input[type="email"]',
     'input[id="email"]',
     'input[id="username"]',
     'input[placeholder*="email" i]',
     'input[placeholder*="Email" i]',
     'input[placeholder*="e-mail" i]',
     'input[placeholder*="usuário" i]',
     'input[placeholder*="user" i]',
     'form input[type="text"]:first-of-type',
     'form input:not([type="password"]):not([type="hidden"]):not([type="submit"]):first-of-type',
     '.login-form input:first-of-type',
     '[class*="login"] input:first-of-type',
     '[class*="signin"] input:first-of-type'
   ];

   for (const selector of emailSelectors) {
     try {
       console.log(`[LOGIN] 🔍 Testando seletor: ${selector}`);
       
       const element = await page.waitForSelector(selector, { 
         timeout: 5000,
         visible: true 
       });
       
       if (element) {
         const isVisible = await element.isVisible();
         const isEnabled = await page.evaluate(el => !el.disabled, element);
         
         if (isVisible && isEnabled) {
           console.log(`[LOGIN] ✅ Campo de email encontrado: ${selector}`);
           return element;
         }
       }
     } catch (error) {
       console.log(`[LOGIN] ❌ Seletor ${selector} falhou`);
     }
   }
   
   // Última tentativa: busca por qualquer input visível
   try {
     const allInputs = await page.$$('input[type="text"], input[type="email"], input:not([type])');
     for (const input of allInputs) {
       const isVisible = await input.isVisible();
       if (isVisible) {
         console.log("[LOGIN] ✅ Campo genérico encontrado");
         return input;
       }
     }
   } catch {}
   
   return null;
 }

 // Sistema robusto para encontrar campo de senha
 async findPasswordField(page) {
   console.log("[LOGIN] 🔒 Procurando campo de senha...");
   
   const passwordSelectors = [
     'input[name="password"]',
     'input[type="password"]',
     'input[data-test-id="password"]',
     'input[data-testid="password"]',
     'input[autocomplete="current-password"]',
     'input[autocomplete="password"]',
     'input[id="password"]',
     'input[placeholder*="senha" i]',
     'input[placeholder*="password" i]'
   ];

   for (const selector of passwordSelectors) {
     try {
       const element = await page.waitForSelector(selector, { 
         timeout: 8000,
         visible: true 
       });
       
       if (element && await element.isVisible()) {
         console.log(`[LOGIN] ✅ Campo de senha encontrado: ${selector}`);
         return element;
       }
     } catch (error) {
       console.log(`[LOGIN] ❌ Seletor senha ${selector} falhou`);
     }
   }
   
   return null;
 }

 // Preenche campos de login com técnica robusta
 async fillLoginFields(page, emailInput, passwordInput) {
   try {
     console.log("[LOGIN] ✏️ Preenchendo campo de email...");
     
     await emailInput.click({ clickCount: 3 });
     await this.delay(500);
     await emailInput.type(this.loginCredentials.email, { delay: 150 });
     await this.delay(1000);
     
     const emailValue = await page.evaluate(el => el.value, emailInput);
     if (!emailValue || !emailValue.includes(this.loginCredentials.email)) {
       await page.evaluate((el, email) => {
         el.value = email;
         el.dispatchEvent(new Event('input', { bubbles: true }));
         el.dispatchEvent(new Event('change', { bubbles: true }));
       }, emailInput, this.loginCredentials.email);
     }
     
     console.log("[LOGIN] ✅ Email inserido com sucesso");
     
     console.log("[LOGIN] ✏️ Preenchendo campo de senha...");
     
     await passwordInput.click({ clickCount: 3 });
     await this.delay(500);
     await passwordInput.type(this.loginCredentials.password, { delay: 150 });
     await this.delay(1000);
     
     const passwordValue = await page.evaluate(el => el.value, passwordInput);
     if (!passwordValue || passwordValue.length < 5) {
       await page.evaluate((el, password) => {
         el.value = password;
         el.dispatchEvent(new Event('input', { bubbles: true }));
         el.dispatchEvent(new Event('change', { bubbles: true }));
       }, passwordInput, this.loginCredentials.password);
     }
     
     console.log("[LOGIN] ✅ Senha inserida com sucesso");
     
   } catch (error) {
     console.error("[LOGIN] ❌ Erro ao preencher campos:", error.message);
     throw error;
   }
 }

 // Submit do formulário com múltiplas estratégias
 async submitLoginForm(page) {
   try {
     console.log("[LOGIN] 🚀 Procurando botão de submit...");
     
     const submitSelectors = [
       'button[type="submit"]',
       'button[data-test-id="registerFormSubmitButton"]',
       'button[data-testid="login-button"]',
       'input[type="submit"]',
       'button:has-text("Entrar")',
       'button:has-text("Log in")',
       'button:has-text("Sign in")',
       'form button:last-of-type',
       '.login-form button',
       '[class*="login"] button'
     ];

     let submitButton = null;
     
     for (const selector of submitSelectors) {
       try {
         submitButton = await page.waitForSelector(selector, { 
           timeout: 3000,
           visible: true 
         });
         if (submitButton && await submitButton.isVisible()) {
           console.log(`[LOGIN] ✅ Botão de submit encontrado: ${selector}`);
           break;
         }
       } catch {}
     }

     if (!submitButton) {
       throw new Error("Botão de submit não encontrado");
     }

     console.log("[LOGIN] 🖱️ Clicando no botão de login...");
     
     try {
       await Promise.all([
         page.waitForNavigation({ 
           waitUntil: "domcontentloaded", 
           timeout: 30000 
         }),
         submitButton.click()
       ]);
     } catch (navError) {
       console.log("[LOGIN] Navegação não detectada, verificando URL...");
       await this.delay(3000);
     }

     // Verifica se login foi bem-sucedido
     await this.delay(2000);
     const currentUrl = page.url();
     console.log(`[LOGIN] 🔍 URL atual após login: ${currentUrl}`);
     
     const successUrls = [
       'br.pinterest.com/',
       'pinterest.com/home',
       'pinterest.com/today',
       'pinterest.com/resource'
     ];
     
     const isLoggedIn = successUrls.some(url => currentUrl.includes(url)) && 
                       !currentUrl.includes('/login');
     
     if (isLoggedIn) {
       return true;
     }
     
     // Verifica por elementos que indicam login
     try {
       await page.waitForSelector([
         '[data-test-id="header-profile"]',
         '[data-test-id="user-menu-button"]',
         '.profileMenuButton',
         '.headerProfileButton'
       ].join(','), { timeout: 5000 });
       return true;
     } catch {}
     
     return false;
     
   } catch (error) {
     console.error("[LOGIN] ❌ Erro no submit:", error.message);
     return false;
   }
 }

 // Limpeza de navegadores ociosos
 async closeIdleBrowsers() {
   const now = Date.now();
   const idleTime = 8 * 60 * 1000; // 8 minutos
   const maxBrowsersToKeep = 2;

   let closedCount = 0;
   
   for (let i = this.browserInstances.length - 1; i >= maxBrowsersToKeep; i--) {
     const instance = this.browserInstances[i];
     
     if (!instance.inUse && 
         instance.lastUsed && 
         (now - instance.lastUsed) > idleTime) {
       try {
         await instance.browser.close();
         this.browserInstances.splice(i, 1);
         closedCount++;
         console.log(`[MAINTENANCE] 🧹 Navegador ocioso fechado: ${instance.id}`);
       } catch (error) {
         console.error(`[MAINTENANCE] ❌ Erro ao fechar navegador ${instance.id}:`, error.message);
       }
     }
   }
   
   if (closedCount > 0) {
     console.log(`[MAINTENANCE] ✅ ${closedCount} navegadores ociosos fechados`);
   }
 }

 // Limpeza de navegadores "mortos"
 async cleanupDeadBrowsers() {
   let cleanedCount = 0;
   
   for (let i = this.browserInstances.length - 1; i >= 0; i--) {
     const instance = this.browserInstances[i];
     
     try {
       const pages = await instance.browser.pages();
       if (pages.length === 0) {
         await instance.browser.newPage().then(page => page.close());
       }
     } catch (error) {
       console.log(`[MAINTENANCE] 🗑️ Removendo navegador morto: ${instance.id}`);
       this.browserInstances.splice(i, 1);
       cleanedCount++;
     }
   }
   
   if (cleanedCount > 0) {
     console.log(`[MAINTENANCE] ✅ ${cleanedCount} navegadores mortos removidos`);
   }
 }

 // Extração de quantidade do comando
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

 // MÉTODO PRINCIPAL DO COMANDO - OTIMIZADO COM API + SCRAPING
 async handlePinterestCommand(Yaka, m, { args, body, prefix }) {
   try {
     // Detecta comando .pinterest para busca personalizada
     const isPintSearch = body && body.toLowerCase().startsWith('.pinterest');
     
     if (isPintSearch) {
       const fullQuery = body.slice(10).trim();
       
       if (!fullQuery) {
         const apiStatus = this.pinterestAPI.enabled ? "🚀 API Ativa" : "⚠️ API Indisponível";
         const requestInfo = `📊 ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial} requests hoje`;
         
         return Yaka.sendMessage(m.from, { 
           text: `❌ Digite um termo para pesquisar:\n\n*Exemplo:* .pinterest goku#5\n*Limite:* 1-10 imagens por busca\n\n${apiStatus}\n${requestInfo}\n\n🔄 *Backup:* Scraping sempre disponível` 
         }, { quoted: m });
       }
       
       const parts = fullQuery.split('#');
       const searchQuery = parts[0].trim();
       const count = parts[1] ? Math.min(Math.max(parseInt(parts[1]), 1), 10) : 1;
       
       console.log(`[COMMAND] 🎯 Pinterest custom search: "${searchQuery}" x${count}`);
       
       const method = this.pinterestAPI.enabled ? "🚀 API Oficial + Backup" : "🔄 Scraping Robusto";
       
       await Yaka.sendMessage(m.from, { 
         text: `🔍 Buscando ${count} imagem(ns): *"${searchQuery}"*\n\n${method}\n⏱️ Processando...` 
       }, { quoted: m });
       
       const images = await this.searchImages(searchQuery, count, true);
       
       // Envia imagens com delay otimizado
       for (let i = 0; i < images.length; i++) {
         try {
           const source = this.pinterestAPI.enabled && this.pinterestAPI.requestCount > 0 ? "🚀 API" : "🔄 Scraping";
           const requestInfo = `${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}`;
           
           await Yaka.sendMessage(
             m.from,
             { 
               image: { url: images[i] }, 
               caption: count > 1 
                 ? `✨ *${searchQuery}*\n📷 Imagem ${i + 1}/${count}\n${source} | Requests: ${requestInfo}\n📸 Pinterest HD` 
                 : `✨ *${searchQuery}*\n${source} | Requests: ${requestInfo}\n📸 Pinterest HD`
             },
             { quoted: m }
           );
           
           if (i < images.length - 1) {
             await this.delay(800);
           }
         } catch (sendError) {
           console.error(`[SEND] ❌ Erro ao enviar imagem ${i + 1}:`, sendError.message);
           await Yaka.sendMessage(m.from, { 
             text: `❌ Erro ao enviar imagem ${i + 1}/${count}` 
           }, { quoted: m });
         }
       }
       
       return;
     }
     
     // Comando .pin com termos pré-definidos
     if (!args.length) {
       const termosList = Object.keys(this.shortToFullTerm)
         .map(key => `• *${key}* → ${this.shortToFullTerm[key]}`)
         .join("\n");
       
       const apiStatus = this.pinterestAPI.enabled ? "🚀 *API Oficial Ativa*" : "⚠️ *API Indisponível*";
       const requestInfo = `📊 Requests hoje: ${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}`;
       const systemInfo = `🖥️ Navegadores ativos: ${this.browserInstances.filter(b => b.inUse).length}/${this.browserInstances.length}`;
       
       return Yaka.sendMessage(m.from, { 
         text: `📌 *Termos Disponíveis:*\n\n${termosList}\n\n*Uso:*\n• .pin <termo>\n• .pin <termo>#<1-10>\n• .pinterest <busca>#<1-10>\n\n*Status do Sistema:*\n${apiStatus}\n${requestInfo}\n${systemInfo}\n🔄 Scraping sempre disponível` 
       }, { quoted: m });
     }

     const { count, newArgs } = this.extractCountFromArgs(args);
     const shortTerm = newArgs[0]?.toLowerCase();

     if (!this.shortToFullTerm[shortTerm]) {
       const availableTerms = Object.keys(this.shortToFullTerm).slice(0, 6).join(', ');
       return Yaka.sendMessage(m.from, { 
         text: `❌ Termo "${shortTerm}" não encontrado.\n\n*Alguns termos:* ${availableTerms}...\n\nUse *.pin* sem argumentos para ver todos os termos disponíveis.` 
       }, { quoted: m });
     }

     const fullTerm = this.shortToFullTerm[shortTerm];
     
     console.log(`[COMMAND] 🎯 Pinterest preset search: "${fullTerm}" x${count}`);
     
     const method = this.pinterestAPI.enabled ? "🚀 Sistema Híbrido" : "🔄 Scraping Backup";
     
     await Yaka.sendMessage(m.from, { 
       text: `🔍 Buscando ${count} imagem(ns): *${fullTerm}*\n\n${method} (API + Scraping)\n⏱️ Processando...` 
     }, { quoted: m });
     
     const images = await this.searchImages(fullTerm, count, false);
     
     // Envia imagens com informações detalhadas
     for (let i = 0; i < images.length; i++) {
       try {
         const source = this.pinterestAPI.enabled && this.pinterestAPI.requestCount > 0 ? "🚀 API" : "🔄 Scraping";
         const requestInfo = `${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}`;
         
         await Yaka.sendMessage(
           m.from,
           { 
             image: { url: images[i] }, 
             caption: count > 1 
               ? `✨ *${fullTerm}*\n📷 Imagem ${i + 1}/${count}\n🔖 Termo: *${shortTerm}*\n${source} | Requests: ${requestInfo}\n📸 Pinterest HD` 
               : `✨ *${fullTerm}*\n🔖 Termo: *${shortTerm}*\n${source} | Requests: ${requestInfo}\n📸 Pinterest HD`
           },
           { quoted: m }
         );
         
         if (i < images.length - 1) {
           await this.delay(800);
         }
       } catch (sendError) {
         console.error(`[SEND] ❌ Erro ao enviar imagem ${i + 1}:`, sendError.message);
         await Yaka.sendMessage(m.from, { 
           text: `❌ Erro ao enviar imagem ${i + 1}/${count}` 
         }, { quoted: m });
       }
     }

     // Manutenção automática ocasional
     if (Math.random() < 0.15) { // 15% de chance
       setTimeout(() => {
         this.closeIdleBrowsers().catch(console.error);
       }, 5000);
     }

   } catch (error) {
     console.error("[COMMAND] ❌ Erro no comando Pinterest:", error);
     
     let errorMessage = "❌ Erro ao buscar imagem.";
     
     if (error.message.includes("login")) {
       errorMessage = "❌ Erro de autenticação. Sistema tentando resolver...";
     } else if (error.message.includes("timeout")) {
       errorMessage = "❌ Timeout na busca. Tente novamente em alguns segundos.";
     } else if (error.message.includes("Nenhuma imagem")) {
       errorMessage = "❌ Nenhuma imagem encontrada para este termo. Tente outro.";
     }
     
     const systemStatus = this.pinterestAPI.enabled ? "🚀 API Ativa" : "🔄 Backup Ativo";
     const requestInfo = `${this.pinterestAPI.requestCount}/${this.pinterestAPI.rateLimit.trial}`;
     
     await Yaka.sendMessage(m.from, { 
       text: `${errorMessage}\n\n${systemStatus} | Requests: ${requestInfo}\n💡 *Dica:* Tente novamente em alguns segundos ou use outro termo.` 
     }, { quoted: m });
   }
 }

 // Método para fechar todos os navegadores (cleanup completo)
 async closeAllBrowsers() {
   console.log("[CLEANUP] 🧹 Fechando todos os navegadores...");
   
   const promises = this.browserInstances.map(async (instance) => {
     try {
       await instance.browser.close();
       console.log(`[CLEANUP] ✅ Navegador ${instance.id} fechado`);
     } catch (error) {
       console.error(`[CLEANUP] ❌ Erro ao fechar navegador ${instance.id}:`, error.message);
     }
   });
   
   await Promise.allSettled(promises);
   this.browserInstances = [];
   console.log("[CLEANUP] ✅ Todos os navegadores fechados");
 }

 // Estatísticas do sistema
 getStats() {
   const totalBrowsers = this.browserInstances.length;
   const activeBrowsers = this.browserInstances.filter(b => b.inUse).length;
   const loggedBrowsers = this.browserInstances.filter(b => b.loginStatus === 'logged').length;
   const queueSize = this.requestQueue.length;
   const cacheTerms = Object.keys(this.imagemCache).length;
   
   return {
     totalBrowsers,
     activeBrowsers,
     loggedBrowsers,
     queueSize,
     cacheTerms,
     maxBrowsers: this.maxBrowsers,
     maxConcurrent: this.maxConcurrentRequests,
     apiEnabled: this.pinterestAPI.enabled,
     apiRequests: this.pinterestAPI.requestCount,
     apiLimit: this.pinterestAPI.rateLimit.trial,
     apiToken: this.pinterestAPI.token.substring(0, 20) + "..." // Mostra só início do token
   };
 }
}

// Instância global do scraper
const pinterestScraper = new PinterestImageScraper();

// Graceful shutdown
process.on('SIGTERM', async () => {
 console.log("[SHUTDOWN] ⚠️ Recebido SIGTERM, fechando navegadores...");
 await pinterestScraper.closeAllBrowsers();
 process.exit(0);
});

process.on('SIGINT', async () => {
 console.log("[SHUTDOWN] ⚠️ Recebido SIGINT, fechando navegadores...");
 await pinterestScraper.closeAllBrowsers();
 process.exit(0);
});

// Exporta o módulo
module.exports = {
 name: "pinterest",
 alias: ["pin"],
 desc: "Sistema híbrido Pinterest: API oficial + scraping backup robusto com login automático",
 category: "Search",
 usage: "pin <termo> | pin <termo>#<1-10> | .pinterest <termo customizado>#<1-10>",
 react: "🖼️",
 start: async (Yaka, m, { args, body, prefix }) => {
   await pinterestScraper.handlePinterestCommand(Yaka, m, { args, body, prefix });
 },
 
 // Métodos adicionais para estatísticas e limpeza
 stats: () => pinterestScraper.getStats(),
 cleanup: () => pinterestScraper.closeAllBrowsers()
};
