const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
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

    // Criar conexão
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger,
        browser: ['YakaBot', 'Chrome', '116.0.0.0'],
        syncFullHistory: false
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