/*▓██ ██▓ ▄▄▄ ██ ▄█▀▄▄▄
 ▒██ ██▒▒████▄ ██▄█▒▒████▄
 ▒██ ██░▒██ ▀█▄ ▓███▄░▒██ ▀█▄
 ░ ▐██▓░░██▄▄▄▄██ ▓██ █▄░██▄▄▄▄██
 ░ ██▒▓░ ▓█ ▓██▒▒██▒ █▄▓█ ▓██▒
 ██▒▒▒ ▒▒ ▓▒█░▒ ▒▒ ▓▒▒▒ ▓▒█░
 ▓██ ░▒░ ▒ ▒▒ ░░ ░▒ ▒░ ▒ ▒▒ ░
 ▒ ▒ ░░ ░ ▒ ░ ░░ ░ ░ ▒
 ░ ░ ░ ░░ ░ ░ ░
 ░ ░
Olá,
Obrigado por usar o bot Yaka.
Eu sou,
██╗ ██╗ █████╗ ██╗ ██╗ █████╗ ███████╗██╗ ██╗██╗
╚██╗ ██╔╝██╔══██╗██║ ██╔╝██╔══██╗██╔════╝██║ ██║██║
 ╚████╔╝ ███████║█████╔╝ ███████║███████╗███████║██║
 ╚██╔╝ ██╔══██║██╔═██╗ ██╔══██║╚════██║██╔══██║██║
 ██║ ██║ ██║██║ ██╗██║ ██║███████║██║ ██║██║
 ╚═╝ ╚═╝ ╚═╝╚═╝ ╚═╝╚═╝ ╚═╝╚══════╝╚═╝ ╚═╝╚═╝
 */

// Sistema HÍBRIDO - MongoDB + Sistema Local com fallback automático
console.log("🚀 Carregando sistema de banco de dados híbrido...");

const fs = require('fs');
const path = require('path');

// Carregar config
let config;
try {
    config = require('../config');
} catch (e) {
    config = { mongodb: "" };
}

// Sistema de armazenamento em memória (ultra rápido)
const inMemoryDB = {
    groups: new Map(),
    users: new Map(), 
    characters: new Map(),
    lastSave: Date.now()
};

// Arquivo para persistência local
const DB_FILE = path.join(__dirname, '../bot_database.json');

// Funções de persistência local
const saveToFile = () => {
    try {
        const data = {
            groups: Object.fromEntries(inMemoryDB.groups),
            users: Object.fromEntries(inMemoryDB.users),
            characters: Object.fromEntries(inMemoryDB.characters),
            timestamp: Date.now()
        };
        
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        inMemoryDB.lastSave = Date.now();
    } catch (e) {
        console.log("⚠️ Erro ao salvar banco local:", e.message);
    }
};

const loadFromFile = () => {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            
            if (data.groups) inMemoryDB.groups = new Map(Object.entries(data.groups));
            if (data.users) inMemoryDB.users = new Map(Object.entries(data.users));
            if (data.characters) inMemoryDB.characters = new Map(Object.entries(data.characters));
            
            console.log("✅ Banco local carregado com sucesso!");
        }
    } catch (e) {
        console.log("⚠️ Erro ao carregar banco local, usando dados vazios");
    }
};

// Verificar se MongoDB está configurado
const isMongoConfigured = config.mongodb && config.mongodb.trim() !== '' && config.mongodb !== 'mongodb://localhost:27017/yakabot';
let mongoAvailable = false;
let mk, mku, mkchar;

// Tentar conectar ao MongoDB apenas se configurado
if (isMongoConfigured) {
    try {
        const mongoose = require("mongoose");
        
        const db1 = mongoose.createConnection(config.mongodb, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 5000,
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 5
        });
        
        // Schemas otimizados
        const GroupSchema = new mongoose.Schema({
            id: { type: String, unique: true, required: true },
            antilink: { type: String, default: "false" },
            nsfw: { type: String, default: "false" },
            bangroup: { type: String, default: "false" },
            chatBot: { type: String, default: "false" },
            botSwitch: { type: String, default: "true" },
            switchNSFW: { type: String, default: "false" },
            switchWelcome: { type: String, default: "false" }
        });
        
        const UserSchema = new mongoose.Schema({
            id: { type: String, unique: true, required: true },
            ban: { type: String, default: "false" },
            name: { type: String },
            gcname: { type: String },
            reason: { type: String, default: "no reason" },
            addedMods: { type: String, default: "false" }
        });
        
        const CharacterSchema = new mongoose.Schema({
            id: { type: String, unique: false, required: true, default: "1" },
            seletedCharacter: { type: String, default: "0" },
            PMchatBot: { type: String, default: "false" },
            privateMode: { type: String, default: "false" }
        });
        
        mk = db1.model("Mk", GroupSchema);
        mku = db1.model("Mku", UserSchema);
        mkchar = db1.model("Mkchar", CharacterSchema);
        
        // Eventos de conexão
        db1.on('connected', () => {
            console.log("✅ MongoDB conectado com sucesso!");
            mongoAvailable = true;
        });
        
        db1.on('error', (err) => {
            console.log("⚠️ Erro MongoDB, usando sistema local:", err.message);
            mongoAvailable = false;
        });
        
        db1.on('disconnected', () => {
            console.log("⚠️ MongoDB desconectado, usando sistema local");
            mongoAvailable = false;
        });
        
    } catch (error) {
        console.log("⚠️ Erro ao configurar MongoDB, usando sistema local:", error.message);
        mongoAvailable = false;
    }
} else {
    console.log("🚀 Sistema local ativado (MongoDB não configurado)");
}

// Carregar dados locais na inicialização
loadFromFile();

// Sistema de modelos híbrido (funciona com ou sem MongoDB)
const createHybridModel = (modelName, defaultData, mongoModel) => {
    return {
        findOne: async (query) => {
            try {
                // Tentar MongoDB primeiro se disponível
                if (mongoAvailable && mongoModel) {
                    const result = await Promise.race([
                        mongoModel.findOne(query),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                    ]);
                    return result;
                }
            } catch (e) {
                // Fallback para sistema local
            }
            
            // Sistema local
            const id = query.id;
            const data = inMemoryDB[modelName].get(id);
            return data || null;
        },
        
        findOneAndUpdate: async (query, update, options = {}) => {
            const id = query.id;
            
            try {
                // Tentar MongoDB primeiro se disponível
                if (mongoAvailable && mongoModel) {
                    const result = await Promise.race([
                        mongoModel.findOneAndUpdate(query, update, { 
                            ...options, 
                            new: true, 
                            upsert: true 
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                    ]);
                    return result;
                }
            } catch (e) {
                // Fallback para sistema local
            }
            
            // Sistema local
            let data = inMemoryDB[modelName].get(id);
            
            if (!data) {
                if (options.upsert !== false) {
                    data = { id, ...defaultData };
                    inMemoryDB[modelName].set(id, data);
                } else {
                    return null;
                }
            }
            
            // Aplicar updates
            if (update.$set) {
                Object.assign(data, update.$set);
            }
            
            // Salvar no arquivo (throttled)
            const now = Date.now();
            if (now - inMemoryDB.lastSave > 5000) { // Salvar no máximo a cada 5 segundos
                setTimeout(saveToFile, 1000);
            }
            
            return data;
        },
        
        create: async (data) => {
            try {
                // Tentar MongoDB primeiro se disponível
                if (mongoAvailable && mongoModel) {
                    const result = await Promise.race([
                        mongoModel.create(data),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                    ]);
                    return result;
                }
            } catch (e) {
                // Fallback para sistema local
            }
            
            // Sistema local
            inMemoryDB[modelName].set(data.id, data);
            setTimeout(saveToFile, 1000);
            return data;
        },
        
        updateOne: async (query, update) => {
            return await this.findOneAndUpdate(query, update);
        },
        
        deleteOne: async (query) => {
            const id = query.id;
            
            try {
                // Tentar MongoDB primeiro se disponível
                if (mongoAvailable && mongoModel) {
                    await Promise.race([
                        mongoModel.deleteOne(query),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                    ]);
                }
            } catch (e) {
                // Continuar com sistema local mesmo se MongoDB falhar
            }
            
            // Sistema local
            const deleted = inMemoryDB[modelName].delete(id);
            if (deleted) {
                setTimeout(saveToFile, 1000);
            }
            return { deletedCount: deleted ? 1 : 0 };
        }
    };
};

// Dados padrão para cada modelo
const groupDefaults = {
    antilink: "false",
    nsfw: "false", 
    bangroup: "false",
    chatBot: "false",
    botSwitch: "true",
    switchNSFW: "false",
    switchWelcome: "false"
};

const userDefaults = {
    ban: "false",
    name: "",
    gcname: "",
    reason: "no reason",
    addedMods: "false"
};

const characterDefaults = {
    seletedCharacter: "0",
    PMchatBot: "false",
    privateMode: "false"
};

// Criar modelos híbridos
const hybridMk = createHybridModel('groups', groupDefaults, mk);
const hybridMku = createHybridModel('users', userDefaults, mku);
const hybridMkchar = createHybridModel('characters', characterDefaults, mkchar);

// Salvar dados periodicamente (a cada 2 minutos)
setInterval(saveToFile, 2 * 60 * 1000);

// Salvar ao encerrar o processo
process.on('exit', saveToFile);
process.on('SIGINT', () => {
    saveToFile();
    process.exit(0);
});
process.on('SIGTERM', () => {
    saveToFile();
    process.exit(0);
});

// Exportar modelos
module.exports = {
    mk: hybridMk,
    mku: hybridMku, 
    mkchar: hybridMkchar,
    
    // Funções utilitárias
    isMongoAvailable: () => mongoAvailable,
    isLocalMode: () => !mongoAvailable,
    getStats: () => ({
        groups: inMemoryDB.groups.size,
        users: inMemoryDB.users.size,
        characters: inMemoryDB.characters.size,
        mongoAvailable,
        lastSave: inMemoryDB.lastSave
    }),
    
    // Força salvamento manual
    forceSave: saveToFile,
    
    // Limpar dados (apenas local)
    clearLocal: () => {
        inMemoryDB.groups.clear();
        inMemoryDB.users.clear();
        inMemoryDB.characters.clear();
        saveToFile();
    }
};

console.log(mongoAvailable ? 
    "✅ Sistema híbrido: MongoDB + Local" : 
    "🚀 Sistema local ativo (ultra rápido)"
);
