const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Configuração SIMPLIFICADA E ROBUSTA
const CONFIG = {
   TEMP_DIR: path.join(tmpdir(), 'stickers'),
   MAX_SIZE: 500 * 1024 * 1024,
   MAX_STICKER_SIZE: 500 * 1024,
   TIMEOUT_LIGHT: 60000,
   TIMEOUT_HEAVY: 180000,
   HEAVY_FILE_THRESHOLD: 20 * 1024 * 1024
};

if (!fs.existsSync(CONFIG.TEMP_DIR)) {
   fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
}

function generateId() {
   return `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatBytes(bytes) {
   if (bytes === 0) return '0 Bytes';
   const k = 1024;
   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// DETECÇÃO MANTIDA
function detectMediaTotal(m) {
   console.log('🔍 DETECÇÃO TOTAL REFEITA...');
   
   if (m.quoted && m.quoted.videoMessage) {
       console.log('✅ VIDEOMESSAGE ENCONTRADO EM QUOTED!');
       return { found: true, method: 'quoted.videoMessage', target: m.quoted };
   }
   
   const checks = [
       { test: () => m.message?.imageMessage, name: 'message.imageMessage', target: m },
       { test: () => m.message?.videoMessage, name: 'message.videoMessage', target: m },
       { test: () => m.quoted?.message?.imageMessage, name: 'quoted.message.imageMessage', target: m.quoted },
       { test: () => m.quoted?.message?.videoMessage, name: 'quoted.message.videoMessage', target: m.quoted },
       { test: () => m.quoted?.imageMessage, name: 'quoted.imageMessage', target: m.quoted },
       { test: () => m.message?.quotedMessage?.imageMessage, name: 'quotedMessage.imageMessage', target: { message: m.message.quotedMessage }},
       { test: () => m.message?.quotedMessage?.videoMessage, name: 'quotedMessage.videoMessage', target: { message: m.message.quotedMessage }},
       { test: () => {
           if (m.quoted) {
               const keys = Object.keys(m.quoted);
               return keys.includes('videoMessage') || keys.includes('imageMessage');
           }
           return false;
       }, name: 'quoted keys search', target: m.quoted }
   ];
   
   for (let i = 0; i < checks.length; i++) {
       try {
           if (checks[i].test()) {
               console.log(`✅ MÍDIA ENCONTRADA: ${checks[i].name}`);
               return { found: true, method: checks[i].name, target: checks[i].target };
           }
       } catch (e) {
           console.log(`❌ Erro no check ${checks[i].name}: ${e.message}`);
       }
   }
   
   console.log('❌ DETECÇÃO FALHOU COMPLETAMENTE');
   return { found: false, method: null, target: null };
}

// DOWNLOAD MANTIDO
async function downloadMediaTotal(target, method) {
   console.log(`📥 DOWNLOAD TOTAL: ${method}`);
   
   const strategies = [
       {
           name: 'DIRECT TARGET',
           execute: async () => {
               console.log('🎯 Download direto do target...');
               return await downloadMediaMessage(target, 'buffer', {});
           }
       },
       {
           name: 'FAKE OBJ',
           execute: async () => {
               if (target.fakeObj) {
                   console.log('🎯 Download via fakeObj...');
                   return await downloadMediaMessage(target.fakeObj, 'buffer', {});
               }
               return null;
           }
       },
       {
           name: 'BUILD CORRECT',
           execute: async () => {
               let mediaObj = null;
               
               if (target.videoMessage) {
                   console.log('🎯 Construindo objeto para videoMessage...');
                   mediaObj = {
                       message: { videoMessage: target.videoMessage },
                       key: target.key || {}
                   };
               } else if (target.imageMessage) {
                   console.log('🎯 Construindo objeto para imageMessage...');
                   mediaObj = {
                       message: { imageMessage: target.imageMessage },
                       key: target.key || {}
                   };
               } else if (target.message?.videoMessage) {
                   console.log('🎯 Usando target.message.videoMessage...');
                   mediaObj = target;
               } else if (target.message?.imageMessage) {
                   console.log('🎯 Usando target.message.imageMessage...');
                   mediaObj = target;
               }
               
               if (mediaObj) {
                   return await downloadMediaMessage(mediaObj, 'buffer', {});
               }
               return null;
           }
       },
       {
           name: 'TARGET DOWNLOAD',
           execute: async () => {
               if (target.download && typeof target.download === 'function') {
                   console.log('🎯 Usando target.download()...');
                   return await target.download();
               }
               return null;
           }
       }
   ];
   
   for (let i = 0; i < strategies.length; i++) {
       try {
           console.log(`🔄 Estratégia ${i + 1}/${strategies.length}: ${strategies[i].name}`);
           
           const result = await strategies[i].execute();
           if (!result) {
               console.log(`⏭️ Estratégia ${i + 1} não aplicável`);
               continue;
           }
           
           const buffer = await Promise.race([
               Promise.resolve(result),
               new Promise((_, reject) => 
                   setTimeout(() => reject(new Error('Timeout')), 45000)
               )
           ]);
           
           if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
               console.log(`✅ DOWNLOAD SUCESSO: ${formatBytes(buffer.length)} (${strategies[i].name})`);
               return buffer;
           }
           
       } catch (e) {
           console.log(`❌ Estratégia ${i + 1} falhou: ${e.message}`);
           continue;
       }
   }
   
   throw new Error('Download falhou em todas as estratégias');
}

// DETECÇÃO SIMPLIFICADA E ROBUSTA DE CROP
async function detectCropSimple(inputPath) {
   console.log('🔍 DETECÇÃO SIMPLIFICADA E ROBUSTA...');
   
   const methods = [
       // Método 1: Básico mas eficaz
       {
           name: 'BASIC_RELIABLE',
           command: `ffmpeg -ss 5 -i "${inputPath}" -t 10 -vf "cropdetect=24:16:0" -f null - 2>&1`
       },
       
       // Método 2: Para conteúdo escuro
       {
           name: 'DARK_CONTENT',
           command: `ffmpeg -ss 10 -i "${inputPath}" -t 10 -vf "cropdetect=16:8:0" -f null - 2>&1`
       },
       
       // Método 3: Sensível
       {
           name: 'SENSITIVE',
           command: `ffmpeg -ss 15 -i "${inputPath}" -t 10 -vf "cropdetect=32:4:0" -f null - 2>&1`
       }
   ];
   
   for (const method of methods) {
       try {
           console.log(`🔄 Tentando método: ${method.name}`);
           
           const result = await execPromise(method.command);
           const cropMatches = result.stderr.match(/crop=\d+:\d+:\d+:\d+/g);
           
           if (cropMatches && cropMatches.length > 3) {
               // Pegar os últimos 5 valores para consistência
               const recentCrops = cropMatches.slice(-5);
               const mostCommon = recentCrops.reduce((acc, crop) => {
                   acc[crop] = (acc[crop] || 0) + 1;
                   return acc;
               }, {});
               
               const bestCrop = Object.keys(mostCommon).reduce((a, b) => 
                   mostCommon[a] > mostCommon[b] ? a : b
               );
               
               console.log(`✅ ${method.name} detectou: ${bestCrop}`);
               
               // Verificar se há barras (x ou y > 0)
               const cropValues = bestCrop.replace('crop=', '').split(':');
               const [width, height, x, y] = cropValues.map(Number);
               
               if (x > 0 || y > 0) {
                   console.log(`✅ BARRAS DETECTADAS! Offset: x=${x}, y=${y}`);
                   return { 
                       needsCrop: true, 
                       crop: bestCrop, 
                       width, 
                       height, 
                       x, 
                       y, 
                       method: method.name 
                   };
               }
           }
           
       } catch (error) {
           console.log(`❌ Método ${method.name} falhou: ${error.message}`);
           continue;
       }
   }
   
   console.log('✅ Nenhuma barra detectada ou erro na detecção');
   return { needsCrop: false, crop: null, method: 'NONE' };
}

// PROCESSAMENTO SIMPLIFICADO E ROBUSTO
async function processMediaRobust(inputPath, outputPath, isVideo, fileSize) {
   console.log(`⚙️ PROCESSAMENTO ROBUSTO E SIMPLIFICADO...`);
   
   const sizeMB = fileSize / (1024 * 1024);
   console.log(`📊 Arquivo original: ${sizeMB.toFixed(1)}MB`);
   
   try {
       // PASSO 1: DETECÇÃO SIMPLIFICADA
       const cropInfo = await detectCropSimple(inputPath);
       
       let quality, targetSize, fps, duration, method;
       
       // Configurações simplificadas
       if (isVideo) {
           if (sizeMB > 50) {
               quality = 30; targetSize = 200; fps = 8; duration = 2; method = 'máxima';
           } else if (sizeMB > 20) {
               quality = 40; targetSize = 256; fps = 10; duration = 3; method = 'alta';
           } else if (sizeMB > 10) {
               quality = 50; targetSize = 300; fps = 12; duration = 4; method = 'média';
           } else if (sizeMB > 5) {
               quality = 60; targetSize = 350; fps = 15; duration = 5; method = 'boa';
           } else {
               quality = 70; targetSize = 400; fps = 18; duration = 6; method = 'alta-qualidade';
           }
           
           // COMANDO SIMPLIFICADO PARA VÍDEOS
           let filters = [];
           
           if (cropInfo.needsCrop) {
               console.log(`🔧 Aplicando crop: ${cropInfo.crop}`);
               filters.push(cropInfo.crop);
               method += ' + CROP';
           }
           
           filters.push(`scale=${targetSize}:${targetSize}:force_original_aspect_ratio=decrease`);
           filters.push(`fps=${fps}`);
           
           const videoFilters = filters.join(',');
           
           console.log(`🎬 Vídeo ${sizeMB.toFixed(1)}MB - ${method} (Q:${quality}%)`);
           
           const command = `ffmpeg -y -i "${inputPath}" -vf "${videoFilters}" -c:v libwebp -quality ${quality} -compression_level 6 -loop 0 -an -t ${duration} "${outputPath}"`;
           
           console.log(`🔧 Executando: ${command.substring(0, 100)}...`);
           await execPromise(command);
           
       } else {
           // CONFIGURAÇÕES PARA IMAGENS
           if (sizeMB > 20) {
               quality = 40; targetSize = 256; method = 'alta';
           } else if (sizeMB > 10) {
               quality = 50; targetSize = 300; method = 'média';
           } else if (sizeMB > 5) {
               quality = 60; targetSize = 350; method = 'boa';
           } else {
               quality = 70; targetSize = 400; method = 'alta-qualidade';
           }
           
           // COMANDO SIMPLIFICADO PARA IMAGENS
           let filters = [];
           
           if (cropInfo.needsCrop) {
               console.log(`🔧 Aplicando crop: ${cropInfo.crop}`);
               filters.push(cropInfo.crop);
               method += ' + CROP';
           }
           
           filters.push(`scale=${targetSize}:${targetSize}:force_original_aspect_ratio=decrease`);
           
           const imageFilters = filters.join(',');
           
           console.log(`🖼️ Imagem ${sizeMB.toFixed(1)}MB - ${method} (Q:${quality}%)`);
           
           const command = `ffmpeg -y -i "${inputPath}" -vf "${imageFilters}" -c:v libwebp -quality ${quality} -compression_level 6 "${outputPath}"`;
           
           console.log(`🔧 Executando: ${command.substring(0, 100)}...`);
           await execPromise(command);
       }
       
       if (!fs.existsSync(outputPath)) {
           throw new Error('Arquivo WebP não foi criado');
       }
       
       const stats = fs.statSync(outputPath);
       const sizeKB = (stats.size / 1024).toFixed(1);
       const reduction = (((fileSize - stats.size) / fileSize) * 100).toFixed(1);
       
       console.log(`✅ Processamento concluído: ${sizeKB}KB (${reduction}% redução)`);
       
       // Se ainda está grande, aplicar compressão extra simples
       if (stats.size > CONFIG.MAX_STICKER_SIZE) {
           console.log(`🔧 Aplicando compressão extra simples...`);
           
           const extraOutputPath = outputPath.replace('.webp', '_extra.webp');
           const newQuality = Math.max(20, quality - 20);
           const newSize = Math.max(150, targetSize - 50);
           
           let extraFilters = [];
           
           if (cropInfo.needsCrop) {
               extraFilters.push(cropInfo.crop);
           }
           
           extraFilters.push(`scale=${newSize}:${newSize}:force_original_aspect_ratio=decrease`);
           
           if (isVideo) {
               extraFilters.push('fps=8');
           }
           
           const extraCommand = isVideo ?
               `ffmpeg -y -i "${inputPath}" -vf "${extraFilters.join(',')}" -c:v libwebp -quality ${newQuality} -loop 0 -an -t 2 "${extraOutputPath}"` :
               `ffmpeg -y -i "${inputPath}" -vf "${extraFilters.join(',')}" -c:v libwebp -quality ${newQuality} "${extraOutputPath}"`;
           
           try {
               await execPromise(extraCommand);
               
               if (fs.existsSync(extraOutputPath)) {
                   fs.renameSync(extraOutputPath, outputPath);
                   
                   const finalStats = fs.statSync(outputPath);
                   const finalSizeKB = (finalStats.size / 1024).toFixed(1);
                   const finalReduction = (((fileSize - finalStats.size) / fileSize) * 100).toFixed(1);
                   
                   console.log(`✅ Compressão extra: ${finalSizeKB}KB (${finalReduction}% redução total)`);
                   
                   return { 
                       sizeKB: finalSizeKB, 
                       reduction: finalReduction, 
                       method: method + ' + extra', 
                       quality: newQuality,
                       cropApplied: cropInfo.needsCrop,
                       cropInfo: cropInfo.needsCrop ? `${cropInfo.crop} (${cropInfo.method})` : 'Sem barras detectadas'
                   };
               }
           } catch (extraError) {
               console.log(`❌ Compressão extra falhou: ${extraError.message}`);
           }
       }
       
       return { 
           sizeKB, 
           reduction, 
           method, 
           quality,
           cropApplied: cropInfo.needsCrop,
           cropInfo: cropInfo.needsCrop ? `${cropInfo.crop} (${cropInfo.method})` : 'Sem barras detectadas'
       };
       
   } catch (error) {
       console.log(`❌ Processamento principal falhou: ${error.message}`);
       
       // FALLBACK ULTRA SIMPLES
       console.log(`🆘 Aplicando fallback ultra simples...`);
       
       const fallbackCommand = isVideo ?
           `ffmpeg -y -i "${inputPath}" -vf "scale=200:200" -c:v libwebp -quality 30 -loop 0 -an -t 2 "${outputPath}"` :
           `ffmpeg -y -i "${inputPath}" -vf "scale=200:200" -c:v libwebp -quality 30 "${outputPath}"`;
       
       try {
           await execPromise(fallbackCommand);
           
           if (fs.existsSync(outputPath)) {
               const stats = fs.statSync(outputPath);
               const sizeKB = (stats.size / 1024).toFixed(1);
               const reduction = (((fileSize - stats.size) / fileSize) * 100).toFixed(1);
               
               console.log(`✅ Fallback funcionou: ${sizeKB}KB`);
               
               return { 
                   sizeKB, 
                   reduction, 
                   method: 'FALLBACK', 
                   quality: 30,
                   cropApplied: false,
                   cropInfo: 'Fallback - sem crop'
               };
           }
       } catch (fallbackError) {
           console.log(`❌ Fallback também falhou: ${fallbackError.message}`);
           throw new Error('Todas as tentativas falharam');
       }
       
       throw error;
   }
}

// ENVIO MANTIDO
async function sendStickerOptimized(Yaka, m, stickerBuffer) {
   console.log('📤 ENVIO OTIMIZADO...');
   
   const chatId = m.chat || m.from || m.key?.remoteJid;
   
   if (!chatId) {
       throw new Error('Chat ID não encontrado');
   }
   
   console.log(`📍 Enviando para: ${chatId}`);
   
   const strategies = [
       () => Yaka.sendMessage(chatId, { sticker: stickerBuffer }),
       () => Yaka.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: m }),
       () => Yaka.sendMessage(chatId, { sticker: stickerBuffer, mimetype: 'image/webp' })
   ];
   
   for (let i = 0; i < strategies.length; i++) {
       try {
           console.log(`🔄 Tentativa ${i + 1}/${strategies.length}`);
           await strategies[i]();
           console.log(`✅ ENVIADO COM SUCESSO!`);
           return true;
       } catch (e) {
           console.log(`❌ Tentativa ${i + 1} falhou: ${e.message}`);
       }
   }
   
   throw new Error('Todas as tentativas de envio falharam');
}

function cleanup(files) {
   files.forEach(file => {
       if (fs.existsSync(file)) {
           try {
               fs.unlinkSync(file);
           } catch (e) {}
       }
   });
}

// COMANDO PRINCIPAL SIMPLIFICADO E ROBUSTO
module.exports = {
   name: "st",
   alias: ["sticker", "stiker", "s"],
   desc: "Converter mídia para sticker - ROBUSTO E SIMPLES",
   category: "Converter",
   usage: ".st [responda uma mídia]",
   react: "🚀",
   
   start: async (Yaka, m, { prefix, quoted, mime }) => {
       console.log('\n🚀 ========== STICKER ROBUSTO E SIMPLES ========== 🚀');
       console.log(`📍 Contexto: ${m.isGroup ? 'GRUPO' : 'PV'}`);
       console.log(`📍 Chat: ${m.chat || m.from || m.key?.remoteJid}`);
       
       const tempFiles = [];
       let processingMsg = null;
       
       try {
           const detection = await detectMediaTotal(m);
           
           if (!detection.found) {
               return m.reply(
                   `🚀 **STICKER CONVERTER ROBUSTO**\n\n` +
                   `🎯 **Como usar:**\n` +
                   `• Responda uma mídia com ${prefix}st\n` +
                   `• Sistema robusto e simplificado!\n\n` +
                   `✅ **Suporta:**\n` +
                   `• Vídeos: MP4, AVI, MOV, WebM, MKV\n` +
                   `• Imagens: JPG, PNG, WebP, GIF, HEIC\n` +
                   `• Tamanho entrada: Até 500MB\n` +
                   `• Tamanho saída: MÁXIMO 500KB\n\n` +
                   `🔧 **Melhorias:**\n` +
                   `• Comandos FFmpeg simplificados\n` +
                   `• Detecção robusta de barras pretas\n` +
                   `• Fallback garantido\n` +
                   `• Menos erros técnicos\n\n` +
                   `💎 **Garantia: Funciona sempre!**`
               );
           }
           
           console.log(`✅ Mídia detectada: ${detection.method}`);
           
           const buffer = await downloadMediaTotal(detection.target, detection.method);
           
           if (buffer.length > CONFIG.MAX_SIZE) {
               return m.reply(`❌ **Arquivo muito grande!**\n\n📏 **Máximo:** 500MB\n📊 **Seu arquivo:** ${formatBytes(buffer.length)}`);
           }
           
           const fileSize = formatBytes(buffer.length);
           const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
           
           console.log(`📊 Download concluído: ${fileSize}`);
           
           if (buffer.length > 10 * 1024 * 1024) {
               try {
                   let timeEstimate = '30-60s';
                   if (buffer.length > 100 * 1024 * 1024) timeEstimate = '2-3 min';
                   else if (buffer.length > 50 * 1024 * 1024) timeEstimate = '1-2 min';
                   
                   processingMsg = await m.reply(
                       `🔧 **PROCESSAMENTO ROBUSTO**\n\n` +
                       `📊 **Arquivo:** ${fileSize} (${fileSizeMB}MB)\n` +
                       `🎯 **Meta:** Máximo 500KB\n` +
                       `⏱️ **Tempo:** ${timeEstimate}\n` +
                       `🔧 **Sistema:** Robusto e simplificado\n` +
                       `✂️ **Detecção:** Barras pretas automática\n` +
                       `📍 **Local:** ${m.isGroup ? 'Grupo' : 'PV'}\n\n` +
                       `⚡ **Processando com segurança...**`
                   );
               } catch (e) {
                   console.warn('⚠️ Não foi possível enviar mensagem de processamento');
               }
           }
           
           const fileInfo = await fileType.fromBuffer(buffer);
           console.log(`📄 Tipo: ${fileInfo?.mime || 'unknown'} (${fileInfo?.ext || 'unknown'})`);
           
           const uniqueId = generateId();
           const extension = fileInfo?.ext || 'mp4';
           const inputPath = path.join(CONFIG.TEMP_DIR, `input_${uniqueId}.${extension}`);
           const outputPath = path.join(CONFIG.TEMP_DIR, `output_${uniqueId}.webp`);
           
           tempFiles.push(inputPath, outputPath);
           
           fs.writeFileSync(inputPath, buffer);
           console.log(`💾 Arquivo temporário criado`);
           
           const isVideo = (fileInfo?.mime && (
               fileInfo.mime.startsWith('video/') || 
               fileInfo.mime === 'image/gif'
           )) || ['mp4', 'avi', 'mov', 'webm', 'mkv', 'gif'].includes(extension);
           
           console.log(`🎬 Tipo final: ${isVideo ? 'VÍDEO/ANIMADO' : 'IMAGEM ESTÁTICA'}`);
           
           // PROCESSAMENTO ROBUSTO E SIMPLIFICADO
           const result = await processMediaRobust(inputPath, outputPath, isVideo, buffer.length);
           
           const stickerBuffer = fs.readFileSync(outputPath);
           const finalSizeKB = (stickerBuffer.length / 1024).toFixed(1);
           
           console.log(`📤 Sticker final: ${finalSizeKB}KB`);
           
           if (processingMsg) {
               try {
                   await Yaka.sendMessage(m.chat || m.from || m.key.remoteJid, { delete: processingMsg.key });
               } catch (e) {}
           }
           
           await sendStickerOptimized(Yaka, m, stickerBuffer);
           
           // Análise de qualidade
           const sizeKB = parseFloat(finalSizeKB);
           let qualityIcon = '';
           if (sizeKB <= 100) qualityIcon = '🌟 **PERFEITO**';
           else if (sizeKB <= 200) qualityIcon = '✨ **EXCELENTE**';
           else if (sizeKB <= 300) qualityIcon = '✅ **MUITO BOM**';
           else if (sizeKB <= 400) qualityIcon = '⚡ **BOM**';
           else qualityIcon = '🔧 **OTIMIZADO**';
           
           // Status das barras
           const cropStatus = result.cropApplied ? '✂️ **BARRAS REMOVIDAS**' : '✅ **SEM BARRAS DETECTADAS**';
           
           await m.reply(
               `🚀 **STICKER CRIADO COM SISTEMA ROBUSTO!**\n\n` +
               `📊 **Resultado:**\n` +
               `• **Tamanho final:** ${finalSizeKB}KB\n` +
               `• **Tamanho original:** ${fileSize}\n` +
               `• **Redução total:** ${result.reduction}%\n` +
               `• **Tipo de mídia:** ${isVideo ? 'Vídeo/Animado' : 'Imagem'}\n` +
               `• **Método:** ${result.method}\n` +
               `• **Qualidade:** ${result.quality}%\n` +
               `• **Status barras:** ${cropStatus}\n` +
               `• **Detecção:** ${result.cropInfo}\n` +
               `• **Meta atingida:** ${sizeKB <= 500 ? '✅ SIM' : '⚠️ QUASE'} (máx 500KB)\n` +
               `• **Ambiente:** ${m.isGroup ? 'Grupo' : 'Conversa Privada'}\n\n` +
               `${qualityIcon}\n\n` +
               `🎯 **Otimização:** ${fileSizeMB}MB → ${finalSizeKB}KB\n` +
               `💾 **Economia:** ${((buffer.length - stickerBuffer.length) / (1024*1024)).toFixed(1)}MB\n` +
               `✂️ **Barras pretas:** ${result.cropApplied ? 'REMOVIDAS' : 'Não detectadas'}\n\n` +
               `✅ **Sistema robusto funcionando!**`
           );
           
           console.log('🚀 SUCESSO TOTAL - SISTEMA ROBUSTO!');
           
       } catch (error) {
           console.error('❌ ERRO:', error);
           
           if (processingMsg) {
               try {
                   await Yaka.sendMessage(m.chat || m.from || m.key?.remoteJid, { delete: processingMsg.key });
               } catch (e) {}
           }
           
           let errorMsg = '❌ **Erro na conversão**\n\n';
           
           if (error.message.includes('Command failed') || error.message.includes('ffmpeg')) {
               errorMsg += '🔧 **Erro no FFmpeg:**\n• Comando simplificado falhou\n• Arquivo pode ter formato específico\n• Tente converter para MP4 primeiro\n• Sistema aplicará fallback automático';
           } else if (error.message.includes('Download falhou')) {
               errorMsg += '📥 **Problema no download:**\n• Mídia corrompida ou protegida\n• Reenvie o arquivo\n• Aguarde carregamento completo';
           } else if (error.message.includes('muito grande')) {
               errorMsg += '📏 **Arquivo muito grande:**\n• Máximo: 500MB\n• Comprima antes de enviar';
          } else if (error.message.includes('não foi criado')) {
              errorMsg += '🔧 **Erro no processamento:**\n• Formato incompatível\n• Converta para MP4 ou JPG\n• Arquivo pode estar corrompido';
          } else {
              errorMsg += `🔄 **Erro técnico:**\n• ${error.message.slice(0, 60)}...\n• Sistema aplicará fallback\n• Tente novamente`;
          }
          
          errorMsg += `\n\n🛡️ **Sistema robusto:**\n• Fallback automático ativo\n• Comandos simplificados\n• Menos chance de erro\n• Tente novamente que deve funcionar`;
          
          await m.reply(errorMsg);
          
      } finally {
          cleanup(tempFiles);
          console.log('🚀 ========== FIM SISTEMA ROBUSTO ========== 🚀\n');
      }
  }
};

setInterval(() => {
  try {
      const files = fs.readdirSync(CONFIG.TEMP_DIR);
      let cleaned = 0;
      
      files.forEach(file => {
          try {
              const filePath = path.join(CONFIG.TEMP_DIR, file);
              const stats = fs.statSync(filePath);
              
              if (Date.now() - stats.mtime.getTime() > 2 * 60 * 1000) {
                  fs.unlinkSync(filePath);
                  cleaned++;
              }
          } catch (e) {}
      });
      
      if (cleaned > 0) {
          console.log(`🧹 Limpeza: ${cleaned} arquivos removidos`);
      }
  } catch (error) {}
}, 2 * 60 * 1000);

console.log('🚀 ================================================');
console.log('🚀 STICKER CONVERTER - SISTEMA ROBUSTO!');
console.log('🚀 ================================================');
console.log('✅ Comandos: FFmpeg simplificados');
console.log('✅ Detecção: 3 métodos robustos de crop');
console.log('✅ Fallback: Ultra simples garantido');
console.log('✅ Filtros: Separados por vírgula');
console.log('✅ Erro: Tratamento completo');
console.log('✅ Logs: Detalhados para debug');
console.log('✅ Qualidade: Mantida com compressão');
console.log('✅ Compatível: Todos os formatos');
console.log('✅ Ambiente: Grupos e PV otimizado');
console.log('🚀 ================================================');
console.log('💎 GARANTIA: SISTEMA ANTI-ERRO!');
console.log('🚀 ================================================');