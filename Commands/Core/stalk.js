const { randInt } = require("../../lib/myfunc");

module.exports = {
  name: "stalk",
  alias: ["nowa", "stalknumero", "buscarnumero", "check"],
  desc: "Verificar contas de WhatsApp em números específicos ou em intervalos",
  usage: "stalk 5583962793851 ou stalk 558396279xxx",
  react: "🔍",
  category: "Core",
  start: async (Yaka, m, { pushName, args, prefix }) => {
    // Verificar se há argumentos
    if (!args[0]) {
      return m.reply(`*🔍 COMANDO STALK*\n\n1️⃣ Para verificar um número:\n${prefix}stalk 5583962793851\n\n2️⃣ Para buscar em intervalo:\n${prefix}stalk 558396279xxx\n\n3️⃣ Opções extras:\n${prefix}stalk foto 5583962793851\n${prefix}stalk info 5583962793851`);
    }

    // Processar opções extras
    let mode = "basic";
    let numberToCheck = args[0];
    
    if (args[0].toLowerCase() === "foto" || args[0].toLowerCase() === "img" || args[0].toLowerCase() === "photo") {
      mode = "photo";
      numberToCheck = args[1];
    } 
    else if (args[0].toLowerCase() === "info" || args[0].toLowerCase() === "full" || args[0].toLowerCase() === "completo") {
      mode = "full";
      numberToCheck = args[1];
    }
    
    // Se não foi especificado um número após o modo
    if (!numberToCheck) {
      numberToCheck = args[0];
    }

    // VERIFICAÇÃO DE NÚMERO ÚNICO (SEM "X")
    if (!numberToCheck.includes("x")) {
      const cleanNumber = numberToCheck.replace(/[^0-9]/g, "");
      const jid = `${cleanNumber}@s.whatsapp.net`;
      
      await m.reply("🔍 Verificando número... Aguarde um momento.");
      
      try {
        // Verificar se existe no WhatsApp
        const exists = await Yaka.onWhatsApp(jid);
        
        if (exists.length === 0) {
          return m.reply(`❌ O número ${cleanNumber} não possui WhatsApp.`);
        }
        
        // Coletando informações
        let bio = "Não disponível";
        let profilePic = "Não disponível";
        let lastSeen = "Não disponível";
        let statusOnline = "🔒 Não disponível";
        let businessInfo = null;
        
        // Obter bio/status
        try {
          const statusData = await Yaka.fetchStatus(jid);
          if (statusData && statusData.status) {
            bio = statusData.status;
            if (statusData.setAt) {
              lastSeen = new Date(statusData.setAt).toLocaleString('pt-BR');
            }
          }
        } catch (error) {
          bio = "Não disponível";
        }
        
        // Obter foto de perfil
        try {
          profilePic = await Yaka.profilePictureUrl(jid, 'image');
        } catch (error) {
          profilePic = "Não disponível";
        }
        
        // Informações business (se disponíveis)
        try {
          businessInfo = await Yaka.getBusinessProfile(jid);
        } catch (error) {
          businessInfo = null;
        }
        
        // Verificar status online (quando possível)
        try {
          const presence = await Yaka.presenceSubscribe(jid);
          if (presence && presence.presences && presence.presences[jid]) {
            const lastPresence = presence.presences[jid].lastKnownPresence;
            statusOnline = lastPresence === "unavailable" ? "🔴 Offline" : "🟢 Online";
          }
        } catch (error) {
          statusOnline = "🔒 Informação privada";
        }
        
        // Construir resposta
        let response = `✅ *NÚMERO VERIFICADO*\n\n`;
        response += `📱 *Número:* ${cleanNumber}\n`;
        response += `🔗 *Link:* wa.me/${cleanNumber}\n`;
        response += `📝 *Bio:* ${bio}\n`;
        response += `👤 *Status:* ${statusOnline}\n`;
        
        // Modo completo/foto mostra mais informações
        if (mode === "full" || mode === "photo") {
          response += `⏱️ *Última atualização:* ${lastSeen}\n`;
          response += `🖼️ *Foto:* ${profilePic !== "Não disponível" ? "Disponível" : "Não disponível"}\n`;
          
          // Informações business
          if (businessInfo) {
            response += `\n📊 *INFORMAÇÕES BUSINESS*\n`;
            if (businessInfo.description) response += `📋 *Descrição:* ${businessInfo.description}\n`;
            if (businessInfo.address) response += `📍 *Endereço:* ${businessInfo.address}\n`;
            if (businessInfo.website) response += `🌐 *Website:* ${businessInfo.website}\n`;
            if (businessInfo.email) response += `✉️ *Email:* ${businessInfo.email}\n`;
            if (businessInfo.category) response += `🏷️ *Categoria:* ${businessInfo.category}\n`;
          }
        }
        
        // Enviar resposta textual
        await Yaka.sendMessage(m.from, { text: response }, { quoted: m });
        
        // Enviar foto de perfil se solicitado
        if ((mode === "photo" || mode === "full") && profilePic !== "Não disponível") {
          try {
            await Yaka.sendMessage(
              m.from, 
              { image: { url: profilePic }, caption: `🖼️ Foto de perfil de ${cleanNumber}` }, 
              { quoted: m }
            );
          } catch (error) {
            await m.reply("❌ Não foi possível enviar a foto de perfil.");
          }
        }
        
        return;
      } catch (error) {
        console.error("Erro ao verificar número:", error);
        return m.reply(`❌ Ocorreu um erro ao verificar o número.`);
      }
    }
    
    // BUSCA POR PADRÃO (COM "X")
    const xCount = (numberToCheck.match(/x/g) || []).length;
    
    if (xCount > 3) {
      return m.reply("❌ São permitidos, no máximo, 3 \"x\" (para evitar bloqueios).");
    }
    
    // Avisar início da busca
    m.reply("🔍 Buscando contas no intervalo informado... Aguarde, isso pode demorar um pouco.");
    
    // Dividir o número nas partes antes e depois do "x"
    const prefixNum = numberToCheck.split("x")[0]; 
    const suffixNum = numberToCheck.split("x").pop() || "";
    
    // Calcular quantas combinações possíveis
    const combos = Math.pow(10, xCount);
    
    // Preparar strings para armazenar resultados
    let comConta = "『 ✅ CONTAS ENCONTRADAS 』\n\n";
    let semBio = "\n『 📝 SEM BIO PERSONALIZADA 』\n\n";
    let semConta = "\n『 ❌ SEM CONTA NO WHATSAPP 』\n\n";
    
    // Contadores
    let contasEncontradas = 0;
    let semBioCount = 0;
    let semContaCount = 0;
    
    // Limitar verificações para evitar bloqueios
    const maxChecks = Math.min(combos, 100);
    
    // Iniciar verificação
    for (let i = 0; i < maxChecks; i++) {
      try {
        // Pequeno atraso para evitar bloqueios
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Gerar a combinação atual
        const rnd = String(i).padStart(xCount, "0");
        const numeroCompleto = `${prefixNum}${rnd}${suffixNum}`;
        const numeroJid = `${numeroCompleto}@s.whatsapp.net`;
        
        // Verificar se existe no WhatsApp
        const existe = await Yaka.onWhatsApp(numeroJid);
        
        if (existe.length === 0) {
          semConta += `${numeroCompleto}\n`;
          semContaCount++;
          continue;
        }
        
        // Tentar obter bio/status
        let bio = "";
        let statusIcon = "🔵"; // ícone padrão
        
        // Tentar obter status online
        try {
          const presence = await Yaka.presenceSubscribe(numeroJid);
          if (presence && presence.presences && presence.presences[numeroJid]) {
            statusIcon = presence.presences[numeroJid].lastKnownPresence === "unavailable" ? "🔴" : "🟢";
          }
        } catch (error) {
          statusIcon = "🔵"; // neutro se não conseguir verificar
        }
        
        // Tentar obter bio
        try {
          const statusData = await Yaka.fetchStatus(numeroJid);
          bio = statusData?.status || "";
        } catch (error) {
          bio = ""; // não conseguiu obter bio
        }
        
        // Adicionar à lista apropriada
        if (!bio) {
          semBio += `${statusIcon} wa.me/${numeroCompleto}\n`;
          semBioCount++;
        } else {
          comConta += `${statusIcon} *Número:* wa.me/${numeroCompleto}\n📝 *Bio:* ${bio}\n\n`;
          contasEncontradas++;
        }
      } catch (error) {
        // Ignorar erros e continuar
        continue;
      }
    }
    
    // Preparar resumo
    const resumo = `📊 *RESULTADO DA BUSCA*\n\n` +
                 `🔍 *Verificados:* ${maxChecks}/${combos}\n` +
                 `✅ *Contas encontradas:* ${contasEncontradas}\n` +
                 `📝 *Sem bio personalizada:* ${semBioCount}\n` +
                 `❌ *Sem conta:* ${semContaCount}\n\n`;
    
    // Juntar tudo
    const respostaFinal = `${resumo}${comConta}${semBio}${semConta}`.trim();
    
    // Enviar resposta, dividindo se for muito grande
    try {
      if (respostaFinal.length > 4000) {
        const parte1 = respostaFinal.substring(0, 4000);
        const parte2 = respostaFinal.substring(4000);
        
        await Yaka.sendMessage(m.from, { text: parte1 }, { quoted: m });
        await Yaka.sendMessage(m.from, { text: parte2 });
      } else {
        await Yaka.sendMessage(m.from, { text: respostaFinal }, { quoted: m });
      }
    } catch (error) {
      await m.reply("❌ Erro ao enviar resultados. Tente novamente com menos números.");
    }
  },
};