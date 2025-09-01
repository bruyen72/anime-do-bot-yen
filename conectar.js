const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const https = require('https');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

// Função para iniciar a conexão
async function startConnection() {
    // Criar pasta para armazenar dados da sessão
    const sessionDir = './baileys-session';
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Carregar estado de autenticação
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    // Log personalizado para suprimir mensagens desnecessárias
    const logger = pino({ 
        level: 'fatal'
    });

    // Agente HTTPS melhorado para problemas de upload
    const agent = new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
        keepAliveMsecs: 30000,
        timeout: 120000, // 2 minutos
        maxSockets: 50,
        maxFreeSockets: 10
    });

    // Criar conexão com configurações otimizadas
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger,
        browser: ['YakaBot', 'Chrome', '116.0.0.0'],
        syncFullHistory: false,
        agent: agent,
        // Configurações de timeout estendidas
        defaultQueryTimeoutMs: 120000, // 2 minutos
        connectTimeoutMs: 60000, // 1 minuto para conectar
        // Configurações de retry
        retryRequestDelayMs: 3000,
        maxMsgRetryCount: 5,
        // Configurações de upload específicas
        options: {
            mediaUploadTimeoutMs: 300000, // 5 minutos
            retryRequestDelayMs: 3000,
            maxRetries: 3
        }
    });

    // Manipular eventos de conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Mostrar código QR quando disponível
        if (qr) {
            console.log('\n\n============= ESCANEIE O QR CODE COM SEU WHATSAPP =============\n');
            qrcode.generate(qr, { small: false });
            console.log('\n==============================================================\n');
        }
        
        // Log de status de conexão
        if (connection) {
            console.log('Status de conexão:', connection);
        }
        
        // Tratamento de desconexão
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            console.log('Conexão fechada devido a:', lastDisconnect?.error?.message || 'Razão desconhecida');
            
            if (shouldReconnect) {
                console.log('Tentando reconectar...');
                setTimeout(startConnection, 3000);
            } else {
                console.log('Você foi desconectado permanentemente. Reinicie o processo manualmente.');
            }
        }
        
        // Conexão estabelecida com sucesso
        if (connection === 'open') {
            console.log('\n===========================================');
            console.log('    ✅ CONEXÃO ESTABELECIDA COM SUCESSO    ');
            console.log('===========================================\n');
            console.log('Bot está pronto para uso!\n');
        }
    });
    
    // Salvar credenciais quando atualizadas
    sock.ev.on('creds.update', saveCreds);
    
    // Manipulador básico de mensagens
    sock.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages[0] || !messages[0].message) return;
        
        const m = messages[0];
        const messageText = m.message?.conversation || 
                          m.message?.extendedTextMessage?.text || 
                          m.message?.imageMessage?.caption || 
                          m.message?.videoMessage?.caption || '';
                          
        // Comando básico para testar
        if (messageText.startsWith('.ping')) {
            await sock.sendMessage(m.key.remoteJid, { text: 'pong!' });
        }
    });
    
    return sock;
}

// Iniciar conexão
console.log('Iniciando o bot WhatsApp...');
startConnection().catch(err => console.error('Erro ao iniciar:', err));