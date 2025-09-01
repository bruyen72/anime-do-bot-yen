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
            
            // Método 2: Usar wa-sticker-formatter se disponível
            () => this.sendWithStickerFormatter(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 3: Salvar temporariamente e enviar como arquivo
            () => this.sendAsTemporaryFile(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 4: Comprimir mais e tentar novamente
            () => this.sendCompressed(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 5: Enviar como imagem com indicação de sticker
            () => this.sendAsImage(sock, chatId, stickerBuffer, originalMsg, options),
            
            // Método 6: Criar documento com extensão .webp
            () => this.sendAsDocument(sock, chatId, stickerBuffer, originalMsg),
            
            // Método 7: Base64 inline (último recurso)
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

    // Método 1: Sticker direto
    async sendDirectSticker(sock, chatId, stickerBuffer, originalMsg) {
        await sock.sendMessage(chatId, {
            sticker: stickerBuffer,
            mimetype: 'image/webp'
        }, { quoted: originalMsg });
        return 'direct-sticker';
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

    // Método 4: Comprimir mais
    async sendCompressed(sock, chatId, stickerBuffer, originalMsg) {
        const sharp = require('sharp');
        
        // Comprimir mais agressivamente
        const compressedBuffer = await sharp(stickerBuffer)
            .resize(512, 512, { 
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ 
                quality: 50,  // Qualidade menor
                effort: 6     // Mais esforço de compressão
            })
            .toBuffer();
        
        await sock.sendMessage(chatId, {
            sticker: compressedBuffer,
            mimetype: 'image/webp'
        }, { quoted: originalMsg });
        
        return 'compressed-sticker';
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

    // Método 7: Base64 inline (último recurso)
    async sendAsBase64(sock, chatId, stickerBuffer, originalMsg) {
        const base64 = stickerBuffer.toString('base64');
        const preview = base64.substring(0, 100) + '...';
        
        await sock.sendMessage(chatId, {
            text: `🔧 *Sticker em Base64*\n\n` +
                  `📊 Tamanho: ${Math.round(stickerBuffer.length / 1024)}KB\n` +
                  `🔗 Preview: ${preview}\n\n` +
                  `💡 Use um conversor online para visualizar`
        }, { quoted: originalMsg });
        
        return 'base64-text';
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