const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

async function startBot() {
    // Cria pasta de sessão se não existir
    const SESSION_DIR = './session';
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
    
    // Carrega estados de autenticação
    const { state, saveState } = await useMultiFileAuthState(SESSION_DIR);
    
    // Cria conexão
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Usando o QR terminal padrão do Baileys
        logger: pino({ level: 'silent' }),
        browser: ['Yaka Bot', 'Chrome', '1.0.0']
    });
    
    // Manipulador de conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'open') {
            console.log('\n=================================');
            console.log('       CONECTADO COM SUCESSO      ');
            console.log('=================================\n');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`Conexão fechada devido a ${lastDisconnect.error}`);
            
            if (shouldReconnect) {
                startBot();
            } else {
                console.log('Conexão fechada permanentemente. Reinicie o bot.');
            }
        }
    });
    
    // Salvar credenciais quando atualizadas
    sock.ev.on('creds.update', saveState);
    
    // Manipulador básico de mensagens
    sock.ev.on('messages.upsert', async ({ messages }) => {
        if (messages[0].key.fromMe) return;
        
        const msg = messages[0];
        if (msg.message?.conversation?.startsWith('.ping')) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'pong!' });
        }
    });
    
    return sock;
}

// Iniciar bot
startBot();