/*▓██   ██▓ ▄▄▄       ██ ▄█▀▄▄▄      
 ▒██  ██▒▒████▄     ██▄█▒▒████▄    
  ▒██ ██░▒██  ▀█▄  ▓███▄░▒██  ▀█▄  
  ░ ▐██▓░░██▄▄▄▄██ ▓██ █▄░██▄▄▄▄██ 
  ░ ██▒▓░ ▓█   ▓██▒▒██▒ █▄▓█   ▓██▒
   ██▒▒▒  ▒▒   ▓▒█░▒ ▒▒ ▓▒▒▒   ▓▒█░
 ▓██ ░▒░   ▒   ▒▒ ░░ ░▒ ▒░ ▒   ▒▒ ░
 ▒ ▒ ░░    ░   ▒   ░ ░░ ░  ░   ▒   
 ░ ░           ░  ░░  ░        ░  ░
 ░ ░                               

Olá,
Obrigado por usar o bot Yaka.
Eu sou,

██╗   ██╗ █████╗ ██╗  ██╗ █████╗ ███████╗██╗  ██╗██╗
╚██╗ ██╔╝██╔══██╗██║ ██╔╝██╔══██╗██╔════╝██║  ██║██║
 ╚████╔╝ ███████║█████╔╝ ███████║███████╗███████║██║
  ╚██╔╝  ██╔══██║██╔═██╗ ██╔══██║╚════██║██╔══██║██║
   ██║   ██║  ██║██║  ██╗██║  ██║███████║██║  ██║██║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝
                                                    */

require("./config.js");
require("./BotCharacters.js");

const { Collection, Function } = require("./lib");
const { isUrl } = Function;
const axios = require("axios");
const Func = require("./lib");
const chalk = require("chalk");
const { color } = require("./lib/color");
const os = require('os');

const cool = new Collection();
const prefix = global.prefa;

// Importar database com tratamento de erro
let mk, mku, mkchar;
try {
    const database = require("./Database/dataschema.js");
    mk = database.mk;
    mku = database.mku;
    mkchar = database.mkchar;
    console.log("✅ Database carregado com sucesso");
} catch (e) {
    console.log("⚠️ Erro ao carregar database, usando sistema mock");
    // Sistema mock para fallback
    const mockModel = {
        findOne: async () => null,
        findOneAndUpdate: async () => null,
        updateOne: async () => true
    };
    mk = mockModel;
    mku = mockModel;
    mkchar = mockModel;
}

// 🚀 CACHE DE PERFORMANCE OTIMIZADO
const performanceCache = new Map();
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutos

function getCachedData(key) {
    const cached = performanceCache.get(key);
    if (cached && (Date.now() - cached.time) < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    performanceCache.set(key, { data, time: Date.now() });
    // Limitar tamanho do cache
    if (performanceCache.size > 1000) {
        const oldestKey = performanceCache.keys().next().value;
        performanceCache.delete(oldestKey);
    }
}

// 🚀 LIMPEZA AUTOMÁTICA DE CACHE
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of performanceCache.entries()) {
        if (now - value.time > CACHE_DURATION) {
            performanceCache.delete(key);
        }
    }
}, CACHE_DURATION);

// 🔥 SISTEMA NSFW GLOBAL COM EXECUÇÃO AUTOMÁTICA OTIMIZADA
global.checkNSFW = async (Yaka, m, prefix, pushName, NSFWstatus, cmdName) => {
    if (!m.isGroup) {
        return "execute";
    }
    
    if (NSFWstatus == "false") {
        // 🚀 EXECUÇÃO ASSÍNCRONA PARA NÃO BLOQUEAR
        setImmediate(async () => {
            try {
                await Yaka.sendMessage(
                    m.from,
                    {
                        text: `🚫 *NSFW BLOQUEADO* 🚫\n\nEste grupo não tem NSFW ativado!\n\n🔧 Para ativar:\n*${prefix}nsfw*`
                    },
                    { quoted: m }
                );
            } catch (e) {
                console.log("Erro ao enviar mensagem NSFW:", e.message);
            }
        });
        return "block";
    }
    
    if (NSFWstatus == "redirect" || NSFWstatus == "true") {
        // 🚀 ENVIO ASSÍNCRONO
        setImmediate(async () => {
            try {
                await Yaka.sendMessage(
                    m.from,
                    { text: `📱 *${pushName}* comando enviado para seu privado!` },
                    { quoted: m }
                );
            } catch (e) {
                console.log("Erro ao enviar redirect NSFW:", e.message);
            }
        });
        
        // 🔥 EXECUTAR COMANDO AUTOMATICAMENTE NO PRIVADO OTIMIZADO
        setTimeout(async () => {
            try {
                // APIs para diferentes comandos
                const nsfwApis = {
                    "ass": "https://fantox-apis.vercel.app/ass",
                    "pussy": "https://api.waifu.pics/nsfw/neko",
                    "hentai": "https://api.waifu.pics/nsfw/waifu",
                    "sex": "https://api.waifu.pics/nsfw/neko",
                    "yuri": "https://api.waifu.pics/nsfw/yuri",
                    "boobs": "https://api.waifu.pics/nsfw/boobs",
                    "nude": "https://api.waifu.pics/nsfw/neko"
                };
                
                const apiUrl = nsfwApis[cmdName.toLowerCase()] || "https://api.waifu.pics/nsfw/waifu";
                // 🚀 TIMEOUT ADICIONADO PARA EVITAR TRAVAMENTOS
                let response = await axios.get(apiUrl, { timeout: 8000 });
                let imgURL = response.data.url;
                
                await Yaka.sendMessage(
                    m.sender,
                    {
                        image: { url: imgURL },
                        caption: `🔞 *COMANDO ${cmdName.toUpperCase()}* 🔞\n\n✅ Executado automaticamente no privado!\n\n👀 _Grupos ficam limpos, você recebe aqui!_`,
                    }
                );
                
            } catch (error) {
                console.log("Erro ao executar comando NSFW automaticamente:", error.message);
                try {
                    await Yaka.sendMessage(
                        m.sender,
                        { text: `🔞 Comando ${cmdName} redirecionado!\n\n✅ Use \`${prefix}${cmdName}\` aqui no privado - grupos ficam limpos!` }
                    );
                } catch (e) {
                    console.log("Erro ao enviar fallback NSFW:", e.message);
                }
            }
        }, 800); // 🚀 REDUZIDO PARA 800ms
        
        return "redirect";
    }
    
    return "execute";
};

// Configurar Levels com tratamento de erro
try {
    if (global.mongodb && global.mongodb.trim() !== "") {
        global.Levels = require("discord-xp");
        global.Levels.setURL(global.mongodb);
        console.log("✅ Discord XP configurado com MongoDB");
    } else {
        throw new Error("MongoDB não configurado");
    }
} catch (error) {
    console.log("⚠️ Usando sistema XP local:", error.message);
    // Sistema XP local
    const localXP = new Map();
    global.Levels = {
        appendXp: async (userId, guildId, xp) => {
            try {
                const key = `${userId}_${guildId}`;
                const current = localXP.get(key) || { xp: 0, level: 0 };
                current.xp += xp;
                current.level = Math.floor(current.xp / 100);
                localXP.set(key, current);
                return current.level > Math.floor((current.xp - xp) / 100);
            } catch (e) {
                return false;
            }
        },
        fetch: async (userId, guildId) => {
            try {
                const key = `${userId}_${guildId}`;
                return localXP.get(key) || { xp: 0, level: 0 };
            } catch (e) {
                return { xp: 0, level: 0 };
            }
        },
        fetchLeaderboard: async () => {
            try {
                return Array.from(localXP.entries()).slice(0, 10);
            } catch (e) {
                return [];
            }
        },
    };
}

console.log(color("\nDatabase 1 connected  !\n", "lime"));
console.log(color("\nDatabase 2 connected !\n", "lime"));
console.log(color("\nCarregando, por favor aguarde...\n", "yellow"));
console.log(color('\nNão modifique este bot por conta própria!!\nPergunte ao proprietário antes de fazê-lo..\n', 'red'));

module.exports = async (Yaka, m, commands, chatUpdate, store) => {
    try {
        // 🚀 VALIDAÇÃO RÁPIDA
        if (!m || !m.message || !Yaka) return;
        
        let { type, isGroup, sender, from } = m;
        
        // Extrair body de forma mais robusta
        let body = "";
        try {
            body = type == "buttonsResponseMessage"
                ? m.message[type].selectedButtonId
                : type == "listResponseMessage"
                    ? m.message[type].singleSelectReply.selectedRowId
                    : type == "templateButtonReplyMessage"
                        ? m.message[type].selectedId
                        : m.text || m.body || "";
        } catch (e) {
            body = m.text || "";
        }
        
        // Garantir que body é string
        if (!body || typeof body !== 'string') body = "";
        
        // Extrair texto da mensagem
        const messageText = m.text || 
                           m.body || 
                           (m.message?.conversation) || 
                           (m.message?.extendedTextMessage?.text) || 
                           body || "";

        let prat = "";
        try {
            prat = (type === "conversation" && body?.startsWith(prefix)) ? body
                : ((type === "imageMessage" || type === "videoMessage") && body?.startsWith(prefix)) ? body
                : (type === "extendedTextMessage" && body?.startsWith(prefix)) ? body
                : (type === "buttonsResponseMessage" && body?.startsWith(prefix)) ? body
                : (type === "listResponseMessage" && body?.startsWith(prefix)) ? body
                : (type === "templateButtonReplyMessage" && body?.startsWith(prefix)) ? body
                : "";
        } catch (e) {
            prat = "";
        }

        // 🚀 CACHE DE METADATA OTIMIZADO
        let metadata = {};
        if (isGroup) {
            const metaKey = `meta_${from}`;
            metadata = getCachedData(metaKey);
            if (!metadata) {
                try {
                    metadata = await Yaka.groupMetadata(from);
                    setCachedData(metaKey, metadata);
                } catch (error) {
                    console.log("Erro ao obter metadata do grupo:", error.message);
                    metadata = { participants: [], subject: "Grupo" };
                }
            }
        }
        
        const pushname = m.pushName || 'Usuario';
        const participants = isGroup ? (metadata.participants || []) : [sender];
        const groupAdmin = isGroup
            ? participants.filter((v) => v.admin !== null).map((v) => v.id)
            : [];
        const botNumber = await Yaka.decodeJid(Yaka.user.id);
        const isBotAdmin = isGroup ? groupAdmin.includes(botNumber) : false;
        const isAdmin = isGroup ? groupAdmin.includes(sender) : false;
        const isCreator = [botNumber, ...global.owner]
            .map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
            .includes(m.sender);
        const isOwner = global.owner.includes(m.sender.replace('@s.whatsapp.net', ''));
        global.suppL = "https://chat.whatsapp.com/KLX59oSwhGWLCDNGshiwWv";

        const isCmd = body.startsWith(prefix);
        
        // 🚀 RETORNO RÁPIDO SE NÃO FOR COMANDO
        if (!isCmd && !m.quoted) return;

        // Uptime do servidor
        const uptimeValue = os.uptime();
        const uptime = `${Math.floor(uptimeValue / 3600)}h ${Math.floor(uptimeValue % 3600 / 60)}m ${Math.floor(uptimeValue % 60)}s`;
        
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || m.msg || {}).mimetype || "";
        const isMedia = /image|video|sticker|audio/.test(mime);
        const budy = typeof m.text == "string" ? m.text : "";
        
        // Extrair nome do comando
        const cmdName = prat
            .slice(prefix.length)
            .trim()
            .split(/ +/)
            .shift()
            .toLowerCase();
        
        // Parse dos argumentos
        const argsWithCommand = messageText.split(' ');
        const args = argsWithCommand.slice(1);
        const ar = args.map((v) => v.toLowerCase());
        let text = args.join(" ");
        
        const groupName = m.isGroup ? (metadata.subject || "Grupo") : "";

        // 🚀 CACHE DE COMANDOS
        const cmdKey = `cmd_${cmdName}`;
        let cmd = getCachedData(cmdKey);
        if (!cmd) {
            cmd = commands.get(cmdName) ||
                Array.from(commands.values()).find((v) =>
                    v.alias && v.alias.find((x) => x.toLowerCase() == cmdName)
                ) || "";
            if (cmd) setCachedData(cmdKey, cmd);
        }
        
        const icmd = cmd;
        
        // Extrair menções
        let mentionByTag = [];
        try {
            if (type == "extendedTextMessage" && 
                m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                mentionByTag = m.message.extendedTextMessage.contextInfo.mentionedJid;
            } else if (m.mentionedJid?.length > 0) {
                mentionByTag = m.mentionedJid;
            } else if (messageText) {
                const textMentions = messageText.match(/@(\d+)/g);
                if (textMentions) {
                    mentionByTag = textMentions.map(mention => {
                        const number = mention.replace('@', '');
                        return number + '@s.whatsapp.net';
                    });
                }
            }
        } catch (e) {
            mentionByTag = [];
        }

        // 🚀 VERIFICAÇÕES PARALELAS COM TIMEOUT
        const dbPromises = [
            Promise.race([
                mku.findOne({ id: m.sender }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]).catch(() => null),
            Promise.race([
                mkchar.findOne({ id: "1" }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]).catch(() => null),
            Promise.race([
                mk.findOne({ id: m.from }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]).catch(() => null)
        ];

        const [banResult, characterResult, groupResult] = await Promise.allSettled(dbPromises);
        
        // Verificação de ban
        let userBanned = false;
        let banReason = "";
        let banGcname = "";
        
        if (banResult.status === 'fulfilled' && banResult.value && banResult.value.ban !== "false") {
            userBanned = true;
            banReason = banResult.value.reason || "Sem motivo específico";
            banGcname = banResult.value.gcname || "desconhecido";
        }

        if (
            !isCreator && 
            isCmd && 
            userBanned && 
            budy != `${prefix}support` &&
            budy != `${prefix}supportgc` &&
            budy != `${prefix}owner` &&
            budy != `${prefix}mods` &&
            budy != `${prefix}mod` &&
            budy != `${prefix}modlist`
        ) {
            return m.reply(
                `Você está *Banido* de usar comandos por *${banReason}* de *${banGcname}*`
            );
        }

        // Character Configuration
        let char = "0";
        let CharacterSelection = "0";

        if (characterResult.status === 'fulfilled' && characterResult.value) {
            CharacterSelection = characterResult.value.seletedCharacter || "0";
        }

        let idConfig = "charID" + CharacterSelection;

        try {
            global.botName = global[idConfig]?.botName || global.charID0?.botName || "YakaBot";
            global.botVideo = global[idConfig]?.botVideo || global.charID0?.botVideo || "";
            global.botImage1 = global[idConfig]?.botImage1 || global.charID0?.botImage1 || "";
            global.botImage2 = global[idConfig]?.botImage2 || global.charID0?.botImage2 || "";
            global.botImage3 = global[idConfig]?.botImage3 || global.charID0?.botImage3 || "";
            global.botImage4 = global[idConfig]?.botImage4 || global.charID0?.botImage4 || "";
            global.botImage5 = global[idConfig]?.botImage5 || global.charID0?.botImage5 || "";
            global.botImage6 = global[idConfig]?.botImage6 || global.charID0?.botImage6 || "";
            global.botImage7 = global[idConfig]?.botImage7 || global.charID0?.botImage7 || "";
        } catch (e) {
            console.log("Erro ao configurar character:", e.message);
        }

        // Antilink Configuration
        let antilinkStatus = "false";
        
        try {
            const groupData = groupResult.status === 'fulfilled' ? groupResult.value : null;
            if (groupData) {
                antilinkStatus = groupData.antilink || "false";
                
                if (groupData.antilink == "true" && !isBotAdmin) {
                    await mk.updateOne({ id: m.from }, { antilink: "false" }).catch(() => {});
                    Yaka.sendMessage(m.from, { text: `Antilink foi *desativado* porque não sou mais um administrador.` }).catch(() => {});
                    antilinkStatus = "false";
                }
            }
        } catch (error) {
            console.log("Erro ao verificar antilink:", error.message);
        }

        if (m.isGroup && antilinkStatus == "true") {
            try {
                const linkgce = await Yaka.groupInviteCode(from);
                if (budy.includes(`https://chat.whatsapp.com/${linkgce}`)) {
                    m.reply(`Nenhuma ação será tomada porque você enviou o link deste grupo.`);
                } else if (budy.includes(`https://chat.whatsapp`)) {
                    const bvl = `O administrador enviou um link, então não há problemas.`;
                    if (isAdmin) return m.reply(bvl);
                    if (m.key.fromMe) return m.reply(bvl);
                    if (isCreator) return m.reply(bvl);
                    
                    const kice = m.sender;
                    await Yaka.groupParticipantsUpdate(m.from, [kice], "remove");
                    await Yaka.sendMessage(
                        from,
                        {
                            delete: {
                                remoteJid: m.from,
                                fromMe: false,
                                id: m.id,
                                participant: m.sender,
                            },
                        },
                        { quoted: m }
                    );
                    
                    try {
                        await mk.updateOne({ id: m.from }, { antilink: "true" }, { upsert: true });
                    } catch (error) {
                        console.log("Erro ao atualizar antilink:", error.message);
                    }
                    
                    Yaka.sendMessage(
                        from,
                        {
                            text: `\`\`\`*Sistema Antilink*\`\`\`\n\n@${kice.split("@")[0]} Removido por enviar link de grupo WhatsApp neste grupo! Mensagem excluída.`,
                            mentions: [kice],
                        },
                        { quoted: m }
                    );
                } else if (isUrl(m.text) && !icmd && !isAdmin && !isCreator) {
                    await Yaka.sendMessage(
                        from,
                        {
                            delete: {
                                remoteJid: m.from,
                                fromMe: false,
                                id: m.id,
                                participant: m.sender,
                            },
                        },
                        { quoted: m }
                    );
                    m.reply(
                        `Antilink está ativado! Para usar qualquer comando relacionado a links, use meu prefixo real (${prefix})! \n\nExemplo: ${prefix}igdl <link> ou ${prefix}ytmp4 <link>`
                    );
                }
            } catch (e) {
                console.log("Erro no sistema antilink:", e.message);
            }
        }

        // Verificar status do usuário
        let modStatus = "false";
        if (banResult.status === 'fulfilled' && banResult.value) {
            modStatus = banResult.value.addedMods || "false";
        }

        let workerMode = "false";
        if (characterResult.status === 'fulfilled' && characterResult.value) {
            workerMode = characterResult.value.privateMode || "false";
        }
        
        if (workerMode == "true") {
            if (
                !global.owner.includes(`${m.sender.split("@")[0]}`) &&
                modStatus == "false" &&
                isCmd &&
                m.sender != botNumber
            ) {
                console.log("\nComando Rejeitado! O bot está no modo privado!\n");
                return;
            }
        }
        
        if (workerMode == "self") {
            if (m.sender != botNumber && isCmd) {
                console.log("\nComando Rejeitado! O bot está no modo Self!\n");
                return;
            }
        }

        // Bot Switch Configuration
        let botSwitchGC = "true";
        try {
            const groupData = groupResult.status === 'fulfilled' ? groupResult.value : null;
            if (groupData) {
                botSwitchGC = groupData.botSwitch || "true";
            }
        } catch (error) {
            console.log("Erro ao verificar botSwitch:", error.message);
        }
        
        if (
            m.isGroup &&
            botSwitchGC == "false" &&
            !isAdmin &&
            !isOwner &&
            modStatus == "false" &&
            isCmd
        ) {
            return console.log(
                `\nComando Rejeitado! O bot está desligado no grupo ${groupName}!\n`
            );
        }

        // Chatbot Configuration
        let csts = "false";
        try {
            const groupData = groupResult.status === 'fulfilled' ? groupResult.value : null;
            if (groupData) {
                csts = groupData.chatBot || "false";
            }
        } catch (error) {
            console.log("Erro ao verificar chatbot:", error.message);
        }
        
        if (m.isGroup && csts == "true" && !icmd && !isCmd) {
            if (m.quoted && m.quoted.sender == botNumber) {
                try {
                    const botreply = await axios.get(
                        `http://api.brainshop.ai/get?bid=174300&key=ugPE0tD90fafvu2N&uid=[uid]&msg=[${encodeURIComponent(budy)}]`,
                        { timeout: 5000 }
                    );
                    const txt = `${botreply.data.cnt}`;
                    setTimeout(() => {
                        m.reply(txt).catch(() => {});
                    }, 2200);
                } catch (error) {
                    console.log("Erro na API do chatbot:", error.message);
                }
            }
        }

        let PMcsts = "false";
        if (characterResult.status === 'fulfilled' && characterResult.value) {
            PMcsts = characterResult.value.PMchatBot || "false";
        }

        if (!m.isGroup && PMcsts == "true" && !icmd && !isCmd) {
            try {
                const botreply = await axios.get(
                    `http://api.brainshop.ai/get?bid=174300&key=ugPE0tD90fafvu2N&uid=[uid]&msg=[${encodeURIComponent(budy)}]`,
                    { timeout: 5000 }
                );
                const txt = `${botreply.data.cnt}`;
                setTimeout(() => {
                    m.reply(txt).catch(() => {});
                }, 2200);
            } catch (error) {
                console.log("Erro na API do chatbot PM:", error.message);
            }
        }

        // NSFW Configuration
        let NSFWstatus = "false";
        try {
            const groupData = groupResult.status === 'fulfilled' ? groupResult.value : null;
            if (groupData) {
                NSFWstatus = groupData.switchNSFW || "false";
            }
        } catch (error) {
            console.log("Erro ao verificar NSFW:", error.message);
        }

        // 🔥 LISTA COMPLETA DOS COMANDOS NSFW
        const nsfwCommands = [
            "animalears", "animal", "anusview", "ass", "barefoot", "bed", "bell", "bikini", "blonde",
            "bondage", "bra", "breasthold", "breasts", "bunnyears", "bunnygirl", "chain", "closeview",
            "cloudsview", "cum", "dress", "drunk", "elbowgloves", "erectnipples", "fateseries",
            "fingering", "flatchest", "food", "foxgirl", "gamecg", "genshin", "glasses", "gloves",
            "greenhair", "hatsunemiku", "hcatgirl", "headband", "headdress", "headphones",
            "hentaimiku", "hentaivideo", "hloli", "hneko", "hololove", "horns", "inshorts",
            "japanesecloths", "necklace", "nipples", "nobra", "nsfwbeach", "nsfwbell", "nsfwdemon",
            "nsfwidol", "nsfwmaid", "nsfwmenu", "nsfwvampire", "nude", "openshirt", "pantyhose",
            "pantypull", "penis", "pinkhair", "ponytail", "pussy", "ribbons", "schoolswimsuit",
            "schooluniform", "seethrough", "sex", "sex2", "sex3", "shirt", "shirtlift", "skirt",
            "spreadlegs", "spreadpussy", "squirt", "stockings", "sunglasses", "swimsuit", "tail",
            "tattoo", "tears", "temp", "thighhighs", "thogirls", "topless", "torncloths", "touhou",
            "twintails", "uncensored", "underwear", "vocaloid", "weapon", "wet", "whitehair",
            "white", "withflowers", "withgun", "withpetals", "withtie", "withtree", "wolfgirl",
            "xgif", "yuki", "yuri"
        ];

        // 🔥 SISTEMA NSFW AUTOMÁTICO
        if (cmd && nsfwCommands.includes(cmdName.toLowerCase())) {
            const nsfwCheck = await global.checkNSFW(Yaka, m, prefix, pushname, NSFWstatus, cmdName);
            if (nsfwCheck !== "execute") return;
        }

        // Group Banning Configuration
        let BANGCSTATUS = "false";
        try {
            const groupData = groupResult.status === 'fulfilled' ? groupResult.value : null;
            if (groupData) {
                BANGCSTATUS = groupData.bangroup || "false";
            }
        } catch (error) {
            console.log("Erro ao verificar ban do grupo:", error.message);
        }
        
       if (
            BANGCSTATUS == "true" &&
            budy != `${prefix}unbangc` &&
            budy != `${prefix}unbangroup` &&
            body.startsWith(prefix) &&
            budy != `${prefix}support` &&
            budy != `${prefix}supportgc` &&
            budy != `${prefix}owner` &&
            budy != `${prefix}mods` &&
            budy != `${prefix}mod` &&
            budy != `${prefix}modlist`
        ) {
            if (m.isGroup && !isOwner && modStatus == "false") {
                return m.reply(
                    `*${global.botName}* está *Banido* no grupo *${groupName}*! \n\nDigite *${prefix}owner* para enviar uma solicitação para desbanir o grupo!`
                );
            }
        }

        // Comando não encontrado
        if (body.startsWith(prefix) && !icmd) {
            let Yakatext = `*${pushname}* bakaa! Nenhum comando encontrado!!\n\nDigite *${prefix}help* para ver meus comandos!`;
            
            try {
                const reactmxv = {
                    react: {
                        text: '🙍🏻‍♀️',
                        key: m.key,
                    },
                };
                await Yaka.sendMessage(m.from, reactmxv);

                Yaka.sendMessage(m.from, { 
                    video: { url: 'https://media.tenor.com/qvvKGZhH0ysAAAPo/anime-girl.mp4' }, 
                    caption: Yakatext, 
                    gifPlayback: true 
                }, {
                    quoted: m,
                });
            } catch (e) {
                console.log("Erro ao enviar mensagem de comando não encontrado:", e.message);
            }
        }

        // 🚀 LOGS OTIMIZADOS - SÓ PARA GRUPOS PEQUENOS OU COMANDOS
        if (m.message && isCmd && (!isGroup || participants.length < 100)) {
            console.log(
                chalk.white(chalk.bgRed("[ MENSAGEM ]")),
                chalk.black(chalk.bgYellow(new Date())),
                chalk.yellow(chalk.bgGrey(budy || m.mtype)) +
                "\n" +
                chalk.blue("=> De"),
                chalk.red(pushname),
                chalk.green(m.sender) + "\n" + chalk.blueBright("=> Em"),
                chalk.white(m.isGroup ? m.from : "Chat Privado", m.chat)
            );
        }

        // XP System - Otimizado
        if (cmd) {
            // 🚀 XP OTIMIZADO - SÓ 30% DAS VEZES PARA ECONOMIZAR RECURSOS
            if (Math.random() > 0.7) {
                setImmediate(async () => {
                    try {
                        const randomXp = Math.floor(Math.random() * 3) + 1;
                        await global.Levels.appendXp(m.sender, "bot", randomXp);
                    } catch (error) {
                        // Silenciar erro XP para não poluir logs
                    }
                });
            }
        }
        
        // Info do comando
        if (
            text.endsWith("--info") ||
            text.endsWith("--i") ||
            text.endsWith("--?")
        ) {
            try {
                let data = [];
                if (cmd.alias) data.push(`*Alias :* ${cmd.alias.join(", ")}`);

                if (cmd.desc) data.push(`*Descrição :* ${cmd.desc}\n`);
                if (cmd.usage)
                    data.push(
                        `*Exemplo :* ${cmd.usage
                            .replace(/%prefix/gi, prefix)
                            .replace(/%command/gi, cmd.name)
                            .replace(/%text/gi, text)}`
                    );

                let buttonmess = {
                    text: `*Informação do Comando*\n\n${data.join("\n")}`,
                };
                
                if (cmd.react) {
                    let reactionMess = {
                        react: {
                            text: cmd.react,
                            key: m.key,
                        },
                    };
                    await Yaka.sendMessage(m.from, reactionMess);
                }
                
                return Yaka.sendMessage(m.from, buttonmess, {
                    quoted: m,
                });
            } catch (e) {
                console.log("Erro ao mostrar info do comando:", e.message);
            }
        }
        
        // 🚀 REAÇÃO OTIMIZADA - SÓ 60% DAS VEZES
        if (cmd && cmd.react && Math.random() > 0.4) {
            setImmediate(async () => {
                try {
                    const reactm = {
                        react: {
                            text: cmd.react,
                            key: m.key,
                        },
                    };
                    await Yaka.sendMessage(m.from, reactm);
                } catch (error) {
                    // Ignorar erros de reação
                }
            });
        }
        
        // Sistema de Cooldown
        if (!cool.has(m.sender)) {
            cool.set(m.sender, new Collection());
        }
        
        const now = Date.now();
        const timestamps = cool.get(m.sender);
        const cdAmount = (cmd.cool || 0) * 1000;

        // 🚀 COOLDOWN OTIMIZADO
        if (!isOwner && modStatus == "false" && !botNumber.includes(m.sender)) {
            if (timestamps.has(m.sender)) {
                const expiration = timestamps.get(m.sender) + cdAmount;

                if (now < expiration) {
                    let timeLeft = (expiration - now) / 1000;
                    return await Yaka.sendMessage(
                        m.from,
                        {
                            text: `Não faça spam! Você pode usar o comando após _${timeLeft.toFixed(1)} segundo(s)_`,
                        },
                        {
                            quoted: m,
                        }
                    );
                }
            }
        }
        
        timestamps.set(m.sender, now);
        setTimeout(() => timestamps.delete(m.sender), cdAmount);

        // Executar comando
        if (cmd && cmd.start) {
            try {
                // Preparar contexto do comando
                const commandContext = {
                    name: "Yaka",
                    metadata,
                    pushName: pushname,
                    participants,
                    body,
                    messageText,
                    fullText: messageText,
                    args,
                    ar,
                    groupName,
                    botNumber,
                    flags: args.filter((arg) => arg.startsWith("--")),
                    isAdmin,
                    groupAdmin,
                    text,
                    quoted,
                    mentionByTag,
                    mime,
                    isBotAdmin,
                    prefix,
                    modStatus,
                    NSFWstatus,
                    isCreator,
                    store,
                    uptime,
                    command: cmd.name,
                    commands,
                    Function: Func,
                    toUpper: function toUpper(query) {
                        return query.replace(/^\w/, (c) => c.toUpperCase());
                    },
                };

                // Executar comando com timeout
                const commandPromise = cmd.start(Yaka, m, commandContext);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Command timeout')), 60000)
                );

                await Promise.race([commandPromise, timeoutPromise]);
                
            } catch (e) {
                const errorMessage = String(e);
                if (!errorMessage.includes("cmd.start") && !errorMessage.includes("timeout")) {
                    console.error(chalk.red("❌ Erro ao executar comando:"), e.message || errorMessage);
                    
                    // Enviar mensagem de erro para o usuário (opcional)
                    try {
                        await Yaka.sendMessage(m.from, {
                            text: `⚠️ Ocorreu um erro ao executar o comando. Tente novamente em alguns segundos.`
                        }, { quoted: m });
                    } catch (sendError) {
                        // Ignorar erro ao enviar mensagem de erro
                    }
                }
            }
        }
        
    } catch (e) {
        const errorStr = String(e);
        if (!errorStr.includes("cmd.start") && !errorStr.includes("Cannot read properties")) {
            console.error(chalk.red("❌ Erro crítico no Core:"), e);
        }
    }
};
