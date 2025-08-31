const { DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcodeTerminal = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');

class AdvancedConnectionManager {
    constructor(logger) {
        this.logger = logger;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.currentQR = null;
        this.qrAttempts = 0;
        this.maxQRAttempts = 3;
        this.connectionStartTime = null;
        this.lastSuccessfulConnection = null;
        this.isConnecting = false;
        this.connectionHistory = [];
    }

    // Sistema inteligente de fetch para WhatsApp
    async intelligentFetch(url, options = {}) {
        const methods = [
            // Método 1: Fetch padrão
            () => fetch(url, {
                ...options,
                timeout: 30000,
                headers: {
                    'User-Agent': 'WhatsApp/2.2.24.12',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    ...options.headers
                }
            }),
            
            // Método 2: Axios com configurações WhatsApp
            () => axios.get(url, {
                ...options,
                timeout: 30000,
                headers: {
                    'User-Agent': 'WhatsApp/2.2.24.12 Android/10',
                    'Accept': 'application/json, text/plain, */*',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                }
            }).then(res => ({ ok: true, data: res.data })),
            
            // Método 3: Fetch com diferentes User-Agents
            () => fetch(url, {
                ...options,
                timeout: 45000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    ...options.headers
                }
            })
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`📡 Tentando método de fetch ${i + 1}...`);
                const result = await methods[i]();
                console.log(`✅ Fetch bem-sucedido com método ${i + 1}`);
                return result;
            } catch (error) {
                console.log(`⚠️ Método ${i + 1} falhou:`, error.message);
                if (i === methods.length - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // Configurações otimizadas para conexão estável
    getOptimizedSocketConfig(baileyState, version) {
        return {
            auth: baileyState,
            printQRInTerminal: false,
            logger: require('pino')({ level: 'silent' }),
            
            // Configurações de browser otimizadas para WhatsApp
            browser: ['YakaBot', 'Chrome', '120.0.0.0'],
            version,
            
            // Configurações de conexão para evitar "dispositivo não conectado"
            syncFullHistory: false,
            fireInitQueries: true,
            downloadHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            
            // Timeouts otimizados para conexão estável
            keepAliveIntervalMs: 30000, // Aumentado para estabilidade
            connectTimeoutMs: 120000,   // 2 minutos para conexão inicial
            defaultQueryTimeoutMs: 90000, // 1.5 minutos para queries
            
            // Configurações de retry inteligentes
            retryRequestDelayMs: 2000,
            maxRetries: 5, // Mais tentativas para queries importantes
            
            // Configurações de qualidade de conexão
            queueOp: {
                timeout: 10000,
                delayBetweenOperations: 20
            },
            
            // Configurações de cache otimizadas
            shouldSyncHistoryMessage: () => false,
            shouldIgnoreJid: jid => jid.endsWith('@broadcast') || jid === 'status@broadcast',
            
            // Configurações de websocket
            socketConfig: {
                maxPayloadSize: 100 * 1024 * 1024, // 100MB
                timeout: 60000
            },
            
            // Opções avançadas
            options: {
                maxCachedMessages: 10,
                maxMessagesHistory: 0 // Não manter histórico
            },
            
            // Fetch personalizado para WhatsApp
            fetchAgent: this.intelligentFetch.bind(this)
        };
    }

    // Geração de QR Code melhorada
    async handleQRGeneration(qr) {
        this.currentQR = qr;
        this.qrAttempts++;
        
        console.clear();
        console.log('\n🚀 YakaBot - Conectar WhatsApp');
        console.log('=' .repeat(60));
        console.log('         📱 ESCANEIE O QR CODE COM SEU WHATSAPP         ');
        console.log('=' .repeat(60));
        
        // QR no terminal
        try {
            qrcodeTerminal.generate(qr, { small: true });
        } catch (e) {
            console.log('❌ Erro ao mostrar QR no terminal');
        }
        
        console.log('=' .repeat(60));
        console.log('📋 INSTRUÇÕES DETALHADAS:');
        console.log('1. Abra o WhatsApp no seu celular');
        console.log('2. Toque no menu (3 pontos) → "Aparelhos conectados"');
        console.log('3. Toque em "Conectar um aparelho"');
        console.log('4. Aponte a câmera para o QR code acima');
        console.log('5. Aguarde a mensagem "Conectado com sucesso"');
        console.log('=' .repeat(60));
        console.log(`🔄 Tentativa do QR: ${this.qrAttempts}/${this.maxQRAttempts}`);
        console.log(`🌐 QR também em: http://localhost:3000/qr?session=default`);
        console.log('=' .repeat(60));
        
        // Salvar histórico de QR
        this.connectionHistory.push({
            type: 'qr_generated',
            timestamp: new Date(),
            attempt: this.qrAttempts,
            qrLength: qr.length
        });
    }

    // Handler de conexão avançado
    async handleConnectionUpdate(update, startYakaCallback) {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            await this.handleQRGeneration(qr);
            return;
        }
        
        if (connection) {
            await this.handleConnectionChange(connection, lastDisconnect, startYakaCallback);
        }
    }

    async handleConnectionChange(connection, lastDisconnect, startYakaCallback) {
        this.logger.info(`🔄 Estado da conexão: ${connection}`);
        
        switch (connection) {
            case 'connecting':
                this.handleConnecting();
                break;
                
            case 'open':
                await this.handleConnectionOpen();
                break;
                
            case 'close':
                await this.handleConnectionClose(lastDisconnect, startYakaCallback);
                break;
        }
    }

    handleConnecting() {
        if (!this.connectionStartTime) {
            this.connectionStartTime = Date.now();
            this.isConnecting = true;
            console.log('\n🔄 Conectando ao WhatsApp...');
            console.log('⏳ Por favor aguarde, isso pode levar alguns segundos...');
        }
    }

    async handleConnectionOpen() {
        const connectionTime = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        
        console.clear();
        console.log('\n' + '█' .repeat(60));
        console.log('█' + ' ' .repeat(58) + '█');
        console.log('█' + '          ✅ YAKABOT CONECTADO COM SUCESSO!          '.padEnd(58) + '█');
        console.log('█' + ' ' .repeat(58) + '█');
        console.log('█' + '      🎉 WhatsApp vinculado e funcionando            '.padEnd(58) + '█');
        console.log('█' + `      ⏱️ Tempo de conexão: ${Math.round(connectionTime/1000)}s`.padEnd(58) + '█');
        console.log('█' + '      🚀 Bot online e pronto para usar               '.padEnd(58) + '█');
        console.log('█' + ' ' .repeat(58) + '█');
        console.log('█' .repeat(60));
        
        // Reset contadores
        this.reconnectAttempts = 0;
        this.qrAttempts = 0;
        this.connectionStartTime = null;
        this.isConnecting = false;
        this.lastSuccessfulConnection = new Date();
        
        // Salvar na história
        this.connectionHistory.push({
            type: 'connected',
            timestamp: new Date(),
            connectionTime
        });
        
        this.logger.info('✅ WhatsApp conectado com sucesso!');
    }

    async handleConnectionClose(lastDisconnect, startYakaCallback) {
        let statusCode = 0;
        let reason = "Desconhecido";
        
        if (lastDisconnect?.error instanceof Boom) {
            statusCode = lastDisconnect.error.output?.statusCode || 0;
            reason = lastDisconnect.error.output?.payload?.error || 'Erro desconhecido';
        }
        
        console.log(`\n❌ Conexão perdida: ${reason} (Código: ${statusCode})`);
        
        // Salvar na história
        this.connectionHistory.push({
            type: 'disconnected',
            timestamp: new Date(),
            reason,
            statusCode
        });
        
        // Tratar diferentes tipos de desconexão
        if (statusCode === DisconnectReason.loggedOut) {
            this.handleLoggedOut();
            return;
        }
        
        if (statusCode === DisconnectReason.badSession) {
            await this.handleBadSession(startYakaCallback);
            return;
        }
        
        if (statusCode === DisconnectReason.restartRequired) {
            console.log('🔄 Reinicialização necessária detectada');
            setTimeout(startYakaCallback, 3000);
            return;
        }
        
        // Reconexão inteligente para outros erros
        await this.attemptIntelligentReconnection(statusCode, startYakaCallback);
    }

    handleLoggedOut() {
        console.log('\n🚪 LOGOUT DETECTADO');
        console.log('=' .repeat(50));
        console.log('Você foi deslogado do WhatsApp.');
        console.log('Para reconectar:');
        console.log('1. Feche o bot (Ctrl+C)');
        console.log('2. Delete a pasta "baileys-session"');
        console.log('3. Reinicie o bot');
        console.log('=' .repeat(50));
    }

    async handleBadSession(startYakaCallback) {
        console.log('🔧 Sessão inválida detectada');
        console.log('🧹 Limpando sessão automaticamente...');
        
        try {
            const path = require('path');
            const sessionDir = path.join(process.cwd(), 'baileys-session');
            
            if (require('fs').existsSync(sessionDir)) {
                require('fs').rmSync(sessionDir, { recursive: true, force: true });
                console.log('✅ Sessão limpa com sucesso');
            }
            
            console.log('🔄 Reiniciando em 5 segundos...');
            setTimeout(startYakaCallback, 5000);
            
        } catch (error) {
            console.log('❌ Erro ao limpar sessão:', error.message);
            console.log('💡 Limpe a pasta "baileys-session" manualmente');
        }
    }

    async attemptIntelligentReconnection(statusCode, startYakaCallback) {
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            console.log('❌ Muitas tentativas de reconexão falharam');
            console.log('💡 Sugestões:');
            console.log('  - Verifique sua conexão com a internet');
            console.log('  - Limpe a pasta "baileys-session"');
            console.log('  - Reinicie o bot manualmente');
            return;
        }
        
        // Delay progressivo mais inteligente
        const baseDelay = 5000; // 5 segundos base
        const delay = baseDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        const maxDelay = 60000; // Máximo 1 minuto
        const finalDelay = Math.min(delay, maxDelay);
        
        console.log(`🔄 Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        console.log(`⏳ Reconectando em ${Math.round(finalDelay/1000)} segundos...`);
        
        // Análise do erro para reconexão inteligente
        if (statusCode === DisconnectReason.connectionLost) {
            console.log('📡 Verificando conectividade...');
            await this.checkConnectivity();
        }
        
        setTimeout(startYakaCallback, finalDelay);
    }

    async checkConnectivity() {
        try {
            await this.intelligentFetch('https://www.google.com', { timeout: 5000 });
            console.log('✅ Conexão com internet OK');
        } catch (error) {
            console.log('⚠️ Problemas de conectividade detectados');
            console.log('💡 Verifique sua conexão com a internet');
        }
    }

    // Obter QR atual
    getCurrentQR() {
        return this.currentQR;
    }

    // Status detalhado
    getConnectionStatus() {
        return {
            reconnectAttempts: this.reconnectAttempts,
            qrAttempts: this.qrAttempts,
            isConnecting: this.isConnecting,
            lastSuccessfulConnection: this.lastSuccessfulConnection,
            connectionHistory: this.connectionHistory.slice(-10) // Últimas 10 entradas
        };
    }

    // Reset completo
    reset() {
        this.reconnectAttempts = 0;
        this.qrAttempts = 0;
        this.currentQR = null;
        this.connectionStartTime = null;
        this.isConnecting = false;
        this.connectionHistory = [];
    }
}

module.exports = AdvancedConnectionManager;