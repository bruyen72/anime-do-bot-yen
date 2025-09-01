const sharp = require('sharp');

class VideoProcessor {
    constructor() {
        this.name = 'VideoProcessor';
    }

    // Extrair informações básicas do vídeo sem FFmpeg
    analyzeVideoBuffer(buffer) {
        try {
            const header = buffer.slice(0, 64);
            const analysis = {
                size: buffer.length,
                isValid: false,
                format: 'unknown',
                hasVideoData: false
            };
            
            // Detectar formatos de vídeo comuns
            if (header.includes(Buffer.from('ftyp'))) {
                analysis.format = 'mp4';
                analysis.isValid = true;
                analysis.hasVideoData = true;
            } else if (header.includes(Buffer.from([0x1A, 0x45, 0xDF, 0xA3]))) {
                analysis.format = 'webm';
                analysis.isValid = true;
                analysis.hasVideoData = true;
            } else if (header.includes(Buffer.from('RIFF'))) {
                analysis.format = 'avi';
                analysis.isValid = true;
                analysis.hasVideoData = true;
            }
            
            return analysis;
        } catch (error) {
            return {
                size: buffer.length,
                isValid: false,
                format: 'unknown',
                hasVideoData: false,
                error: error.message
            };
        }
    }

    // Criar sticker representativo do vídeo usando SVG
    async createVideoSticker(videoBuffer, options = {}) {
        const analysis = this.analyzeVideoBuffer(videoBuffer);
        const {
            title = 'Vídeo Processado',
            subtitle = 'Frame não disponível',
            color = '#667eea'
        } = options;
        
        const svgContent = `
            <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="videoBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow">
                        <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="black" flood-opacity="0.3"/>
                    </filter>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                <!-- Background -->
                <rect width="100%" height="100%" fill="url(#videoBg)"/>
                
                <!-- Video icon circle -->
                <circle cx="256" cy="180" r="80" fill="rgba(255,255,255,0.95)" filter="url(#shadow)"/>
                
                <!-- Play button triangle -->
                <polygon points="220,150 220,210 300,180" fill="#2c3e50" filter="url(#glow)"/>
                
                <!-- Video format badge -->
                <rect x="180" y="120" width="152" height="30" rx="15" fill="rgba(0,0,0,0.7)"/>
                <text x="256" y="140" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">${analysis.format.toUpperCase()}</text>
                
                <!-- Title -->
                <text x="256" y="290" font-family="Arial Black" font-size="22" font-weight="bold" fill="white" text-anchor="middle" filter="url(#shadow)">${title}</text>
                <text x="256" y="315" font-family="Arial" font-size="14" fill="rgba(255,255,255,0.9)" text-anchor="middle">${subtitle}</text>
                
                <!-- Video info -->
                <text x="256" y="350" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.8)" text-anchor="middle">📦 ${Math.round(analysis.size/1024)}KB • 🎯 ${analysis.format}</text>
                
                <!-- Status -->
                ${analysis.isValid ? 
                    '<text x="256" y="370" font-family="Arial" font-size="11" fill="rgba(200,255,200,0.9)" text-anchor="middle">✅ Formato válido</text>' :
                    '<text x="256" y="370" font-family="Arial" font-size="11" fill="rgba(255,200,200,0.9)" text-anchor="middle">⚠️ Formato não reconhecido</text>'
                }
                
                <!-- Footer -->
                <text x="256" y="400" font-family="Arial" font-size="10" fill="rgba(255,255,255,0.6)" text-anchor="middle">🤖 Processado sem FFmpeg</text>
                <text x="256" y="420" font-family="Arial" font-size="9" fill="rgba(255,255,255,0.5)" text-anchor="middle">YakaBot • Método alternativo</text>
                
                <!-- Decorative elements -->
                <circle cx="100" cy="100" r="3" fill="rgba(255,255,255,0.3)"/>
                <circle cx="400" cy="100" r="2" fill="rgba(255,255,255,0.2)"/>
                <circle cx="100" cy="400" r="2" fill="rgba(255,255,255,0.2)"/>
                <circle cx="400" cy="400" r="3" fill="rgba(255,255,255,0.3)"/>
            </svg>`;
        
        return await sharp(Buffer.from(svgContent))
            .resize(512, 512)
            .webp({ quality: 85, effort: 4 })
            .toBuffer();
    }

    // Tentar extrair thumbnail usando apenas a estrutura do arquivo
    async extractThumbnailFromVideo(videoBuffer) {
        try {
            // Para MP4, tentar encontrar dados de thumbnail embutidos
            if (videoBuffer.includes(Buffer.from('ftyp'))) {
                // Procurar por markers JPEG dentro do arquivo
                const jpegStart = Buffer.from([0xFF, 0xD8, 0xFF]);
                const jpegEnd = Buffer.from([0xFF, 0xD9]);
                
                let startIdx = videoBuffer.indexOf(jpegStart);
                if (startIdx !== -1) {
                    let endIdx = videoBuffer.indexOf(jpegEnd, startIdx);
                    if (endIdx !== -1) {
                        endIdx += 2; // Incluir o marker de fim
                        const thumbnailBuffer = videoBuffer.slice(startIdx, endIdx);
                        
                        if (thumbnailBuffer.length > 1000) { // Thumbnail válido deve ter tamanho razoável
                            console.log('🖼️ Thumbnail JPEG encontrado no vídeo MP4');
                            
                            // Converter para sticker usando Sharp
                            return await sharp(thumbnailBuffer)
                                .resize(512, 512, {
                                    fit: 'contain',
                                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                                })
                                .webp({ quality: 80 })
                                .toBuffer();
                        }
                    }
                }
            }
            
            throw new Error('Nenhum thumbnail encontrado');
        } catch (error) {
            console.log('⚠️ Falha ao extrair thumbnail:', error.message);
            return null;
        }
    }

    // Método principal para processar vídeo sem FFmpeg
    async processVideo(videoBuffer, options = {}) {
        console.log('📹 Processando vídeo sem FFmpeg...');
        
        const analysis = this.analyzeVideoBuffer(videoBuffer);
        console.log('🔍 Análise do vídeo:', analysis);
        
        // Tentar extrair thumbnail primeiro
        const thumbnail = await this.extractThumbnailFromVideo(videoBuffer);
        if (thumbnail) {
            console.log('✅ Thumbnail extraído do vídeo');
            return thumbnail;
        }
        
        // Se não conseguiu extrair thumbnail, criar sticker representativo
        console.log('🎨 Criando sticker representativo...');
        const representativeSticker = await this.createVideoSticker(videoBuffer, {
            title: `🎬 VÍDEO ${analysis.format.toUpperCase()}`,
            subtitle: 'Thumbnail não disponível',
            color: analysis.isValid ? '#667eea' : '#e74c3c'
        });
        
        return representativeSticker;
    }

    // Verificar se um buffer é um vídeo válido
    isValidVideo(buffer) {
        if (!buffer || buffer.length < 100) return false;
        
        const analysis = this.analyzeVideoBuffer(buffer);
        return analysis.isValid && analysis.hasVideoData;
    }

    // Obter informações sobre capacidades
    getCapabilities() {
        return {
            name: 'VideoProcessor',
            canExtractFrames: false,
            canExtractThumbnails: true,
            canCreateRepresentativeStickers: true,
            dependsOnFFmpeg: false,
            supportedFormats: ['mp4', 'webm', 'avi'],
            method: 'Binary Analysis + SVG Generation'
        };
    }
}

module.exports = new VideoProcessor();