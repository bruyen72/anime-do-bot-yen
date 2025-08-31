const { spawn } = require('child_process');
const sharp = require('sharp');

class StreamVideoProcessor {
    constructor() {
        this.ffmpegPath = null;
        this.hasFFmpeg = false;
        // A inicialização agora é feita sob demanda
    }

    async init() {
        // Evita reinicializações desnecessárias se o caminho já foi detectado
        if (this.hasFFmpeg) {
            return;
        }
        await this.detectFFmpeg();
    }

    async detectFFmpeg() {
        try {
            const ffmpegStatic = require('ffmpeg-static');

            if (!ffmpegStatic) {
                console.log('❌ Pacote ffmpeg-static não encontrado. Instale com "npm install ffmpeg-static".');
                this.hasFFmpeg = false;
                return false;
            }

            if (typeof ffmpegStatic !== 'string') {
                console.log(`❌ O pacote ffmpeg-static retornou um tipo inesperado: ${typeof ffmpegStatic}.`);
                this.hasFFmpeg = false;
                return false;
            }
            
            await this.testFFmpeg(ffmpegStatic);
            this.ffmpegPath = ffmpegStatic;
            this.hasFFmpeg = true;
            console.log('✅ FFmpeg-static detectado e funcionando:', this.ffmpegPath);
            return true;

        } catch (error) {
            console.log('❌ Erro fatal ao detectar ou testar o FFmpeg-static:', error.message);
            this.hasFFmpeg = false;
            return false;
        }
    }

    async testFFmpeg(command) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, ['-version'], { stdio: 'pipe' });
            process.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`FFmpeg test failed: ${code}`));
            });
            process.on('error', reject);
        });
    }

    // Extrair frame usando streaming (SEM arquivos temporários)
    async extractFrameFromBuffer(videoBuffer, options = {}) {
        if (!this.hasFFmpeg) {
            throw new Error('FFmpeg não disponível');
        }

        const {
            timePosition = '00:00:02',
            format = 'png',
            width = 512,
            height = 512,
            quality = 2 // Para PNG: 1-31 (menor = melhor qualidade)
        } = options;

        return new Promise((resolve, reject) => {
            console.log(`🎬 Extraindo frame via streaming de vídeo ${Math.round(videoBuffer.length/1024)}KB...`);

            // Comando FFmpeg para streaming
            const ffmpegArgs = [
                // Configurações de entrada tolerantes
                '-analyzeduration', '10M',    // Analisar mais dados para detectar formato
                '-probesize', '10M',          // Buffer maior para probing
                '-fflags', '+discardcorrupt', // Descartar dados corrompidos
                '-i', 'pipe:0',               // Ler do stdin
                
                // Buscar posição no tempo (movido para depois da entrada)
                '-ss', timePosition,          // Posição do frame
                
                // Extrair apenas 1 frame
                '-frames:v', '1',             // Apenas 1 frame
                '-an',                        // Sem áudio
                
                // Filtros de vídeo para redimensionar
                '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1:color=white`,
                
                // Configurações de saída
                '-f', 'image2pipe',           // Formato de saída como pipe
                '-vcodec', format,            // Codec de saída
                '-compression_level', quality.toString(), // Qualidade PNG
                
                // Configurações otimizadas
                '-threads', '1',              // Single thread para consistency
                '-y',                         // Sobrescrever sem perguntar
                '-v', 'warning',              // Log warnings também
                
                // Saída para stdout
                'pipe:1'                      // Escrever no stdout
            ];

            const ffmpeg = spawn(this.ffmpegPath, ffmpegArgs, {
                stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
            });

            let outputBuffer = Buffer.alloc(0);
            let errorOutput = '';

            // Capturar dados do stdout (imagem PNG)
            ffmpeg.stdout.on('data', (chunk) => {
                outputBuffer = Buffer.concat([outputBuffer, chunk]);
            });

            // Capturar erros
            ffmpeg.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            // Quando o processo termina
            ffmpeg.on('close', (code) => {
                if (code === 0 && outputBuffer.length > 0) {
                    console.log(`✅ Frame extraído via streaming: ${Math.round(outputBuffer.length/1024)}KB`);
                    resolve(outputBuffer);
                } else {
                    const error = `FFmpeg falhou (código ${code}): ${errorOutput}`;
                    console.log(`❌ ${error}`);
                    reject(new Error(error));
                }
            });

            // Erro no processo
            ffmpeg.on('error', (error) => {
                console.log(`❌ Erro no FFmpeg: ${error.message}`);
                reject(error);
            });

            // IMPORTANTE: Escrever o vídeo buffer no stdin
            try {
                ffmpeg.stdin.write(videoBuffer);
                ffmpeg.stdin.end(); // Finalizar o stream de entrada
                console.log('📡 Dados de vídeo enviados via stdin');
            } catch (writeError) {
                console.log(`❌ Erro ao escrever no stdin: ${writeError.message}`);
                reject(writeError);
            }
        });
    }

    // Método principal que combina extração + conversão para sticker
    async processVideoToSticker(videoBuffer, options = {}) {
        try {
            console.log('🚀 Iniciando processamento de vídeo para sticker...');
            
            // Extrair frame usando streaming
            const frameBuffer = await this.extractFrameFromBuffer(videoBuffer, {
                timePosition: options.timePosition || '00:00:02',
                format: 'png',
                width: 512,
                height: 512,
                quality: 2
            });

            // Converter frame para sticker WebP usando Sharp
            console.log('🖼️ Convertendo frame para sticker WebP...');
            const stickerBuffer = await sharp(frameBuffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .webp({ 
                    quality: options.quality || 80,
                    effort: 4 // Menor tempo de processamento
                })
                .toBuffer();

            console.log(`✅ Sticker criado: ${Math.round(stickerBuffer.length/1024)}KB`);
            return stickerBuffer;

        } catch (error) {
            console.log(`❌ Erro no processamento: ${error.message}`);
            throw error;
        }
    }

    // Criar sticker visual para quando FFmpeg não está disponível
    async createVideoInfoSticker(videoBuffer, errorMsg = '') {
        const videoSize = videoBuffer.length;
        
        const svgContent = `
            <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="modernBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <rect width="100%" height="100%" fill="url(#modernBg)"/>
                
                <!-- Ícone de vídeo com glow -->
                <circle cx="256" cy="180" r="75" fill="rgba(255,255,255,0.95)" filter="url(#glow)"/>
                <polygon points="230,155 230,205 290,180" fill="#2c3e50"/>
                <circle cx="256" cy="180" r="75" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
                
                <!-- Título principal -->
                <text x="256" y="290" font-family="Arial Black" font-size="24" font-weight="bold" fill="white" text-anchor="middle" filter="url(#glow)">🎬 VÍDEO</text>
                <text x="256" y="315" font-family="Arial" font-size="14" fill="rgba(255,255,255,0.9)" text-anchor="middle">Processado via Streaming</text>
                
                <!-- Informações técnicas -->
                <text x="256" y="350" font-family="Arial" font-size="12" fill="rgba(255,255,255,0.8)" text-anchor="middle">📦 ${Math.round(videoSize/1024)}KB • 🎯 Frame extraction</text>
                <text x="256" y="370" font-family="Arial" font-size="11" fill="rgba(255,255,255,0.7)" text-anchor="middle">⚡ FFmpeg stdin/stdout pipeline</text>
                
                ${errorMsg ? `
                    <text x="256" y="400" font-family="Arial" font-size="10" fill="rgba(255,200,200,0.8)" text-anchor="middle">⚠️ ${errorMsg.substring(0, 40)}</text>
                    <text x="256" y="420" font-family="Arial" font-size="9" fill="rgba(255,200,200,0.6)" text-anchor="middle">Use .ss para alternativa</text>
                ` : `
                    <text x="256" y="400" font-family="Arial" font-size="10" fill="rgba(255,255,255,0.6)" text-anchor="middle">💡 Sticker gerado sem arquivos temporários</text>
                    <text x="256" y="420" font-family="Arial" font-size="9" fill="rgba(255,255,255,0.5)" text-anchor="middle">YakaBot • Tecnologia de Streaming</text>
                `}
            </svg>`;
        
        return await sharp(Buffer.from(svgContent))
            .resize(512, 512)
            .webp({ quality: 85, effort: 4 })
            .toBuffer();
    }

    // Método principal que tenta streaming, senão usa visual
    async processVideo(videoBuffer, options = {}) {
        try {
            if (this.hasFFmpeg) {
                return await this.processVideoToSticker(videoBuffer, options);
            } else {
                console.log('🎨 FFmpeg não disponível, criando sticker informativo...');
                return await this.createVideoInfoSticker(videoBuffer);
            }
        } catch (error) {
            console.log('⚠️ Fallback para sticker visual devido ao erro:', error.message);
            return await this.createVideoInfoSticker(videoBuffer, error.message);
        }
    }

    // Verificar se é vídeo válido
    isValidVideo(buffer) {
        if (!buffer || buffer.length < 1000) return false;

        // Verificar assinaturas mais específicas
        const header = buffer.slice(0, 32);
        
        // MP4 signatures
        if (header.includes(Buffer.from('ftyp'))) return true;
        if (header.includes(Buffer.from('moov'))) return true;
        
        // WebM signature
        if (header.includes(Buffer.from([0x1A, 0x45, 0xDF, 0xA3]))) return true;
        
        // AVI signature
        if (header.includes(Buffer.from('RIFF'))) {
            if (header.includes(Buffer.from('AVI '))) return true;
        }
        
        return false;
    }

    getStatus() {
        return {
            hasFFmpeg: this.hasFFmpeg,
            ffmpegPath: this.ffmpegPath,
            streamingSupported: this.hasFFmpeg,
            method: this.hasFFmpeg ? 'FFmpeg Streaming' : 'Visual Fallback'
        };
    }
}

module.exports = new StreamVideoProcessor();