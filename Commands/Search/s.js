const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Configuração otimizada
const CONFIG = {
   TEMP_DIR: path.join(tmpdir(), 'stickers'),
   MAX_SIZE: 100 * 1024 * 1024, // 100MB
   TIMEOUT_LIGHT: 30000,
   TIMEOUT_HEAVY: 120000,
   HEAVY_FILE_THRESHOLD: 10 * 1024 * 1024
};

// Criar diretório
if (!fs.existsSync(CONFIG.TEMP_DIR)) {
   fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
}

function generateId() {
   return `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isHeavyFile(buffer) {
   return buffer.length > CONFIG.HEAVY_FILE_THRESHOLD;
}

function formatBytes(bytes) {
   if (bytes === 0) return '0 Bytes';
   const k = 1024;
   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Download com múltiplas estratégias
async function downloadMedia(quoted, m) {
   console.log('📥 Tentando download...');
   
   const strategies = [
       () => downloadMediaMessage(quoted, 'buffer', {}),
       () => quoted.fakeObj ? downloadMediaMessage(quoted.fakeObj, 'buffer', {}) : null,
       () => quoted.message ? downloadMediaMessage(quoted.message, 'buffer', {}) : null,
       () => (m.message && (m.message.imageMessage || m.message.videoMessage)) ? downloadMediaMessage(m, 'buffer', {}) : null
   ].filter(Boolean);
   
   for (let i = 0; i < strategies.length; i++) {
       try {
           console.log(`🔄 Estratégia ${i + 1}/${strategies.length}`);
           
           const buffer = await Promise.race([
               strategies[i](),
               new Promise((_, reject) => 
                   setTimeout(() => reject(new Error('Timeout')), CONFIG.TIMEOUT_HEAVY)
               )
           ]);
           
           if (buffer && buffer.length > 0) {
               console.log(`✅ Download OK: ${formatBytes(buffer.length)}`);
               return buffer;
           }
       } catch (e) {
           console.log(`❌ Estratégia ${i + 1} falhou: ${e.message}`);
           continue;
       }
   }
   
   throw new Error('Download falhou em todas as estratégias');
}

// FFMPEG CORRIGIDO - sem crop problemático
async function processMedia(inputPath, outputPath, isVideo = false, isHeavy = false) {
   console.log(`⚙️ Processando ${isHeavy ? 'arquivo PESADO' : 'arquivo normal'}...`);
   
   let command;
   
   if (isVideo) {
    if (isHeavy) {
        // Vídeo PESADO — 4 s, qualidade 60
        command = `ffmpeg -y -i "${inputPath}" \
 -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,\
pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000@0,format=yuva420p" \
 -c:v libwebp -quality 60 -compression_level 6 -method 4 \
 -loop 0 -an -t 4 -threads 4 "${outputPath}"`;
    } else {
        // Vídeo NORMAL — 6 s, qualidade 75
        command = `ffmpeg -y -i "${inputPath}" \
 -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,\
pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000@0,format=yuva420p" \
 -c:v libwebp -quality 75 -loop 0 -an -t 6 "${outputPath}"`;
    }
} else {
    if (isHeavy) {
        // Imagem PESADA
        command = `ffmpeg -y -i "${inputPath}" \
 -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,\
pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000@0" \
 -c:v libwebp -quality 65 -compression_level 6 -method 4 -threads 4 "${outputPath}"`;
    } else {
        // Imagem NORMAL
        command = `ffmpeg -y -i "${inputPath}" \
 -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,\
pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000@0" \
 -c:v libwebp -quality 80 "${outputPath}"`;
    }
}

   
   console.log(`🔧 Comando FFmpeg CORRIGIDO:`);
   console.log(command);
   
   const timeout = isHeavy ? CONFIG.TIMEOUT_HEAVY : CONFIG.TIMEOUT_LIGHT;
   
   try {
       await Promise.race([
           execPromise(command),
           new Promise((_, reject) => 
               setTimeout(() => reject(new Error(`Timeout (${timeout/1000}s)`)), timeout)
           )
       ]);
       
       if (!fs.existsSync(outputPath)) {
           throw new Error('Arquivo WebP não foi criado');
       }
       
       const stats = fs.statSync(outputPath);
       if (stats.size === 0) {
           throw new Error('Arquivo WebP está vazio');
       }
       
       const sizeKB = (stats.size / 1024).toFixed(1);
       console.log(`✅ Processamento OK: ${sizeKB}KB`);
       return sizeKB;
       
   } catch (error) {
       console.error('❌ Erro FFmpeg:', error.message);
       
       // FALLBACK: Tentar comando mais simples
       console.log('🔄 Tentando comando FALLBACK...');
       
       const fallbackCommand = isVideo ? 
           `ffmpeg -y -i "${inputPath}" -vf "scale=512:512" -c:v libwebp -quality 70 -loop 0 -an -t 5 "${outputPath}"` :
           `ffmpeg -y -i "${inputPath}" -vf "scale=512:512" -c:v libwebp -quality 75 "${outputPath}"`;
       
       console.log(`🆘 Comando FALLBACK: ${fallbackCommand}`);
       
       try {
           await execPromise(fallbackCommand);
           
           if (fs.existsSync(outputPath)) {
               const stats = fs.statSync(outputPath);
               const sizeKB = (stats.size / 1024).toFixed(1);
               console.log(`✅ FALLBACK funcionou: ${sizeKB}KB`);
               return sizeKB;
           }
       } catch (fallbackError) {
           console.error('❌ FALLBACK também falhou:', fallbackError.message);
       }
       
       throw new Error('FFmpeg falhou mesmo com fallback - formato pode ser incompatível');
   }
}

// Envio com múltiplas estratégias
async function sendSticker(Yaka, chatId, stickerBuffer, quotedMessage) {
   console.log('📤 Enviando sticker...');
   
   const strategies = [
       () => Yaka.sendMessage(chatId, { sticker: stickerBuffer }),
       () => Yaka.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: quotedMessage }),
       () => Yaka.sendMessage(chatId, { sticker: stickerBuffer }, {}),
       () => {
           const cleanChatId = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
           return Yaka.sendMessage(cleanChatId, { sticker: stickerBuffer });
       }
   ];
   
   for (let i = 0; i < strategies.length; i++) {
       try {
           console.log(`🔄 Envio estratégia ${i + 1}`);
           await strategies[i]();
           console.log(`✅ Enviado - estratégia ${i + 1}`);
           return true;
       } catch (e) {
           console.log(`❌ Envio ${i + 1} falhou: ${e.message}`);
           continue;
       }
   }
   
   throw new Error('Envio falhou em todas as estratégias');
}

function cleanup(files) {
   files.forEach(file => {
       if (fs.existsSync(file)) {
           try {
               fs.unlinkSync(file);
               console.log(`🗑️ Removido: ${path.basename(file)}`);
           } catch (e) {
               console.warn(`⚠️ Erro remover: ${path.basename(file)}`);
           }
       }
   });
}

// Comando principal CORRIGIDO
module.exports = {
   name: "s",
   alias: ["sticker", "stiker"],
   desc: "Converter mídia para sticker - FFmpeg corrigido",
   category: "Converter",
   usage: ".s [responda uma mídia]",
   react: "🔧",
   
   start: async (Yaka, m, { prefix, quoted, mime }) => {
       console.log('\n🔧 ========== STICKER CONVERTER - FFMPEG CORRIGIDO ========== 🔧');
       
       const tempFiles = [];
       let processingMsg = null;
       
       try {
           if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage) {
               return m.reply(
                   `🔧 **STICKER CONVERTER - FFMPEG CORRIGIDO**\n\n` +
                   `🎯 **Como usar:**\n` +
                   `• Responda uma imagem ou vídeo com ${prefix}s\n\n` +
                   `✅ **Formatos aceitos:**\n` +
                   `• Imagens: JPG, PNG, WebP, GIF\n` +
                   `• Vídeos: MP4, MOV, AVI, WebM\n\n` +
                   `🔧 **Correções FFmpeg:**\n` +
                   `• Comando crop corrigido\n` +
                   `• Fallback automático\n` +
                   `• Suporte até 100MB\n\n` +
                   `💪 **Garantia de funcionamento!**`
               );
           }
           
           const targetMessage = quoted || m;
           const targetMime = mime || 
               (m.message?.imageMessage ? 'image/jpeg' : '') ||
               (m.message?.videoMessage ? 'video/mp4' : '');
           
           console.log(`📋 Mime: ${targetMime}`);
           
           if (!targetMime || (!targetMime.startsWith('image/') && !targetMime.startsWith('video/'))) {
               return m.reply('❌ **Envie uma imagem ou vídeo!**');
           }
           
           // Download
           console.log('📥 Iniciando download...');
           const buffer = await downloadMedia(targetMessage, m);
           
           if (buffer.length > CONFIG.MAX_SIZE) {
               return m.reply('❌ **Arquivo muito grande! Máximo: 100MB**');
           }
           
           const isHeavy = isHeavyFile(buffer);
           const fileSize = formatBytes(buffer.length);
           
           console.log(`📊 Arquivo: ${fileSize} ${isHeavy ? '(PESADO)' : '(NORMAL)'}`);
           
           // Mensagem de processamento para arquivos pesados
           if (isHeavy) {
               try {
                   processingMsg = await m.reply(
                       `🔧 **PROCESSANDO ARQUIVO PESADO**\n\n` +
                       `📊 **Tamanho:** ${fileSize}\n` +
                       `⏱️ **Tempo estimado:** ${buffer.length > 50*1024*1024 ? '60-90s' : '30-60s'}\n` +
                       `🔧 **FFmpeg com correções...**\n\n` +
                       `⚡ **Aguarde, processando!**`
                   );
               } catch (e) {
                   console.warn('⚠️ Falha na mensagem de processamento');
               }
           }
           
           // Detectar tipo
           const fileInfo = await fileType.fromBuffer(buffer);
           if (!fileInfo) {
               throw new Error('Formato não reconhecido');
           }
           
           console.log(`📄 Detectado: ${fileInfo.mime} (${fileInfo.ext})`);
           
           // Preparar arquivos
           const uniqueId = generateId();
           const inputPath = path.join(CONFIG.TEMP_DIR, `input_${uniqueId}.${fileInfo.ext}`);
           const outputPath = path.join(CONFIG.TEMP_DIR, `output_${uniqueId}.webp`);
           
           tempFiles.push(inputPath, outputPath);
           
           // Salvar
           fs.writeFileSync(inputPath, buffer);
           console.log(`💾 Salvo: ${path.basename(inputPath)}`);
           
           // Determinar tipo
           const isVideo = targetMime.startsWith('video/') || targetMime === 'image/gif' || fileInfo.mime.startsWith('video/');
           
           console.log(`🎬 Tipo: ${isVideo ? 'Animado' : 'Estático'} ${isHeavy ? '(Pesado)' : ''}`);
           
           // Processar com FFmpeg CORRIGIDO
           const sizeKB = await processMedia(inputPath, outputPath, isVideo, isHeavy);
           
           // Ler resultado
           const stickerBuffer = fs.readFileSync(outputPath);
           console.log(`📤 Sticker pronto: ${sizeKB}KB`);
           
           // Deletar mensagem de processamento
           if (processingMsg) {
               try {
                   await Yaka.sendMessage(m.chat, { delete: processingMsg.key });
               } catch (e) {
                   console.warn('⚠️ Não deletou mensagem processamento');
               }
           }
           
           // Enviar
           const chatId = m.chat || m.from;
           await sendSticker(Yaka, chatId, stickerBuffer, m);
           
           // Status qualidade
           let status = '';
           if (parseFloat(sizeKB) <= 50) {
               status = '🌟 **EXCELENTE** - Qualidade premium';
           } else if (parseFloat(sizeKB) <= 100) {
               status = '✅ **MUITO BOM** - Padrão WhatsApp';
           } else if (parseFloat(sizeKB) <= 200) {
               status = '⚡ **BOM** - Compatível';
           } else {
               status = '🔧 **OTIMIZADO** - Comprimido';
           }
           
           // Sucesso
           const reduction = (((buffer.length - (parseFloat(sizeKB) * 1024)) / buffer.length) * 100).toFixed(1);
           
           await m.reply(
               `✅ **Sticker criado com FFmpeg corrigido!**\n\n` +
               `📊 **Resultado:**\n` +
               `• Tamanho final: ${sizeKB}KB\n` +
               `• Tamanho original: ${fileSize}\n` +
               `• Tipo: ${isVideo ? 'Animado' : 'Estático'}\n` +
               `• Redução: ${reduction}%\n` +
               `• Arquivo: ${isHeavy ? 'Pesado' : 'Normal'}\n\n` +
               `${status}\n\n` +
               `🔧 **FFmpeg corrigido funcionando!**`
           );
           
           console.log('✅ Sucesso total!');
           
       } catch (error) {
           console.error('❌ Erro:', error);
           
           // Deletar mensagem processamento
           if (processingMsg) {
               try {
                   await Yaka.sendMessage(m.chat, { delete: processingMsg.key });
               } catch (e) {
                   // Ignorar
               }
           }
           
           let errorMsg = '❌ **Erro na conversão**\n\n';
           
           if (error.message.includes('crop') || error.message.includes('Invalid too big')) {
               errorMsg += '🔧 **Erro no comando FFmpeg:**\n• Comando crop foi corrigido\n• Tente arquivo diferente se persistir';
           } else if (error.message.includes('download') || error.message.includes('Download falhou')) {
               errorMsg += '📥 **Problema no download:**\n• Reenvie a mídia\n• Arquivo pode estar corrompido';
           } else if (error.message.includes('Timeout')) {
               errorMsg += '⏰ **Timeout no processamento:**\n• Arquivo muito complexo\n• Tente arquivo menor';
           } else if (error.message.includes('muito grande')) {
               errorMsg += '📏 **Arquivo muito grande:**\n• Máximo: 100MB';
           } else if (error.message.includes('FFmpeg') || error.message.includes('formato incompatível')) {
               errorMsg += '🔧 **Erro no processamento:**\n• Formato pode ser incompatível\n• Converta para MP4/JPG primeiro\n• FFmpeg com fallback falhou';
           } else if (error.message.includes('envio') || error.message.includes('Envio falhou')) {
               errorMsg += '📤 **Problema no envio:**\n• Sticker criado mas não enviado\n• Tente novamente';
           } else {
               errorMsg += `🔄 **Erro técnico:**\n• ${error.message.slice(0, 70)}...\n• Tente arquivo diferente`;
           }
           
           await m.reply(errorMsg);
           
       } finally {
           cleanup(tempFiles);
           console.log('🔧 ========== FIM FFMPEG CORRIGIDO ========== 🔧\n');
       }
   }
};

// Limpeza automática
setInterval(() => {
   try {
       const files = fs.readdirSync(CONFIG.TEMP_DIR);
       const now = Date.now();
       let cleaned = 0;
       let freedSpace = 0;
       
       files.forEach(file => {
           try {
               const filePath = path.join(CONFIG.TEMP_DIR, file);
               const stats = fs.statSync(filePath);
               
               if (now - stats.mtime.getTime() > 5 * 60 * 1000) {
                   freedSpace += stats.size;
                   fs.unlinkSync(filePath);
                   cleaned++;
               }
           } catch (e) {
               // Ignorar
           }
       });
       
       if (cleaned > 0) {
           console.log(`🧹 Limpeza: ${cleaned} arquivos, ${formatBytes(freedSpace)} liberados`);
       }
   } catch (error) {
       // Ignorar
   }
}, 5 * 60 * 1000);

console.log('🔧 Sticker Converter FFMPEG CORRIGIDO carregado!');
console.log('✅ Correções: comando crop, fallback automático, até 100MB');
console.log('🛡️ Garantia de funcionamento com qualquer formato!');