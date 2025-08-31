const { DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRManager = require('./QRManager');

class ConnectionManager {
    constructor(logger) {
        this.logger = logger;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 8; // Reduzido para evitar loops infinitos
        this.baseReconnectDelay = 3000;
        this.maxReconnectDelay = 30000; // Reduzido
        this.lastReconnectTime = 0;
        this.isReconnecting = false;
        this.connectionState = 'initializing';
    }

    async handleConnectionUpdate(update, startYakaCallback) {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection) {
            this.connectionState = connection;
            this.logger.info(`🔄 Estado da conexão: ${connection}`);
        }

        // Handle QR Code
        if (qr) {
            await QRManager.generateQR(qr);
            return;
        }

        // Handle successful connection
        if (connection === 'open') {
            this.onConnectionOpen();
            return;
        }

        // Handle connection close
        if (connection === 'close') {
            await this.handleDisconnection(lastDisconnect, startYakaCallback);
        }
    }

    onConnectionOpen() {
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        QRManager.reset();
        
        console.clear();
        console.log('\n██████████████████████████████████████████████████');
        console.log('██                                              ██');
        console.log('██          ✅ YAKABOT CONECTADO!               ██');
        console.log('██                                              ██');
        console.log('██      🤖 Bot operacional e funcionando        ██');
        console.log('██      📱 WhatsApp conectado com sucesso       ██');
        console.log('██      ⚡ Sistema otimizado ativo              ██');
        console.log('██                                              ██');
        console.log('██████████████████████████████████████████████████\n');
        
        this.logger.info('✅ WhatsApp conectado com sucesso!');
    }

    async handleDisconnection(lastDisconnect, startYakaCallback) {
        let statusCode = 0;
        let reason = "Desconhecido";
        
        if (lastDisconnect?.error instanceof Boom) {
            statusCode = lastDisconnect.error.output?.statusCode || 0;
            reason = lastDisconnect.error.output?.payload?.error || 'Erro desconhecido';
        }
        
        this.logger.warn(`❌ Conexão fechada: ${reason} (${statusCode})`);
        QRManager.clear();

        // Handle logout - don't reconnect
        if (statusCode === DisconnectReason.loggedOut) {
            this.logger.warn("🚪 Logout detectado. Limpe a pasta baileys-session e reinicie.");
            console.log('\n⚠️ ATENÇÃO: Você foi desconectado do WhatsApp!');
            console.log('💡 Para reconectar, delete a pasta "baileys-session" e reinicie o bot.');
            return;
        }

        // Handle connection lost/bad session
        if (statusCode === DisconnectReason.connectionLost || 
            statusCode === DisconnectReason.badSession ||
            statusCode === DisconnectReason.connectionClosed) {
            await this.attemptReconnection(startYakaCallback);
            return;
        }

        // Handle restart required
        if (statusCode === DisconnectReason.restartRequired) {
            this.logger.info("🔄 Reinicialização necessária detectada");
            setTimeout(startYakaCallback, 2000);
            return;
        }

        // Default reconnection for other errors
        await this.attemptReconnection(startYakaCallback);
    }

    async attemptReconnection(startYakaCallback) {
        if (this.isReconnecting) {
            this.logger.info("🔄 Reconexão já em andamento...");
            return;
        }

        this.reconnectAttempts++;
        
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            this.logger.error("❌ Máximo de tentativas de reconexão atingido");
            console.log('\n❌ Falha na conexão após várias tentativas.');
            console.log('💡 Reinicie o bot manualmente para tentar novamente.');
            return;
        }

        this.isReconnecting = true;
        
        const delay = Math.min(
            this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );
        
        this.logger.info(`🔄 Tentando reconectar em ${Math.round(delay/1000)}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.isReconnecting = false;
            startYakaCallback();
        }, delay);
    }

    getConnectionState() {
        return this.connectionState;
    }

    isConnected() {
        return this.connectionState === 'open';
    }

    getReconnectAttempts() {
        return this.reconnectAttempts;
    }

    reset() {
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.connectionState = 'initializing';
        QRManager.reset();
    }
}

module.exports = ConnectionManager;