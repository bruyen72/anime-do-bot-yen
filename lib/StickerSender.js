const fs = require('fs').promises;
const path = require('path');
const { tmpdir } = require('os');

class StickerSender {
    constructor() {
        this.tempDir = path.join(tmpdir(), 'yaka_stickers');
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.log('[StickerSender] Erro ao criar diretório temporário:', error.message);
        }
    }

    // Método principal para enviar sticker com fallbacks robustos
    async sendSticker(sock, chatId, stickerBuffer, originalMsg, options = {}) {
        const sendMethods = [
            // Método 1: Sticker direto com buffer
            () => this.sendDirectSticker(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 2: Salvar temporariamente e enviar como arquivo
            () => this.sendAsTemporaryFile(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 3: Comprimir mais e tentar novamente
            () => this.sendCompressed(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 4: Usar wa-sticker-formatter se disponível
            () => this.sendWithStickerFormatter(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 5: Enviar como imagem com indicação de sticker
            () => this.sendAsImage(sock, chatId, stickerBuffer, originalMsg, options),
            
            // Método 6: Criar documento com extensão .webp
            () => this.sendAsDocument(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 7: Criar arquivo PNG como imagem
            () => this.sendAsPNG(sock, chatId, stickerBuffer, originalMsg, options),
            
            // Método 8: Base64 inline (último recurso)
            () => this.sendAsBase64(sock, chatId, stickerBuffer, originalMsg)
        ];

        let lastError = null;
        
        for (let i = 0; i < sendMethods.length; i++) {
            try {
                console.log(`[StickerSender] Tentativa ${i + 1}/${sendMethods.length}...`);
                const result = await sendMethods[i]();
                console.log(`[StickerSender] ✅ Enviado com método ${i + 1}: ${result}`);
                return { success: true, method: i + 1, result };
            } catch (error) {
                lastError = error;
                console.log(`[StickerSender] ❌ Método ${i + 1} falhou: ${error.message}`);
                
                // Aguardar um pouco antes da próxima tentativa
                if (i < sendMethods.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        throw new Error(`Todas as tentativas falharam. Último erro: ${lastError?.message}`);
    }

    // Método 1: Sticker direto com detecção de Baileys bug
    async sendDirectSticker(sock, chatId, stickerBuffer, originalMsg) {
        try {
            // Verificar tamanho do buffer - Baileys 6.7.18+ tem problemas com arquivos grandes
            if (stickerBuffer.length > 100000) { // >100KB pode causar problemas
                console.log(`[StickerSender] Arquivo grande (${Math.round(stickerBuffer.length/1024)}KB), tentando com timeout estendido...`);
                
                // Timeout mais longo para arquivos grandes
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
                
                await sock.sendMessage(chatId, {
                    sticker: stickerBuffer,
                    mimetype: 'image/webp'
                }, { 
                    quoted: originalMsg,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
            } else {
                // Arquivo pequeno, envio normal
                await sock.sendMessage(chatId, {
                    sticker: stickerBuffer,
                    mimetype: 'image/webp'
                }, { quoted: originalMsg });
            }
            return 'direct-sticker';
        } catch (error) {
            // Se for erro específico do Baileys, adicionar mais informação
            if (error.message.includes('Media upload failed on all hosts')) {
                throw new Error(`Baileys 6.7.18+ bug detected: ${error.message}`);
            }
            throw error;
        }
    }

    // Método 2: Usar wa-sticker-formatter
    async sendWithStickerFormatter(sock, chatId, stickerBuffer, originalMsg) {
        try {
            const { Sticker } = require('wa-sticker-formatter');
            const sticker = new Sticker(stickerBuffer, {
                pack: 'YakaBot',
                author: 'Processado',
                type: 'default',
                categories: ['🤖']
            });
            
            const stickerWebp = await sticker.toBuffer();
            await sock.sendMessage(chatId, {
                sticker: stickerWebp
            }, { quoted: originalMsg });
            return 'wa-sticker-formatter';
        } catch (error) {
            // Se wa-sticker-formatter não estiver disponível, pular
            throw new Error('wa-sticker-formatter não disponível');
        }
    }

    // Método 3: Arquivo temporário
    async sendAsTemporaryFile(sock, chatId, stickerBuffer, originalMsg) {
        const tempPath = path.join(this.tempDir, `sticker_${Date.now()}.webp`);
        
        try {
            await fs.writeFile(tempPath, stickerBuffer);
            await sock.sendMessage(chatId, {
                sticker: { url: tempPath },
                mimetype: 'image/webp'
            }, { quoted: originalMsg });
            
            // Limpeza após 30 segundos
            setTimeout(async () => {
                try {
                    await fs.unlink(tempPath);
                } catch (e) {
                    // Ignorar erro de limpeza
                }
            }, 30000);
            
            return 'temporary-file';
        } catch (error) {
            // Tentar limpar arquivo em caso de erro
            try {
                await fs.unlink(tempPath);
            } catch (e) {
                // Ignorar
            }
            throw error;
        }
    }

    // Método 4: Comprimir agressivamente para Baileys bug
    async sendCompressed(sock, chatId, stickerBuffer, originalMsg) {
        const sharp = require('sharp');
        
        // Estratégias de compressão progressiva para contornar bug do Baileys 6.7.18+
        const compressionLevels = [
            { quality: 60, size: 480 }, // Primeira tentativa
            { quality: 40, size: 400 }, // Segunda tentativa  
            { quality: 30, size: 350 }, // Terceira tentativa
            { quality: 20, size: 300 }  // Última tentativa (muito baixa qualidade)
        ];
        
        for (let i = 0; i < compressionLevels.length; i++) {
            try {
                const { quality, size } = compressionLevels[i];
                console.log(`[StickerSender] Tentativa de compressão ${i + 1}: ${size}px, qualidade ${quality}`);
                
                const compressedBuffer = await sharp(stickerBuffer)
                    .resize(size, size, { 
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .webp({ 
                        quality: quality,
                        effort: 6,
                        nearLossless: false,
                        smartSubsample: true
                    })
                    .toBuffer();
                
                console.log(`[StickerSender] Buffer comprimido: ${Math.round(compressedBuffer.length/1024)}KB`);
                
                // Se muito grande ainda, tentar próximo nível
                if (compressedBuffer.length > 80000 && i < compressionLevels.length - 1) {
                    console.log(`[StickerSender] Ainda muito grande, tentando compressão ${i + 2}...`);
                    continue;
                }
                
                await sock.sendMessage(chatId, {
                    sticker: compressedBuffer,
                    mimetype: 'image/webp'
                }, { quoted: originalMsg });
                
                return `compressed-sticker-level-${i + 1}`;
            } catch (error) {
                if (i === compressionLevels.length - 1) {
                    throw error; // Se última tentativa falhou, propagar erro
                }
                console.log(`[StickerSender] Compressão ${i + 1} falhou: ${error.message}`);
            }
        }
        
        throw new Error('Todas as tentativas de compressão falharam');
    }

    // Método 5: Como imagem
    async sendAsImage(sock, chatId, stickerBuffer, originalMsg, options) {
        const mediaType = options.isVideo ? '🎬 Frame do vídeo' : '🖼️ Sticker convertido';
        
        await sock.sendMessage(chatId, {
            image: stickerBuffer,
            caption: `${mediaType}\n\n⚠️ Enviado como imagem devido à limitação de upload`,
            mimetype: 'image/webp'
        }, { quoted: originalMsg });
        
        return 'as-image';
    }

    // Método 6: Como documento
    async sendAsDocument(sock, chatId, stickerBuffer, originalMsg) {
        const fileName = `sticker_${Date.now()}.webp`;
        
        await sock.sendMessage(chatId, {
            document: stickerBuffer,
            fileName: fileName,
            mimetype: 'image/webp',
            caption: '📎 Sticker enviado como documento\n💡 Baixe e adicione às suas figurinhas'
        }, { quoted: originalMsg });
        
        return 'as-document';
    }

    // Método 7: Como PNG
    async sendAsPNG(sock, chatId, stickerBuffer, originalMsg, options) {
        const sharp = require('sharp');
        
        // Converter WebP para PNG
        const pngBuffer = await sharp(stickerBuffer)
            .resize(512, 512, { 
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png({ quality: 90 })
            .toBuffer();
        
        const mediaType = options?.isVideo ? '🎬 Frame do vídeo (PNG)' : '🖼️ Sticker convertido (PNG)';
        
        await sock.sendMessage(chatId, {
            image: pngBuffer,
            caption: `${mediaType}\n💡 Convertido de WebP para PNG`,
            mimetype: 'image/png'
        }, { quoted: originalMsg });
        
        return 'as-png';
    }

    // Método 8: FORÇAR sticker visual (NUNCA texto!)
    async sendAsBase64(sock, chatId, stickerBuffer, originalMsg) {
        console.log('🔥 [StickerSender] ATIVANDO MODO FORÇA - NUNCA TEXTO!');
        
        // Usar ForceStickerSender que SEMPRE produz algo visual
        const forceStickerSender = require('./ForceStickerSender');
        const result = await forceStickerSender.forceSendSticker(sock, chatId, stickerBuffer, originalMsg);
        
        return `force-${result.result}`;
    }

    // Método utilitário para limpeza periódica
    async cleanup() {
        try {
            const files = await fs.readdir(this.tempDir);
            let cleaned = 0;
            
            for (const file of files) {
                try {
                    const filePath = path.join(this.tempDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Remove arquivos mais antigos que 10 minutos
                    if (Date.now() - stats.mtime.getTime() > 10 * 60 * 1000) {
                        await fs.unlink(filePath);
                        cleaned++;
                    }
                } catch (error) {
                    // Ignorar erros individuais
                }
            }
            
            if (cleaned > 0) {
                console.log(`[StickerSender] ${cleaned} arquivos temporários removidos`);
            }
        } catch (error) {
            console.log('[StickerSender] Erro na limpeza:', error.message);
        }
    }
}

// Instância global
const stickerSender = new StickerSender();

// Limpeza automática a cada 10 minutos
setInterval(() => {
    stickerSender.cleanup();
}, 10 * 60 * 1000);

module.exports = stickerSender;