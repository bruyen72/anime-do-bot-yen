const axios = require("axios");
module.exports = {
  name: "couplepp",
  alias: ["ppcouple", "casalpp"],
  desc: "Obter foto de perfil de casal combinando",
  react: "💞",
  category: "Core",
  start: async (Yaka, m, { pushName, prefix }) => {
    try {
      // Verificar se há menções ou se está em um grupo
      const isGroup = m.isGroup;
      const mentions = m.mentionedJid || [];
      const sender = m.sender;
      
      // Arrays para armazenar as imagens do casal
      let maleImg = null;
      let femaleImg = null;
      
      // Se há menções em um grupo, verificar se podemos usar fotos de perfil
      if (isGroup && mentions.length > 0) {
        // Se há duas ou mais menções, usar as duas primeiras como casal
        if (mentions.length >= 2) {
          try {
            // Obter PP do primeiro usuário mencionado
            try {
              maleImg = await Yaka.profilePictureUrl(mentions[0], 'image');
            } catch (err) {
              console.log("Não foi possível obter foto de perfil do primeiro usuário mencionado");
            }
            
            // Obter PP do segundo usuário mencionado
            try {
              femaleImg = await Yaka.profilePictureUrl(mentions[1], 'image');
            } catch (err) {
              console.log("Não foi possível obter foto de perfil do segundo usuário mencionado");
            }
            
            // Obter nomes dos usuários para legendas personalizadas
            const maleContact = await Yaka.getName(mentions[0]);
            const femaleContact = await Yaka.getName(mentions[1]);
            
            // Se conseguimos as duas fotos, enviar mensagem
            if (maleImg && femaleImg) {
              await sendImageWithRetry(maleImg, `_Para ${maleContact}..._ 💕`);
              await sendImageWithRetry(femaleImg, `_Para ${femaleContact}..._ 💕`);
              return; // Encerrar a função, não precisamos continuar
            }
          } catch (err) {
            console.log("Erro ao processar menções:", err);
            // Continuar com o fluxo normal se houver erro
          }
        } 
        // Se há apenas uma menção, usar o remetente + mencionado
        else if (mentions.length === 1) {
          try {
            // Obter PP do remetente
            try {
              maleImg = await Yaka.profilePictureUrl(sender, 'image');
            } catch (err) {
              console.log("Não foi possível obter foto de perfil do remetente");
            }
            
            // Obter PP do usuário mencionado
            try {
              femaleImg = await Yaka.profilePictureUrl(mentions[0], 'image');
            } catch (err) {
              console.log("Não foi possível obter foto de perfil do usuário mencionado");
            }
            
            // Obter nomes para legendas personalizadas
            const maleContact = await Yaka.getName(sender);
            const femaleContact = await Yaka.getName(mentions[0]);
            
            // Se conseguimos as duas fotos, enviar mensagem
            if (maleImg && femaleImg) {
              await sendImageWithRetry(maleImg, `_Para ${maleContact}..._ 💕`);
              await sendImageWithRetry(femaleImg, `_Para ${femaleContact}..._ 💕`);
              return; // Encerrar a função
            }
          } catch (err) {
            console.log("Erro ao processar remetente e menção:", err);
            // Continuar com o fluxo normal se houver erro
          }
        }
      }
      
      // Se chegou aqui, é porque não tem menções ou houve erro ao obter fotos de perfil
      // Continuar com o comportamento original do comando
      
      // URLs de APIs de casal
      const apiUrls = [
        'https://neko-couple-api.onrender.com',
        'https://api.popcat.xyz/couple',
        'https://api.waifu.pics/sfw/couple',
        'https://nekos.life/api/v2/img/cuddle',
        'https://nekos.life/api/v2/img/hug'
      ];
      
      let coupleData = null;
      
      // Tentar múltiplas APIs
      for (const apiUrl of apiUrls) {
        try {
          const response = await axios.get(apiUrl, {
            timeout: 5000, // Timeout de 5 segundos
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
            }
          });
          
          // Verificar estrutura da resposta baseada na API
          if (response.data) {
            if (apiUrl === 'https://neko-couple-api.onrender.com' && response.data.male && response.data.female) {
              coupleData = {
                male: response.data.male,
                female: response.data.female
              };
              break;
            } else if (apiUrl === 'https://api.popcat.xyz/couple' && response.data.male && response.data.female) {
              coupleData = {
                male: response.data.male,
                female: response.data.female
              };
              break;
            } else if (apiUrl === 'https://api.waifu.pics/sfw/couple' && response.data.url) {
              // Esta API retorna apenas uma imagem, então usamos a mesma para ambos
              // para teste e então adicionar outra imagem mais tarde
              coupleData = {
                male: response.data.url,
                female: null  // Será definido depois usando as imagens de backup
              };
              break;
            } else if ((apiUrl === 'https://nekos.life/api/v2/img/cuddle' || 
                       apiUrl === 'https://nekos.life/api/v2/img/hug') && 
                       response.data.url) {
              // Estas APIs retornam apenas uma imagem, usamos para um lado do casal
              if (!coupleData) {
                coupleData = { male: response.data.url, female: null };
              } else if (coupleData.female === null) {
                coupleData.female = response.data.url;
                break;
              }
            }
          }
        } catch (apiError) {
          console.log(`Falha na API ${apiUrl}:`, apiError.message);
          // Continuar tentando outras APIs
        }
      }
      
      // Imagens de backup com múltiplas fontes (não apenas Imgur)
      const backupImages = [
        {
          male: 'https://raw.githubusercontent.com/iamriz7/couples-pics/main/male/1.jpg',
          female: 'https://raw.githubusercontent.com/iamriz7/couples-pics/main/female/1.jpg'
        },
        {
          male: 'https://raw.githubusercontent.com/iamriz7/couples-pics/main/male/2.jpg',
          female: 'https://raw.githubusercontent.com/iamriz7/couples-pics/main/female/2.jpg'
        },
        {
          male: 'https://raw.githubusercontent.com/iamriz7/couples-pics/main/male/3.jpg',
          female: 'https://raw.githubusercontent.com/iamriz7/couples-pics/main/female/3.jpg'
        },
        {
          male: 'https://cdn.pixabay.com/photo/2017/12/11/15/34/lions-3012515_960_720.jpg',
          female: 'https://cdn.pixabay.com/photo/2017/12/11/15/34/lions-3012515_960_720.jpg'
        },
        {
          male: 'https://cdn.pixabay.com/photo/2016/03/28/12/35/cat-1285634_960_720.png',
          female: 'https://cdn.pixabay.com/photo/2015/11/16/22/14/cat-1046544_960_720.jpg'
        }
      ];
      
      // Se nenhuma API funcionar OU se coupleData.female for null, usar backup
      if (!coupleData || coupleData.female === null) {
        coupleData = backupImages[Math.floor(Math.random() * backupImages.length)];
      }
      
      // Função para tentar enviar imagem com retry em caso de falha
      const sendImageWithRetry = async (imageUrl, caption, maxRetries = 3) => {
        let lastError = null;
        
        // Tentar URLs alternativas se a original falhar
        const urls = [
          imageUrl,
          ...backupImages.map(img => Math.random() > 0.5 ? img.male : img.female)
        ];
        
        for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
          const url = urls[urlIndex];
          
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              // Adicionar delay exponencial entre tentativas
              if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
              }
              
              // Tentar enviar a imagem
              await Yaka.sendMessage(m.from, {
                image: { url },
                caption
              }, { quoted: m });
              
              return true; // Sucesso
            } catch (error) {
              lastError = error;
              console.log(`Tentativa ${attempt + 1} falhou para URL ${url}:`, error.message);
            }
          }
        }
        
        // Se chegou aqui, todas as tentativas falharam
        throw lastError;
      };
      
      // Enviar imagens com retry
      try {
        await sendImageWithRetry(coupleData.male, `_Para Ele..._ 💕`);
        await sendImageWithRetry(coupleData.female, `_Para Ela..._ 💕`);
      } catch (sendError) {
        // Se falhar no envio, enviar mensagem de erro
        await Yaka.sendMessage(m.from, {
          text: "Desculpe, não foi possível carregar imagens de casal.\nTente novamente mais tarde. 💔"
        }, { quoted: m });
      }
      
    } catch (error) {
      console.error('Erro no comando couplepp:', error);
      // Mensagem de erro
      await Yaka.sendMessage(m.from, {
        text: "Desculpe, não foi possível carregar imagens de casal.\nTente novamente mais tarde. 💔"
      }, { quoted: m });
    }
  }
}