const axios = require("axios");
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: "3dchristmas",
  alias: ["3dchristmastree", "christmaslogo", "xmaslogo"],
  desc: "Criar logo de texto 3D com tema de Natal",
  react: "🎄",
  category: "Logo Maker",
  usage: "3dchristmas <texto>",
  start: async (Yaka, m, { pushName, prefix, text, botName }) => {
    try {
      // Validação de entrada
      if (!text) {
        return m.reply(`❌ *Texto obrigatório!*\n\n📋 *Exemplo:* ${prefix}3dchristmas Feliz Natal\n💡 *Dica:* Use textos curtos para melhor resultado`);
      }

      // Validação do tamanho do texto
      if (text.length > 30) {
        return m.reply(`❌ *Texto muito longo!*\n\n📏 *Máximo:* 30 caracteres\n📝 *Atual:* ${text.length} caracteres\n💡 *Dica:* Use textos mais curtos`);
      }

      // Envia mensagem de carregamento
      await m.reply(`🎄 *Criando logo de Natal...*\n⏳ *Aguarde alguns segundos...*\n\n📝 *Texto:* ${text}`);

      console.log(`🎄 Iniciando criação de logo 3D Christmas para: "${text}"`);

      // Lista de APIs funcionais para tentar
      const logoMakers = [
        {
          name: "DeepAI Logo Generator",
          method: async () => {
            const response = await axios.post('https://api.deepai.org/api/logo-generator', {
              text: `3D Christmas logo: ${text}, festive, red and green colors, snow effects, Christmas tree elements`
            }, {
              timeout: 30000,
              headers: {
                'api-key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K', // Key pública do DeepAI
                'Content-Type': 'application/json'
              }
            });
            return response.data.output_url;
          }
        },
        {
          name: "AI Logo Generator",
          method: async () => {
            const response = await axios.get(`https://ailogomaker.io/api/generate?text=${encodeURIComponent(text)}&style=christmas&effect=3d`, {
              timeout: 25000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            return response.data.image_url || response.data.url;
          }
        },
        {
          name: "Cool Text Generator",
          method: async () => {
            const response = await axios.post('https://cooltext.com/PostChange', {
              LogoID: 4,
              Text: text,
              FontSize: 70,
              Color1_color: '#FF0000',
              Color2_color: '#00FF00',
              Integer1: 15,
              Integer9: 0,
              Integer13: 'on',
              Integer12: 'on'
            }, {
              timeout: 25000,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            return response.data.url || response.data.image;
          }
        },
        {
          name: "Logo AI Generator",
          method: async () => {
            const response = await axios.post('https://www.logoai.com/api/make-logo', {
              company_name: text,
              style: 'christmas',
              industry: 'holiday'
            }, {
              timeout: 30000,
              headers: {
                'Content-Type': 'application/json'
              }
            });
            return response.data.logo_url;
          }
        },
        {
          name: "Canvas Local Generator",
          method: async () => {
            return await generateLocalChristmasLogo(text);
          }
        }
      ];

      let logoUrl = null;
      let successfulMethod = null;
      let attemptCount = 0;

      // Tenta cada método
      for (const logoMaker of logoMakers) {
        try {
          attemptCount++;
          console.log(`🔄 [${attemptCount}/${logoMakers.length}] Tentando ${logoMaker.name}...`);
          
          const result = await logoMaker.method();
          
          if (result && typeof result === 'string' && (result.startsWith('http') || result.startsWith('data:'))) {
            logoUrl = result;
            successfulMethod = logoMaker.name;
            console.log(`✅ Sucesso com ${logoMaker.name}!`);
            break;
          } else {
            console.log(`❌ ${logoMaker.name}: Resultado inválido`);
          }
          
        } catch (error) {
          console.log(`❌ ${logoMaker.name} falhou: ${error.message}`);
          
          // Delay entre tentativas
          if (attemptCount < logoMakers.length) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          continue;
        }
      }

      // Se conseguiu gerar o logo
      if (logoUrl && successfulMethod) {
        console.log(`✅ Logo gerado com sucesso via ${successfulMethod}`);
        
        try {
          // Tenta enviar a imagem
          if (logoUrl.startsWith('data:')) {
            // Se for base64, converte para buffer
            const base64Data = logoUrl.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            await Yaka.sendMessage(m.from, {
              image: buffer,
              caption: `🎄 *LOGO 3D CHRISTMAS CRIADO!*

📝 *Texto:* ${text}
🎨 *Estilo:* 3D Christmas
🔧 *Método:* ${successfulMethod}
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

🤖 *Feito por:* ${botName || 'Yaka Bot'}
🎅 *Feliz Natal!* 🎄

_Use ${prefix}help para ver mais comandos de logo_`
            }, { quoted: m });
          } else {
            // Se for URL
            await Yaka.sendMessage(m.from, {
              image: { url: logoUrl },
              caption: `🎄 *LOGO 3D CHRISTMAS CRIADO!*

📝 *Texto:* ${text}
🎨 *Estilo:* 3D Christmas
🔧 *Método:* ${successfulMethod}
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

🤖 *Feito por:* ${botName || 'Yaka Bot'}
🎅 *Feliz Natal!* 🎄

_Use ${prefix}help para ver mais comandos de logo_`
            }, { quoted: m });
          }
          
          console.log(`✅ Logo enviado com sucesso`);
          return;
          
        } catch (sendError) {
          console.log(`❌ Erro ao enviar imagem: ${sendError.message}`);
          
          // Fallback: envia apenas o link se for URL
          if (logoUrl.startsWith('http')) {
            await m.reply(`🎄 *Logo criado com sucesso!*\n\n🔗 *Link:* ${logoUrl}\n🔧 *Via:* ${successfulMethod}\n\n💡 *Clique no link para baixar o logo*`);
            return;
          }
        }
      }

      // Se nenhum método funcionou - cria um logo texto simples
      console.log(`❌ Todos os ${logoMakers.length} métodos falharam, criando logo texto simples`);
      
      try {
        const simpleLogoBuffer = await createSimpleChristmasText(text);
        
        await Yaka.sendMessage(m.from, {
          image: simpleLogoBuffer,
          caption: `🎄 *LOGO DE NATAL CRIADO!*

📝 *Texto:* ${text}
🎨 *Estilo:* Christmas Text (Fallback)
🔧 *Método:* Gerador Local
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

⚠️ *Nota:* APIs externas indisponíveis
🎅 *Feliz Natal!* 🎄

_Logo criado localmente pelo bot_`
        }, { quoted: m });
        
        console.log(`✅ Logo texto simples enviado com sucesso`);
        return;
        
      } catch (fallbackError) {
        console.log(`❌ Erro no fallback: ${fallbackError.message}`);
      }

      // Último recurso - só texto
      const errorReply = `❌ *Não foi possível criar o logo*

📝 *Texto:* ${text}
🔄 *Tentativas:* ${logoMakers.length} métodos testados

**🔧 Todos os serviços estão temporariamente indisponíveis:**
• APIs de logo externas fora do ar
• Gerador local com problemas
• Possível sobrecarga dos serviços

**💡 Soluções:**
• Aguarde 5-10 minutos e tente novamente
• Verifique sua conexão com a internet
• Tente com textos mais simples

**🧪 Tente depois:**
• \`${prefix}3dchristmas Noel\`
• \`${prefix}3dchristmas 2025\`
• \`${prefix}3dchristmas Xmas\`

**🎄 Alternativas funcionais agora:**
• \`${prefix}textlogo ${text}\` - Logo de texto simples
• \`${prefix}sticker\` - Criar figurinha
• \`${prefix}emoji 🎄\` - Emojis de Natal

_Problema técnico temporário - tente novamente em alguns minutos_`;

      await m.reply(errorReply);

    } catch (globalError) {
      console.error(`❌ Erro global no comando 3dchristmas:`, globalError);
      
      const criticalErrorReply = `❌ *Erro crítico no comando!*

🔧 Problema técnico interno detectado.

**💡 Soluções rápidas:**
• Aguarde alguns minutos e tente novamente
• Use: \`${prefix}textlogo ${text || 'seu texto'}\`
• Verifique conexão com internet

**🆘 Se persistir:** Entre em contato com admin

_Erro registrado para correção_`;

      try {
        await m.reply(criticalErrorReply);
      } catch (replyError) {
        console.error(`❌ Erro crítico - não conseguiu responder:`, replyError);
      }
    }
  },
};

// Função para gerar logo local com Canvas
async function generateLocalChristmasLogo(text) {
  try {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Fundo gradiente natalino
    const gradient = ctx.createLinearGradient(0, 0, 800, 400);
    gradient.addColorStop(0, '#0f4c3a');
    gradient.addColorStop(0.5, '#1e5f4a');
    gradient.addColorStop(1, '#2d7a5a');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 400);

    // Efeito de neve
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 800, Math.random() * 400, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Texto principal
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#FF0000';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Sombra do texto
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    // Desenha o texto
    ctx.strokeText(text, 400, 200);
    ctx.fillText(text, 400, 200);
    
    // Elementos decorativos (estrelas)
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 10; i++) {
      drawStar(ctx, Math.random() * 800, Math.random() * 400, 5, 15, 7);
    }

    return canvas.toBuffer('image/png');
  } catch (error) {
    console.log('Erro no gerador local:', error.message);
    throw error;
  }
}

// Função para criar logo texto simples
async function createSimpleChristmasText(text) {
  const canvas = createCanvas(600, 200);
  const ctx = canvas.getContext('2d');

  // Fundo vermelho natalino
  ctx.fillStyle = '#8B0000';
  ctx.fillRect(0, 0, 600, 200);

  // Texto
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillText(text, 300, 100);
  
  // Borda dourada
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 580, 180);

  return canvas.toBuffer('image/png');
}

// Função auxiliar para desenhar estrela
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}