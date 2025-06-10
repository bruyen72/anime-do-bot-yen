const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// ========================================
// CONFIGURAÇÃO ULTRA ROBUSTA PARA ST
// ========================================
const STICKER_CONFIG = {
    TEMP_DIR: path.join(tmpdir(), 'wa_sticker'),
    MAX_SIZE_STATIC: 150000,    // 150KB
    MAX_SIZE_ANIMATED: 120000,  // 120KB
    MAX_DURATION: 6,
    // Qualidades SEGURAS e ALTAS
    QUALITY_LEVELS: [88, 85, 82, 78, 75, 72, 68, 65],
    STANDARD_SIZE: 512
};

// Criar diretório se não existir
if (!fs.existsSync(STICKER_CONFIG.TEMP_DIR)) {
    fs.mkdirSync(STICKER_CONFIG.TEMP_DIR, { recursive: true });
}

// ========================================
// UTILITÁRIOS PARA DEBUGAR JID
// ========================================
function debugChatInfo(m) {
    console.log('🔍 DEBUG CHAT INFO:');
    console.log('   m.chat:', m.chat);
    console.log('   m.from:', m.from);
    console.log('   m.key.remoteJid:', m.key?.remoteJid);
    console.log('   m.key.participant:', m.key?.participant);
    console.log('   Tipo de chat:', typeof m.chat);
    console.log('   Chat válido:', !!m.chat && m.chat.length > 0);
    
    // Tentar identificar o formato correto
    if (m.chat && m.chat.includes('@')) {
        console.log('   ✅ Chat tem @ - formato válido');
        return m.chat;
    } else if (m.key?.remoteJid) {
        console.log('   🔄 Usando remoteJid:', m.key.remoteJid);
        return m.key.remoteJid;
    } else if (m.from) {
        console.log('   🔄 Usando from:', m.from);
        return m.from;
    } else {
        console.log('   ❌ Nenhum chat válido encontrado');
        return null;
    }
}

function sanitizeChatId(chatId) {
    if (!chatId) return null;
    
    // Se já está no formato correto, retornar
    if (chatId.includes('@s.whatsapp.net') || chatId.includes('@g.us')) {
        return chatId;
    }
    
    // Tentar adicionar sufixo correto
    if (chatId.includes('-')) {
        // Provavelmente é grupo
        return `${chatId}@g.us`;
    } else {
        // Provavelmente é privado
        return `${chatId}@s.whatsapp.net`;
    }
}

// ========================================
// DOWNLOAD (MANTENDO SEU SISTEMA)
// ========================================
async function downloadMedia(quoted, m) {
    console.log('📥 Download de mídia...');
    
    const strategies = [
        () => quoted?.fakeObj ? downloadMediaMessage(quoted.fakeObj, 'buffer', {}) : null,
        () => quoted ? downloadMediaMessage(quoted, 'buffer', {}) : null,
        () => m.message ? downloadMediaMessage(m, 'buffer', {}) : null,
        () => quoted?.message ? downloadMediaMessage(quoted.message, 'buffer', {}) : null
    ];
    
    for (let i = 0; i < strategies.length; i++) {
        try {
            const buffer = await Promise.race([
                strategies[i](),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);
            
            if (buffer && buffer.length > 0) {
                console.log(`✅ Download: ${(buffer.length / 1024).toFixed(1)}KB`);
                return buffer;
            }
        } catch (error) {
            console.log(`❌ Estratégia ${i + 1}: ${error.message}`);
        }
    }
    
    throw new Error('Download falhou');
}

// ========================================
// PROCESSAMENTO ULTRA SEGURO (MANTENDO COMO ESTÁ)
// ========================================
async function processSticker(inputPath, outputPath, isVideo) {
    console.log(`🔄 Processamento SEGURO - ${isVideo ? 'VÍDEO' : 'IMAGEM'}`);
    
    const maxSize = isVideo ? STICKER_CONFIG.MAX_SIZE_ANIMATED : STICKER_CONFIG.MAX_SIZE_STATIC;
    
    for (const quality of STICKER_CONFIG.QUALITY_LEVELS) {
        try {
            console.log(`🔄 Tentando qualidade ${quality}...`);
            
            if (isVideo) {
                const success = await processVideoSafe(inputPath, outputPath, quality);
                if (!success) continue;
            } else {
                const success = await processImageSafe(inputPath, outputPath, quality);
                if (!success) continue;
            }
            
            // Verificar resultado
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                const sizeKB = stats.size / 1024;
                
                console.log(`📊 Resultado Q${quality}: ${sizeKB.toFixed(1)}KB`);
                
                if (stats.size <= maxSize || quality === STICKER_CONFIG.QUALITY_LEVELS[STICKER_CONFIG.QUALITY_LEVELS.length - 1]) {
                    console.log(`✅ Qualidade ${quality} OK: ${sizeKB.toFixed(1)}KB`);
                    return sizeKB.toFixed(1);
                }
                
                console.log('⚠️ Muito grande, tentando menor...');
                // Deletar arquivo grande antes da próxima tentativa
                try { fs.unlinkSync(outputPath); } catch (e) {}
            }
            
        } catch (error) {
            console.log(`❌ Qualidade ${quality} falhou: ${error.message}`);
            // Limpar arquivo de erro
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
        }
    }
    
    throw new Error('Processamento falhou em todas as qualidades');
}

async function processVideoSafe(inputPath, outputPath, quality) {
    return new Promise((resolve) => {
        try {
            const args = [
                '-hide_banner',
                '-loglevel', 'error',
                '-y',
                '-i', inputPath,
                '-vf', `scale=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:force_original_aspect_ratio=decrease,pad=${STICKER_CONFIG.STANDARD_SIZE}:${STICKER_CONFIG.STANDARD_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000@0`,
                '-c:v', 'libwebp',
                '-quality', quality.toString(),
                '-compression_level', '4',
                '-method', '6',
                '-loop', '0',
                '-an', '-sn', '-dn',
                '-t', STICKER_CONFIG.MAX_DURATION.toString(),
                outputPath
            ];
            
            console.log(`🎬 Executando FFmpeg Q${quality}...`);
            
            const process = spawn('ffmpeg', args, {
                stdio: ['ignore', 'ignore', 'pipe']
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ FFmpeg Q${quality} sucesso`);
                    resolve(true);
                } else {
                    console.log(`❌ FFmpeg Q${quality} falhou: código ${code}`);
                    resolve(false);
                }
            });
            
            process.on('error', (error) => {
                console.log(`❌ Erro FFmpeg Q${quality}: ${error.message}`);
                resolve(false);
            });
            
            // Timeout de segurança
            setTimeout(() => {
                try {
                    process.kill('SIGTERM');
                    setTimeout(() => {
                        try { process.kill('SIGKILL'); } catch (e) {}
                    }, 2000);
                } catch (e) {}
                console.log(`⏱️ Timeout FFmpeg Q${quality}`);
                resolve(false);
            }, 30000);
            
        } catch (error) {
            console.log(`❌ Erro ao iniciar FFmpeg Q${quality}: ${error.message}`);
            resolve(false);
        }
    });
}

async function processImageSafe(inputPath, outputPath, quality) {
    try {
        console.log(`🖼️ Processando imagem Q${quality}...`);
        
        const inputBuffer = fs.readFileSync(inputPath);
        
        const outputBuffer = await sharp(inputBuffer)
            .resize(STICKER_CONFIG.STANDARD_SIZE, STICKER_CONFIG.STANDARD_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
                kernel: sharp.kernel.lanczos2
            })
            .webp({
                quality: quality,
                effort: 6,
                alphaQuality: quality >= 80 ? 100 : 90
            })
            .toBuffer();
        
        fs.writeFileSync(outputPath, outputBuffer);
        console.log(`✅ Imagem Q${quality} processada`);
        return true;
        
    } catch (error) {
        console.log(`❌ Erro Sharp Q${quality}: ${error.message}`);
        return false;
    }
}

// ========================================
// ENVIO ULTRA INVESTIGATIVO E SEGURO
// ========================================
async function ultraSafeSendSticker(Yaka, m, stickerBuffer) {
    console.log('🔍 ========== INVESTIGAÇÃO DE ENVIO ========== 🔍');
    
    // Debug completo do chat
    const originalChat = debugChatInfo(m);
    const sanitizedChat = sanitizeChatId(originalChat);
    
    console.log('🎯 Chat para envio:', sanitizedChat);
    
    if (!sanitizedChat) {
        throw new Error('Não foi possível determinar o chat de destino');
    }
    
    // Estratégias com diferentes formatos de chat
    const sendStrategies = [
        {
            name: 'Chat original',
            execute: async () => {
                return await Yaka.sendMessage(originalChat, { 
                    sticker: stickerBuffer 
                }, { quoted: m });
            }
        },
        {
            name: 'Chat sanitizado com quoted',
            execute: async () => {
                return await Yaka.sendMessage(sanitizedChat, { 
                    sticker: stickerBuffer 
                }, { quoted: m });
            }
        },
        {
            name: 'Chat sanitizado sem quoted',
            execute: async () => {
                return await Yaka.sendMessage(sanitizedChat, { 
                    sticker: stickerBuffer 
                });
            }
        },
        {
            name: 'RemoteJid direto',
            execute: async () => {
                if (m.key?.remoteJid) {
                    return await Yaka.sendMessage(m.key.remoteJid, { 
                        sticker: stickerBuffer 
                    });
                }
                throw new Error('RemoteJid não disponível');
            }
        },
        {
            name: 'From direto',
            execute: async () => {
                if (m.from) {
                    return await Yaka.sendMessage(m.from, { 
                        sticker: stickerBuffer 
                    });
                }
                throw new Error('From não disponível');
            }
        },
        {
            name: 'Método reply direto',
            execute: async () => {
                if (m.reply && typeof m.reply === 'function') {
                    // Criar mensagem de sticker para reply
                    return await m.reply({ sticker: stickerBuffer });
                }
                throw new Error('Reply não disponível');
            }
        },
        {
            name: 'Usando sendMessage básico',
            execute: async () => {
                // Tentar com o mínimo de parâmetros
                return await Yaka.sendMessage(m.chat || m.key?.remoteJid || m.from, { 
                    sticker: stickerBuffer 
                }, {});
            }
        }
    ];
    
    for (let i = 0; i < sendStrategies.length; i++) {
        const strategy = sendStrategies[i];
        
        try {
            console.log(`📤 Tentativa ${i + 1}/${sendStrategies.length}: ${strategy.name}`);
            
            const result = await Promise.race([
                strategy.execute(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout no envio')), 8000)
                )
            ]);
            
            if (result) {
                console.log(`✅ SUCESSO! Sticker enviado via: ${strategy.name}`);
                return true;
            }
            
        } catch (error) {
            console.log(`❌ ${strategy.name} falhou: ${error.message}`);
            
            // Log específico para erro jidDecode
            if (error.message.includes('jidDecode')) {
                console.log(`   🔍 Erro jidDecode em: ${strategy.name}`);
                console.log(`   📱 Chat usado: ${originalChat || 'undefined'}`);
            }
        }
    }
    
    console.log('🔍 ========== FIM INVESTIGAÇÃO ========== 🔍');
    throw new Error('Todas as estratégias de envio falharam - problema no jidDecode do Baileys');
}

// ========================================
// COMANDO ST COM INVESTIGAÇÃO COMPLETA
// ========================================
module.exports = {
    name: "st",
    alias: ["sticker", "stick"],
    desc: "Criar sticker com investigação completa de envio",
    category: "Converter",
    usage: ".st [responda mídia]",
    react: "🔥",
    
    start: async (Yaka, m, { prefix, quoted }) => {
        console.log('\n🔥 ========== STICKER COM INVESTIGAÇÃO ========== 🔥');
        
        const tempFiles = [];
        let progressMsg = null;
        
        try {
            if (!quoted && !m.message?.imageMessage && !m.message?.videoMessage) {
                return m.reply(
                    `🔥 **CRIAR STICKER (.ST)**\n\n` +
                    `🚀 **Como usar:**\n` +
                    `• Responda uma imagem ou vídeo com ${prefix}st\n\n` +
                    `✅ **Recursos:**\n` +
                    `• Qualidade 88-65 (ALTA)\n` +
                    `• Sistema de investigação\n` +
                    `• 7 métodos de envio\n` +
                    `• Debug completo\n\n` +
                    `🔍 **MODO INVESTIGAÇÃO ATIVO!**`
                );
            }
            
            // Debug inicial do contexto
            console.log('🔍 CONTEXTO INICIAL:');
            console.log('   Yaka disponível:', !!Yaka);
            console.log('   sendMessage disponível:', !!Yaka?.sendMessage);
            console.log('   m disponível:', !!m);
            console.log('   quoted disponível:', !!quoted);
            
            // Download
            const buffer = await downloadMedia(quoted || m, m);
            const fileInfo = await fileType.fromBuffer(buffer);
            const isVideo = fileInfo?.mime?.startsWith('video/') || fileInfo?.ext === 'gif';
            
            // Verificar tamanho
            if (buffer.length > 20 * 1024 * 1024) {
                return m.reply('❌ **Arquivo muito grande!**\n\nTamanho máximo: 20MB');
            }
            
            // Progresso (SEM tentar deletar por enquanto)
            const sizeKB = (buffer.length / 1024).toFixed(1);
            console.log(`📊 Arquivo: ${sizeKB}KB, Tipo: ${isVideo ? 'vídeo' : 'imagem'}`);
            
            // Arquivos temporários
            const uniqueId = Date.now();
            const inputPath = path.join(STICKER_CONFIG.TEMP_DIR, `debug_input_${uniqueId}.${fileInfo?.ext || 'tmp'}`);
            const outputPath = path.join(STICKER_CONFIG.TEMP_DIR, `debug_sticker_${uniqueId}.webp`);
            tempFiles.push(inputPath, outputPath);
            
            // Salvar entrada
            fs.writeFileSync(inputPath, buffer);
            console.log(`💾 Arquivo salvo: ${inputPath}`);
            
            // Processar
            const startTime = Date.now();
            const resultSize = await processSticker(inputPath, outputPath, isVideo);
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
            
            // Verificar saída
            if (!fs.existsSync(outputPath)) {
                throw new Error('Arquivo de saída não foi criado');
            }
            
            const stickerBuffer = fs.readFileSync(outputPath);
            if (stickerBuffer.length === 0) {
                throw new Error('Arquivo de saída está vazio');
            }
            
            console.log(`📤 Sticker processado: ${resultSize}KB em ${processingTime}s`);
            console.log(`📱 Iniciando investigação de envio...`);
            
            // Envio com investigação completa
            await ultraSafeSendSticker(Yaka, m, stickerBuffer);
            
            console.log(`✅ STICKER ENVIADO COM SUCESSO!`);
            
        } catch (error) {
            console.error('❌ ERRO GERAL:', error.message);
            console.error('Stack completo:', error.stack);
            
            // Tentar enviar erro de forma segura
            try {
                await m.reply(`❌ **Erro detalhado**\n\n🔧 ${error.message}`);
            } catch (replyError) {
                console.log('❌ Não foi possível enviar mensagem de erro:', replyError.message);
            }
            
        } finally {
            // Limpeza
            console.log('🧹 Limpeza final...');
            for (const filePath of tempFiles) {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Removido: ${path.basename(filePath)}`);
                    }
                } catch (cleanError) {
                    console.log(`⚠️ Erro limpeza: ${cleanError.message}`);
                }
            }
        }
    }
};

// ========================================
// INICIALIZAÇÃO
// ========================================
console.log('\n🔥 ========== STICKER COM INVESTIGAÇÃO CARREGADO ========== 🔥');
console.log('🔍 Modo investigação ativo');
console.log('📤 7 estratégias de envio diferentes');
console.log('🎨 Processamento mantido (funcional)');
console.log('🧹 Debug completo de jidDecode');
console.log('🚀 Comando: .st [responder mídia]');
console.log('==========================================\n');
