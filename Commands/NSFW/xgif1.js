const axios = require('axios');
const cheerio = require('cheerio');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Busca GIFs ou vídeos animados do sex.com (HTML estático)
async function buscarGifsSexCom(termo, maxGifs = 1) {
  const url = `https://www.sex.com/en/gifs?search=${encodeURIComponent(termo)}`;
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const gifs = [];

    // Primeiro tenta pegar vídeo mp4/webm dentro das divs com a classe 'tile' (ou próxima estrutura)
    $('div.tile video source').each((i, el) => {
      if (gifs.length >= maxGifs) return false;

      let src = $(el).attr('src');
      if (src && (src.endsWith('.mp4') || src.endsWith('.webm'))) {
        if (src.startsWith('//')) src = 'https:' + src;
        else if (src.startsWith('/')) src = 'https://www.sex.com' + src;

        gifs.push({ url: src, type: 'video' });
      }
    });

    // Se não achou vídeo, tenta pegar gifs diretos nas imagens (fallback)
    if (gifs.length === 0) {
      $('div.tile img').each((i, el) => {
        if (gifs.length >= maxGifs) return false;

        let gifUrl = $(el).attr('src') || $(el).attr('data-src');
        if (gifUrl && gifUrl.endsWith('.gif')) {
          if (gifUrl.startsWith('//')) gifUrl = 'https:' + gifUrl;
          else if (gifUrl.startsWith('/')) gifUrl = 'https://www.sex.com' + gifUrl;

          gifs.push({ url: gifUrl, type: 'gif' });
        }
      });
    }

    return gifs.slice(0, maxGifs);
  } catch (err) {
    console.error('Erro ao buscar GIFs sex.com:', err);
    return [];
  }
}

// Converte vídeo (mp4/webm) para WebP animado para sticker
async function videoToWebp(buffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const inputPath = path.join(tmpDir, `input-${timestamp}.mp4`);
    const outputPath = path.join(tmpDir, `output-${timestamp}.webp`);

    fs.writeFileSync(inputPath, buffer);

    ffmpeg(inputPath)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-qscale', '75',
        '-preset', 'default',
        '-an',
        '-vsync', '0',
        '-s', '512:512',
        '-loop', '0',
        '-r', '15',          // frames per second
        '-pix_fmt', 'yuv420p'
      ])
      .save(outputPath)
      .on('end', () => {
        try {
          const data = fs.readFileSync(outputPath);
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', err => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      });
  });
}

// Se o conteúdo for gif, converte GIF para webp animado
async function gifToWebp(buffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const inputPath = path.join(tmpDir, `input-${timestamp}.gif`);
    const outputPath = path.join(tmpDir, `output-${timestamp}.webp`);

    fs.writeFileSync(inputPath, buffer);

    ffmpeg(inputPath)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-qscale', '75',
        '-preset', 'default',
        '-an',
        '-vsync', '0',
        '-s', '512:512',
        '-loop', '0',
        '-r', '15',
        '-pix_fmt', 'yuv420p'
      ])
      .save(outputPath)
      .on('end', () => {
        try {
          const data = fs.readFileSync(outputPath);
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', err => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      });
  });
}

module.exports = {
  name: "xvgif1",
  alias: ["redgif", "redgifs", "pgif"],
  desc: "Busca e envia stickers animados dos GIFs do sex.com (múltiplos com #n)",
  category: "NSFW",
  usage: ".xvgif1 <termo> [#n]",
  react: "🔞",
  start: async (Yaka, m, { prefix, args }) => {
    if (args.length === 0) return m.reply(`❗ Use: *${prefix}xvgif1 <termo> [#n]*`);

    let maxFigurinhas = 1;
    if (args[args.length - 1]?.startsWith('#')) {
      const n = parseInt(args[args.length - 1].slice(1), 10);
      if (!isNaN(n) && n > 0 && n <= 10) maxFigurinhas = n;
      args.pop();
    }

    const termo = args.join(" ").trim();
    if (!termo) return m.reply(`❗ Use: *${prefix}xvgif1 <termo> [#n]*`);

    if (m.isGroup) await m.reply(`🔞 Buscando até ${maxFigurinhas} GIF(s) animado(s)...`);

    try {
      const gifs = await buscarGifsSexCom(termo, maxFigurinhas);
      if (gifs.length === 0) {
        return await Yaka.sendMessage(m.key.remoteJid, { text: `❌ Nenhum GIF animado encontrado para: ${termo}` }, { quoted: m });
      }

      for (const gif of gifs) {
        const res = await axios.get(gif.url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data);

        let webpBuffer;

        if (gif.type === 'video') {
          webpBuffer = await videoToWebp(buffer);
        } else {
          webpBuffer = await gifToWebp(buffer);
        }

        const sticker = new Sticker(webpBuffer, {
          pack: "xvgif1 Pack",
          author: "SeuBot",
          type: StickerTypes.ANIMATED,
          quality: 50,
          animated: true,
        });

        const stickerBuffer = await sticker.build();
        await Yaka.sendMessage(m.key.remoteJid, { sticker: stickerBuffer }, { quoted: m });
      }

    } catch (error) {
      console.error('Erro no comando xvgif1:', error);
      await m.reply("❌ Erro ao buscar ou enviar stickers animados.");
    }
  }
};
