const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class SmartStickerConverter {
  constructor() {
    this.tempDir = '/tmp/yaka_stickers';
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('[StickerConverter] Erro ao criar diretório:', error.message);
    }
  }

  // Converte imagem para sticker usando Sharp (sem FFmpeg)
  async convertToSticker(inputBuffer, options = {}) {
    try {
      console.log('[StickerConverter] Iniciando conversão com Sharp');
      
      // Configurações padrão
      const config = {
        width: 512,
        height: 512,
        quality: 80,
        format: 'webp',
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparente
        ...options
      };

      // Processa com Sharp
      let sharpInstance = sharp(inputBuffer)
        .resize(config.width, config.height, {
          fit: 'contain',
          background: config.background
        })
        .webp({ 
          quality: config.quality,
          effort: 4, // Balanço entre qualidade e velocidade
          nearLossless: false
        });

      const outputBuffer = await sharpInstance.toBuffer();
      
      console.log(`[StickerConverter] Conversão Sharp concluída: ${outputBuffer.length} bytes`);
      return outputBuffer;

    } catch (error) {
      console.error('[StickerConverter] Erro Sharp:', error.message);
      throw error;
    }
  }

  // Fallback usando Jimp (caso Sharp falhe)
  async convertWithJimp(inputBuffer, options = {}) {
    try {
      console.log('[StickerConverter] Tentando conversão com Jimp');
      const Jimp = require('jimp');
      
      const image = await Jimp.read(inputBuffer);
      
      // Redimensiona mantendo aspecto
      image.contain(512, 512);
      
      // Converte para buffer
      const outputBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
      
      console.log(`[StickerConverter] Conversão Jimp concluída: ${outputBuffer.length} bytes`);
      return outputBuffer;
      
    } catch (error) {
      console.error('[StickerConverter] Erro Jimp:', error.message);
      throw error;
    }
  }

  // Fallback básico (apenas resize simples)
  async basicConvert(inputBuffer) {
    try {
      console.log('[StickerConverter] Usando conversão básica');
      
      // Se o arquivo já é pequeno, apenas retorna
      if (inputBuffer.length < 1024 * 1024) { // < 1MB
        return inputBuffer;
      }

      // Tenta comprimir com Sharp básico
      const compressed = await sharp(inputBuffer)
        .resize(512, 512, { fit: 'inside' })
        .png({ quality: 60 })
        .toBuffer();

      return compressed;
    } catch (error) {
      console.error('[StickerConverter] Erro conversão básica:', error.message);
      // Última opção: retorna buffer original
      return inputBuffer;
    }
  }

  // Método principal que tenta múltiplas abordagens
  async smartConvert(inputBuffer, options = {}) {
    const methods = [
      () => this.convertToSticker(inputBuffer, options),
      () => this.convertWithJimp(inputBuffer, options),
      () => this.basicConvert(inputBuffer)
    ];

    let lastError;

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`[StickerConverter] Tentativa ${i + 1}/${methods.length}`);
        const result = await methods[i]();
        
        if (result && result.length > 0) {
          console.log(`[StickerConverter] Sucesso com método ${i + 1}`);
          return result;
        }
      } catch (error) {
        console.log(`[StickerConverter] Método ${i + 1} falhou:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw new Error(`Conversão falhou. Último erro: ${lastError?.message}`);
  }

  // Detecta tipo de arquivo
  async detectFileType(buffer) {
    try {
      const { fileTypeFromBuffer } = require('file-type');
      const type = await fileTypeFromBuffer(buffer);
      return type;
    } catch (error) {
      // Fallback: tenta detectar pelos primeiros bytes
      const header = buffer.slice(0, 12).toString('hex');
      
      if (header.startsWith('ffd8ff')) return { ext: 'jpg', mime: 'image/jpeg' };
      if (header.startsWith('89504e47')) return { ext: 'png', mime: 'image/png' };
      if (header.startsWith('47494638')) return { ext: 'gif', mime: 'image/gif' };
      if (header.includes('57454250')) return { ext: 'webp', mime: 'image/webp' };
      
      return { ext: 'unknown', mime: 'unknown' };
    }
  }

  // Valida se o arquivo pode ser convertido
  async validateInput(buffer) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (buffer.length > maxSize) {
      throw new Error(`Arquivo muito grande: ${Math.round(buffer.length / 1024 / 1024)}MB (máximo 10MB)`);
    }

    const type = await this.detectFileType(buffer);
    const validTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!validTypes.includes(type.ext)) {
      throw new Error(`Tipo de arquivo não suportado: ${type.ext}`);
    }

    return type;
  }

  // Método público principal
  async createSticker(inputBuffer, options = {}) {
    try {
      console.log(`[StickerConverter] Criando sticker (${inputBuffer.length} bytes)`);
      
      // Valida entrada
      const fileType = await this.validateInput(inputBuffer);
      console.log(`[StickerConverter] Tipo detectado: ${fileType.ext}`);
      
      // Converte
      const stickerBuffer = await this.smartConvert(inputBuffer, options);
      
      console.log(`[StickerConverter] Sticker criado: ${stickerBuffer.length} bytes`);
      return stickerBuffer;
      
    } catch (error) {
      console.error('[StickerConverter] Erro ao criar sticker:', error.message);
      throw error;
    }
  }

  // Limpa arquivos temporários antigos
  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        try {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          
          // Remove arquivos mais antigos que 1 hora
          if (now - stats.mtime.getTime() > 60 * 60 * 1000) {
            await fs.unlink(filePath);
            cleaned++;
          }
        } catch (error) {
          continue;
        }
      }

      if (cleaned > 0) {
        console.log(`[StickerConverter] ${cleaned} arquivos temporários removidos`);
      }
    } catch (error) {
      console.error('[StickerConverter] Erro na limpeza:', error.message);
    }
  }
}

// Instância global
const smartStickerConverter = new SmartStickerConverter();

// Limpeza automática a cada 30 minutos
setInterval(() => {
  smartStickerConverter.cleanup();
}, 30 * 60 * 1000);

module.exports = smartStickerConverter;