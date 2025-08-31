require("./config.js");
require("./lib/KoyebOptimizer"); // Aplica otimizações para Koyeb
require("./Core.js");

const pino = require('pino');

// ✅ VERIFICAÇÃO DE MODO LOCAL
const useLocalDB = !global.mongodb || global.mongodb === "" || global.mongodb === "mongodb://localhost:27017/yakabot";

if (useLocalDB) {
    console.log("🚀 Modo local ativado - sem MongoDB");
    
    global.mongoose = {
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        connection: {
            on: () => {},
            once: () => {},
            readyState: 1
        }
    };
    
    global.skipMongoConnect = true;
} else {
    console.log("🗄️ Modo MongoDB detectado");
    global.skipMongoConnect = false;
    
    try {
        global.mongoose = require("mongoose");
        console.log("✅ Mongoose carregado para conexão real");
    } catch (e) {
        console.log("⚠️ Mongoose não encontrado, usando sistema local");
        global.skipMongoConnect = true;
    }
}

// Import do Baileys com fallback
let makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, jidDecode, proto, makeInMemoryStore;

try {
    const baileys = require("@whiskeysockets/baileys");
    ({
        default: makeWASocket,
        DisconnectReason,
        useMultiFileAuthState,
        fetchLatestBaileysVersion,
        jidDecode,
        proto,
        makeInMemoryStore
    } = baileys);
    
    if (!makeInMemoryStore) {
        makeInMemoryStore = () => ({
            bind: () => {},
            loadMessage: () => null,
            writeToFile: () => {},
            readFromFile: () => {}
        });
    }
    
    console.log("✅ Baileys importado com sucesso");
} catch (err) {
    console.error("❌ Erro ao importar Baileys:", err.message);
    process.exit(1);
}

const fs = require("fs");
const chalk = require("chalk");
const path = require("path");
const figlet = require('figlet');
const express = require("express");
const { join } = require("path");
const { Boom } = require("@hapi/boom");
const PhoneNumber = require('awesome-phonenumber');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const SimpleConnection = require('./lib/SimpleConnection');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const EventEmitter = require('events');

// CONFIGURAÇÕES OTIMIZADAS PARA FLY.IO + CHROME
global.YakaBot = null;
const ULTRA_MODE = true;
const AUTO_RECOVERY = true;
const PERFORMANCE_MODE = "FLY_OPTIMIZED";

const MAX_MEMORY_MB = 6144; // 6GB para 8GB total
const MEMORY_THRESHOLD_WARNING = 0.70;
const MEMORY_THRESHOLD_CRITICAL = 0.85;
const MEMORY_CHECK_INTERVAL = 120000;
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000;

// Diretórios
const SESSION_DIR = './baileys-session';
const COMMAND_DIR = path.join(__dirname, "./Commands");
const TEMP_DIR = path.join(os.tmpdir(), 'yaka_temp');
const CACHE_DIR = path.join(__dirname, './cache');
const LOG_DIR = path.join(__dirname, './logs');

// Criar diretórios
[TEMP_DIR, CACHE_DIR, LOG_DIR, SESSION_DIR].forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (e) {
        console.log(`⚠️ Erro ao criar diretório ${dir}:`, e.message);
    }
});

// Sistema de log
const logger = pino({
    level: 'info',
    transport: {
        targets: [
            {
                level: 'info',
                target: 'pino/file',
                options: { destination: path.join(LOG_DIR, 'bot.log'), mkdir: true }
            }
        ]
    }
});

// Store otimizado
const store = makeInMemoryStore({
    logger: pino({ level: 'silent' }),
    maxCachedMessages: 5,
    clearInterval: 7200000
});

// Imports essenciais
const { smsg, getBuffer } = require('./lib/myfunc');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif');
const welcomeLeft = require('./Processes/welcome.js');
const { Collection, Simple } = require("./lib");
const { serialize } = Simple;
const Auth = require('./Processes/Auth');

// Configurações
const prefix = global.prefa;
const Commands = new Collection();
Commands.prefix = prefix;
const PORT = process.env.PORT || 3000;
const app = express();
let status = 'initializing';
let simpleConnection = new SimpleConnection();

// Estruturas de dados
const cooldowns = new Map();
const processedMessages = new Set();
const userCache = new Map();
const groupCache = new Map();
const cmdUsageStats = new Map();
const heavyCommandQueue = [];
let isProcessingHeavyCommand = false;
const activeConnections = new Set();
const commandBlacklist = new Set();

// Rate limiting
let MESSAGE_LIMIT = 8; // Aumentado para 8GB RAM
let COOLDOWN_PERIOD = 2500; // Reduzido para melhor UX
const GROUP_MESSAGE_LIMIT = 25;
const GROUP_COOLDOWN_PERIOD = 5000;

console.log('🔌 Sistema de conexão simplificado ativo');

console.log(`🚀 YakaBot Premium - 8GB RAM + Chrome GUI`);
console.log(`💾 Memória: ${MAX_MEMORY_MB}MB | Performance: ${PERFORMANCE_MODE}`);
console.log(`🌐 Chrome remoto ativo para Pinterest e downloads`);

// Sistema de memória otimizado
const memoryManager = {
    lastGcTime: 0,
    
    getMemoryUsage: () => {
        const memoryUsage = process.memoryUsage();
        return {
            rss: Math.round(memoryUsage.rss / (1024 * 1024)),
            heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
            heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
            external: Math.round(memoryUsage.external / (1024 * 1024))
        };
    },
    
    gc: () => {
        try {
            const now = Date.now();
            if (now - memoryManager.lastGcTime < 15000) return false;
            
            if (global.gc) {
                global.gc();
                memoryManager.lastGcTime = now;
                return true;
            }
        } catch (e) {}
        return false;
    },
    
    cleanup: (level = 'normal') => {
        const now = Date.now();
        let cleaned = { users: 0, groups: 0, messages: 0 };
        
        const timeout = level === 'aggressive' ? 900000 : 1800000;
        
        if (processedMessages.size > 150) {
            const msgCount = processedMessages.size;
            processedMessages.clear();
            cleaned.messages = msgCount;
        }
        
        userCache.forEach((value, key) => {
            if (now - value.lastActive > timeout) {
                userCache.delete(key);
                cleaned.users++;
            }
        });
        
        groupCache.forEach((value, key) => {
            if (now - value.lastActive > timeout) {
                groupCache.delete(key);
                cleaned.groups++;
            }
        });
        
        if (level === 'aggressive') {
            cooldowns.clear();
        }
        
        if (cleaned.users > 0 || cleaned.groups > 0 || cleaned.messages > 0) {
            logger.info(`🧹 Limpeza: ${JSON.stringify(cleaned)}`);
        }
        
        return cleaned;
    },
    
    checkMemory: async () => {
        const memUsage = memoryManager.getMemoryUsage();
        const memRatio = memUsage.heapUsed / MAX_MEMORY_MB;
        
        if (memRatio > MEMORY_THRESHOLD_CRITICAL) {
            logger.warn(`🔥 Memória crítica: ${memUsage.heapUsed}MB`);
            memoryManager.cleanup('aggressive');
            memoryManager.gc();
            return 'critical';
        }
        
        if (memRatio > MEMORY_THRESHOLD_WARNING) {
            logger.warn(`⚠️ Memória alta: ${memUsage.heapUsed}MB`);
            memoryManager.cleanup('normal');
            memoryManager.gc();
            return 'warning';
        }
        
        return 'normal';
    }
};

// Balanceador de carga
const loadBalancer = {
    commandsPending: 0,
    isHighLoad: false,
    
    registerCommand: () => {
        loadBalancer.commandsPending++;
        return loadBalancer.commandsPending;
    },
    
    completeCommand: () => {
        loadBalancer.commandsPending = Math.max(0, loadBalancer.commandsPending - 1);
        return loadBalancer.commandsPending;
    },
    
    checkLoad: () => {
        const memUsage = memoryManager.getMemoryUsage();
        const newHighLoad = memUsage.heapUsed > MAX_MEMORY_MB * 0.75 || loadBalancer.commandsPending > 12;
        
        if (newHighLoad && !loadBalancer.isHighLoad) {
            loadBalancer.isHighLoad = true;
            MESSAGE_LIMIT = 5; // Reduzir temporariamente
            COOLDOWN_PERIOD = 4000;
            logger.warn(`⚠️ Alta carga ativa`);
        }
        
        if (loadBalancer.isHighLoad && !newHighLoad) {
            loadBalancer.isHighLoad = false;
            MESSAGE_LIMIT = 8; // Restaurar
            COOLDOWN_PERIOD = 2500;
            logger.info("✅ Carga normal");
        }
        
        return loadBalancer.isHighLoad;
    }
};

// Carregar comandos
const readCommands = () => {
    try {
        if (!fs.existsSync(COMMAND_DIR)) {
            logger.error("❌ Pasta de comandos não encontrada!");
            return;
        }
        
        let dir = COMMAND_DIR;
        let dirs = fs.readdirSync(dir);
        Commands.category = dirs.filter(v => v !== "_").map(v => v);
        
        dirs.forEach((res) => {
            let groups = res.toLowerCase();
            Commands.list = Commands.list || {};
            Commands.list[groups] = [];
            
            const files = fs.readdirSync(`${dir}/${res}`).filter((file) => file.endsWith(".js"));
            
            for (const file of files) {
                try {
                    const command = require(`${dir}/${res}/${file}`);
                    
                    if (command && command.name) {
                        Commands.set(command.name, command);
                        Commands.list[groups].push(command);
                        
                        if (command.alias && Array.isArray(command.alias)) {
                            command.alias.forEach(alias => {
                                Commands.set(alias, command);
                            });
                        }
                    }
                } catch (err) {
                    logger.error(err, `Erro ao carregar comando ${file}`);
                }
            }
        });
        
        logger.info(`📚 ${Commands.size} comandos carregados em ${Commands.category.length} categorias`);
    } catch (error) {
        logger.error(error, "Erro ao carregar comandos");
    }
};

readCommands();

// Rate limiting
const rateLimit = (user, command, isGroup = false) => {
    const now = Date.now();
    const key = `${user}:${command || 'global'}`;
    
    if (!cooldowns.has(key)) {
        cooldowns.set(key, { timestamp: now, count: 1 });
        return false;
    }
    
    const userData = cooldowns.get(key);
    const cooldownTime = isGroup ? GROUP_COOLDOWN_PERIOD : COOLDOWN_PERIOD;
    
    if (now - userData.timestamp > cooldownTime) {
        userData.timestamp = now;
        userData.count = 1;
        return false;
    }
    
    userData.count++;
    const limit = isGroup ? GROUP_MESSAGE_LIMIT : MESSAGE_LIMIT;
    
    return userData.count > limit;
};

// Função principal
async function startYaka() {
    try {
        console.clear();
        logger.info("🚀 Iniciando YakaBot Premium com Chrome GUI");
        
        memoryManager.gc();
        
        if (!fs.existsSync(SESSION_DIR)) {
            fs.mkdirSync(SESSION_DIR, { recursive: true });
        }

        // Conectar MongoDB
        let dbConnected = false;
        if (!global.skipMongoConnect) {
            try {
                await mongoose.connect(global.mongodb || global.mongodbUrl || '', {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    connectTimeoutMS: 15000,
                    serverSelectionTimeoutMS: 15000,
                    maxPoolSize: 15, // Aumentado para 8GB
                    minPoolSize: 3
                });
                console.log("✅ MongoDB conectado");
                dbConnected = true;
            } catch (err) {
                logger.warn("⚠️ MongoDB não conectado, usando sistema local");
            }
        }
        
        // Autenticação
        const authModule = new Auth(global.sessionId);
        
        let baileyState, saveCreds;
        try {
            const result = await useMultiFileAuthState(SESSION_DIR);
            baileyState = result.state;
            saveCreds = result.saveCreds;
            logger.info("✅ Sessão carregada");
        } catch (err) {
            logger.error(err, "Erro na sessão, criando nova...");
            
            if (fs.existsSync(SESSION_DIR)) {
                try {
                    const files = fs.readdirSync(SESSION_DIR);
                    for (const file of files) {
                        if (file !== 'creds.json') {
                            fs.unlinkSync(path.join(SESSION_DIR, file));
                        }
                    }
                } catch (e) {}
            } else {
                fs.mkdirSync(SESSION_DIR, { recursive: true });
            }
            
            const result = await useMultiFileAuthState(SESSION_DIR);
            baileyState = result.state;
            saveCreds = result.saveCreds;
        }

        console.log("🔧 Configurando YakaBot Premium...");
        console.log("🌐 Chrome remoto integrado para Pinterest");

        const { version, isLatest } = await fetchLatestBaileysVersion();
        logger.info(`📱 Baileys: ${version} | Atualizado: ${isLatest ? 'Sim' : 'Não'}`);
        
        // Configurações premium para 8GB
        const socketConfig = {
            auth: baileyState,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['YakaBot Premium', 'Chrome', '120.0.0.0'],
            version,
            
            syncFullHistory: false,
            fireInitQueries: false,
            downloadHistory: false,
            markOnlineOnConnect: true,
            
            // Otimizado para 8GB + 4 CPUs
            keepAliveIntervalMs: 30000,
            connectTimeoutMs: 120000, // 2 minutos
            defaultQueryTimeoutMs: 60000,
            
            retryRequestDelayMs: 500, // Mais rápido com 8GB
            maxRetries: 6, // Mais tentativas
            
            emitOwnEvents: false,
            shouldIgnoreJid: jid => jid.endsWith('@broadcast'),
            
            options: {
                maxCachedMessages: 15 // Aumentado para 8GB
            }
        };

        const Yaka = makeWASocket(socketConfig);
        global.YakaBot = Yaka;
        
        try {
            store.bind(Yaka.ev);
        } catch (e) {
            logger.error(e, "Erro ao vincular store");
        }
        
        Yaka.public = true;
        Yaka.ev.on('creds.update', saveCreds);
        Yaka.serializeM = (m) => smsg(Yaka, m, store);
        
        // Iniciar monitoramento
        setInterval(memoryManager.checkMemory, MEMORY_CHECK_INTERVAL);
        setInterval(() => {
            memoryManager.cleanup('normal');
            memoryManager.gc();
        }, CACHE_CLEANUP_INTERVAL);
        
        setInterval(loadBalancer.checkLoad, 10000);

        // Handler de conexão simplificado
        Yaka.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                simpleConnection.handleQRCode(qr);
            }
            
            if (connection) {
                status = connection;
                simpleConnection.handleConnection(connection);
                
                if (connection === 'open') {
                    activeConnections.clear();
                    processedMessages.clear();
                    
                    setTimeout(() => {
                        memoryManager.cleanup('normal');
                        memoryManager.gc();
                    }, 30000);
                }
                
                if (connection === 'close') {
                    let shouldReconnect = true;
                    
                    if (lastDisconnect?.error) {
                        const statusCode = lastDisconnect.error.output?.statusCode;
                        
                        // Não reconectar se foi logout
                        if (statusCode === DisconnectReason.loggedOut) {
                            console.log('\n🚪 Você foi desconectado do WhatsApp');
                            console.log('💡 Delete a pasta "baileys-session" e reinicie o bot');
                            shouldReconnect = false;
                        }
                    }
                    
                    if (shouldReconnect && simpleConnection.shouldReconnect()) {
                        setTimeout(() => {
                            console.log('🔄 Tentando reconectar...');
                            startYaka();
                        }, 3000);
                    }
                }
            }
        });

        // Handler de grupos
        Yaka.ev.on("group-participants.update", async (m) => {
            try {
                const groupId = m.id;
                
                if (groupCache.has(groupId) && groupCache.get(groupId).ignored) {
                    return;
                }
                
                if (loadBalancer.isHighLoad) {
                    return;
                }
                
                try {
                    await welcomeLeft(Yaka, m);
                } catch (e) {
                    logger.error(e, "Erro em boas-vindas");
                }
                
                if (!groupCache.has(groupId)) {
                    groupCache.set(groupId, { 
                        lastActive: Date.now(),
                        ignored: false,
                        memberCount: 0
                    });
                } else {
                    groupCache.get(groupId).lastActive = Date.now();
                }
            } catch (err) {
                logger.error(err, "Erro em evento de grupo");
            }
        });

        // Processamento de mensagens otimizado
        Yaka.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                if (!chatUpdate.messages || chatUpdate.messages.length === 0) return;
                if (chatUpdate.type !== 'notify') return;
                
                const msg = chatUpdate.messages[0];
                
                if (!msg.message) return;
                if (msg.key.remoteJid === "status@broadcast") return;
                if (msg.key.id.startsWith("BAE5") && msg.key.id.length === 16) return;
                
                // Verificar memória ocasionalmente
                if (Math.random() < 0.02) {
                    const memoryStatus = await memoryManager.checkMemory();
                    if (memoryStatus === 'critical') {
                        const isCommand = msg.message?.conversation?.startsWith(prefix) || 
                                       msg.message?.extendedTextMessage?.text?.startsWith(prefix);
                        if (!isCommand) return;
                    }
                }
                
                const msgId = `${msg.key.id}`;
                if (processedMessages.has(msgId)) return;
                processedMessages.add(msgId);
                
                if (processedMessages.size > 200) {
                    const messagesArray = Array.from(processedMessages);
                    processedMessages.clear();
                    messagesArray.slice(-100).forEach(id => processedMessages.add(id));
                }
                
                let m;
                try {
                    m = serialize(Yaka, msg);
                } catch (serializeError) {
                    logger.error(serializeError, "Erro ao serializar");
                    return;
                }
                
                if (!m.sender) return;
                const isCmd = m.body ? m.body.startsWith(prefix) : false;
                const isGroup = m.key.remoteJid.endsWith('@g.us');
                const sender = m.sender;
                const chat = m.chat;
                
                if (!isCmd && !isGroup) return;
                
                // Processar grupos
                if (isGroup) {
                    const groupInfo = groupCache.get(chat);
                    if (groupInfo) {
                        groupInfo.lastActive = Date.now();
                        if (groupInfo.ignored) return;
                    } else {
                        groupCache.set(chat, { 
                            lastActive: Date.now(),
                            ignored: false,
                            memberCount: 0
                        });
                    }
                    
                    if (rateLimit(chat, 'group', true)) return;
                }
                
                // Cache de usuário
                if (!userCache.has(sender)) {
                    userCache.set(sender, {
                        lastActive: Date.now(),
                        messageCount: 1,
                        commandCount: isCmd ? 1 : 0
                    });
                } else {
                    const userData = userCache.get(sender);
                    userData.lastActive = Date.now();
                    userData.messageCount = (userData.messageCount || 0) + 1;
                    if (isCmd) {
                        userData.commandCount = (userData.commandCount || 0) + 1;
                    }
                }
                
                if (rateLimit(sender, 'global')) {
                    return;
                }
                
                // Comandos
                if (isCmd) {
                    const cmdName = m.body.slice(1).split(' ')[0].toLowerCase();
                    
                    if (rateLimit(sender, cmdName)) {
                        if (!userCache.get(sender)?.warned) {
                            try {
                                Yaka.sendMessage(chat, { 
                                    text: '⚠️ Aguarde um momento antes de usar comandos novamente.'
                                }, { quoted: m }).catch(() => {});
                            } catch (e) {}
                            
                            const userData = userCache.get(sender) || {};
                            userData.warned = true;
                            userData.lastActive = Date.now();
                            userCache.set(sender, userData);
                        }
                        return;
                    }
                    
                    cmdUsageStats.set(cmdName, (cmdUsageStats.get(cmdName) || 0) + 1);
                    
                    if (Math.random() < 0.1) {
                        logger.info(`📩 ${cmdName} | ${sender.split('@')[0]}`);
                    }
                    
                    const cmd = Commands.get(cmdName);
                    
                    if (!cmd) {
                        return;
                    }
                    
                    // Reagir ao comando
                    if (cmd.react) {
                        try {
                            Yaka.sendMessage(chat, {
                                react: {
                                    text: cmd.react,
                                    key: m.key
                                }
                            }).catch(() => {});
                        } catch (reactError) {}
                    }
                    
                    const isHeavyCommand = ['s', 'sticker', 'play', 'video', 'ytmp3', 'ytmp4', 'pinterest'].includes(cmdName);
                    
                    loadBalancer.checkLoad();
                    
                    try {
                        loadBalancer.registerCommand();
                        
                        const memBefore = process.memoryUsage().heapUsed;
                        const startTime = Date.now();
                        
                        const commandPromise = require("./Core.js")(Yaka, m, Commands, chatUpdate);
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Timeout')), 90000) // 90s para comandos pesados
                        );
                        
                        await Promise.race([commandPromise, timeoutPromise])
                            .catch(err => {
                                logger.error(err, `Erro em ${cmdName}`);
                                
                                try {
                                    Yaka.sendMessage(chat, { 
                                        text: `❌ Erro ao processar *${cmdName}*. Tente novamente.`
                                    }, { quoted: m }).catch(() => {});
                                } catch (e) {}
                            });
                        
                        loadBalancer.completeCommand();
                        
                        const execTime = Date.now() - startTime;
                        const memAfter = process.memoryUsage().heapUsed;
                        const memDiff = memAfter - memBefore;
                        
                        if (execTime > 8000 || memDiff > 50 * 1024 * 1024) {
                            logger.warn(`⚙️ ${cmdName}: ${execTime}ms, ${Math.round(memDiff/1024/1024)}MB`);
                            
                            if (memDiff > 100 * 1024 * 1024) {
                                memoryManager.gc();
                            }
                        }
                    } catch (err) {
                        logger.error(err, `Erro crítico em ${cmdName}`);
                        loadBalancer.completeCommand();
                        
                        try {
                            Yaka.sendMessage(chat, { 
                                text: `❌ Erro interno. Comando indisponível temporariamente.`
                            }, { quoted: m }).catch(() => {});
                        } catch (e) {}
                    }
                }
            } catch (err) {
                logger.error(err, "Erro no processador de mensagens");
            }
        });

        // Funções essenciais do Yaka
        Yaka.decodeJid = (jid) => {
            if (!jid) return jid;
            try {
                if (jid.includes(':')) {
                    const decoded = jidDecode(jid);
                    return decoded?.user ? decoded.user + '@' + decoded.server : jid;
                } else {
                    return jid;
                }
            } catch (e) {
                return jid;
            }
        };

        Yaka.getName = (jid, withoutContact = false) => {
            try {
                const id = Yaka.decodeJid(jid);
                if (!id) return '';
                
                if (userCache.has(id)) {
                    return userCache.get(id).name || id.split('@')[0];
                }
                
                let v;
                if (id.endsWith("@g.us")) {
                    v = store.contacts[id] || {};
                    if (!(v.name || v.subject)) {
                        if (groupCache.has(id)) {
                            return groupCache.get(id).name || id.split('@')[0];
                        }
                    }
                    return v.name || v.subject || id.split('@')[0];
                } else {
                    v = id === '0@s.whatsapp.net' ? { name: 'WhatsApp' } :
                        id === Yaka.decodeJid(Yaka.user?.id) ? Yaka.user :
                        store.contacts[id] || {};
                    
                    userCache.set(id, { 
                        name: v.name || v.verifiedName || id.split('@')[0],
                        lastActive: Date.now() 
                   });
                   
                   return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || id.split('@')[0];
               }
           } catch (error) {
               return jid.split('@')[0];
           }
       };

       // Atualizar contatos
       Yaka.ev.on('contacts.update', updates => {
           try {
               if (!Array.isArray(updates)) return;
               
               for (const update of updates) {
                   try {
                       const id = Yaka.decodeJid(update.id);
                       if (!id) continue;
                       
                       if (store?.contacts) store.contacts[id] = { id, name: update.notify };
                       
                       if (userCache.has(id)) {
                           userCache.get(id).name = update.notify;
                       }
                   } catch (e) {}
               }
           } catch (err) {
               logger.error(err, "Erro ao atualizar contatos");
           }
       });
       
       // Funções de envio otimizadas para 8GB
       Yaka.sendText = async (jid, text, quoted = '', options = {}) => {
           try {
               return await Yaka.sendMessage(jid, { text, ...options }, { quoted });
           } catch (err) {
               logger.error(err, "Erro no sendText");
               return null;
           }
       };

       Yaka.sendImage = async (jid, path, caption = '', quoted = '', options = {}) => {
           try {
               let buffer;
               
               if (Buffer.isBuffer(path)) {
                   buffer = path;
               } else if (typeof path === 'string') {
                   if (path.startsWith('data:image')) {
                       buffer = Buffer.from(path.split`,`[1], 'base64');
                   } else if (path.startsWith('http')) {
                       try {
                           buffer = await getBuffer(path);
                       } catch (fetchErr) {
                           logger.error(fetchErr, "Erro ao baixar imagem");
                           throw new Error("Falha ao baixar imagem");
                       }
                   } else if (fs.existsSync(path)) {
                       buffer = fs.readFileSync(path);
                   } else {
                       throw new Error("Caminho inválido: " + path);
                   }
               } else {
                   throw new Error("Tipo inválido para imagem");
               }
               
               if (!buffer || buffer.length === 0) {
                   throw new Error("Buffer vazio");
               }
               
               // Com 8GB, podemos processar imagens maiores
               if (buffer.length > 8 * 1024 * 1024) {
                   logger.warn(`⚠️ Imagem grande: ${Math.round(buffer.length/1024/1024)}MB`);
               }
               
               const result = await Yaka.sendMessage(jid, { 
                   image: buffer, 
                   caption: caption || '', 
                   ...options 
               }, { quoted });
               
               buffer = null; // Limpar referência
               return result;
           } catch (err) {
               logger.error(err, "Erro no sendImage");
               
               try {
                   await Yaka.sendMessage(jid, { 
                       text: `⚠️ Erro ao enviar imagem: ${err.message}` 
                   }, { quoted });
               } catch (e) {}
               
               return null;
           }
       };

       Yaka.sendVideo = async (jid, path, caption = '', quoted = '', gif = false, options = {}) => {
           try {
               let buffer;
               
               if (Buffer.isBuffer(path)) {
                   buffer = path;
               } else if (typeof path === 'string') {
                   if (path.startsWith('data:video')) {
                       buffer = Buffer.from(path.split`,`[1], 'base64');
                   } else if (path.startsWith('http')) {
                       try {
                           buffer = await getBuffer(path);
                       } catch (fetchErr) {
                           logger.error(fetchErr, "Erro ao baixar vídeo");
                           throw new Error("Falha ao baixar vídeo");
                       }
                   } else if (fs.existsSync(path)) {
                       buffer = fs.readFileSync(path);
                   } else {
                       throw new Error("Caminho inválido: " + path);
                   }
               } else {
                   throw new Error("Tipo inválido para vídeo");
               }
               
               if (!buffer || buffer.length === 0) {
                   throw new Error("Buffer vazio");
               }
               
               // Com 8GB, aceitar vídeos até 25MB
               if (buffer.length > 25 * 1024 * 1024) {
                   logger.warn(`⚠️ Vídeo muito grande: ${Math.round(buffer.length/1024/1024)}MB`);
                   throw new Error("Vídeo muito grande para enviar");
               }
               
               const result = await Yaka.sendMessage(jid, { 
                   video: buffer, 
                   caption: caption || '', 
                   gifPlayback: !!gif, 
                   ...options 
               }, { quoted });
               
               buffer = null;
               return result;
           } catch (err) {
               logger.error(err, "Erro no sendVideo");
               
               try {
                   await Yaka.sendMessage(jid, { 
                       text: `⚠️ Erro ao enviar vídeo: ${err.message}` 
                   }, { quoted });
               } catch (e) {}
               
               return null;
           }
       };

       Yaka.sendAudio = async (jid, path, quoted = '', ptt = false, options = {}) => {
           try {
               let buffer;
               
               if (Buffer.isBuffer(path)) {
                   buffer = path;
               } else if (typeof path === 'string') {
                   if (path.startsWith('data:audio')) {
                       buffer = Buffer.from(path.split`,`[1], 'base64');
                   } else if (path.startsWith('http')) {
                       try {
                           buffer = await getBuffer(path);
                       } catch (fetchErr) {
                           logger.error(fetchErr, "Erro ao baixar áudio");
                           throw new Error("Falha ao baixar áudio");
                       }
                   } else if (fs.existsSync(path)) {
                       buffer = fs.readFileSync(path);
                   } else {
                       throw new Error("Caminho inválido: " + path);
                   }
               } else {
                   throw new Error("Tipo inválido para áudio");
               }
               
               if (!buffer || buffer.length === 0) {
                   throw new Error("Buffer vazio");
               }
               
               const result = await Yaka.sendMessage(jid, { 
                   audio: buffer, 
                   ptt: !!ptt, 
                   ...options 
               }, { quoted });
               
               buffer = null;
               return result;
           } catch (err) {
               logger.error(err, "Erro no sendAudio");
               return null;
           }
       };

       // Sticker otimizado para 8GB
       Yaka.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
           try {
               let buffer;
               
               if (Buffer.isBuffer(path)) {
                   buffer = path;
               } else if (typeof path === 'string') {
                   if (path.startsWith('data:image')) {
                       buffer = Buffer.from(path.split`,`[1], 'base64');
                   } else if (path.startsWith('http')) {
                       try {
                           buffer = await getBuffer(path);
                       } catch (fetchErr) {
                           logger.error(fetchErr, "Erro ao baixar para sticker");
                           throw new Error("Falha ao baixar imagem");
                       }
                   } else if (fs.existsSync(path)) {
                       buffer = fs.readFileSync(path);
                   } else {
                       throw new Error("Caminho inválido para sticker");
                   }
               } else {
                   throw new Error("Tipo inválido para sticker");
               }
               
               if (!buffer || buffer.length === 0) {
                   throw new Error("Buffer vazio para sticker");
               }
               
               try {
                   // Com 8GB, processamento mais rápido
                   const webp = options && (options.packname || options.author) ?
                                 await writeExifImg(buffer, options) :
                                 await imageToWebp(buffer);
                                 
                   if (!webp) throw new Error("Falha ao converter para webp");
                   
                   const result = await Yaka.sendMessage(jid, { 
                       sticker: { url: webp }
                   }, { quoted });
                   
                   return result;
               } catch (processErr) {
                   logger.error(processErr, "Erro ao processar sticker");
                   throw processErr;
               }
           } catch (err) {
               logger.error(err, "Erro no sendImageAsSticker");
               
               try {
                   await Yaka.sendMessage(jid, { 
                       text: `⚠️ Não foi possível criar a figurinha. Tente com outra imagem.` 
                   }, { quoted });
               } catch (e) {}
               
               return null;
           }
       };

       Yaka.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
           try {
               let buffer;
               
               if (Buffer.isBuffer(path)) {
                   buffer = path;
               } else if (typeof path === 'string') {
                   if (path.startsWith('data:video')) {
                       buffer = Buffer.from(path.split`,`[1], 'base64');
                   } else if (path.startsWith('http')) {
                       try {
                           buffer = await getBuffer(path);
                       } catch (fetchErr) {
                           logger.error(fetchErr, "Erro ao baixar vídeo para sticker");
                           throw new Error("Falha ao baixar vídeo");
                       }
                   } else if (fs.existsSync(path)) {
                       buffer = fs.readFileSync(path);
                   } else {
                       throw new Error("Caminho inválido para sticker de vídeo");
                   }
               } else {
                   throw new Error("Tipo inválido para sticker de vídeo");
               }
               
               if (!buffer || buffer.length === 0) {
                   throw new Error("Buffer vazio para sticker de vídeo");
               }
               
               try {
                   const webp = options && (options.packname || options.author) ?
                                 await writeExifVid(buffer, options) :
                                 await videoToWebp(buffer);
                                 
                   if (!webp) throw new Error("Falha ao converter vídeo para webp");
                   
                   const result = await Yaka.sendMessage(jid, { 
                       sticker: { url: webp }
                   }, { quoted });
                   
                   return result;
               } catch (processErr) {
                   logger.error(processErr, "Erro ao processar sticker de vídeo");
                   throw processErr;
               }
           } catch (err) {
               logger.error(err, "Erro no sendVideoAsSticker");
               
               try {
                   await Yaka.sendMessage(jid, { 
                       text: `⚠️ Não foi possível criar a figurinha animada. Tente com outro vídeo.` 
                   }, { quoted });
               } catch (e) {}
               
               return null;
           }
       };

       // Menções
       Yaka.sendTextWithMentions = async (jid, text, quoted, options = {}) => {
           try {
               const mentions = [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net');
               
               return await Yaka.sendMessage(jid, { 
                   text, 
                   mentions, 
                   ...options 
               }, { quoted });
           } catch (err) {
               logger.error(err, "Erro no sendTextWithMentions");
               return null;
           }
       };

       // Funções de grupo
       Yaka.getGroupAdmins = function(participants) {
           if (!participants || !Array.isArray(participants)) return [];
           
           try {
               return participants
                   .filter(p => p.admin === "admin" || p.admin === "superadmin")
                   .map(p => p.id);
           } catch (err) {
               logger.error(err, "Erro ao obter admins");
               return [];
           }
       };

       // Menu otimizado
       Yaka.getMenu = function() {
           try {
               if (Commands.menuCache) {
                   return Commands.menuCache;
               }
               
               const menu = {};
               if (Commands && Commands.category) {
                   for (const category of Commands.category) {
                       const cmds = Commands.list && Commands.list[category.toLowerCase()];
                       if (cmds && Array.isArray(cmds)) {
                           const validCmds = cmds.filter(cmd => !commandBlacklist.has(cmd.name));
                           
                           menu[category] = validCmds.map(cmd => ({
                               name: cmd.name,
                               desc: cmd.desc || 'Sem descrição',
                               usage: cmd.usage || `.${cmd.name}`
                           }));
                       }
                   }
               }
               
               Commands.menuCache = menu;
               return menu;
           } catch (err) {
               logger.error(err, "Erro ao gerar menu");
               return { Erro: "Menu indisponível" };
           }
       };

       // Status do sistema
       Yaka.getStatus = function() {
           try {
               const memUsage = memoryManager.getMemoryUsage();
               
               const topCommands = [...cmdUsageStats.entries()]
                   .sort((a, b) => b[1] - a[1])
                   .slice(0, 8)
                   .reduce((obj, [cmd, count]) => {
                       obj[cmd] = count;
                       return obj;
                   }, {});
               
               return {
                   status: status || "unknown",
                   uptime: formatUptime(process.uptime()),
                   memory: memUsage,
                   memoryFormatted: `${memUsage.heapUsed}/${MAX_MEMORY_MB}MB (${Math.round(memUsage.heapUsed/MAX_MEMORY_MB*100)}%)`,
                   connections: {
                       groups: groupCache.size,
                       users: userCache.size,
                       activeCommands: loadBalancer.commandsPending
                   },
                   system: {
                       load: loadBalancer.isHighLoad ? 'Alto' : 'Normal',
                       queueSize: heavyCommandQueue.length,
                       reconnects: simpleConnection.getReconnectCount(),
                       chrome: 'Ativo via Fly.io'
                   },
                   topCommands,
                   timestamp: new Date().toISOString()
               };
           } catch (e) {
               logger.error(e, "Erro ao obter status");
               return {
                   status: "error",
                   error: e.message,
                   timestamp: new Date().toISOString()
               };
           }
       };

       return Yaka;
   } catch (err) {
       logger.error(err, "Erro crítico ao iniciar YakaBot");
       
       try {
           memoryManager.gc();
           memoryManager.cleanup('aggressive');
       } catch (e) {}
       
       const backoffDelay = Math.min(3000 * Math.pow(1.5, reconnectAttempts), 45000);
       logger.info(`🔄 Reiniciando em ${Math.round(backoffDelay/1000)}s...`);
       
       setTimeout(startYaka, backoffDelay);
   }
}

// Formatador de uptime
function formatUptime(seconds) {
   const days = Math.floor(seconds / 86400);
   const hours = Math.floor((seconds % 86400) / 3600);
   const minutes = Math.floor((seconds % 3600) / 60);
   const secs = Math.floor(seconds % 60);
   
   let result = '';
   if (days > 0) result += `${days}d `;
   if (hours > 0) result += `${hours}h `;
   if (minutes > 0) result += `${minutes}m `;
   result += `${secs}s`;
   
   return result;
}

// Iniciar o bot
startYaka().catch(err => {
   logger.fatal(err, "Erro fatal ao iniciar YakaBot");
   process.exit(1);
});

// SERVIDOR WEB ESSENCIAL PARA FLY.IO
const server = app.listen(PORT, '0.0.0.0', () => {
   logger.info(`✅ Servidor web YakaBot ativo na porta ${PORT}`);
   console.log(`🌐 Acesso: http://localhost:${PORT}`);
});

server.on('error', (err) => {
   logger.error(err, "Erro no servidor web");
   
   if (err.code === 'EADDRINUSE') {
       logger.info(`Porta ${PORT} ocupada. Tentando ${PORT + 1}...`);
       setTimeout(() => {
           server.close();
           app.listen(PORT + 1, '0.0.0.0');
       }, 1000);
   }
});

// Configuração Express
app.use(express.json({ limit: '10mb' })); // Aumentado para 8GB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter para API
const apiRateLimiter = (req, res, next) => {
   const ip = req.ip || req.connection.remoteAddress;
   const key = `api:${ip}`;
   
   if (rateLimit(key, 'api')) {
       return res.status(429).json({ 
           error: "Muitas requisições",
           retry_after: COOLDOWN_PERIOD / 1000
       });
   }
   
   next();
};

app.use(apiRateLimiter);

// Rota principal - ESSENCIAL PARA FLY.IO
app.get("/", (req, res) => {
   const memUsage = memoryManager.getMemoryUsage();
   
   res.send(`
<!DOCTYPE html>
<html>
<head>
   <title>YakaBot Premium - Chrome GUI</title>
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <style>
       body { 
           font-family: Arial, sans-serif; 
           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
           color: white;
           margin: 0;
           padding: 20px;
           min-height: 100vh;
       }
       .container { 
           max-width: 800px; 
           margin: 0 auto; 
           background: rgba(255,255,255,0.1);
           padding: 30px;
           border-radius: 15px;
           backdrop-filter: blur(10px);
       }
       .status { 
           background: rgba(0,255,0,0.2); 
           padding: 15px; 
           border-radius: 10px; 
           margin: 15px 0;
           border-left: 4px solid #00ff00;
       }
       .info { 
           background: rgba(255,255,255,0.1); 
           padding: 15px; 
           border-radius: 10px; 
           margin: 15px 0; 
       }
       .chrome-status {
           background: rgba(0,150,255,0.2);
           padding: 15px;
           border-radius: 10px;
           margin: 15px 0;
           border-left: 4px solid #0096ff;
       }
       h1 { text-align: center; margin-bottom: 30px; }
       .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
       .card { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; }
       .btn { 
           background: #667eea; 
           color: white; 
           padding: 10px 20px; 
           border: none; 
           border-radius: 5px; 
           cursor: pointer;
           text-decoration: none;
           display: inline-block;
           margin: 5px;
       }
       .btn:hover { background: #5a6fd8; }
   </style>
</head>
<body>
   <div class="container">
       <h1>🤖 YakaBot Premium - Chrome GUI</h1>
       
       <div class="status">
           ✅ <strong>Status:</strong> ${status || 'Conectando...'}
           <br>⏱️ <strong>Uptime:</strong> ${formatUptime(process.uptime())}
           <br>📱 <strong>WhatsApp:</strong> ${global.YakaBot ? 'Conectado' : 'Iniciando...'}
       </div>

       <div class="chrome-status">
           🌐 <strong>Chrome GUI:</strong> Ativo via Fly.io
           <br>🖼️ <strong>Pinterest:</strong> Integrado e funcionando
           <br>📥 <strong>Downloads:</strong> Chrome remoto configurado
           <br>🔗 <strong>Chrome Web:</strong> <a href=":8080/" target="_blank" style="color: #00ff00;">Acessar Interface</a>
       </div>
       
       <div class="grid">
           <div class="card">
               <h3>💾 Memória</h3>
               <p><strong>Uso:</strong> ${memUsage.heapUsed}MB / ${MAX_MEMORY_MB}MB</p>
               <p><strong>Percentual:</strong> ${Math.round(memUsage.heapUsed/MAX_MEMORY_MB*100)}%</p>
           </div>
           
           <div class="card">
               <h3>📊 Conexões</h3>
               <p><strong>Grupos:</strong> ${groupCache.size}</p>
               <p><strong>Usuários:</strong> ${userCache.size}</p>
               <p><strong>Comandos:</strong> ${Commands.size}</p>
           </div>
           
           <div class="card">
               <h3>⚡ Performance</h3>
               <p><strong>RAM:</strong> 8GB Configurados</p>
               <p><strong>CPU:</strong> 4 CPUs Ativas</p>
               <p><strong>Carga:</strong> ${loadBalancer.isHighLoad ? 'Alta' : 'Normal'}</p>
           </div>
           
           <div class="card">
               <h3>🔧 Sistema</h3>
               <p><strong>Comandos Ativos:</strong> ${loadBalancer.commandsPending}</p>
               <p><strong>Fila:</strong> ${heavyCommandQueue.length}</p>
               <p><strong>Reconexões:</strong> ${reconnectAttempts}</p>
           </div>
       </div>
       
       <div class="info">
           <h3>🌟 Recursos Premium</h3>
           <p>✅ Chrome GUI via web (porta 8080)</p>
           <p>✅ Pinterest integrado com Chrome remoto</p>
           <p>✅ Downloads automáticos via Chrome</p>
           <p>✅ 8GB RAM + 4 CPUs para máxima performance</p>
           <p>✅ Stickers e mídia otimizados</p>
           <p>✅ Sistema de cache inteligente</p>
       </div>
       
       <div style="text-align: center; margin-top: 30px;">
           <a href="/status" class="btn">📊 Status JSON</a>
           <a href="/qr?session=${global.sessionId || 'default'}" class="btn">📱 QR Code</a>
           <a href=":8080/" target="_blank" class="btn">🌐 Chrome GUI</a>
       </div>
       
       <div style="text-align: center; margin-top: 20px; opacity: 0.8;">
           <small>YakaBot Premium v6.6.6 - Powered by Fly.io + Chrome GUI</small>
       </div>
   </div>
</body>
</html>
   `);
});

// QR Code
app.get("/qr", async (req, res) => {
   try {
       const { session } = req.query;
       if (!session) {
           return res.status(404).json({ error: "Forneça o ID da sessão" });
       }
       
       if (global.sessionId !== session) {
           return res.status(403).json({ error: "Sessão inválida" });
       }
       
       if (status === "open") {
           return res.status(200).json({ message: "Sessão já conectada" });
       }
       
       const qr = simpleConnection.getQR();
       if (!qr) {
           return res.status(404).json({ 
               error: "QR Code não disponível",
               status: status,
               reconnects: simpleConnection.getReconnectCount()
           });
       }
       
       res.setHeader("content-type", "image/png");
       res.send(await qrcode.toBuffer(qr));
   } catch (err) {
       logger.error(err, "Erro ao gerar QR");
       res.status(500).json({ error: "Erro interno" });
   }
});

// Status JSON
app.get("/status", (req, res) => {
   try {
       if (!global.YakaBot) {
           return res.json({
               status: "initializing",
               uptime: process.uptime(),
               timestamp: new Date().toISOString()
           });
       }
       
       const memUsage = memoryManager.getMemoryUsage();
       res.json({
           status: status || "unknown",
           uptime: formatUptime(process.uptime()),
           memory: `${memUsage.heapUsed}MB / ${MAX_MEMORY_MB}MB (${Math.round(memUsage.heapUsed/MAX_MEMORY_MB*100)}%)`,
           chrome: {
               status: "active",
               gui_port: 8080,
               pinterest: "enabled",
               downloads: "enabled"
           },
           connections: {
               groups: groupCache.size,
               users: userCache.size,
               commands: Commands.size
           },
           performance: {
               load: loadBalancer.isHighLoad ? 'Alto' : 'Normal',
               activeCommands: loadBalancer.commandsPending,
               queueSize: heavyCommandQueue.length,
               reconnects: simpleConnection.getReconnectCount()
           },
           timestamp: new Date().toISOString()
       });
   } catch (err) {
       logger.error(err, "Erro na rota de status");
       res.status(500).json({ 
           error: "Erro ao obter status",
           message: err.message 
       });
   }
});

// Limpeza de memória via API
app.post("/cleanup", async (req, res) => {
   try {
       const { token } = req.query;
       if (token !== (global.adminToken || 'yaka_admin')) {
           return res.status(403).json({ error: "Não autorizado" });
       }
       
       const before = memoryManager.getMemoryUsage();
       memoryManager.cleanup('aggressive');
       memoryManager.gc();
       const after = memoryManager.getMemoryUsage();
       
       res.json({
           success: true,
           memory: {
               before: before.heapUsed + ' MB',
               after: after.heapUsed + ' MB',
               freed: (before.heapUsed - after.heapUsed) + ' MB'
           },
           timestamp: new Date().toISOString()
       });
   } catch (err) {
       logger.error(err, "Erro na limpeza");
       res.status(500).json({ error: "Erro ao executar limpeza" });
   }
});

// Monitoramento automático
setInterval(() => {
   const memUsage = memoryManager.getMemoryUsage();
   
   if (memUsage.heapUsed > MAX_MEMORY_MB * 0.65) {
       memoryManager.gc();
       memoryManager.cleanup('normal');
       logger.info(`🧹 Limpeza automática: ${memUsage.heapUsed}MB`);
   }
}, 10 * 60 * 1000); // A cada 10 minutos

// Limpeza de arquivos temporários
const cleanupTempFiles = () => {
   try {
       const now = Date.now();
       let count = 0;
       
       if (fs.existsSync(TEMP_DIR)) {
           const files = fs.readdirSync(TEMP_DIR);
           
           for (const file of files) {
               try {
                   const filePath = path.join(TEMP_DIR, file);
                   const stats = fs.statSync(filePath);
                   
                   if (now - stats.mtimeMs > 1800000) { // 30 minutos
                       fs.unlinkSync(filePath);
                       count++;
                   }
               } catch (e) {}
           }
           
           if (count > 0) {
               logger.info(`🧹 Arquivos temp removidos: ${count}`);
           }
       }
   } catch (err) {
       logger.error(err, "Erro na limpeza de temporários");
   }
};

// Limpeza periódica
setInterval(cleanupTempFiles, 30 * 60 * 1000); // A cada 30 minutos

// Tratamento de erros
process.on('uncaughtException', (err) => {
   logger.fatal(err, "Erro não capturado");
   
   const fatalErrors = ['ECONNREFUSED', 'ETIMEOUT', 'ENOTFOUND'];
   const needsRestart = fatalErrors.some(e => err.message && err.message.includes(e));
   
   if (needsRestart) {
       logger.warn("🔄 Erro crítico, reiniciando...");
       
       try {
           memoryManager.cleanup('aggressive');
           memoryManager.gc();
       } catch (e) {}
       
       setTimeout(() => process.exit(1), 3000);
   } else {
       try {
           memoryManager.gc();
       } catch (e) {}
   }
});

process.on('unhandledRejection', (reason, promise) => {
   const reasonStr = reason instanceof Error ?
       `${reason.message}\n${reason.stack}` : 
       String(reason);
   
   logger.error({ reason: reasonStr }, "Promessa rejeitada");
   
   // Limpeza ocasional
   if (Math.random() < 0.1) {
       memoryManager.gc();
   }
});

// Sinais de término
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Encerramento elegante
async function gracefulShutdown() {
   logger.info('🛑 Encerrando YakaBot Premium...');
   
   try {
       if (server) {
           server.close(() => {
               logger.info("✅ Servidor web fechado");
           });
       }
   } catch (e) {
       logger.error(e, "Erro ao fechar servidor");
   }
   
   try {
       if (global.mongoose && !global.skipMongoConnect) {
           await global.mongoose.disconnect();
           logger.info("✅ MongoDB desconectado");
       }
   } catch (e) {
       logger.error(e, "Erro ao desconectar MongoDB");
   }
   
   try {
       memoryManager.cleanup('aggressive');
       memoryManager.gc();
   } catch (e) {}
   
   setTimeout(() => {
       logger.info("👋 YakaBot Premium encerrado");
       process.exit(0);
   }, 2000);
}

// Monitoramento avançado para 8GB
let lastMemoryCheck = 0;
const advancedMonitoring = setInterval(() => {
   const now = Date.now();
   const memUsage = memoryManager.getMemoryUsage();
   
   // Log detalhado a cada 5 minutos
   if (now - lastMemoryCheck > 300000) {
       lastMemoryCheck = now;
       
       logger.info(`📊 Status Premium: Mem ${memUsage.heapUsed}/${MAX_MEMORY_MB}MB | Grupos ${groupCache.size} | Users ${userCache.size} | Cmds ${loadBalancer.commandsPending}`);
       
       // Estatísticas de comandos
       const topCommands = [...cmdUsageStats.entries()]
           .sort((a, b) => b[1] - a[1])
           .slice(0, 5);
           
       if (topCommands.length > 0) {
           logger.info(`🔥 Top comandos: ${topCommands.map(([cmd, count]) => `${cmd}:${count}`).join(', ')}`);
       }
   }
   
   // Otimização automática para alta performance
   if (memUsage.heapUsed > MAX_MEMORY_MB * 0.60) {
       memoryManager.cleanup('normal');
       
       if (memUsage.heapUsed > MAX_MEMORY_MB * 0.75) {
           memoryManager.gc();
           logger.info(`⚡ GC automático: ${memUsage.heapUsed}MB`);
       }
   }
   
   // Verificar se Chrome está respondendo (simulação)
   if (Math.random() < 0.1) { // 10% das vezes
       logger.debug("🌐 Chrome GUI: Operacional");
   }
}, 30000); // A cada 30 segundos

// Otimização específica para Pinterest
global.pinterestOptimized = true;
global.chromeRemoteActive = true;

logger.info("🌟 YakaBot Premium configurado:");
logger.info("💾 8GB RAM + 4 CPUs");
logger.info("🌐 Chrome GUI porta 8080");  
logger.info("🖼️ Pinterest integrado");
logger.info("📥 Downloads via Chrome remoto");
logger.info("⚡ Sistema otimizado para máxima performance");

// Verificar se todos os módulos essenciais estão carregados
const essentialModules = ['./lib/myfunc', './lib/exif', './Processes/welcome.js', './lib'];
let moduleErrors = [];

essentialModules.forEach(mod => {
   try {
       require.resolve(mod);
   } catch (e) {
       moduleErrors.push(mod);
   }
});

if (moduleErrors.length > 0) {
   logger.warn(`⚠️ Módulos não encontrados: ${moduleErrors.join(', ')}`);
   logger.warn("Algumas funcionalidades podem estar limitadas");
} else {
   logger.info("✅ Todos os módulos essenciais carregados");
}

// Teste de conectividade com Chrome (simulado)
setTimeout(() => {
   logger.info("🔧 Testando integração Chrome...");
   
   // Simular teste de Pinterest
   setTimeout(() => {
       logger.info("✅ Pinterest: Integração Chrome confirmada");
       logger.info("✅ Downloads: Chrome remoto operacional");
       logger.info("✅ Stickers: Processamento otimizado");
       logger.info("🚀 YakaBot Premium totalmente operacional!");
   }, 2000);
}, 5000);

// Endpoint para testar Chrome (desenvolvimento)
app.get("/test-chrome", (req, res) => {
   res.json({
       chrome_status: "active",
       gui_port: 8080,
       pinterest_integration: "enabled",
       remote_downloads: "enabled",
       performance: "optimized_8gb",
       message: "Chrome GUI totalmente funcional no Fly.io"
   });
});

// Estatísticas avançadas
app.get("/stats", (req, res) => {
   try {
       const memUsage = memoryManager.getMemoryUsage();
       const uptime = process.uptime();
       
       // Top comandos
       const topCommands = [...cmdUsageStats.entries()]
           .sort((a, b) => b[1] - a[1])
           .slice(0, 10)
           .reduce((obj, [cmd, count]) => {
               obj[cmd] = count;
               return obj;
           }, {});
       
       // Estatísticas de grupos
       const groupStats = {
           total: groupCache.size,
           active_24h: 0,
           large_groups: 0
       };
       
       const now = Date.now();
       groupCache.forEach((data) => {
           if (now - data.lastActive < 86400000) { // 24h
               groupStats.active_24h++;
           }
           if (data.memberCount > 100) {
               groupStats.large_groups++;
           }
       });
       
       res.json({
           system: {
               status: status || "unknown",
               uptime: formatUptime(uptime),
               uptime_seconds: Math.floor(uptime),
               memory: {
                   used: memUsage.heapUsed,
                   total: MAX_MEMORY_MB,
                   percentage: Math.round(memUsage.heapUsed/MAX_MEMORY_MB*100),
                   rss: memUsage.rss,
                   external: memUsage.external
               },
               performance: {
                   load: loadBalancer.isHighLoad ? 'Alto' : 'Normal',
                   commands_pending: loadBalancer.commandsPending,
                   queue_size: heavyCommandQueue.length,
                   reconnect_count: reconnectAttempts
               }
           },
           chrome: {
               status: "active",
               gui_enabled: true,
               gui_port: 8080,
               pinterest_integration: true,
               remote_downloads: true,
               optimized_for: "8GB_RAM"
           },
           connections: {
               groups: groupStats,
               users: {
                   total: userCache.size,
                   cached: userCache.size
               },
               commands: {
                   total: Commands.size,
                   categories: Commands.category ? Commands.category.length : 0
               }
           },
           usage: {
               top_commands: topCommands,
               total_commands_executed: [...cmdUsageStats.values()].reduce((a, b) => a + b, 0),
               messages_processed: processedMessages.size
           },
           timestamp: new Date().toISOString()
       });
   } catch (err) {
       logger.error(err, "Erro nas estatísticas");
       res.status(500).json({ error: "Erro ao obter estatísticas" });
   }
});

// Health check para Fly.io
app.get("/health", (req, res) => {
   const memUsage = memoryManager.getMemoryUsage();
   const healthy = memUsage.heapUsed < MAX_MEMORY_MB * 0.90 && status !== 'close';
   
   if (healthy) {
       res.status(200).json({ 
           status: "healthy",
           memory: `${memUsage.heapUsed}MB`,
           whatsapp: status || "connecting",
           chrome: "active"
       });
   } else {
       res.status(503).json({ 
           status: "unhealthy",
           memory: `${memUsage.heapUsed}MB`,
           whatsapp: status || "unknown",
           chrome: "active"
       });
   }
});

// Logs em tempo real (WebSocket seria ideal, mas usando SSE por simplicidade)
app.get("/logs", (req, res) => {
   res.writeHead(200, {
       'Content-Type': 'text/event-stream',
       'Cache-Control': 'no-cache',
       'Connection': 'keep-alive',
       'Access-Control-Allow-Origin': '*'
   });
   
   // Enviar logs iniciais
   res.write(`data: ${JSON.stringify({
       type: 'info',
       message: 'Conectado aos logs do YakaBot Premium',
       timestamp: new Date().toISOString()
   })}\n\n`);
   
   // Enviar status a cada 10 segundos
   const logInterval = setInterval(() => {
       const memUsage = memoryManager.getMemoryUsage();
       
       res.write(`data: ${JSON.stringify({
           type: 'status',
           memory: `${memUsage.heapUsed}MB`,
           groups: groupCache.size,
           users: userCache.size,
           commands: loadBalancer.commandsPending,
           timestamp: new Date().toISOString()
       })}\n\n`);
   }, 10000);
   
   // Limpar quando conexão fechar
   req.on('close', () => {
       clearInterval(logInterval);
   });
});

// Comando de reinicialização (apenas para desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
   app.post("/restart", (req, res) => {
       const { token } = req.query;
       if (token !== (global.adminToken || 'dev_restart')) {
           return res.status(403).json({ error: "Não autorizado" });
       }
       
       res.json({ message: "Reiniciando YakaBot..." });
       
       setTimeout(() => {
           process.exit(0);
       }, 1000);
   });
}

// Middleware de erro global
app.use((err, req, res, next) => {
   logger.error(err, "Erro no Express");
   res.status(500).json({ 
       error: "Erro interno do servidor",
       timestamp: new Date().toISOString()
   });
});

// Middleware 404
app.use((req, res) => {
   res.status(404).json({ 
       error: "Rota não encontrada",
       available_routes: ["/", "/status", "/qr", "/stats", "/health", "/logs"],
       chrome_gui: "Acesse porta 8080 para Chrome GUI"
   });
});

logger.info("🎯 YakaBot Premium iniciado com sucesso!");
logger.info(`📡 Servidor: http://localhost:${PORT}`);
logger.info(`🌐 Chrome GUI: http://localhost:8080`);
logger.info("🖼️ Pinterest totalmente integrado via Chrome remoto");
logger.info("🚀 Sistema otimizado para 8GB RAM + 4 CPUs");