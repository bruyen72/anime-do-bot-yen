// browser-config.js - Configuração otimizada de navegadores para Render

const fs = require('fs');
const path = require('path');

// Configurações do Puppeteer para ambiente de produção
const getPuppeteerConfig = () => {
    const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
    
    if (isRender) {
        return {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-default-apps',
                '--disable-extensions',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-sync',
                '--force-color-profile=srgb',
                '--metrics-recording-only',
                '--safebrowsing-disable-auto-update',
                '--enable-automation',
                '--password-store=basic',
                '--use-mock-keychain',
                '--hide-scrollbars',
                '--mute-audio',
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
            timeout: 30000,
            protocolTimeout: 30000,
            slowMo: 0
        };
    }
    
    return {
        headless: 'new',
        args: ['--no-sandbox'],
        timeout: 15000
    };
};

// Configurações do Playwright para ambiente de produção
const getPlaywrightConfig = () => {
    const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
    
    if (isRender) {
        return {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--single-process'
            ],
            timeout: 30000
        };
    }
    
    return {
        headless: true,
        timeout: 15000
    };
};

// Função para verificar disponibilidade de navegadores
const checkBrowserAvailability = async () => {
    const results = {
        puppeteer: false,
        playwright: false,
        chrome: false
    };
    
    try {
        const puppeteer = require('puppeteer');
        await puppeteer.launch({ headless: true });
        results.puppeteer = true;
        console.log('✅ Puppeteer disponível');
    } catch (error) {
        console.log('❌ Puppeteer não disponível:', error.message);
    }
    
    try {
        const { chromium } = require('playwright');
        await chromium.launch({ headless: true });
        results.playwright = true;
        console.log('✅ Playwright disponível');
    } catch (error) {
        console.log('❌ Playwright não disponível:', error.message);
    }
    
    // Verificar Chrome no sistema
    const chromePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        process.env.CHROME_BIN
    ].filter(Boolean);
    
    for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
            results.chrome = chromePath;
            console.log('✅ Chrome encontrado em:', chromePath);
            break;
        }
    }
    
    return results;
};

// Função para inicializar navegador com fallback
const initBrowser = async (type = 'puppeteer') => {
    const availability = await checkBrowserAvailability();
    
    if (type === 'puppeteer' && availability.puppeteer) {
        try {
            const puppeteer = require('puppeteer');
            const config = getPuppeteerConfig();
            
            if (availability.chrome && typeof availability.chrome === 'string') {
                config.executablePath = availability.chrome;
            }
            
            return await puppeteer.launch(config);
        } catch (error) {
            console.log('⚠️ Falha ao inicializar Puppeteer:', error.message);
        }
    }
    
    if (availability.playwright) {
        try {
            const { chromium } = require('playwright');
            const config = getPlaywrightConfig();
            return await chromium.launch(config);
        } catch (error) {
            console.log('⚠️ Falha ao inicializar Playwright:', error.message);
        }
    }
    
    throw new Error('Nenhum navegador disponível. Instale Puppeteer ou Playwright.');
};

// Função para screenshot com fallback
const takeScreenshot = async (url, options = {}) => {
    let browser;
    let page;
    
    try {
        browser = await initBrowser('puppeteer');
        page = await browser.newPage();
        
        await page.setViewport({
            width: options.width || 1280,
            height: options.height || 720,
            deviceScaleFactor: options.deviceScaleFactor || 1
        });
        
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        const screenshot = await page.screenshot({
            type: options.type || 'png',
            quality: options.quality || 80,
            fullPage: options.fullPage || false
        });
        
        return screenshot;
        
    } catch (error) {
        console.log('❌ Erro ao tirar screenshot:', error.message);
        throw error;
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
};

module.exports = {
    getPuppeteerConfig,
    getPlaywrightConfig,
    checkBrowserAvailability,
    initBrowser,
    takeScreenshot
};
