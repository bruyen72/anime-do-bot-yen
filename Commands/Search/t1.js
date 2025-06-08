const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { promisify } = require('util');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fileType = require('file-type');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

// ==================== CONFIGURAÇÕES PARA UPLOAD ====================
const TEMP_DIR = path.join(tmpdir(), 'yaka_uploads');
const TIMEOUT_DOWNLOAD = 120000;
const MAX_FILE_SIZE_MB = 100; // Limite máximo para upload

// Garantir diretório temporário
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`[✅] Diretório temporário criado: ${TEMP_DIR}`);
}

// Função para upload no Catbox
const catboxUpload = async (buffer) => {
    try {
        const detectedType = await fileType.fromBuffer(buffer);
        const ext = detectedType?.ext || 'bin';
        const mime = detectedType?.mime || 'application/octet-stream';

        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { 
            filename: `file.${ext}`, 
            contentType: mime 
        });

        console.log(`[🔄] Fazendo upload para Catbox... (${ext}, ${mime})`);
        
        const res = await fetch('https://catbox.moe/user/api.php', { 
            method: 'POST', 
            body: form,
            timeout: 60000
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const result = await res.text();
        
        if (!result || !result.startsWith('https://')) {
            throw new Error('Resposta inválida do Catbox');
        }

        console.log(`[✅] Upload concluído: ${result}`);
        return result.trim();

    } catch (error) {
        console.error('[❌] Erro no upload Catbox:', error.message);
        throw new Error(`Falha no upload: ${error.message}`);
    }
};

module.exports = {
    name: "t1",
    alias: ["tourl", "upload"],
    desc: "Faz upload de arquivos para Catbox e retorna o link",
    category: "Tools",
    usage: ".t1 [responda uma mídia]",
    react: "🔗",
    start: async (Yaka, m, { prefix, quoted, mime, body }) => {
        console.log(`[🚀] Comando .t1 iniciado!`);
        
        // Evitar duplicação
        if (m._tourl_done) {
            console.log(`[⚠️] Upload já processado para esta mensagem`);
            return;
        }
        m._tourl_done = true;

        const filesToCleanup = [];
        let processingMsg = null;

        try {
            // Validações básicas
            console.log(`[🔍] Verificando comando...`);
            if (body && !body.toLowerCase().startsWith('.t1') && !body.toLowerCase().startsWith('.tourl') && !body.toLowerCase().startsWith('.upload')) {
                console.log(`[❌] Comando inválido: ${body}`);
                return;
            }

            console.log(`[🔍] Verificando mídia...`);
            let q = quoted ? quoted : m;
            let detectedMime = (q.msg || q).mimetype || q.mediaType || mime || '';

            if (!detectedMime || detectedMime === 'conversation') {
                console.log(`[❌] Nenhuma mídia encontrada`);
                return m.reply(`⚠️ Responda uma mídia com ${prefix}t1 para fazer upload`);
            }

            console.log(`[✅] Mídia detectada: ${detectedMime}`);

            // Verificar se tem fakeObj
            if (!q.fakeObj && q.message) {
                q.fakeObj = q.message;
            }

            if (!q.fakeObj) {
                console.error("[❌] fakeObj ausente");
                return m.reply("❌ Erro ao acessar mídia. Tente novamente.");
            }

            // Mensagem de processamento
            processingMsg = await m.reply('⏳ Fazendo upload do arquivo...');

            // Função de limpeza
            const cleanupFiles = () => {
                console.log(`[🧹] Limpando ${filesToCleanup.length} arquivos...`);
                filesToCleanup.forEach(file => {
                    if (fs.existsSync(file)) {
                        try {
                            fs.unlinkSync(file);
                            console.log(`[✅] Removido: ${path.basename(file)}`);
                        } catch (e) {
                            console.warn(`[⚠️] Falha ao remover: ${file}`);
                        }
                    }
                });
            };

            const removeProcessingMsg = async () => {
                if (processingMsg) {
                    try {
                        await Yaka.sendMessage(m.from || m.chat, { delete: processingMsg.key });
                    } catch (e) {
                        console.warn("[⚠️] Não consegui remover mensagem de processamento");
                    }
                }
            };

            // Download do arquivo
            console.log(`[⬇️] Iniciando download...`);
            let buffer;
            
            try {
                let attempts = 0;
                const maxAttempts = 3;
                
                while (attempts < maxAttempts) {
                    attempts++;
                    console.log(`[⬇️] Tentativa ${attempts}/${maxAttempts}...`);
                    
                    try {
                        buffer = await downloadMediaMessage(q.fakeObj, 'buffer', {}, {
                            logger: {
                                info: msg => console.log(`[ℹ️] ${msg}`),
                                error: msg => console.error(`[❌] ${msg}`)
                            },
                            timeout: TIMEOUT_DOWNLOAD
                        });

                        if (buffer && buffer.length > 0) {
                            const fileSizeMB = buffer.length / (1024 * 1024);
                            console.log(`[✅] Download OK! ${fileSizeMB.toFixed(2)}MB`);
                            
                            // Verificar tamanho
                            if (fileSizeMB > MAX_FILE_SIZE_MB) {
                                throw new Error(`Arquivo muito grande: ${fileSizeMB.toFixed(1)}MB (máximo: ${MAX_FILE_SIZE_MB}MB)`);
                            }
                            
                            break;
                        } else {
                            throw new Error(`Buffer vazio na tentativa ${attempts}`);
                        }
                    } catch (downloadError) {
                        console.warn(`[⚠️] Falha tentativa ${attempts}:`, downloadError.message);
                        
                        if (attempts === maxAttempts) {
                            throw downloadError;
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            } catch (e) {
                console.error("[❌] Download falhou:", e.message);
                await m.reply(`❌ Falha no download: ${e.message}`);
                await removeProcessingMsg();
                return;
            }

            // Fazer upload para Catbox
            console.log(`[📤] Iniciando upload para Catbox...`);
            let catboxLink;
            
            try {
                catboxLink = await catboxUpload(buffer);
                
                if (!catboxLink || !catboxLink.startsWith('https://')) {
                    throw new Error('Link inválido retornado pelo Catbox');
                }
                
                console.log(`[✅] Upload concluído: ${catboxLink}`);
            } catch (uploadError) {
                console.error("[❌] Upload falhou:", uploadError.message);
                await m.reply(`❌ Falha no upload: ${uploadError.message}`);
                await removeProcessingMsg();
                cleanupFiles();
                return;
            }

            // Preparar resposta interativa
            console.log(`[📱] Preparando resposta interativa...`);
            
            try {
                const caption = `✅ Upload realizado com sucesso!\n\n📎 **Link do arquivo:**\n${catboxLink}\n\n💡 Pressione o botão abaixo para copiar o link`;

                // Tentar criar thumbnail se for imagem
                let thumbnail = null;
                try {
                    const detectedType = await fileType.fromBuffer(buffer);
                    if (detectedType && detectedType.mime.startsWith('image/')) {
                        thumbnail = await prepareWAMessageMedia(
                            { image: { url: catboxLink } },
                            { upload: Yaka.waUploadToServer }
                        );
                    }
                } catch (thumbError) {
                    console.warn(`[⚠️] Não foi possível criar thumbnail: ${thumbError.message}`);
                }

                const buttons = [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copiar Link",
                            copy_code: catboxLink
                        })
                    }
                ];

                const msg = {
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        header: thumbnail ? proto.Message.InteractiveMessage.Header.create({
                            hasMediaAttachment: true,
                            ...thumbnail
                        }) : undefined,
                        body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: "🤖 Yaka Bot - Upload Service"
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons
                        })
                    })
                };

                await Yaka.relayMessage(m.chat, msg, { messageId: m.key.id });
                console.log(`[✅] Resposta interativa enviada!`);

            } catch (interactiveError) {
                console.warn(`[⚠️] Falha na resposta interativa: ${interactiveError.message}`);
                // Fallback para resposta simples
                await m.reply(`✅ **Upload concluído!**\n\n📎 **Link:** ${catboxLink}\n\n💡 Copie o link acima para usar o arquivo`);
            }

            await removeProcessingMsg();
            cleanupFiles();

        } catch (error) {
            console.error("[🔥] ERRO CRÍTICO:", error.message);
            
            let errorMsg = "❌ Erro inesperado no upload.";
            if (error.message.includes('timeout')) {
                errorMsg = "❌ Timeout - arquivo muito grande ou conexão lenta.";
            } else if (error.message.includes('ENOSPC')) {
                errorMsg = "❌ Espaço insuficiente no servidor.";
            } else if (error.message.includes('ENOMEM')) {
                errorMsg = "❌ Memória insuficiente.";
            } else if (error.message.includes('muito grande')) {
                errorMsg = `❌ ${error.message}`;
            }
            
            await m.reply(errorMsg);

            if (processingMsg) {
                try {
                    await Yaka.sendMessage(m.from || m.chat, { delete: processingMsg.key });
                } catch {}
            }

            cleanupFiles();
        }
    }
};