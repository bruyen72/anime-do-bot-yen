const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { writeFile, unlink, access, stat } = require('fs/promises');
const { tmpdir } = require('os');
const { join } = require('path');
const smartStickerConverter = require('../../lib/SmartStickerConverter');

// Logger colorido para stickers
class StickerLogger {
  static colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
  };

  static success(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${this.colors.green}${this.colors.bright}✨ [${timestamp}] ${message}${this.colors.reset}`);
  }

  static info(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${this.colors.blue}${this.colors.bright}ℹ️ [${timestamp}] ${message}${this.colors.reset}`);
  }

  static warning(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${this.colors.yellow}${this.colors.bright}⚠️ [${timestamp}] ${message}${this.colors.reset}`);
  }

  static error(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${this.colors.red}${this.colors.bright}❌ [${timestamp}] ${message}${this.colors.reset}`);
  }

  static process(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${this.colors.magenta}${this.colors.bright}🔄 [${timestamp}] ${message}${this.colors.reset}`);
  }
}

// Logger silencioso para download
const mediaLogger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  level: 'silent',
  child: () => mediaLogger
};

function convertToBuffer(data) {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (Array.isArray(data)) {
    return Buffer.from(data);
  }
  if (typeof data === 'string') {
    return Buffer.from(data, 'base64');
  }
  return Buffer.from(data);
}

async function handleStickerCommand(sock, msg, sendMessage) {
  let tempFilePath = null;
  let tempInputPath = null;
  let tempImagePath = null;

  try {
    const chatId = msg.key.remoteJid;

    // Detecta mídia quotada (incluindo view once)
    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    const viewOnceMessage = quotedMessage?.viewOnceMessage || 
                          quotedMessage?.viewOnceMessageV2 || 
                          quotedMessage?.viewOnceMessageV2Extension;
    
    let actualMedia = null;
    let isVideo = false;
    let mediaType = null;

    if (viewOnceMessage) {
      if (viewOnceMessage.message?.videoMessage) {
        actualMedia = viewOnceMessage.message.videoMessage;
        mediaType = 'video';
        isVideo = true;
      } else if (viewOnceMessage.message?.imageMessage) {
        actualMedia = viewOnceMessage.message.imageMessage;
        mediaType = 'image';
        isVideo = false;
      } else {
        actualMedia = viewOnceMessage?.videoMessage || viewOnceMessage?.imageMessage;
        isVideo = !!viewOnceMessage?.videoMessage;
        mediaType = isVideo ? 'video' : 'image';
      }
    } else {
      if (quotedMessage?.imageMessage) {
        actualMedia = quotedMessage.imageMessage;
        mediaType = 'image';
        isVideo = false;
      } else if (quotedMessage?.videoMessage) {
        actualMedia = quotedMessage.videoMessage;
        mediaType = 'video';
        isVideo = true;
      }
    }

    if (!actualMedia) {
      await sendMessage(chatId, '*[❎]* Responda a uma imagem ou vídeo com .s4!');
      return;
    }

    StickerLogger.info(`Processando ${mediaType} ${viewOnceMessage ? 'viewOnce' : 'normal'}`);

    // Cria objeto para download
    const downloadMsg = {
      key: {
        remoteJid: chatId,
        fromMe: false,
        id: msg.key.id
      },
      message: {
        [isVideo ? 'videoMessage' : 'imageMessage']: actualMedia
      }
    };

    try {
      StickerLogger.process('Fazendo download da mídia...');
      
      const buffer = await downloadMediaMessage(
        downloadMsg,
        'buffer',
        {},
        {
          logger: mediaLogger,
          reuploadRequest: sock.updateMediaMessage
        }
      );

      if (!buffer) {
        await sendMessage(chatId, '*[❎]* Falha ao baixar a mídia!');
        return;
      }

      const mediaBuffer = convertToBuffer(buffer);
      StickerLogger.success(`Download concluído: ${mediaBuffer.length} bytes`);

      if (isVideo) {
        // Para vídeos, só funciona se tiver FFmpeg - senão usa fallback
        await sendMessage(chatId, '*[⚠️]* Vídeos precisam de FFmpeg. Use .s para imagens!');
        return;
      } else {
        // Para imagens, usa SmartStickerConverter
        StickerLogger.process('Convertendo imagem para sticker...');
        
        const stickerBuffer = await smartStickerConverter.createSticker(mediaBuffer, {
          quality: 75,
          width: 512,
          height: 512
        });

        StickerLogger.success(`Sticker criado: ${Math.round(stickerBuffer.length / 1024)}KB`);

        await sock.sendMessage(chatId, {
          sticker: stickerBuffer
        }, {
          quoted: msg
        });

        StickerLogger.success("Sticker enviado com sucesso!");
      }

    } catch (downloadError) {
      StickerLogger.error(`Erro no processamento: ${downloadError.message}`);
      await sendMessage(chatId, '*[❎]* Erro ao processar a mídia!');
    }

  } catch (error) {
    StickerLogger.error(`Erro geral: ${error.message}`);
    await sendMessage(msg.key.remoteJid, '*[❎]* Erro ao processar o sticker!');
  } finally {
    // Limpeza de arquivos temporários
    const cleanup = async (path) => {
      if (path) {
        try {
          await unlink(path);
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') {
            StickerLogger.error(`Erro ao remover arquivo: ${cleanupError.message}`);
          }
        }
      }
    };
    
    await cleanup(tempFilePath);
    await cleanup(tempInputPath);
    await cleanup(tempImagePath);
  }
}

// Export como módulo padrão do bot
module.exports = {
  name: "s4",
  alias: ["sticker4", "fig4"],
  desc: "Converte imagem/vídeo para sticker (incluindo view once) - Versão avançada JS",
  category: "Utilities",
  usage: ".s4 [responda uma imagem ou vídeo]",
  react: "🎨",
  start: async (Yaka, m, { quoted }) => {
    const sendMessage = async (chatId, text) => {
      await Yaka.sendMessage(chatId, { text }, { quoted: m });
    };

    await handleStickerCommand(Yaka, m, sendMessage);
  }
};