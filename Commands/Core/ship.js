const axios = require("axios");
module.exports = {
  name: "ship",
  alias: ["shipar", "shippar", "shipando"],
  desc: "Shipar duas pessoas para formar um casal",
  react: "💞",
  category: "Core",
  start: async (Yaka, m, { pushName, prefix, args }) => {
    try {
      // Verificar se estamos em um grupo
      const isGroup = m.isGroup;
      
      // Se não estamos em um grupo, mostrar mensagem de erro
      if (!isGroup) {
        await sendErrorMessage(Yaka, m, "Este comando só funciona em grupos! 💕");
        return;
      }
      
      // Definir as duas pessoas para o ship
      let person1, person2;
      
      // Se temos argumentos, usar os argumentos como nomes
      if (args.length > 0) {
        if (args.length >= 2) {
          // Tentar dividir os argumentos em dois nomes
          const firstHalf = args.slice(0, Math.ceil(args.length / 2)).join(' ');
          const secondHalf = args.slice(Math.ceil(args.length / 2)).join(' ');
          
          person1 = firstHalf;
          person2 = secondHalf;
        } else {
          // Apenas um nome, shippar com o remetente
          person1 = pushName || "Você";
          person2 = args[0];
        }
      } else {
        // Sem argumentos, mostrar instruções
        await sendInstructions(Yaka, m);
        return;
      }
      
      // Enviar mensagem de processamento
      await Yaka.sendMessage(m.from, {
        text: `✨✨✨ *AMOR NO AR* ✨✨✨\n\n` +
              `Analisando a compatibilidade entre:\n` +
              `👑 *${person1}*  e  *${person2}* 👑\n\n` +
              `Processando... 💫`
      }, { quoted: m });
      
      // Pequeno delay para criar suspense
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calcular compatibilidade
      const compatibility = Math.floor(Math.random() * 101); // 0-100%
      
      // Criar nome do ship
      const shipName = person1.slice(0, Math.floor(person1.length/2)) + 
                      person2.slice(Math.floor(person2.length/2));
      
      // Determinar mensagem baseada na compatibilidade
      let loveSymbols, compatibilityMessage, relationshipStatus;
      
      if (compatibility < 30) {
        loveSymbols = "💔 💔 💔";
        compatibilityMessage = `*${compatibility}%* de compatibilidade.\n\nHmm... o amor precisa de tempo para florescer! Talvez em outra vida...`;
        relationshipStatus = "🙏 Melhores como amigos, talvez?";
      } else if (compatibility < 70) {
        loveSymbols = "❤️ ❤️ ❤️";
        compatibilityMessage = `*${compatibility}%* de compatibilidade.\n\nHá uma chama acesa entre vocês! Com dedicação, este amor pode crescer!`;
        relationshipStatus = "💌 Tem potencial para um belo romance!";
      } else {
        loveSymbols = "💘 💘 💘";
        compatibilityMessage = `*${compatibility}%* de compatibilidade.\n\nUau! As estrelas se alinharam! Este amor foi escrito no destino!`;
        relationshipStatus = "👰‍♀️🤵‍♂️ Já podem marcar o casamento!";
      }
      
      // Enviar resultado do ship
      const resultMessage = `💖 *RESULTADO DO SHIP* 💖\n\n` +
                          `💑 *${person1}* + *${person2}* = *${shipName}* 💑\n\n` +
                          `${loveSymbols}\n\n` +
                          `${compatibilityMessage}\n\n` +
                          `${relationshipStatus}\n\n` +
                          `✨ Gerado com amor pelo Yaka Bot ✨`;
      
      await Yaka.sendMessage(m.from, {
        text: resultMessage
      }, { quoted: m });
      
      // Obter imagens para o casal
      const coupleData = await getCouplePictures();
      
      // Citações românticas para as legendas
      const loveQuotes = [
        "\"Você é meu destino.\"",
        "\"Você é a razão pela qual eu sorrio todos os dias.\"",
        "\"Meu coração só bate por você.\"",
        "\"Algumas pessoas esperam a vida inteira para encontrar seu amor verdadeiro.\"",
        "\"Eu te amarei até o fim dos tempos.\"",
        "\"O amor é como as estrelas... não podemos tocá-las, mas podemos admirar sua beleza.\"",
        "\"Mesmo em um mundo de um milhão de pessoas, eu encontraria você.\"",
        "\"Quero passar todos os meus momentos com você.\"",
        "\"Mesmo sem memórias, meu coração nunca esqueceria de você.\"",
        "\"O primeiro momento em que te vi, soube que seria você.\"",
        "\"Se amar é um sonho, quero dormir para sempre.\"",
        "\"Cada batida do meu coração tem seu nome.\"",
        "\"Te encontrar foi destino, mas te amar foi escolha.\"",
        "\"Na matemática do amor, 1 + 1 = infinito.\"",
        "\"Você é a metade que completa meu coração.\"",
        "\"Com você, cada dia é uma nova aventura de amor.\"",
        "\"Se existem vidas passadas, te amei em todas elas.\""
      ];
      
      // Selecionar citações aleatórias
      const randomQuote1 = loveQuotes[Math.floor(Math.random() * loveQuotes.length)];
      const remainingQuotes = loveQuotes.filter(quote => quote !== randomQuote1);
      const randomQuote2 = remainingQuotes[Math.floor(Math.random() * remainingQuotes.length)];
      
      // Enviar as imagens
      try {
        await Yaka.sendMessage(m.from, {
          image: { url: coupleData.male },
          caption: `❤️ *${person1}*\n\n${randomQuote1} 💫`
        }, { quoted: m });
        
        await Yaka.sendMessage(m.from, {
          image: { url: coupleData.female },
          caption: `❤️ *${person2}*\n\n${randomQuote2} 💫`
        }, { quoted: m });
      } catch (imageError) {
        console.error('Erro ao enviar imagens:', imageError);
        // Já temos o resultado do ship, então estamos bem mesmo se as imagens falharem
      }
      
    } catch (error) {
      console.error('Erro no comando ship:', error);
      await sendErrorMessage(Yaka, m, "Desculpe, o cupido está de folga hoje...\nTente novamente mais tarde. 💔");
    }
  }
};

// Função para obter imagens de casal (tenta múltiplas APIs e tem fallbacks)
async function getCouplePictures() {
  // Definir fontes de imagens em ordem de prioridade
  const sources = [
    // Fonte 1: APIs CORS-friendly atualizadas para 2025
    async () => {
      try {
        // Tentar API atualizada que ainda funciona em 2025
        const response = await axios.get('https://anime-api.hisoka17.repl.co/img/couple', {
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.data && response.data.url) {
          // Fazer uma segunda chamada para ter duas imagens diferentes
          const response2 = await axios.get('https://anime-api.hisoka17.repl.co/img/hug', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (response2.data && response2.data.url) {
            return {
              male: response.data.url,
              female: response2.data.url
            };
          }
        }
        throw new Error("API não retornou dados válidos");
      } catch (error) {
        console.log("Fonte 1 falhou:", error.message);
        throw error; // Passar para a próxima fonte
      }
    },
    
    // Fonte 2: APIs alternativas de anime mais estáveis
    async () => {
      try {
        // API waifu.pics altenativa (animu)
        const response = await axios.get('https://api.waifu.pics/sfw/hug', {
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.data && response.data.url) {
          // Segunda chamada para outra categoria
          const response2 = await axios.get('https://api.waifu.pics/sfw/cuddle', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (response2.data && response2.data.url) {
            return {
              male: response.data.url,
              female: response2.data.url
            };
          }
        }
        throw new Error("API waifu.pics não retornou dados válidos");
      } catch (error) {
        console.log("Fonte 2 falhou:", error.message);
        throw error; // Passar para a próxima fonte
      }
    },
    
    // Fonte 3: API personalizada que não deve falhar
    async () => {
      try {
        // IMPORTANTE: Esta é uma API que não falha e retorna imagens de alta qualidade
        const response = await axios.get('https://nekos.best/api/v2/hug', {
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.data && response.data.results && response.data.results[0] && response.data.results[0].url) {
          // Segunda chamada para outra categoria
          const response2 = await axios.get('https://nekos.best/api/v2/cuddle', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (response2.data && response2.data.results && response2.data.results[0] && response2.data.results[0].url) {
            return {
              male: response.data.results[0].url,
              female: response2.data.results[0].url
            };
          }
        }
        throw new Error("API nekos.best não retornou dados válidos");
      } catch (error) {
        console.log("Fonte 3 falhou:", error.message);
        throw error; // Passar para a próxima fonte
      }
    },
    
    // Fonte 4: Banco de imagens local hospedado no ImgBB (última opção, sempre funciona)
    async () => {
      try {
        // Banco de dados de imagens hospedadas no ImgBB
        const coupleImages = [
          // Pares de anime 1
          {
            male: 'https://i.ibb.co/GVrDXRW/couple-boy.jpg',
            female: 'https://i.ibb.co/2g9wv4Q/couple-girl.jpg'
          },
          // Pares de anime 2
          {
            male: 'https://i.ibb.co/FgPZyRY/anime-boy.jpg',
            female: 'https://i.ibb.co/1vC1Rdv/anime-girl.jpg'
          },
          // Pares de anime 3
          {
            male: 'https://i.ibb.co/2snBFHF/anime-male-1.jpg',
            female: 'https://i.ibb.co/FH5QNhj/anime-female-1.jpg'
          },
          // Pares de anime 4
          {
            male: 'https://i.ibb.co/PZgQpq7/anime-male-2.jpg',
            female: 'https://i.ibb.co/b7CK3G3/anime-female-2.jpg'
          },
          // Pares de anime 5
          {
            male: 'https://i.ibb.co/k9pD7bK/anime-male-3.jpg',
            female: 'https://i.ibb.co/cw72vhW/anime-female-3.jpg'
          }
        ];
        
        // Escolher um par aleatório
        return coupleImages[Math.floor(Math.random() * coupleImages.length)];
      } catch (error) {
        console.log("Fonte 4 falhou (não deveria acontecer):", error.message);
        // Se até mesmo esta fonte falhar, retornar um par padrão
        return {
          male: 'https://i.ibb.co/GVrDXRW/couple-boy.jpg',
          female: 'https://i.ibb.co/2g9wv4Q/couple-girl.jpg'
        };
      }
    }
  ];
  
  // Tentar cada fonte em ordem
  for (const sourceFunction of sources) {
    try {
      return await sourceFunction();
    } catch (error) {
      // Continue para a próxima fonte
      continue;
    }
  }
  
  // Fallback final (não deveria chegar aqui, mas por segurança)
  console.log("Todas as fontes falharam, usando fallback final.");
  return {
    male: 'https://i.ibb.co/GVrDXRW/couple-boy.jpg',
    female: 'https://i.ibb.co/2g9wv4Q/couple-girl.jpg'
  };
}

// Função para enviar mensagem de erro formatada
async function sendErrorMessage(Yaka, m, errorMessage) {
  await Yaka.sendMessage(m.from, {
    text: `💔 ${errorMessage}`
  }, { quoted: m });
}

// Função para enviar instruções formatadas
async function sendInstructions(Yaka, m) {
  const heartEmojis = ["❤️", "💖", "💘", "💓", "💕", "💗", "💞", "💝", "💟"];
  const randomHearts = Array(5).fill().map(() => heartEmojis[Math.floor(Math.random() * heartEmojis.length)]).join(" ");
  
  await Yaka.sendMessage(m.from, {
    text: `${randomHearts}\n\n` +
          `*✨ Descubra a Magia do Amor ✨*\n\n` +
          `Para criar um lindo casalzinho:\n` +
          `🌹 Digite dois nomes:\n   \`.ship nome1 nome2\`\n\n` +
          `🌹 Ou apenas um nome para shippar com você:\n   \`.ship nome\`\n\n` +
          `Não é necessário usar @, apenas digite os nomes\n\n` +
          `${randomHearts}`
  }, { quoted: m });
}