const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');

class QRManager {
    constructor() {
        this.currentQR = null;
        this.qrGenerated = false;
        this.connectionAttempts = 0;
        this.maxAttempts = 5;
    }

    async generateQR(qr) {
        try {
            this.currentQR = qr;
            this.qrGenerated = true;
            this.connectionAttempts++;

            // QR no terminal limpo e claro
            console.clear();
            console.log('\n🚀 YakaBot - Conecte seu WhatsApp');
            console.log('══════════════════════════════════════════════════');
            console.log('         📱 ESCANEIE O QR CODE COM WHATSAPP         ');
            console.log('══════════════════════════════════════════════════\n');
            
            // Gerar QR no terminal
            qrcodeTerminal.generate(qr, { small: true });
            
            console.log('\n══════════════════════════════════════════════════');
            console.log('   WHATSAPP → APARELHOS VINCULADOS → VINCULAR APARELHO');
            console.log('══════════════════════════════════════════════════');
            console.log(`   Tentativa: ${this.connectionAttempts}/${this.maxAttempts}`);
            console.log('══════════════════════════════════════════════════\n');

            return true;
        } catch (error) {
            console.error('❌ Erro ao gerar QR Code:', error.message);
            return false;
        }
    }

    async generateQRBuffer() {
        if (!this.currentQR) {
            throw new Error('Nenhum QR code disponível');
        }

        try {
            return await qrcode.toBuffer(this.currentQR);
        } catch (error) {
            throw new Error('Erro ao gerar QR buffer: ' + error.message);
        }
    }

    isValid() {
        return this.qrGenerated && this.currentQR !== null;
    }

    clear() {
        this.currentQR = null;
        this.qrGenerated = false;
    }

    getAttempts() {
        return this.connectionAttempts;
    }

    hasMaxAttempts() {
        return this.connectionAttempts >= this.maxAttempts;
    }

    reset() {
        this.connectionAttempts = 0;
        this.clear();
    }
}

module.exports = new QRManager();