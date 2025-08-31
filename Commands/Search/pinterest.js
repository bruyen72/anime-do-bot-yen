const puppeteer = require("puppeteer");
const { optimizedAxios, fetchJson, HTTP_CONFIG } = require("../../lib/HttpConfig");
const koyebOptimizer = require("../../lib/KoyebOptimizer");
const cacheManager = require("../../lib/CacheManager");

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
    
    this.loginCredentials = {
      email: "brunoruthes92@gmail.com",
      password: "BRPO@hulk1"
    };

    // Mapeamentos de termos curtos e URLs
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
    
    // Pré-aquece alguns navegadores
    this.preWarmBrowsers();
  }

  // Pré-aquece navegadores para reduzir latência
  async preWarmBrowsers() {
    try {
      console.log("[INIT] Pré-aquecendo navegadores...");
      for (let i = 0; i < 2; i++) {
        setTimeout(async () => {
          try {
            const instance = await this.createBrowserInstance();
            this.browserInstances.push(instance);
            console.log(`[INIT] Navegador ${i + 1} pré-aquecido`);
          } catch (error) {
            console.error(`[ERRO] Falha no pré-aquecimento ${i + 1}:`, error.message);
          }
        }, i * 2000);
      }
    } catch (error) {
      console.error("[ERRO] Falha no pré-aquecimento:", error);
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
        console.log(`[LOG] Tentativa ${attempt}/${this.retryAttempts} para "${searchTerm}"`);
        return await this.searchImagesInternal(searchTerm, count, isCustomSearch);
      } catch (error) {
        console.error(`[ERRO] Tentativa ${attempt} falhou:`, error.message);
        
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
      for (const termo in this.imagemCache) {
        const cache = this.imagemCache[termo];
        if (cache.lastUsed && (now - cache.lastUsed) > 30 * 60 * 1000) {
          delete this.imagemCache[termo];
          console.log(`[CACHE] Limpo para termo: ${termo}`);
        }
      }
    }, 10 * 60 * 1000);
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
    const fs = require('fs');
    
    // Tenta diferentes caminhos para o Chrome
    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/app/.chrome/chrome',
      process.env.CHROME_EXECUTABLE_PATH
    ].filter(Boolean);

    let executablePath = undefined;
    
    // Procura por Chrome instalado
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
        break;
      }
    }

    // Usa configuração otimizada para Koyeb
    const launchOptions = koyebOptimizer.isKoyeb ? 
      koyebOptimizer.getPuppeteerConfig() : 
      {
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
          "--no-first-run",
          "--safebrowsing-disable-auto-update",
          "--disable-client-side-phishing-detection"
        ],
        defaultViewport: { width: 1366, height: 768 },
      };

    // Adiciona executablePath apenas se encontrou
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    const browser = await puppeteer.launch(launchOptions);
    
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
      return loggedBrowser;
    }

    // Segundo, tenta navegador disponível qualquer
    const availableBrowser = this.browserInstances.find(instance => !instance.inUse);
    
    if (availableBrowser) {
      availableBrowser.inUse = true;
      availableBrowser.lastUsed = Date.now();
      return availableBrowser;
    }

    // Terceiro, cria novo se possível
    if (this.browserInstances.length < this.maxBrowsers) {
      try {
        const instance = await this.createBrowserInstance();
        instance.inUse = true;
        this.browserInstances.push(instance);
        return instance;
      } catch (error) {
        console.error("[ERRO] Falha ao criar navegador:", error);
      }
    }

    // Quarto, espera por navegador disponível
    let waitTime = 0;
    const maxWait = 45000; // 45 segundos
    
    while (waitTime < maxWait) {
      await this.delay(1000);
      waitTime += 1000;
      
      const availableBrowser = this.browserInstances.find(instance => !instance.inUse);
      if (availableBrowser) {
        availableBrowser.inUse = true;
        availableBrowser.lastUsed = Date.now();
        return availableBrowser;
      }
    }

    throw new Error("Timeout: Nenhum navegador disponível");
  }

  releaseBrowser(instanceId) {
    const instance = this.browserInstances.find(i => i.id === instanceId);
    if (instance) {
      instance.inUse = false;
      instance.lastUsed = Date.now();
    }
  }

  // Sistema de login COMPLETAMENTE REESCRITO e ROBUSTO
  async performRobustLogin(page, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[LOGIN] Tentativa de login ${attempt}/${maxAttempts}`);
        
        // Navega para página de login com timeout otimizado para Koyeb
        await page.goto("https://br.pinterest.com/login/", { 
          waitUntil: "networkidle0", 
          timeout: 25000 
        });

        // Aguarda carregamento completo
        await this.delay(3000);

        // Lida com modal de cookies se existir
        await this.handleCookiesModal(page);

        // SISTEMA ROBUSTO DE DETECÇÃO DE CAMPOS DE LOGIN
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
        
        // Aguarda antes da próxima tentativa
        await this.delay(attempt * 3000);
        
        // Tenta recarregar a página
        try {
          await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
          await this.delay(2000);
        } catch (reloadError) {
          console.error("[LOGIN] Falha ao recarregar página:", reloadError.message);
        }
      }
    }
    
    return false;
  }

  // Lida com modal de cookies de forma robusta
  async handleCookiesModal(page) {
    try {
      console.log("[LOGIN] Verificando modal de cookies...");
      
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
          const cookieButton = await page.waitForSelector(selector, { timeout: 5000 });
          if (cookieButton && await cookieButton.isVisible()) {
            await cookieButton.click();
            await this.delay(1500);
            console.log("[LOGIN] Modal de cookies fechado");
            break;
          }
        } catch {}
      }
    } catch (error) {
      console.log("[LOGIN] Nenhum modal de cookies detectado");
    }
  }

  // Sistema ROBUSTO para encontrar campo de email/login
  async findLoginField(page) {
    console.log("[LOGIN] Procurando campo de email...");
    
    const emailSelectors = [
      // Seletores específicos do Pinterest
      'input[name="id"]',
      'input[data-test-id="email"]',
      'input[data-testid="email"]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]',
      
      // Seletores genéricos
      'input[name="email"]',
      'input[name="username"]',
      'input[type="email"]',
      'input[id="email"]',
      'input[id="username"]',
      
      // Seletores por placeholder
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      'input[placeholder*="e-mail" i]',
      'input[placeholder*="usuário" i]',
      'input[placeholder*="user" i]',
      
      // Seletores mais específicos
      'form input[type="text"]:first-of-type',
      'form input:not([type="password"]):not([type="hidden"]):not([type="submit"]):first-of-type',
      
      // Seletores por posição no DOM
      '.login-form input:first-of-type',
      '[class*="login"] input:first-of-type',
      '[class*="signin"] input:first-of-type'
    ];

    for (const selector of emailSelectors) {
      try {
        console.log(`[LOGIN] Testando seletor: ${selector}`);
        
        const element = await page.waitForSelector(selector, { 
          timeout: 8000,
          visible: true 
        });
        
        if (element) {
          // Verifica se o elemento é realmente visível e interativo
          const isVisible = await element.isVisible();
          const isEnabled = await page.evaluate(el => !el.disabled, element);
          
          if (isVisible && isEnabled) {
            console.log(`[LOGIN] ✅ Campo de email encontrado com: ${selector}`);
            return element;
          }
        }
      } catch (error) {
        console.log(`[LOGIN] ❌ Seletor ${selector} falhou: ${error.message}`);
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
    console.log("[LOGIN] Procurando campo de senha...");
    
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
      console.log("[LOGIN] Preenchendo campo de email...");
      
      // Técnica robusta para preencher email
      await emailInput.click({ clickCount: 3 }); // Seleciona tudo
      await this.delay(500);
      await emailInput.type(this.loginCredentials.email, { delay: 150 });
      await this.delay(1000);
      
      // Verifica se email foi preenchido
      const emailValue = await page.evaluate(el => el.value, emailInput);
      if (!emailValue || !emailValue.includes(this.loginCredentials.email)) {
        // Método alternativo
        await page.evaluate((el, email) => {
          el.value = email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, emailInput, this.loginCredentials.email);
      }
      
      console.log("[LOGIN] ✅ Email inserido com sucesso");
      
      console.log("[LOGIN] Preenchendo campo de senha...");
      
      // Técnica robusta para preencher senha
      await passwordInput.click({ clickCount: 3 });
      await this.delay(500);
      await passwordInput.type(this.loginCredentials.password, { delay: 150 });
      await this.delay(1000);
      
      // Verifica se senha foi preenchida
      const passwordValue = await page.evaluate(el => el.value, passwordInput);
      if (!passwordValue || passwordValue.length < 5) {
        // Método alternativo
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
      console.log("[LOGIN] Procurando botão de submit...");
      
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

      console.log("[LOGIN] Clicando no botão de login...");
      
      // Estratégia 1: Click normal com navegação
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
        // Às vezes o login não redireciona imediatamente
        await this.delay(3000);
      }

      // Verifica se login foi bem-sucedido
      await this.delay(2000);
      const currentUrl = page.url();
      console.log(`[LOGIN] URL atual após login: ${currentUrl}`);
      
      // URLs que indicam login bem-sucedido
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

  // Método principal de login otimizado com cache de sessão
  async ensureLogin(browserInstance) {
    try {
      // Se já está logado, retorna sucesso
      if (browserInstance.loginStatus === 'logged') {
        return true;
      }
      
      // Se está fazendo login, aguarda
      if (browserInstance.loginStatus === 'logging') {
        let waitTime = 0;
        while (browserInstance.loginStatus === 'logging' && waitTime < 60000) {
          await this.delay(1000);
          waitTime += 1000;
        }
        return browserInstance.loginStatus === 'logged';
      }
      
      // Marca como fazendo login
      browserInstance.loginStatus = 'logging';
      
      try {
        const page = await browserInstance.browser.newPage();
        
        // Configurações da página
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
        
        // Realiza login robusto
        const loginSuccess = await this.performRobustLogin(page);
        
        if (loginSuccess) {
          browserInstance.loginStatus = 'logged';
          console.log(`[LOGIN] ✅ Navegador ${browserInstance.id} logado com sucesso`);
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

  // Método interno otimizado para buscar imagens
  async searchImagesInternal(searchTerm, count = 1, isCustomSearch = false) {
    let browserInstance = null;
    let page = null;

    try {
      // Verifica cache primeiro
      const cachedImages = this.getMultipleImages(searchTerm, count);
      if (cachedImages && cachedImages.length >= count) {
        console.log(`[CACHE] Usando ${cachedImages.length} imagens do cache para "${searchTerm}"`);
        return cachedImages.slice(0, count);
      }

      // Adquire navegador
      browserInstance = await this.acquireBrowser();
      console.log(`[BROWSER] Usando navegador ${browserInstance.id}`);
      
      // Garante que está logado
      const loginSuccess = await this.ensureLogin(browserInstance);
      if (!loginSuccess) {
        throw new Error("Falha no login do Pinterest");
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

      console.log(`[SEARCH] Buscando em: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 30000 
      });

      // Aguarda carregamento inicial
      await this.delay(3000);

      // Scroll otimizado para carregar mais imagens
      console.log("[SEARCH] Carregando mais imagens...");
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 1.5);
        });
        await this.delay(i < 3 ? 2000 : 1500); // Mais tempo nas primeiras cargas
      }

      // Extração otimizada de imagens
      console.log("[SEARCH] Extraindo URLs das imagens...");
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
          if (allImgs.length > 120) break; // Aumentado para pegar mais imagens
        }

        // Remove duplicatas e filtra URLs válidas
        const validUrls = [...new Set(allImgs.map(extractBestUrl))]
          .filter((url) => {
            if (!url || !url.includes("pinimg.com")) return false;
            
            // Aceita URLs sem dimensões específicas (geralmente originals)
            const match = url.match(/(\d+)x(\d+)/);
            if (!match) return true;
            
            const width = parseInt(match[1], 10);
            return width >= 200; // Reduzido para pegar mais variedade
          })
          .slice(0, 150); // Aumentado limite

        console.log(`[EXTRACT] Encontradas ${validUrls.length} imagens válidas`);
        return validUrls;
      });

      await page.close();
      this.releaseBrowser(browserInstance.id);

      if (!imgs || imgs.length === 0) {
        throw new Error(`Nenhuma imagem encontrada para "${searchTerm}"`);
      }

      console.log(`[SUCCESS] ${imgs.length} imagens extraídas para "${searchTerm}"`);

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
      console.error(`[ERRO] Falha na busca para "${searchTerm}":`, error.message);
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
        totalFetched: 0
      };
    }
    
    const cache = this.imagemCache[termo];
    const newUrls = imagens.filter(url => !cache.urls.includes(url));
    
    cache.urls = [...cache.urls, ...newUrls];
    cache.lastUsed = Date.now();
    cache.totalFetched += newUrls.length;
    
    // Limita cache para evitar uso excessivo de memória
    if (cache.urls.length > 200) {
      cache.urls = cache.urls.slice(-150); // Mantém as 150 mais recentes
      // Limpa histórico de enviadas para URLs removidas
      const urlsSet = new Set(cache.urls);
      for (const url in cache.enviadas) {
        if (!urlsSet.has(url)) {
          delete cache.enviadas[url];
        }
      }
    }
    
    console.log(`[CACHE] Atualizado "${termo}": ${cache.urls.length} URLs totais`);
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
      console.log(`[CACHE] Reset ${resetCount} imagens antigas para "${termo}"`);
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
    
    console.log(`[CACHE] Selecionadas ${selectedImages.length} imagens para "${termo}"`);
    return selectedImages;
  }

  // Limpeza de navegadores ociosos melhorada
  async closeIdleBrowsers() {
    const now = Date.now();
    const idleTime = 8 * 60 * 1000; // 8 minutos
    const maxBrowsersToKeep = 2; // Sempre mantém pelo menos 2

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
          console.log(`[MAINTENANCE] Navegador ocioso fechado: ${instance.id}`);
        } catch (error) {
          console.error(`[MAINTENANCE] Erro ao fechar navegador ${instance.id}:`, error.message);
        }
      }
    }
    
    if (closedCount > 0) {
      console.log(`[MAINTENANCE] ${closedCount} navegadores ociosos fechados`);
    }
  }

  // Limpeza de navegadores "mortos"
  async cleanupDeadBrowsers() {
    let cleanedCount = 0;
    
    for (let i = this.browserInstances.length - 1; i >= 0; i--) {
      const instance = this.browserInstances[i];
      
      try {
        // Testa se o navegador ainda está ativo
        const pages = await instance.browser.pages();
        if (pages.length === 0) {
          // Navegador sem páginas pode estar morto
          await instance.browser.newPage().then(page => page.close());
        }
      } catch (error) {
        // Navegador está morto, remove da lista
        console.log(`[MAINTENANCE] Removendo navegador morto: ${instance.id}`);
        this.browserInstances.splice(i, 1);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[MAINTENANCE] ${cleanedCount} navegadores mortos removidos`);
    }
  }

  // Extração de quantidade do comando
  extractCountFromArgs(args) {
    const lastArg = args[args.length - 1];
    const match = lastArg?.match(/^#?(\d+)$/);
    
    if (match) {
      const count = parseInt(match[1], 10);
      if (count >= 1 && count <= 10) { // Aumentado limite para 10
        return { count, newArgs: args.slice(0, -1) };
      }
    }
    
    return { count: 1, newArgs: args };
  }

  // Método principal do comando Pinterest OTIMIZADO
  async handlePinterestCommand(Yaka, m, { args, body, prefix }) {
    try {
      // Detecta comando .pinterest para busca personalizada
      const isPintSearch = body && body.toLowerCase().startsWith('.pinterest');
      
      if (isPintSearch) {
        const fullQuery = body.slice(10).trim();
        
        if (!fullQuery) {
          return Yaka.sendMessage(m.from, { 
            text: "❌ Digite um termo para pesquisar depois de .pinterest\n\n*Exemplo:* .pinterest goku#5\n*Limite:* 1-10 imagens por busca" 
          }, { quoted: m });
        }
        
        // Extrai quantidade e termo
        const parts = fullQuery.split('#');
        const searchQuery = parts[0].trim();
        const count = parts[1] ? Math.min(Math.max(parseInt(parts[1]), 1), 10) : 1;
        
        console.log(`[COMMAND] Pinterest custom search: "${searchQuery}" x${count}`);
        
        await Yaka.sendMessage(m.from, { 
          text: `🔍 Buscando ${count} imagem(ns) para "${searchQuery}"...\n⏱️ Aguarde alguns segundos...` 
        }, { quoted: m });
        
        const images = await this.searchImages(searchQuery, count, true);
        
        // Envia imagens com delay otimizado
        for (let i = 0; i < images.length; i++) {
          try {
            await Yaka.sendMessage(
              m.from,
              { 
                image: { url: images[i] }, 
                caption: count > 1 
                  ? `✨ Imagem ${i + 1}/${count}: ${searchQuery}\n📸 Pinterest HD` 
                  : `✨ ${searchQuery}\n📸 Pinterest HD`
              },
              { quoted: m }
            );
            
            // Delay entre envios (menor para melhor UX)
            if (i < images.length - 1) {
              await this.delay(800);
            }
          } catch (sendError) {
            console.error(`[SEND] Erro ao enviar imagem ${i + 1}:`, sendError.message);
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
        return Yaka.sendMessage(m.from, { 
          text: `📌 *Termos Disponíveis:*\n\n${termosList}\n\n*Uso:* \n• .pin <termo>\n• .pin <termo>#<1-10>\n\n*Exemplos:*\n• .pin gojo#5\n• .pinterest naruto#3` 
        }, { quoted: m });
      }

      const { count, newArgs } = this.extractCountFromArgs(args);
      const shortTerm = newArgs[0]?.toLowerCase();

      if (!this.shortToFullTerm[shortTerm]) {
        const availableTerms = Object.keys(this.shortToFullTerm).slice(0, 5).join(', ');
        return Yaka.sendMessage(m.from, { 
          text: `❌ Termo "${shortTerm}" não encontrado.\n\n*Alguns termos:* ${availableTerms}\n\nUse *.pin* sem argumentos para ver todos os termos.` 
        }, { quoted: m });
      }

      const fullTerm = this.shortToFullTerm[shortTerm];
      
      console.log(`[COMMAND] Pinterest preset search: "${fullTerm}" x${count}`);
      
      await Yaka.sendMessage(m.from, { 
        text: `🔍 Buscando ${count} imagem(ns) para *${fullTerm}*...\n⏱️ Processando...` 
      }, { quoted: m });
      
      const images = await this.searchImages(fullTerm, count, false);
      
      // Envia imagens com informações detalhadas
      for (let i = 0; i < images.length; i++) {
        try {
          await Yaka.sendMessage(
            m.from,
            { 
              image: { url: images[i] }, 
              caption: count > 1 
                ? `✨ *${fullTerm}*\n📷 Imagem ${i + 1}/${count}\n🔖 Termo: *${shortTerm}*\n📸 Pinterest HD` 
                : `✨ *${fullTerm}*\n🔖 Termo: *${shortTerm}*\n📸 Pinterest HD`
            },
            { quoted: m }
          );
          
          if (i < images.length - 1) {
            await this.delay(800);
          }
        } catch (sendError) {
          console.error(`[SEND] Erro ao enviar imagem ${i + 1}:`, sendError.message);
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
      console.error("[COMMAND] Erro no comando Pinterest:", error);
      
      // Mensagens de erro mais informativas
      let errorMessage = "❌ Erro ao buscar imagem.";
      
      if (error.message.includes("login")) {
        errorMessage = "❌ Erro de autenticação no Pinterest. Tentando resolver...";
      } else if (error.message.includes("timeout")) {
        errorMessage = "❌ Timeout na busca. Tente novamente em alguns segundos.";
      } else if (error.message.includes("Nenhuma imagem")) {
        errorMessage = "❌ Nenhuma imagem encontrada para este termo. Tente outro.";
      }
      
      await Yaka.sendMessage(m.from, { 
        text: `${errorMessage}\n\n💡 *Dica:* Tente novamente em alguns segundos ou use outro termo.` 
      }, { quoted: m });
    }
  }

  // Método para fechar todos os navegadores (cleanup completo)
  async closeAllBrowsers() {
    console.log("[CLEANUP] Fechando todos os navegadores...");
    
    const promises = this.browserInstances.map(async (instance) => {
      try {
        await instance.browser.close();
        console.log(`[CLEANUP] Navegador ${instance.id} fechado`);
      } catch (error) {
        console.error(`[CLEANUP] Erro ao fechar navegador ${instance.id}:`, error.message);
      }
    });
    
    await Promise.allSettled(promises);
    this.browserInstances = [];
    console.log("[CLEANUP] Todos os navegadores fechados");
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
      maxConcurrent: this.maxConcurrentRequests
    };
  }
}

// Instância global do scraper
const pinterestScraper = new PinterestImageScraper();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log("[SHUTDOWN] Recebido SIGTERM, fechando navegadores...");
  await pinterestScraper.closeAllBrowsers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log("[SHUTDOWN] Recebido SIGINT, fechando navegadores...");
  await pinterestScraper.closeAllBrowsers();
  process.exit(0);
});

// Exporta o módulo
module.exports = {
  name: "pinterest",
  alias: ["pin"],
  desc: "Sistema robusto de busca Pinterest com login otimizado e paralelização de 5 navegadores",
  category: "Search",
  usage: "pin <termo> | pin <termo>#<1-10> | .pinterest <termo customizado>#<1-10>",
  react: "🖼️",
  start: async (Yaka, m, { args, body, prefix }) => {
    // Sistema de fallback inteligente
    const smartPinterest = require('../../lib/SmartPinterestFetcher');
    
    try {
      if (!args[0]) {
        return Yaka.sendMessage(m.from, { 
          text: "❌ Uso: .pinterest <termo de busca>\nExemplo: .pinterest solo leveling" 
        }, { quoted: m });
      }

      const searchTerm = args.join(" ");
      const count = 5; // Número padrão de imagens
      
      console.log(`[Pinterest] Iniciando busca: "${searchTerm}"`);
      
      const loadingMsg = await Yaka.sendMessage(m.from, { 
        text: "🔍 Buscando imagens no Pinterest..." 
      }, { quoted: m });
      
      // Primeiro tenta o sistema original
      try {
        await pinterestScraper.handlePinterestCommand(Yaka, m, { args, body, prefix });
        await Yaka.sendMessage(m.from, { delete: loadingMsg.key });
        return;
      } catch (puppeteerError) {
        console.log("[Pinterest] Sistema original falhou, usando fallback:", puppeteerError.message);
      }
      
      // Fallback para sistema inteligente
      const images = await smartPinterest.searchImages(searchTerm, count);
      
      if (images && images.length > 0) {
        await Yaka.sendMessage(m.from, { delete: loadingMsg.key });
        
        for (let i = 0; i < Math.min(images.length, count); i++) {
          try {
            await Yaka.sendMessage(m.from, { 
              image: { url: images[i] },
              caption: `🖼️ Pinterest: "${searchTerm}" (${i + 1}/${images.length})`
            }, { quoted: m });
            
            // Pequeno delay entre imagens
            if (i < images.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (imageError) {
            console.log(`[Pinterest] Erro ao enviar imagem ${i + 1}:`, imageError.message);
            continue;
          }
        }
      } else {
        throw new Error("Nenhuma imagem encontrada");
      }
      
    } catch (error) {
      console.error('[Pinterest] Erro completo:', error.message);
      await Yaka.sendMessage(m.from, { 
        text: `❌ Erro ao buscar imagens: ${error.message}\n\nTente:\n• Outro termo de busca\n• Aguarde um momento e tente novamente` 
      }, { quoted: m });
    }
  },
  
  // Método adicional para estatísticas (opcional)
  stats: () => pinterestScraper.getStats(),
  
  // Método para limpeza manual (opcional)
  cleanup: () => pinterestScraper.closeAllBrowsers()
};