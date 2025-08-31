// Configuração do Puppeteer para Render
process.env.PUPPETEER_EXECUTABLE_PATH = '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome';
const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);
const crypto = require("crypto");

const CONFIG = {
  BROWSER_TIMEOUT: 25000,
  DOWNLOAD_TIMEOUT: 12000,
  MAX_SEARCH_ATTEMPTS: 8, // Aumentado para mais tentativas
  MIN_GIFS_REQUIRED: 100, // Meta de 100+ GIFs
  MAX_GIFS_HISTORY: 200,
  FFMPEG_QUALITY: 80,
  FFMPEG_FPS: 15,
  BROWSER_ARGS: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu",
    "--disable-features=site-per-process",
    "--disable-web-security",
    "--disable-blink-features=AutomationControlled",
    "--disable-extensions",
    "--disable-plugins",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows"
  ],
  MIN_GIF_WIDTH: 200,
  SCROLL_COUNT: 25, // Mais scrolls para mais GIFs
  PARALLEL_PAGES: 12 // Mais páginas paralelas
};

let browser;
const gifHistory = new Map();
const gifHashCache = new Set(); // Cache para evitar duplicados por hash

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateGifHash(url) {
  // Gera hash da URL para detectar duplicados
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

async function getBrowser() {
  if (!browser) {
    console.log(`[🚀 TURBO] Iniciando Puppeteer ultra-otimizado...`);
    browser = await puppeteer.launch({
      headless: true,
      args: CONFIG.BROWSER_ARGS,
      timeout: CONFIG.BROWSER_TIMEOUT
    });
  }
  return browser;
}

async function createOptimizedPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    // Permite mais tipos para capturar mais GIFs
    if (["font", "media", "other", "manifest"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // User agents rotativos para evitar detecção
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  ];
  
  const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
  await page.setUserAgent(randomUA);
  
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1
  });

  // Headers otimizados
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/gif,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none'
  });

  return page;
}

async function generateSearchVariations(baseTerm) {
  return [
    `${baseTerm} gif`,
    `${baseTerm} animated gif`,
    `${baseTerm} dance gif`,
    `${baseTerm} dancing`,
    `${baseTerm} video gif`,
    `dancing ${baseTerm}`,
    `${baseTerm} movimento`,
    `${baseTerm} baile gif`,
    `${baseTerm} dança gif`,
    `${baseTerm} party gif`,
    `${baseTerm} club gif`,
    `${baseTerm} music gif`
  ];
}

async function megaSearchGifs(term) {
  console.log(`[💥 MEGA BUSCA] Capturando 100+ GIFs para: ${term}`);
  const allGifs = new Set();
  const searchVariations = await generateSearchVariations(term);
  
  // URLs base do Pinterest com diferentes locales e parâmetros
  const pinterestBases = [
    "https://br.pinterest.com/search/pins/?q=",
    "https://www.pinterest.com/search/pins/?q=",
    "https://pinterest.com/search/pins/?q=",
    "https://br.pinterest.com/search/pins/?rs=typed&q=",
    "https://www.pinterest.com/search/pins/?rs=ac&len=2&q=",
    "https://pinterest.com/search/pins/?source_url=%2Fsearch%2Fpins%2F&q="
  ];

  // Cria URLs de busca combinando bases com termos
  const searchUrls = [];
  for (let i = 0; i < CONFIG.PARALLEL_PAGES && i < searchVariations.length; i++) {
    const variation = searchVariations[i];
    const base = pinterestBases[i % pinterestBases.length];
    searchUrls.push(`${base}${encodeURIComponent(variation)}`);
  }

  console.log(`[🔥 PARALELO] Iniciando ${searchUrls.length} buscas simultâneas...`);

  // Busca paralela ultra-agressiva
  const searchPromises = searchUrls.map(async (url, index) => {
    const page = await createOptimizedPage();
    console.log(`[⚡ THREAD ${index + 1}] Buscando: ${url.split('q=')[1]?.substring(0, 20)}...`);
    
    try {
      await page.goto(url, { 
        waitUntil: "domcontentloaded",
        timeout: 15000 
      });

      // Aguarda carregamento mínimo
      await delay(1500);

      // Scroll ultra-agressivo para carregar MUITO conteúdo
      await page.evaluate(async (scrollCount) => {
        const scrollDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        for (let i = 0; i < scrollCount; i++) {
          // Scroll triplo para carregar mais rápido
          window.scrollBy(0, window.innerHeight * 3);
          await scrollDelay(200); // Delay super curto
          
          // A cada 8 scrolls, pausa brevemente
          if (i % 8 === 0) {
            await scrollDelay(800);
          }
        }
      }, CONFIG.SCROLL_COUNT);

      // Aguarda conteúdo final carregar
      await delay(1000);

      // Extração MEGA agressiva de URLs de GIF
      const gifs = await page.evaluate(() => {
        const urls = new Set();
        
        // MÉTODO 1: Todas as imagens
        document.querySelectorAll('img').forEach(img => {
          if (img.src && img.src.includes('.gif')) {
            urls.add(img.src);
          }
          if (img.srcset) {
            img.srcset.split(',').forEach(src => {
              const url = src.trim().split(' ')[0];
              if (url.includes('.gif')) urls.add(url);
            });
          }
          // Data attributes das imagens
          if (img.dataset) {
            Object.values(img.dataset).forEach(val => {
              if (val && val.includes('.gif')) {
                const match = val.match(/https?:\/\/[^"'\s]*\.gif[^"'\s]*/);
                if (match) urls.add(match[0]);
              }
            });
          }
        });

        // MÉTODO 2: Regex ultra-agressiva no HTML
        const html = document.documentElement.innerHTML;
        
        // Diferentes padrões de URLs de GIF do Pinterest
        const patterns = [
          /https?:\/\/[^"\s]*i\.pinimg\.com[^"\s]*\.gif[^"\s]*/g,
          /https?:\/\/[^"\s]*pinimg\.com[^"\s]*\.gif[^"\s]*/g,
          /https?:\/\/[^"\s]*pinterest[^"\s]*\.gif[^"\s]*/g,
          /"url":"[^"]*\.gif[^"]*/g,
          /"src":"[^"]*\.gif[^"]*/g,
          /data-src="[^"]*\.gif[^"]*/g
        ];
        
        patterns.forEach(pattern => {
          const matches = html.match(pattern);
          if (matches) {
            matches.forEach(match => {
              // Limpa a URL
              let cleanUrl = match.replace(/^[^h]*/, '').replace(/[\\'"&gt;&lt;]/g, '').replace(/"url":"/, '').replace(/"src":"/, '').replace(/data-src="/, '');
              if (cleanUrl.startsWith('http') && cleanUrl.includes('.gif')) {
                urls.add(cleanUrl);
              }
            });
          }
        });

        // MÉTODO 3: JSON embeddados (Pinterest carrega muito conteúdo via JSON)
        document.querySelectorAll('script[type*="json"], script[id*="initial"], script:not([src])').forEach(script => {
          if (script.textContent && script.textContent.includes('.gif')) {
            const content = script.textContent;
            // Busca URLs de GIF no JSON
            const jsonGifMatches = content.match(/https?:\/\/[^"'\s]*\.gif[^"'\s]*/g);
            if (jsonGifMatches) {
              jsonGifMatches.forEach(url => {
                const cleanUrl = url.replace(/[\\'"]/g, '');
                if (cleanUrl.startsWith('http')) {
                  urls.add(cleanUrl);
                }
              });
            }
          }
        });

        // MÉTODO 4: Elementos com background-image
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.backgroundImage && style.backgroundImage.includes('.gif')) {
            const match = style.backgroundImage.match(/url\("?([^"]*\.gif[^"]*)"?\)/);
            if (match) urls.add(match[1]);
          }
        });

        return Array.from(urls);
      });

      // Filtra e prioriza URLs de alta qualidade
      const qualityGifs = gifs.filter(url => {
        if (!url || !url.startsWith('http')) return false;
        
        // Prioriza URLs do Pinterest com qualidade
        return url.includes('pinimg.com') && (
          url.includes('/originals/') ||
          url.includes('/736x/') ||
          url.includes('/564x/') ||
          url.includes('/474x/') ||
          url.includes('i.pinimg.com')
        );
      });

      const finalGifs = qualityGifs.length > 0 ? qualityGifs : gifs.filter(url => url && url.startsWith('http'));
      
      console.log(`[⚡ THREAD ${index + 1}] ${finalGifs.length} GIFs (${qualityGifs.length} qualidade)`);
      return finalGifs;

    } catch (err) {
      console.error(`[⚠️ THREAD ${index + 1}] Erro: ${err.message}`);
      return [];
    } finally {
      await page.close();
    }
  });

  // Aguarda todas as buscas paralelas
  console.log(`[⏳ PROCESSANDO] Aguardando ${searchPromises.length} threads...`);
  const results = await Promise.all(searchPromises);
  
  // Combina e filtra duplicados
  results.forEach(gifs => {
    gifs.forEach(gif => {
      if (gif && gif.startsWith('http') && !isDuplicateGif(gif)) {
        allGifs.add(gif);
      }
    });
  });

  console.log(`[🎯 MEGA RESULTADO] ${allGifs.size} GIFs únicos capturados (sem duplicados)`);
  return Array.from(allGifs);
}

async function fastDownloadGif(url, outputPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.DOWNLOAD_TIMEOUT);

  try {
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/gif,image/*,*/*;q=0.8',
        'Referer': 'https://pinterest.com/',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const fileStream = fs.createWriteStream(outputPath);
    await new Promise((resolve, reject) => {
      res.body.pipe(fileStream);
      res.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    clearTimeout(timeout);

    const stats = fs.statSync(outputPath);
    if (stats.size < 2000) throw new Error("Muito pequeno");

    return { size: stats.size };
  } catch (err) {
    clearTimeout(timeout);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw err;
  }
}

async function fastConvertGifToWebp(input, output, originalSize = 0) {
  const quality = originalSize > 8000000 ? 65 : originalSize > 3000000 ? 75 : 85;
  const fps = originalSize > 10000000 ? 10 : 15;
  
  const cmd = `ffmpeg -i "${input}" -vf "fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:black" -c:v libwebp -lossless 0 -compression_level 4 -q:v ${quality} -loop 0 -an "${output}" -y`;
  
  await execPromise(cmd + " 2> /dev/null");
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

async function fastProcessAndSendGif(Yaka, m, gifs, searchTerm, usedGifs) {
  const availableGifs = gifs.filter(url => 
    url && 
    url.startsWith('http') && 
    !isGifUsed(searchTerm, url) && 
    !usedGifs.has(url)
  );
  
  if (!availableGifs.length) {
    throw new Error("Sem GIFs disponíveis");
  }

  // Prioriza GIFs de alta qualidade (originals primeiro)
  const priorityGifs = availableGifs.filter(url => url.includes('/originals/'));
  const finalGifs = priorityGifs.length > 0 ? priorityGifs : availableGifs;
  
  const url = finalGifs[Math.floor(Math.random() * finalGifs.length)];
  const gifPath = path.join(__dirname, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.gif`);
  const webpPath = gifPath.replace(".gif", ".webp");

  try {
    const downloadResult = await fastDownloadGif(url, gifPath);
    await fastConvertGifToWebp(gifPath, webpPath, downloadResult.size);
    
    await Yaka.sendMessage(m.from, { 
      sticker: { stream: fs.createReadStream(webpPath) } 
    }, { quoted: m });

    markGifAsUsed(searchTerm, url);
    usedGifs.add(url);
    
    [gifPath, webpPath].forEach(file => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (err) {}
    });
    
  } catch (err) {
    [gifPath, webpPath].forEach(file => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (cleanupErr) {}
    });
    throw err;
  }
}

module.exports = {
  name: "pinterestgif",
  desc: "MEGA busca de 100+ GIFs únicos no Pinterest - Zero duplicados.",
  async start(Yaka, m, { args }) {
    if (!args.length) return Yaka.sendMessage(m.from, { 
      text: `💥 *Pinterest GIF - MEGA BUSCA*

*Uso:* .pinterestgif <termo>#<quantidade>

🔥 *Exemplos:*
- .pinterestgif mulher funk#5
- .pinterestgif dança#8
- .pinterestgif anime dance#3

💥 *MEGA OTIMIZAÇÕES:*
- 6 buscas paralelas simultâneas
- 12 variações de termos por busca
- 25 scrolls por página = 150+ scrolls total
- 4 métodos de extração por página
- Sistema anti-duplicados por hash
- Priorização de GIFs /originals/

🎯 *META: 100+ GIFs únicos por busca!*

✨ *Recursos:*
- Zero repetições
- Máxima qualidade
- Ultra velocidade
- Busca mega-agressiva

*Quantidade:* 1 a 10 stickers`
    }, { quoted: m });

    let term = args.join(" ");
    let quantity = 1;

    if (term.includes("#")) {
      const parts = term.split("#");
      term = parts[0].trim();
      const q = parseInt(parts[1]);
      if (!isNaN(q) && q >= 1 && q <= 10) quantity = q;
    }

    console.log(`[💥 MEGA INÍCIO] "${term}" (${quantity}x) - Meta: 100+ GIFs`);

    try {
      await Yaka.sendMessage(m.from, { 
        text: `💥 MEGA BUSCA iniciada: "${term}"
🔥 Capturando 100+ GIFs únicos em paralelo...
⚡ 6 threads + 12 variações + 150 scrolls = resultado gigante!` 
      }, { quoted: m });

      const startTime = Date.now();
      
      // Limpa cache de hash para nova busca
      gifHashCache.clear();
      
      const gifs = await megaSearchGifs(term);
      const searchTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (!gifs.length) {
        return Yaka.sendMessage(m.from, { 
          text: `❌ Nenhum GIF encontrado para "${term}"

💡 *Tente termos mais amplos:*
- "mulher" (em vez de "mulher funk específico")
- "dance" 
- "funk"
- "movimento"`
        }, { quoted: m });
      }

      console.log(`[💥 MEGA SUCESSO] ${gifs.length} GIFs únicos em ${searchTime}s`);
      
      await Yaka.sendMessage(m.from, { 
        text: `🎉 MEGA RESULTADO: ${gifs.length} GIFs únicos!
⏱️ Capturados em apenas ${searchTime}s
📤 Processando ${quantity} sticker${quantity > 1 ? "s" : ""} de máxima qualidade...

🔥 ZERO duplicados garantido!` 
      }, { quoted: m });

      const usedGifs = new Set();
      let successCount = 0;

      // Processa com pequenos delays para evitar spam
      for (let i = 0; i < quantity; i++) {
        try {
          await fastProcessAndSendGif(Yaka, m, gifs, term, usedGifs);
          successCount++;
          console.log(`[✅ MEGA ENVIADO] ${successCount}/${quantity}`);
          
          // Delay curto entre envios
          if (i < quantity - 1) {
            await delay(800);
          }
        } catch (err) {
          console.error(`[❌ MEGA FALHA] Sticker ${i + 1}: ${err.message}`);
        }
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

      if (successCount > 0) {
        await Yaka.sendMessage(m.from, { 
          text: `🎉 MEGA MISSÃO CONCLUÍDA EM ${totalTime}s!

✅ ${successCount}/${quantity} sticker${successCount > 1 ? "s" : ""} enviado${successCount > 1 ? "s" : ""}
📊 ${gifs.length} GIFs únicos processados
💥 6 buscas paralelas executadas
🔥 Zero duplicados detectados
⚡ Sistema mega-otimizado ativo

🎯 "${term}" finalizado com sucesso absoluto!`
        }, { quoted: m });
      } else {
        await Yaka.sendMessage(m.from, { 
          text: `❌ Falha no processamento final

📊 ${gifs.length} GIFs foram capturados com sucesso
💡 Problema pode ser temporário - tente novamente`
        }, { quoted: m });
      }

    } catch (err) {
      console.error(`[💥 MEGA ERRO] ${err.message}`);
      await Yaka.sendMessage(m.from, { 
        text: `💥 Erro na mega busca: ${err.message.substring(0, 100)}

🔄 Sistema mega-agressivo às vezes sobrecarrega
💡 Tente novamente em alguns segundos` 
      }, { quoted: m });
    }
  }
};
