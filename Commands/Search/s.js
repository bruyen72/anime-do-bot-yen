const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const smartStickerConverter = require('../../lib/SmartStickerConverter');

module.exports = {
    name: "s",
    alias: ["sticker", "fig"],
    desc: "Converte imagem para sticker (sistema ultra-robusto sem FFmpeg)",
    category: "Utilities", 
    usage: ".s [responda uma imagem]",
    react: "🖼️",
    start: async (Yaka, m, { quoted }) => {
        console.log('[S] Comando sticker iniciado (sistema robusto)');
        
        try {
            // Verifica se há mídia quotada
            if (!quoted) {
                return m.reply("❌ Responda uma imagem com .s para criar sticker");
            }

            // Verifica se é imagem
            const mediaType = quoted.mtype;
            if (!mediaType || !mediaType.includes('image')) {
                return m.reply("❌ Apenas imagens são suportadas\nUse: .s [responda uma imagem]");
            }

            console.log(`[S] Tipo de mídia detectado: ${mediaType}`);
            
            // Mensagem de processamento
            const processingMsg = await m.reply("🔄 Criando sticker...\n⚡ Sistema sem FFmpeg ativo!");
            
            try {
                console.log('[S] Iniciando download da mídia...');
                
                // Download da mídia
                const buffer = await downloadMediaMessage(quoted, 'buffer', {});
                
                if (!buffer || buffer.length === 0) {
                    throw new Error("Falha no download da mídia");
                }
                
                console.log(`[S] Download concluído: ${buffer.length} bytes`);
                
                // Conversão usando SmartStickerConverter
                console.log('[S] Iniciando conversão...');
                const stickerBuffer = await smartStickerConverter.createSticker(buffer, {
                    quality: 75,
                    width: 512,
                    height: 512
                });
                
                console.log(`[S] Conversão concluída: ${stickerBuffer.length} bytes`);
                
                // Remove mensagem de processamento
                await Yaka.sendMessage(m.from, { delete: processingMsg.key });
                
                // Envia sticker
                await Yaka.sendMessage(m.from, { 
                    sticker: stickerBuffer 
                }, { quoted: m });
                
                console.log('[S] Sticker enviado com sucesso!');
                
            } catch (conversionError) {
                console.error('[S] Erro na conversão:', conversionError.message);
                
                // Remove mensagem de processamento
                await Yaka.sendMessage(m.from, { delete: processingMsg.key });
                
                // Fallback: Tenta método básico
                console.log('[S] Tentando método de fallback...');
                try {
                    const buffer = await downloadMediaMessage(quoted, 'buffer', {});
                    
                    // Se é uma imagem pequena, envia como sticker direto
                    if (buffer.length < 1024 * 1024) { // < 1MB
                        await Yaka.sendMessage(m.from, { 
                            sticker: buffer 
                        }, { quoted: m });
                        
                        console.log('[S] Enviado via método de fallback');
                        return;
                    }
                    
                    throw new Error("Arquivo muito grande para fallback");
                    
                } catch (fallbackError) {
                    console.error('[S] Fallback também falhou:', fallbackError.message);
                    await m.reply("❌ Erro ao criar sticker. Tente com uma imagem menor ou diferente.");
                }
            }
            
        } catch (error) {
            console.error('[S] Erro geral:', error.message);
            await m.reply(`❌ Erro ao processar sticker: ${error.message}`);
        }
    }
};