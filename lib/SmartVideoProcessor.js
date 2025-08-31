const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { tmpdir } = require('os');
const sharp = require('sharp');

class SmartVideoProcessor {
    constructor() {
        this.tempDir = path.join(tmpdir(), 'yaka_smart_video');
        this.ffmpegPath = null;
        this.hasFFmpeg = false;
        this.ensureTempDir();
        this.detectFFmpeg();
    }

    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (e) {}
    }

    async detectFFmpeg() {
        try {
            // Tentar ffmpeg-static primeiro
            try {
                const ffmpegStatic = require('ffmpeg-static');
                if (ffmpegStatic && typeof ffmpegStatic === 'string') {
                    this.ffmpegPath = ffmpegStatic;
                    this.hasFFmpeg = true;
                    console.log('✅ FFmpeg-static detectado:', this.ffmpegPath);
                    return true;
                }
            } catch (e) {
                console.log('⚠️ ffmpeg-static não disponível');
            }

            // Tentar FFmpeg do sistema
            try {
                await this.runCommand('ffmpeg', ['-version']);
                this.ffmpegPath = 'ffmpeg';
                this.hasFFmpeg = true;
                console.log('✅ FFmpeg do sistema detectado');
                return true;
            } catch (e) {
                console.log('⚠️ FFmpeg do sistema não disponível');
            }

            console.log('❌ Nenhum FFmpeg disponível');
            return false;
        } catch (error) {
            console.log('❌ Erro na detecção de FFmpeg:', error.message);
            return false;
        }
    }

    async runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                stdio: options.stdio || 'pipe',
                ...options
            });

            let stdout = '';
            let stderr = '';

            if (process.stdout) {
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }

            if (process.stderr) {
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    async extractVideoFrame(videoBuffer, options = {}) {
        if (!this.hasFFmpeg) {
            throw new Error('FFmpeg não disponível - use .s para imagens');
        }

        const startTime = Date.now();
        const { 
            timePosition = '00:00:01', 
            width = 512, 
            height = 512,
            quality = 80
        } = options;

        const inputPath = path.join(this.tempDir, `input_${Date.now()}.mp4`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.png`);

        try {
            console.log(`🎬 Processando vídeo de ${Math.round(videoBuffer.length / 1024)}KB...`);

            // Escrever vídeo temporário
            await fs.writeFile(inputPath, videoBuffer);

            // Extrair frame
            const ffmpegArgs = [
                '-i', inputPath,
                '-ss', timePosition,
                '-vframes', '1',
                '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1:color=white`,
                '-q:v', Math.round((100 - quality) / 10).toString(),
                '-y',
                outputPath
            ];

            await this.runCommand(this.ffmpegPath, ffmpegArgs);
            console.log('🖼️ Frame extraído com FFmpeg');

            // Ler frame extraído
            const frameBuffer = await fs.readFile(outputPath);

            // Converter para WebP usando Sharp
            const webpBuffer = await sharp(frameBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .webp({ quality: 80 })
                .toBuffer();

            console.log(`✅ Vídeo processado em ${Date.now() - startTime}ms`);
            return webpBuffer;

        } finally {
            // Limpeza
            try {
                await fs.unlink(inputPath);
                await fs.unlink(outputPath);
            } catch (e) {}
        }
    }

    // Método sem FFmpeg - criar sticker informativo bonito
    async createVideoPlaceholder(videoBuffer, errorMsg = '') {
        try {
            const videoSize = videoBuffer.length;
            
            const svgContent = `
                <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="videoBg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                        </linearGradient>
                        <filter id="shadow">
                            <feDropShadow dx="2" dy="2" stdDeviation="3" fill-opacity="0.3"/>
                        </filter>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#videoBg)"/>
                    
                    <!-- Ícone de vídeo grande -->
                    <circle cx="256" cy="200" r="80" fill="rgba(255,255,255,0.95)" filter="url(#shadow)"/>
                    <circle cx="256" cy="200" r="70" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>
                    <polygon points="230,170 230,230 300,200" fill="#2c3e50"/>
                    
                    <!-- Título -->
                    <text x="256" y="320" font-family="Arial Black, sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle" filter="url(#shadow)">🎬 VÍDEO</text>
                    <text x="256" y="345" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.9)" text-anchor="middle">Convertido para sticker</text>
                    
                    <!-- Informações -->
                    <text x="256" y="375" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.8)" text-anchor="middle">📦 Tamanho: ${Math.round(videoSize/1024)}KB</text>
                    <text x="256" y="395" font-family="Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="middle">⚡ Processado com Smart System</text>
                    
                    <!-- Rodapé -->
                    ${errorMsg ? 
                        `<text x="256" y="420" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,200,200,0.8)" text-anchor="middle">⚠️ ${errorMsg.substring(0, 35)}...</text>` :
                        `<text x="256" y="420" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.6)" text-anchor="middle">💡 Para frames reais: instale FFmpeg</text>`
                    }
                    <text x="256" y="440" font-family="Arial, sans-serif" font-size="9" fill="rgba(255,255,255,0.5)" text-anchor="middle">YakaBot • Sticker Inteligente</text>
                </svg>`;
            
            return await sharp(Buffer.from(svgContent))
                .resize(512, 512)
                .webp({ quality: 85 })
                .toBuffer();
                
        } catch (error) {
            throw new Error('Erro ao criar placeholder: ' + error.message);
        }
    }

    // Método principal - tenta FFmpeg, senão usa placeholder
    async processVideo(videoBuffer, options = {}) {
        try {
            if (this.hasFFmpeg) {
                console.log('🔧 Usando FFmpeg para extrair frame...');
                return await this.extractVideoFrame(videoBuffer, options);
            } else {
                console.log('🎨 Criando sticker informativo (FFmpeg não disponível)...');
                return await this.createVideoPlaceholder(videoBuffer);
            }
        } catch (error) {
            console.log('⚠️ Fallback para placeholder devido ao erro:', error.message);
            return await this.createVideoPlaceholder(videoBuffer, error.message);
        }
    }

    // Verificar se é vídeo válido
    isValidVideo(buffer) {
        if (!buffer || buffer.length < 1000) return false;

        const header = buffer.slice(0, 20);
        const signatures = [
            Buffer.from('ftyp'),     // MP4
            Buffer.from('webm'),     // WebM  
            Buffer.from('RIFF'),     // AVI
            Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), // MP4 variant
        ];

        return signatures.some(sig => header.includes(sig));
    }

    async cleanup() {
        try {
            const files = await fs.readdir(this.tempDir);
            const now = Date.now();
            
            for (const file of files) {
                try {
                    const filePath = path.join(this.tempDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (now - stats.mtime.getTime() > 10 * 60 * 1000) {
                        await fs.unlink(filePath);
                    }
                } catch (e) {}
            }
        } catch (e) {}
    }

    getStatus() {
        return {
            hasFFmpeg: this.hasFFmpeg,
            ffmpegPath: this.ffmpegPath,
            canExtractFrames: this.hasFFmpeg,
            fallbackMode: !this.hasFFmpeg
        };
    }
}

module.exports = new SmartVideoProcessor();