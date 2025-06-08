const { default: makeWASocket, DisconnectReason, useSingleFileAuthState } = require('@adiwajshing/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');

// Função principal
async function connectToWhatsApp() {
    const { state, saveState } = useSingleFileAuthState('./auth_info_baileys.json');
    
    const sock = makeWASocket({
        // Garantir que o QR code apareça no terminal
        printQRInTerminal: true,
        logger: pino({ level: 'warn' }),
        auth: state,
        // Use um userAgent diferente
        browser: ['Yaka Bot', 'Firefox', '1.0.0']
    });
    
    // Escutar atualizações de conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            
            console.log('Conexão fechada devido a:', lastDisconnect.error);
            
            if (shouldReconnect) {
                console.log('Reconectando...');
                connectToWhatsApp();
            } else {
                console.log('Sessão encerrada. Por favor reinicie o bot.');
            }
        } else if (connection === 'open') {
            console.log('Conectado com sucesso!');
        }
    });
    
    // Salvar estado quando as credenciais forem atualizadas
    sock.ev.on('creds.update', saveState);
    
    return sock;
}

// Iniciar conexão
connectToWhatsApp();