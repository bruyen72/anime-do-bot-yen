module.exports = {
    name: "add",
    alias: ["forceadd", "fadd"],
    desc: "Forçar adição de usuário",
    category: "Group",
    usage: ".add número",
    react: "⚡",
    start: async (
      Yaka,
      m,
      { text, isAdmin, isBotAdmin, pushName }
    ) => {
      // Verificações mínimas
      if (!isAdmin || !isBotAdmin || (!text && !m.quoted)) 
        return Yaka.sendMessage(
          m.from,
          { text: "Erro: Você e o bot precisam ser administradores." },
          { quoted: m }
        );
  
      // Informação que está tentando forçar
      await Yaka.sendMessage(
        m.from,
        { text: "⚡ Forçando adição (ignorando privacidade)..." },
        { quoted: m }
      );
  
      try {
        // Preparar número
        let rawNumber;
        
        if (text) {
          // Limpa completamente o número de qualquer caractere não numérico
          rawNumber = text.replace(/[^0-9]/g, "");
        } else if (m.quoted) {
          // Extrai o número da mensagem respondida
          rawNumber = m.quoted.sender.split('@')[0];
          if (rawNumber.includes("+")) {
            rawNumber = rawNumber.replace("+", "");
          }
        }
        
        // Verificações básicas do número
        if (!rawNumber || rawNumber.length < 10) {
          return Yaka.sendMessage(
            m.from,
            { text: "❎ Número inválido. Use um formato válido." },
            { quoted: m }
          );
        }
        
        // Adiciona código do país se necessário
        if (!rawNumber.startsWith("55") && rawNumber.length >= 10 && rawNumber.length <= 11) {
          rawNumber = "55" + rawNumber;
        }
        
        const mainNumber = rawNumber + "@s.whatsapp.net";
        console.log("Tentando forçar adição de:", mainNumber);
        
        // Lista com todas as estratégias a tentar
        const strategies = [
          // 1. Preparação: Adicionar o contato primeiro para "familiarizar" o sistema
          async () => {
            try {
              // Criar cartão de contato
              const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Contato\nTEL;type=CELL;type=VOICE;waid=${rawNumber}:+${rawNumber}\nEND:VCARD`;
              await Yaka.sendMessage(m.from, { contacts: { displayName: "Contato", contacts: [{ vcard }] } });
              await new Promise(r => setTimeout(r, 1500)); // Pausa para processamento
              return null; // Não retorna resultado ainda, só prepara
            } catch (e) {
              console.log("Erro na estratégia 1:", e);
              return null;
            }
          },
          
          // 2. Tentativa direta: Método básico de adicionar
          async () => {
            try {
              const result = await Yaka.groupParticipantsUpdate(m.from, [mainNumber], "add");
              console.log("Resultado estratégia 2:", result);
              return result;
            } catch (e) {
              console.log("Erro na estratégia 2:", e);
              return null;
            }
          },
          
          // 3. Tentativa com formato alternativo: @c.us
          async () => {
            try {
              const altNumber = rawNumber + "@c.us";
              const result = await Yaka.groupParticipantsUpdate(m.from, [altNumber], "add");
              console.log("Resultado estratégia 3:", result);
              return result;
            } catch (e) {
              console.log("Erro na estratégia 3:", e);
              return null;
            }
          },
          
          // 4. Tentativa com + no número
          async () => {
            try {
              const plusNumber = "+" + rawNumber + "@s.whatsapp.net";
              const result = await Yaka.groupParticipantsUpdate(m.from, [plusNumber], "add");
              console.log("Resultado estratégia 4:", result);
              return result;
            } catch (e) {
              console.log("Erro na estratégia 4:", e);
              return null;
            }
          },
          
          // 5. Tentativa sem código do país
          async () => {
            try {
              // Remove o 55 (Brasil) se estiver presente
              const localNumber = rawNumber.startsWith("55") ? 
                                 rawNumber.substring(2) + "@s.whatsapp.net" : 
                                 rawNumber + "@s.whatsapp.net";
              const result = await Yaka.groupParticipantsUpdate(m.from, [localNumber], "add");
              console.log("Resultado estratégia 5:", result);
              return result;
            } catch (e) {
              console.log("Erro na estratégia 5:", e);
              return null;
            }
          }
        ];
        
        // Executar estratégias sequencialmente
        let success = false;
        let finalResult = null;
        
        for (let i = 0; i < strategies.length; i++) {
          try {
            const result = await strategies[i]();
            
            // Se for uma estratégia de preparação, continua
            if (result === null) continue;
            
            // Verifica sucesso
            if (result && result[0] && result[0].status === "200") {
              success = true;
              finalResult = result;
              break;
            } else {
              finalResult = result; // Guarda o último resultado para reportar
            }
          } catch (e) {
            console.log(`Erro na execução da estratégia ${i+1}:`, e);
          }
          
          // Pequena pausa entre tentativas
          await new Promise(r => setTimeout(r, 1000));
        }
        
        // Verificar resultado final
        if (success) {
          return Yaka.sendMessage(
            m.from,
            { text: "✅ Usuário adicionado com sucesso!" },
            { quoted: m }
          );
        } else if (finalResult && finalResult[0]) {
          // Verificar o status específico
          const status = finalResult[0].status;
          
          if (status === "403") {
            return Yaka.sendMessage(
              m.from,
              { 
                text: "⚠️ Não foi possível adicionar mesmo forçando. Este número tem configurações máximas de privacidade.\n\nO usuário precisa:\n1. Salvar o número do bot como contato\n2. Mudar configurações de privacidade para permitir adição em grupos" 
              },
              { quoted: m }
            );
          } else if (status === "408") {
            return Yaka.sendMessage(
              m.from,
              { text: "⚠️ Este número saiu recentemente do grupo e não pode ser adicionado novamente por um tempo (regra do WhatsApp)." },
              { quoted: m }
            );
          } else if (status === "409") {
            return Yaka.sendMessage(
              m.from,
              { text: "ℹ️ Este número já está no grupo." },
              { quoted: m }
            );
          } else {
            return Yaka.sendMessage(
              m.from,
              { text: `⚠️ Não foi possível adicionar. Código de erro: ${status}` },
              { quoted: m }
            );
          }
        } else {
          return Yaka.sendMessage(
            m.from,
            { text: "⚠️ Não foi possível adicionar o usuário mesmo com métodos forçados." },
            { quoted: m }
          );
        }
      } catch (error) {
        console.error("Erro geral:", error);
        
        return Yaka.sendMessage(
          m.from,
          { text: "❌ Erro ao processar o comando." },
          { quoted: m }
        );
      }
    },
  };