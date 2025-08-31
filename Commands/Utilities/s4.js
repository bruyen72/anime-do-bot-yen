const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { writeFile, unlink, access, stat } = require('fs/promises');
const { tmpdir } = require('os');
const { join } = require('path');
const smartStickerConverter = require('../../lib/SmartStickerConverter');
const streamVideoProcessor = require('../../lib/StreamVideoProcessor');

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

// Criar sticker de erro para vídeos
async function createVideoErrorSticker(videoSize, errorMsg) {
  const svgError = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="errorBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e74c3c;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#c0392b;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#errorBg)"/>
      
      <!-- Ícone de erro -->
      <circle cx="256" cy="180" r="60" fill="rgba(255,255,255,0.9)"/>
      <text x="256" y="200" font-family="Arial" font-size="40" fill="#e74c3c" text-anchor="middle">⚠️</text>
      
      <!-- Texto de erro -->
      <text x="256" y="280" font-family="Arial" font-size="18" font-weight="bold" fill="white" text-anchor="middle">ERRO NO VÍDEO</text>
      <text x="256" y="310" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.9)" text-anchor="middle">Tamanho: ${Math.round(videoSize/1024)}KB</text>
      <text x="256" y="340" font-family="Arial" font-size="10" fill="rgba(255,255,255,0.7)" text-anchor="middle">${errorMsg.substring(0, 40)}...</text>
      
      <!-- Rodapé -->
      <text x="256" y="380" font-family="Arial" font-size="11" fill="rgba(255,255,255,0.6)" text-anchor="middle">Tente outro formato de vídeo</text>
      <text x="256" y="400" font-family="Arial" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">ou use .ss como alternativa</text>
    </svg>`;
  
  return await sharp(Buffer.from(svgError))
    .resize(512, 512)
    .webp({ quality: 80 })
    .toBuffer();
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
        // Para vídeos, usar StreamVideoProcessor (SEM arquivos temporários)
        StickerLogger.process('Processando vídeo via streaming FFmpeg...');
        
        try {
          // Verificar se é um vídeo válido
          const isValid = streamVideoProcessor.isValidVideo(mediaBuffer);
          StickerLogger.info(`Vídeo válido: ${isValid ? 'Sim' : 'Não'}`);
          
          if (!isValid) {
            await sendMessage(chatId, '*[⚠️]* Formato de vídeo não suportado. Tente com MP4, WebM ou AVI!');
            return;
          }

          // Mostrar status do sistema
          const status = streamVideoProcessor.getStatus();
          StickerLogger.info(`Método: ${status.method}`);

          // Processar vídeo usando stdin/stdout streaming
          const stickerBuffer = await streamVideoProcessor.processVideo(mediaBuffer, {
            timePosition: '00:00:02', // Frame aos 2 segundos
            quality: 80
          });

          StickerLogger.success(`Sticker de vídeo criado: ${Math.round(stickerBuffer.length / 1024)}KB`);

          // Retry logic para upload de sticker
          let uploaded = false;
          const maxRetries = 3;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              // Otimizar tamanho se muito grande
              let finalBuffer = stickerBuffer;
              if (stickerBuffer.length > 1000000) { // 1MB
                const sharp = require('sharp');
                finalBuffer = await sharp(stickerBuffer)
                  .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 }})
                  .webp({ quality: 60, effort: 1 })
                  .toBuffer();
                StickerLogger.info(`Sticker otimizado: ${Math.round(finalBuffer.length/1024)}KB`);
              }
              
              await sock.sendMessage(chatId, {
                sticker: finalBuffer
              }, {
                quoted: msg
              });
              
              uploaded = true;
              break;
            } catch (uploadError) {
              StickerLogger.error(`Tentativa ${attempt}/${maxRetries} falhou: ${uploadError.message}`);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }
          }
          
          if (!uploaded) {
            throw new Error('Upload falhou após 3 tentativas');
          }

          StickerLogger.success("🎬 Sticker de vídeo enviado com sucesso!");
          
        } catch (videoError) {
          StickerLogger.error(`Erro no streaming: ${videoError.message}`);
          
          // Tentar fallback final
          try {
            StickerLogger.info('Usando fallback visual final...');
            const fallbackSticker = await streamVideoProcessor.createVideoInfoSticker(mediaBuffer, videoError.message);
            
            // Retry logic para fallback também
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                await sock.sendMessage(chatId, {
                  sticker: fallbackSticker
                }, {
                  quoted: msg
                });
                break;
              } catch (fallbackError) {
                if (attempt < 2) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                  throw fallbackError;
                }
              }
            }
            
            StickerLogger.error("Enviado sticker informativo devido ao erro");
          } catch (fallbackError) {
            await sendMessage(chatId, `*[❌]* Falha completa: ${videoError.message}`);
          }
        }
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
  desc: "Converte imagem/vídeo para sticker usando FFmpeg Streaming (SEM arquivos temporários)",
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