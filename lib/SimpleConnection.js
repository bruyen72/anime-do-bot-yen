const qrcodeTerminal = require('qrcode-terminal');

class SimpleConnection {
    constructor() {
        this.qrCode = null;
        this.connectionStatus = 'initializing';
        this.reconnectCount = 0;
        this.maxReconnects = 5;
    }

    handleQRCode(qr) {
        this.qrCode = qr;
        
        // Limpar terminal e mostrar QR de forma simples
        console.clear();
        console.log('\n🚀 YakaBot - Conecte seu WhatsApp\n');
        console.log('📱 Escaneie o QR Code abaixo com seu WhatsApp:');
        console.log('━'.repeat(60));
        
        qrcodeTerminal.generate(qr, { small: true });
        
        console.log('━'.repeat(60));
        console.log('WhatsApp → Aparelhos Vinculados → Vincular Aparelho');
        console.log(`Tentativa: ${this.reconnectCount + 1}/${this.maxReconnects}`);
        console.log('━'.repeat(60));
    }

    handleConnection(connection) {
        this.connectionStatus = connection;
        
        if (connection === 'open') {
            this.reconnectCount = 0;
            console.clear();
            console.log('\n✅ YakaBot conectado com sucesso!');
            console.log('🤖 Bot online e funcionando');
            console.log('━'.repeat(50));
        }
        
        if (connection === 'close') {
            this.reconnectCount++;
            console.log('\n⚠️ Conexão perdida...');
            if (this.reconnectCount < this.maxReconnects) {
                console.log('🔄 Tentando reconectar...');
            } else {
                console.log('❌ Muitas tentativas de reconexão');
                console.log('💡 Reinicie o bot manualmente');
            }
        }
    }

    getQR() {
        return this.qrCode;
    }

    getStatus() {
        return this.connectionStatus;
    }

    isConnected() {
        return this.connectionStatus === 'open';
    }

    shouldReconnect() {
        return this.reconnectCount < this.maxReconnects;
    }

    getReconnectCount() {
        return this.reconnectCount;
    }

    reset() {
        this.qrCode = null;
        this.reconnectCount = 0;
        this.connectionStatus = 'initializing';
    }
}

module.exports = SimpleConnection;