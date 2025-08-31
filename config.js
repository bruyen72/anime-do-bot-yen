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

require("dotenv").config();

let gg = process.env.MODS;
if (!gg) {
    gg = "6584660212"; // Você pode mudar este número //
}

// -------------------------------------------------------------- //
global.owner = gg.split(",");

// SEM MONGODB - SISTEMA LOCAL ULTRA RÁPIDO
global.mongodb = ""; // Vazio = sem MongoDB
global.mongodbUrl = ""; // Vazio = sem MongoDB
global.useLocalDB = true; // Usar sistema local

global.sessionId = process.env.SESSION_ID || "ok";
global.prefa = process.env.PREFIX || ".";
global.tenorApiKey = process.env.TENOR_API_KEY || "AIzaSyCAYZ930Rq1EFiRNRJuSeGGrKljCnOb8-U";
global.packname = process.env.PACKNAME || `👹 𝕐𝕒𝕜𝕒ᵐᵈ`;
global.author = process.env.AUTHOR || "por: 𝖄𝖆𝖐𝖆𝖘𝖍𝖎";
global.port = process.env.PORT || "3000";

// CACHE LOCAL ULTRA RÁPIDO (substitui MongoDB)
global.cache = {
    botSwitch: new Map(), // Liga/desliga bot por grupo
    chatbot: new Map(),   // Chatbot por grupo
    nsfw: new Map(),      // NSFW por grupo
    banned: new Map(),    // Usuários banidos
    settings: new Map(),  // Configurações gerais
    antilink: new Map()   // Antilink por grupo
};

// SISTEMA DE PERSISTÊNCIA SIMPLES (salva em arquivo)
const fs = require('fs');
const path = require('path');
const CACHE_FILE = path.join(__dirname, 'bot_cache.json');

// Carregar cache do arquivo
global.loadCache = () => {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            
            // Converter objetos de volta para Maps
            if (data.botSwitch) global.cache.botSwitch = new Map(Object.entries(data.botSwitch));
            if (data.chatbot) global.cache.chatbot = new Map(Object.entries(data.chatbot));
            if (data.nsfw) global.cache.nsfw = new Map(Object.entries(data.nsfw));
            if (data.banned) global.cache.banned = new Map(Object.entries(data.banned));
            if (data.settings) global.cache.settings = new Map(Object.entries(data.settings));
            if (data.antilink) global.cache.antilink = new Map(Object.entries(data.antilink));
            
            console.log("✅ Cache local carregado!");
        }
    } catch (e) {
        console.log("⚠️ Erro ao carregar cache, usando padrão");
    }
};

// Salvar cache no arquivo
global.saveCache = () => {
    try {
        const data = {
            botSwitch: Object.fromEntries(global.cache.botSwitch),
            chatbot: Object.fromEntries(global.cache.chatbot),
            nsfw: Object.fromEntries(global.cache.nsfw),
            banned: Object.fromEntries(global.cache.banned),
            settings: Object.fromEntries(global.cache.settings),
            antilink: Object.fromEntries(global.cache.antilink)
        };
        
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("⚠️ Erro ao salvar cache");
    }
};

// FUNÇÕES ULTRA RÁPIDAS (substituem MongoDB)
global.db = {
    // Bot Switch (liga/desliga bot por grupo)
    getBotSwitch: (chatId) => {
        return global.cache.botSwitch.get(chatId) !== false; // Default: true
    },
    
    setBotSwitch: async (chatId, value) => {
        global.cache.botSwitch.set(chatId, value);
        global.saveCache();
        return true;
    },
    
    // Chatbot
    getChatbot: (chatId) => {
        return global.cache.chatbot.get(chatId) || false; // Default: false
    },
    
    setChatbot: async (chatId, value) => {
        global.cache.chatbot.set(chatId, value);
        global.saveCache();
        return true;
    },
    
    // NSFW
    getNSFW: (chatId) => {
        return global.cache.nsfw.get(chatId) || false; // Default: false
    },
    
    setNSFW: async (chatId, value) => {
        global.cache.nsfw.set(chatId, value);
        global.saveCache();
        return true;
    },
    
    // Sistema de Ban
    getBanned: (userId) => {
        return global.cache.banned.get(userId) || false; // Default: false
    },
    
    setBanned: async (userId, value) => {
        global.cache.banned.set(userId, value);
        global.saveCache();
        return true;
    },
    
    // Antilink
    getAntilink: (chatId) => {
        return global.cache.antilink.get(chatId) || false; // Default: false
    },
    
    setAntilink: async (chatId, value) => {
        global.cache.antilink.set(chatId, value);
        global.saveCache();
        return true;
    },
    
    // Configurações gerais
    getSetting: (key) => {
        return global.cache.settings.get(key);
    },
    
    setSetting: async (key, value) => {
        global.cache.settings.set(key, value);
        global.saveCache();
        return true;
    }
};

// Carregar cache na inicialização
global.loadCache();

// Salvar cache a cada 5 minutos
setInterval(global.saveCache, 5 * 60 * 1000);

// CONFIGURAÇÕES DE VELOCIDADE
global.fastMode = true;
global.quickResponse = true;
global.localMode = true;

console.log("🚀 Sistema local ativado - ULTRA RÁPIDO!");

module.exports = {
    mongodb: global.mongodb,
};

// ---------------------Não Modifique esta parte------------------- //
global.mess = {
    jobdone: "✅ Tarefa concluída!",
    useradmin: "❌ Apenas *Administradores* podem usar este comando!",
    botadmin: "❌ Preciso ser *Administrador* para executar este comando!",
    botowner: "❌ Apenas meu *Dono* pode usar este comando!",
    grouponly: "❌ Este comando é apenas para *Grupos*!",
    privateonly: "❌ Este comando é apenas para *Chat Privado*!",
    botonly: "❌ Apenas o próprio *Bot* pode usar este comando!",
    waiting: "⏳ Processando...",
    nolink: "❌ Forneça um *link*!",
    error: "❌ Ocorreu um erro!",
    banned: `🚫 Você está banido!\n\nDigite ${global.prefa}owner para solicitar desbloqueio.`,
    bangc: "🚫 Este grupo está *banido*!",
    nonsfw: "🔞 Este grupo não permite conteúdo NSFW!",
};
