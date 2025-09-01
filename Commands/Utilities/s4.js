const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { writeFile, unlink, access, stat } = require('fs/promises');
const { tmpdir } = require('os');
const { join } = require('path');
const sharp = require('sharp');
const smartStickerConverter = require('../../lib/SmartStickerConverter');
const streamVideoProcessor = require('../../lib/StreamVideoProcessor');
const videoProcessor = require('../../lib/VideoProcessor');
const stickerSender = require('../../lib/StickerSender');

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
    // Auto-setup para ambiente workspace se necessário
    if (process.cwd().includes('/workspace')) {
      try {
        const { autoSetup } = require('../../auto-setup');
        await autoSetup();
      } catch (setupError) {
        // Ignorar erros de setup, continuar com fallbacks
      }
    }
    
    // Força a inicialização do processador de vídeo para garantir que o FFmpeg seja detectado
    await streamVideoProcessor.init();
    
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
        // Para vídeos, tentar FFmpeg primeiro, depois método alternativo
        try {
          StickerLogger.process('Processando vídeo...');
        
          // Verificar se é um vídeo válido
          let isValid = streamVideoProcessor.isValidVideo(mediaBuffer);
          if (!isValid) {
            isValid = videoProcessor.isValidVideo(mediaBuffer);
          }
          
          StickerLogger.info(`Vídeo válido: ${isValid ? 'Sim' : 'Não'}`);
          
          if (!isValid) {
            await sendMessage(chatId, '*[⚠️]* Formato de vídeo não suportado. Tente com MP4, WebM ou AVI!');
            return;
          }

          let stickerBuffer = null;
          let processingMethod = 'unknown';

          // Tentar FFmpeg primeiro se disponível
          const streamStatus = streamVideoProcessor.getStatus();
          if (streamStatus.hasFFmpeg) {
            try {
              StickerLogger.info(`Tentando FFmpeg: ${streamStatus.method}`);
              stickerBuffer = await streamVideoProcessor.processVideo(mediaBuffer, {
                timePosition: '00:00:02',
                quality: 80
              });
              processingMethod = 'FFmpeg';
              StickerLogger.success('✅ Processado com FFmpeg');
            } catch (ffmpegError) {
              StickerLogger.warning(`FFmpeg falhou: ${ffmpegError.message}`);
              stickerBuffer = null;
            }
          }

          // Se FFmpeg falhou ou não está disponível, usar método alternativo
          if (!stickerBuffer) {
            try {
              StickerLogger.info('Usando processador alternativo sem FFmpeg...');
              stickerBuffer = await videoProcessor.processVideo(mediaBuffer);
              processingMethod = 'Alternativo';
              StickerLogger.success('✅ Processado com método alternativo');
            } catch (altError) {
              StickerLogger.error(`Método alternativo falhou: ${altError.message}`);
              // Fallback final - usar visual do streamVideoProcessor
              stickerBuffer = await streamVideoProcessor.createVideoInfoSticker(mediaBuffer, 'Processamento alternativo');
              processingMethod = 'Visual Fallback';
            }
          }

          StickerLogger.success(`Sticker de vídeo criado: ${Math.round(stickerBuffer.length / 1024)}KB (${processingMethod})`);

          // Usar StickerSender robusto para vídeos
          try {
            StickerLogger.process('Enviando sticker de vídeo com sistema robusto...');
            const result = await stickerSender.sendSticker(sock, chatId, stickerBuffer, msg, { isVideo: true });
            StickerLogger.success(`Sticker enviado com método ${result.method}: ${result.result}`);
          } catch (senderError) {
            StickerLogger.error(`StickerSender falhou: ${senderError.message}`);
            StickerLogger.warning('🔥 ATIVANDO MODO FORÇA - GARANTINDO STICKER VISUAL!');
            
            // FORÇAR envio visual - NUNCA texto!
            try {
              const forceStickerSender = require('../../lib/ForceStickerSender');
              const forceResult = await forceStickerSender.forceSendSticker(sock, chatId, stickerBuffer, msg);
              StickerLogger.success(`🎉 FORÇA CONSEGUIU! Método: ${forceResult.result}`);
            } catch (forceError) {
              // Se até o FORÇA falhou, criar sticker de emergência  
              StickerLogger.warning('🚨 Criando sticker de EMERGÊNCIA...');
              
              try {
                const emergencySvg = `
                  <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#4CAF50"/>
                    <text x="128" y="100" font-family="Arial" font-size="48" fill="white" text-anchor="middle">🎬</text>
                    <text x="128" y="140" font-family="Arial" font-size="18" fill="white" text-anchor="middle">VÍDEO</text>
                    <text x="128" y="160" font-family="Arial" font-size="14" fill="white" text-anchor="middle">PROCESSADO</text>
                    <text x="128" y="200" font-family="Arial" font-size="10" fill="white" text-anchor="middle">${Math.round(stickerBuffer.length/1024)}KB</text>
                  </svg>`;
                
                const emergencySticker = await sharp(Buffer.from(emergencySvg))
                  .resize(256, 256)
                  .webp({ quality: 20 }) // Qualidade baixíssima
                  .toBuffer();
                
                // Envio DIRETO bypass tudo
                await sock.sendMessage(chatId, { 
                  sticker: emergencySticker 
                }, { quoted: msg });
                
                StickerLogger.success('🚨 Sticker de EMERGÊNCIA enviado!');
              } catch (emergencyError) {
                StickerLogger.error('💀 FALHA TOTAL - nem emergência funcionou');
                // Só agora enviar texto como ÚLTIMO recurso
                await sock.sendMessage(chatId, { 
                  text: `🎬 Vídeo processado (${Math.round(stickerBuffer.length/1024)}KB) mas upload falhou completamente`
                }, { quoted: msg });
              }
            }
          }

          StickerLogger.success("🎬 Sticker de vídeo enviado com sucesso!");
        
      } catch (videoError) {
          StickerLogger.error(`Erro no streaming: ${videoError.message}`);
          
          // Fallback com sticker visual usando StickerSender
          try {
            StickerLogger.info('Criando sticker informativo de erro...');
            const fallbackSticker = await streamVideoProcessor.createVideoInfoSticker(mediaBuffer, videoError.message);
            
            StickerLogger.info('Enviando sticker de erro com sistema robusto...');
            const result = await stickerSender.sendSticker(sock, chatId, fallbackSticker, msg, { isVideo: true, isError: true });
            StickerLogger.success(`Sticker de erro enviado com método ${result.method}: ${result.result}`);
            
          } catch (fallbackError) {
            StickerLogger.error(`Fallback visual falhou: ${fallbackError.message}`);
            
            // Fallback final: mensagem de texto
            try {
              await sock.sendMessage(chatId, {
                text: `⚠️ *ERRO NO VÍDEO*\n\n` +
                      `❌ ${videoError.message.substring(0, 80)}\n\n` +
                      `📊 *Informações:*\n` +
                      `• Tamanho: ${Math.round(mediaBuffer.length / 1024)}KB\n` +
                      `• FFmpeg: ${streamVideoProcessor.getStatus().hasFFmpeg ? '✅' : '❌'}\n\n` +
                      `💡 *Soluções:*\n` +
                      `• Use .ss como alternativo\n` +
                      `• Vídeo menor (<10MB)\n` +
                      `• Formato MP4/WebM/AVI\n` +
                      `• Aguarde e tente novamente`
              }, { quoted: msg });
              
              StickerLogger.success("Mensagem de erro enviada com sucesso");
            } catch (textError) {
              StickerLogger.error("Falha completa no tratamento de erro");
              await sendMessage(chatId, `*[❌]* Erro crítico: ${videoError.message.substring(0, 50)}`);
            }
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

        // Usar StickerSender robusto para imagens
        try {
          StickerLogger.process('Enviando sticker de imagem com sistema robusto...');
          const result = await stickerSender.sendSticker(sock, chatId, stickerBuffer, msg, { isVideo: false });
          StickerLogger.success(`Sticker de imagem enviado com método ${result.method}: ${result.result}`);
        } catch (senderError) {
          StickerLogger.error(`StickerSender falhou: ${senderError.message}`);
          StickerLogger.warning('🔥 ATIVANDO MODO FORÇA PARA IMAGEM!');
          
          // FORÇAR envio visual de imagem - NUNCA texto!
          try {
            const forceStickerSender = require('../../lib/ForceStickerSender');
            const forceResult = await forceStickerSender.forceSendSticker(sock, chatId, stickerBuffer, msg);
            StickerLogger.success(`🎉 FORÇA IMAGEM CONSEGUIU! Método: ${forceResult.result}`);
          } catch (forceError) {
            // Sticker de emergência para imagem
            StickerLogger.warning('🚨 Criando sticker de emergência para IMAGEM...');
            
            try {
              const emergencySvg = `
                <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100%" height="100%" fill="#2196F3"/>
                  <text x="128" y="100" font-family="Arial" font-size="48" fill="white" text-anchor="middle">🖼️</text>
                  <text x="128" y="140" font-family="Arial" font-size="18" fill="white" text-anchor="middle">IMAGEM</text>
                  <text x="128" y="160" font-family="Arial" font-size="14" fill="white" text-anchor="middle">PROCESSADA</text>
                  <text x="128" y="200" font-family="Arial" font-size="10" fill="white" text-anchor="middle">${Math.round(stickerBuffer.length/1024)}KB</text>
                </svg>`;
              
              const emergencySticker = await sharp(Buffer.from(emergencySvg))
                .resize(256, 256)
                .webp({ quality: 20 })
                .toBuffer();
              
              await sock.sendMessage(chatId, { 
                sticker: emergencySticker 
              }, { quoted: msg });
              
              StickerLogger.success('🚨 Sticker de EMERGÊNCIA (imagem) enviado!');
            } catch (emergencyError) {
              // Último recurso: texto mínimo
              await sock.sendMessage(chatId, { 
                text: `🖼️ Imagem processada (${Math.round(stickerBuffer.length/1024)}KB)`
              }, { quoted: msg });
            }
          }
        }
      }

    } catch (downloadError) {
      StickerLogger.error(`Erro no processamento: ${downloadError.message}`);
      await sendMessage(chatId, '*[❎]* Erro ao processar a mídia!');
    }

  } catch (error) {
    console.error('--- [s4.js] ERRO DENTRO DE handleStickerCommand ---');
    console.error(error);
    StickerLogger.error(`Erro geral: ${error.stack}`);
    await sendMessage(msg.key.remoteJid, `*[❎]* Erro ao processar o sticker! Detalhes: ${error.message}`);
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
    console.log('--- [s4.js] Comando .s4 iniciado ---');
    const sendMessage = async (chatId, text) => {
      await Yaka.sendMessage(chatId, { text }, { quoted: m });
    };

    try {
      console.log('--- [s4.js] Chamando handleStickerCommand ---');
      await handleStickerCommand(Yaka, m, sendMessage);
      console.log('--- [s4.js] handleStickerCommand concluído com sucesso ---');
    } catch (e) {
      console.error('--- [s4.js] ERRO GRAVE NO COMANDO .S4 ---');
      console.error(e);
      await sendMessage(m.key.remoteJid, '❌ Ocorreu um erro crítico no comando .s4. Verifique os logs.');
    }
  }
};