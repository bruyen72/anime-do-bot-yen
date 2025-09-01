const fs = require('fs').promises;
const path = require('path');
const { tmpdir } = require('os');
const sharp = require('sharp');

class ForceStickerSender {
    constructor() {
        this.tempDir = path.join(tmpdir(), 'force_stickers');
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.log('[ForceStickerSender] Erro ao criar diretório:', error.message);
        }
    }

    // MÉTODO 1: Sticker ultra-comprimido (FORÇA aparecer sticker)
    async sendUltraCompressed(sock, chatId, stickerBuffer, originalMsg) {
        console.log('[ForceStickerSender] Tentando sticker ultra-comprimido...');
        
        // Comprimir ao máximo para contornar limitações
        const ultraCompressed = await sharp(stickerBuffer)
            .resize(200, 200, { fit: 'contain' }) // Muito pequeno
            .webp({ 
                quality: 10,  // Qualidade mínima
                effort: 1,    // Esforço mínimo para velocidade
                nearLossless: false,
                smartSubsample: false,
                preset: 'picture' // Preset otimizado
            })
            .toBuffer();
        
        console.log(`[ForceStickerSender] Ultra-comprimido: ${ultraCompressed.length} bytes`);
        
        if (ultraCompressed.length < 10000) { // <10KB
            await sock.sendMessage(chatId, {
                sticker: ultraCompressed,
                mimetype: 'image/webp'
            }, { quoted: originalMsg });
            return 'ultra-compressed';
        }
        
        throw new Error('Ainda muito grande para ultra-compressão');
    }

    // MÉTODO 2: Sticker via buffer direto (força upload)
    async sendBufferDirect(sock, chatId, stickerBuffer, originalMsg) {
        console.log('[ForceStickerSender] Tentando buffer direto...');
        
        // Tentar com diferentes configurações
        const configs = [
            { mimetype: 'image/webp' },
            { mimetype: 'image/webp', ptt: false },
            { mimetype: 'application/octet-stream' },
        ];
        
        for (const config of configs) {
            try {
                await sock.sendMessage(chatId, {
                    sticker: stickerBuffer,
                    ...config
                }, { quoted: originalMsg });
                return `buffer-direct-${config.mimetype}`;
            } catch (error) {
                console.log(`[ForceStickerSender] Config falhou: ${config.mimetype}`);
            }
        }
        
        throw new Error('Buffer direto falhou em todas as configurações');
    }

    // MÉTODO 3: Criar arquivo e enviar como documento WebP 
    async sendAsWebPDocument(sock, chatId, stickerBuffer, originalMsg) {
        console.log('[ForceStickerSender] Enviando como documento WebP...');
        
        const fileName = `sticker_${Date.now()}.webp`;
        
        try {
            await sock.sendMessage(chatId, {
                document: stickerBuffer,
                fileName: fileName,
                mimetype: 'image/webp',
                caption: '📎 *Sticker em WebP*\n💡 Baixe e adicione às suas figurinhas'
            }, { quoted: originalMsg });
            
            return 'webp-document';
        } catch (error) {
            throw new Error(`Documento WebP falhou: ${error.message}`);
        }
    }

    // MÉTODO 4: Converter para GIF e enviar como sticker
    async sendAsGIFSticker(sock, chatId, stickerBuffer, originalMsg) {
        console.log('[ForceStickerSender] Convertendo para GIF sticker...');
        
        try {
            // Converter WebP para GIF
            const gifBuffer = await sharp(stickerBuffer)
                .resize(256, 256, { fit: 'contain' })
                .gif({ dither: 1 }) // GIF com dither
                .toBuffer();
            
            console.log(`[ForceStickerSender] GIF criado: ${gifBuffer.length} bytes`);
            
            await sock.sendMessage(chatId, {
                sticker: gifBuffer,
                mimetype: 'image/gif'
            }, { quoted: originalMsg });
            
            return 'gif-sticker';
        } catch (error) {
            throw new Error(`GIF sticker falhou: ${error.message}`);
        }
    }

    // MÉTODO 5: Sticker como imagem com transparência
    async sendAsImageSticker(sock, chatId, stickerBuffer, originalMsg) {
        console.log('[ForceStickerSender] Enviando como imagem sticker...');
        
        try {
            // Criar imagem com borda de sticker
            const imageWithBorder = await sharp({
                create: {
                    width: 512,
                    height: 512,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            })
            .composite([{
                input: await sharp(stickerBuffer)
                    .resize(480, 480, { fit: 'contain' })
                    .toBuffer(),
                top: 16,
                left: 16
            }])
            .png({ quality: 90 })
            .toBuffer();
            
            await sock.sendMessage(chatId, {
                image: imageWithBorder,
                caption: '🎨 *Sticker Processado*',
                mimetype: 'image/png'
            }, { quoted: originalMsg });
            
            return 'image-sticker';
        } catch (error) {
            throw new Error(`Imagem sticker falhou: ${error.message}`);
        }
    }

    // MÉTODO 6: Salvar local e enviar URL (último recurso visual)
    async sendLocalFile(sock, chatId, stickerBuffer, originalMsg) {
        console.log('[ForceStickerSender] Criando arquivo local...');
        
        const fileName = `sticker_${Date.now()}.webp`;
        const filePath = path.join(this.tempDir, fileName);
        
        try {
            await fs.writeFile(filePath, stickerBuffer);
            
            // Tentar como sticker com caminho local
            await sock.sendMessage(chatId, {
                sticker: { url: filePath },
                mimetype: 'image/webp'
            }, { quoted: originalMsg });
            
            // Limpeza após 30 segundos
            setTimeout(async () => {
                try {
                    await fs.unlink(filePath);
                } catch (e) {
                    // Ignorar erro de limpeza
                }
            }, 30000);
            
            return 'local-file';
        } catch (error) {
            // Tentar limpar arquivo em caso de erro
            try {
                await fs.unlink(filePath);
            } catch (e) {
                // Ignorar
            }
            throw new Error(`Arquivo local falhou: ${error.message}`);
        }
    }

    // MÉTODO PRINCIPAL: Tenta todos os métodos, NUNCA envia texto
    async forceSendSticker(sock, chatId, stickerBuffer, originalMsg) {
        console.log('🔥 [ForceStickerSender] FORÇANDO envio de sticker visual...');
        
        const visualMethods = [
            () => this.sendUltraCompressed(sock, chatId, stickerBuffer, originalMsg),
            () => this.sendBufferDirect(sock, chatId, stickerBuffer, originalMsg),
            () => this.sendLocalFile(sock, chatId, stickerBuffer, originalMsg),
            () => this.sendAsGIFSticker(sock, chatId, stickerBuffer, originalMsg),
            () => this.sendAsImageSticker(sock, chatId, stickerBuffer, originalMsg),
            () => this.sendAsWebPDocument(sock, chatId, stickerBuffer, originalMsg)
        ];
        
        let lastError = null;
        
        for (let i = 0; i < visualMethods.length; i++) {
            try {
                console.log(`🔥 [ForceStickerSender] Método FORÇADO ${i + 1}/${visualMethods.length}...`);
                const result = await visualMethods[i]();
                console.log(`🎉 [ForceStickerSender] SUCESSO! Método: ${result}`);
                return { success: true, method: i + 1, result };
            } catch (error) {
                lastError = error;
                console.log(`🔥 [ForceStickerSender] Método ${i + 1} falhou: ${error.message}`);
                
                // Pequena pausa entre tentativas
                if (i < visualMethods.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        // Se TODOS falharam, criar um sticker de erro visual
        console.log('🚨 [ForceStickerSender] TODOS falharam, criando sticker de ERRO...');
        try {
            const errorStickerSvg = `
                <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#ff4444"/>
                    <text x="256" y="200" font-family="Arial" font-size="60" fill="white" text-anchor="middle">⚠️</text>
                    <text x="256" y="280" font-family="Arial" font-size="24" fill="white" text-anchor="middle">ERRO UPLOAD</text>
                    <text x="256" y="320" font-family="Arial" font-size="16" fill="white" text-anchor="middle">Sticker processado</text>
                    <text x="256" y="350" font-family="Arial" font-size="14" fill="white" text-anchor="middle">mas upload falhou</text>
                    <text x="256" y="400" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Baileys bug detectado</text>
                </svg>`;
            
            const errorSticker = await sharp(Buffer.from(errorStickerSvg))
                .resize(256, 256) // Muito pequeno para garantir upload
                .webp({ quality: 30 })
                .toBuffer();
            
            console.log(`🚨 Sticker de erro: ${errorSticker.length} bytes`);
            
            // Forçar envio do sticker de erro
            await sock.sendMessage(chatId, {
                sticker: errorSticker,
                mimetype: 'image/webp'
            }, { quoted: originalMsg });
            
            return { success: true, method: 'error-sticker', result: 'error-visual' };
            
        } catch (finalError) {
            throw new Error(`Falha total: ${lastError?.message} | Final: ${finalError.message}`);
        }
    }
}

module.exports = new ForceStickerSender();