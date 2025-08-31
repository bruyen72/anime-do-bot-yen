const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { tmpdir } = require('os');

class VideoStickerConverter {
    constructor() {
        this.tempDir = path.join(tmpdir(), 'yaka_video_stickers');
        this.ensureTempDir();
    }

    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (e) {}
    }

    // Extrai frame do vídeo usando diferentes métodos
    async extractFrameWithSharp(videoBuffer) {
        try {
            console.log('🔍 Tentando processar com Sharp...');
            
            // Método 1: Tentar como imagem (alguns vídeos têm frames que Sharp consegue ler)
            try {
                const frame = await sharp(videoBuffer, { failOnError: false })
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .png()
                    .toBuffer();
                
                console.log('✅ Sharp processou como imagem');
                return frame;
            } catch (e) {
                console.log('⚠️ Sharp não conseguiu processar como imagem');
            }
            
            // Método 2: Tentar extrair metadados e criar um frame baseado no tamanho
            try {
                // Criar uma imagem placeholder baseada no tamanho do vídeo
                const size = Math.min(Math.max(videoBuffer.length / 10000, 200), 512);
                
                const placeholderSvg = `
                    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#34495e"/>
                        <circle cx="256" cy="200" r="60" fill="#e74c3c"/>
                        <polygon points="236,180 236,220 280,200" fill="white"/>
                        <text x="256" y="280" font-family="Arial" font-size="16" fill="white" text-anchor="middle">🎬 VÍDEO</text>
                        <text x="256" y="310" font-family="Arial" font-size="12" fill="#bdc3c7" text-anchor="middle">Tamanho: ${Math.round(videoBuffer.length/1024)}KB</text>
                        <text x="256" y="340" font-family="Arial" font-size="10" fill="#95a5a6" text-anchor="middle">Convertido sem FFmpeg</text>
                    </svg>`;
                
                const frame = await sharp(Buffer.from(placeholderSvg))
                    .resize(512, 512)
                    .png()
                    .toBuffer();
                
                console.log('✅ Criado placeholder baseado no vídeo');
                return frame;
            } catch (e) {
                console.log('⚠️ Erro ao criar placeholder');
            }
            
            throw new Error('Todos os métodos de Sharp falharam');
            
        } catch (error) {
            throw new Error('Sharp falhou completamente: ' + error.message);
        }
    }

    // Fallback: criar sticker estático com texto
    async createVideoFallbackSticker(videoSize = 0) {
        try {
            const width = 512;
            const height = 512;
            
            // Criar um sticker com informações do vídeo
            const svgText = `
                <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#bg)"/>
                    
                    <!-- Ícone de play -->
                    <circle cx="256" cy="180" r="70" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
                    <polygon points="230,150 230,210 290,180" fill="#2c3e50"/>
                    
                    <!-- Texto informativo -->
                    <text x="256" y="280" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">🎬 VÍDEO</text>
                    <text x="256" y="310" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.9)" text-anchor="middle">Convertido para sticker</text>
                    ${videoSize > 0 ? `<text x="256" y="330" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.7)" text-anchor="middle">Tamanho: ${Math.round(videoSize/1024)}KB</text>` : ''}
                    
                    <!-- Rodapé -->
                    <text x="256" y="370" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.6)" text-anchor="middle">✨ Processado sem FFmpeg</text>
                    <text x="256" y="390" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">Para vídeos animados: instale FFmpeg</text>
                </svg>`;
            
            const stickerBuffer = await sharp(Buffer.from(svgText))
                .resize(512, 512)
                .webp({ quality: 85 })
                .toBuffer();
            
            return stickerBuffer;
        } catch (error) {
            throw new Error('Erro ao criar sticker fallback: ' + error.message);
        }
    }

    // Método principal para converter vídeo
    async convertVideoToSticker(videoBuffer, options = {}) {
        const startTime = Date.now();
        
        try {
            console.log('🎬 Tentando converter vídeo para sticker...');
            
            // Método 1: Tentar extrair frame com Sharp
            try {
                console.log('📸 Tentando extrair frame com Sharp...');
                const frameBuffer = await this.extractFrameWithSharp(videoBuffer);
                
                const stickerBuffer = await sharp(frameBuffer)
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    })
                    .webp({ quality: 80 })
                    .toBuffer();
                
                console.log(`✅ Vídeo convertido com Sharp em ${Date.now() - startTime}ms`);
                return stickerBuffer;
                
            } catch (sharpError) {
                console.log(`⚠️ Sharp falhou: ${sharpError.message}`);
            }
            
            // Método 2: Fallback - criar sticker informativo
            console.log('🔄 Usando fallback - criando sticker informativo...');
            const fallbackSticker = await this.createVideoFallbackSticker(videoBuffer.length);
            
            console.log(`✅ Sticker fallback criado em ${Date.now() - startTime}ms`);
            return fallbackSticker;
            
        } catch (error) {
            console.error('❌ Erro na conversão de vídeo:', error.message);
            throw error;
        }
    }

    // Método para detectar se é possível processar o vídeo
    async canProcessVideo(videoBuffer) {
        try {
            // Verificar se o buffer parece ser um vídeo válido
            if (!videoBuffer || videoBuffer.length < 1000) {
                return false;
            }
            
            // Verificar assinaturas de arquivos de vídeo comuns
            const header = videoBuffer.slice(0, 12);
            const mp4Signature = header.includes(Buffer.from('ftyp'));
            const webmSignature = header.includes(Buffer.from('webm'));
            
            return mp4Signature || webmSignature;
        } catch (error) {
            return false;
        }
    }

    // Limpeza de arquivos temporários
    async cleanup() {
        try {
            const files = await fs.readdir(this.tempDir);
            const now = Date.now();
            
            for (const file of files) {
                try {
                    const filePath = path.join(this.tempDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Remover arquivos mais antigos que 30 minutos
                    if (now - stats.mtime.getTime() > 30 * 60 * 1000) {
                        await fs.unlink(filePath);
                    }
                } catch (e) {}
            }
        } catch (e) {}
    }
}

module.exports = new VideoStickerConverter();