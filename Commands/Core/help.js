const fs = require('fs');
const path = require('path');

// Cache do arquivo GIF - carrega apenas uma vez
let cachedImageBuffer;
try {
  // Uso de caminho relativo para melhor compatibilidade
  const filePath = path.join(__dirname, '../../Assets/Img/girlrosa.gif');
  if (fs.existsSync(filePath)) {
    cachedImageBuffer = fs.readFileSync(filePath);
    console.log('Arquivo de menu em cache carregado com sucesso');
  } else {
    console.log('Arquivo GIF do menu não encontrado em:', filePath);
  }
} catch (err) {
  console.error('Erro ao carregar arquivo em cache:', err);
}

module.exports = {
  name: "help",
  alias: ["menu", "commands", "h", "cmd"],
  desc: "Exibe todos os menus de comando do bot",
  react: "📚",
  category: "Core",
  start: async (
    Yaka,
    m,
    { prefix, pushName, NSFWstatus, args, commands, uptime, isCreator }
  ) => {
    // Verificação de segurança para evitar erros
    if (!commands) {
      console.log('Alerta: commands está undefined');
      commands = { size: 0 }; // Valor padrão para evitar erros
    }
    
    // Formatação padronizada para criar um visual mais organizado
    const formatSection = (title, emoji) => {
      return `┏━━━━━『 ${emoji} *${title}* 』━━━━━┓`;
    };
    
    const formatFooter = () => {
      return `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
    };
    
    // Cabeçalho principal do bot com visual melhorado
    const header = `
╭────『 ⚡ *YAKASHI DOJO* - 道場 ⚡ 』────╮
│
│  🌸 KONNICHIWA, ${pushName || 'User'}-kun! ようこそ
│  ⛩️ BOT: ${global.botName || 'Yakashi'} - OTAKU SUPREME
│  ⏰ UPTIME: ${uptime || 'Desconhecido'}
│  👑 OWNER: Yen-sama
│  🔮 PREFIX: ${prefix || '.'}
│
╰─────────────────────────────────╯
`;

    // Menu principal reorganizado com ícones consistentes
    const mainMenu = `
${formatSection('MENU PRINCIPAL', '🎌')}
┃
┃ 🏯『 コア - CORE 』
┃   ⚙️ ${prefix}core - Comandos essenciais
┃   🛡️ ${prefix}admins - Funções administrativas
┃   🔞 ${prefix}nsfwconfig - IMAGENS 18+
┃   🎬 ${prefix}xvgif <qualquer> - IMAGENS real GIFS 18+
┃
┃ 🎎『 GROUP - グループ 』
┃   👥 ${prefix}grpc - Gerenciamento de grupo
┃   🛠️ ${prefix}antilink - Proteção automática
┃
┃ ⚔️『 MODERAÇÃO - モデレーション 』
┃   👮‍♂️ ${prefix}modc - Controle de membros
┃
┃ 🎌『 FUN - 楽しみ 』
┃   🎮 ${prefix}func - BREVE AINDA ARRUMADO
┃   🎭 ${prefix}fact - BREVE AINDA ARRUMADO
┃   💘 ${prefix}ship - Compatibilidade
┃
${formatFooter()}`;

    // Seção de comandos Weeb com visual melhorado
    const weebCommands = `
${formatSection('COMANDOS WEEB', '🧿')}
┃
┃ 🎋 ${prefix}ᴀɴɪᴍᴇQᴜᴏᴛᴇ   - Citação de anime aleatória
┃ 👘 ${prefix}ᴄᴏꜱᴘʟᴀʏ       - Foto de cosplay
┃ 🎬 ${prefix}ᴄᴏꜱᴘʟᴀʏᴠɪᴅᴇᴏ   - Vídeo de cosplay
┃ 🦊 ${prefix}ꜰᴏxɢɪʀʟ       - Imagem de foxgirl
┃ 👗 ${prefix}ᴍᴀɪᴅ          - Foto de maid de anime
┃ 🖼️ ${prefix}ᴡᴀʟʟᴘᴀᴘᴇʀ     - Buscar wallpaper
┃ 💖 ${prefix}ᴡᴀɪꜰᴜ         - Imagem de waifu
┃
${formatFooter()}`;

    // Seção de Downloads e Busca
    const downloadsMenu = `
${formatSection('DOWNLOADS E BUSCA', '📥')}
┃
┃ 📥『 DOWNLOADS - ダウンロード 』
┃   🎵 ${prefix}mediac - BREVE AINDA ARRUMADO
┃   📺 ${prefix}ytmp4 - BREVE AINDA ARRUMADO
┃   🎶 ${prefix}ig   -   INSTAGRAM IMAGEM/VIDEO <LINK>
┃   🎬 ${prefix}tk - VIDEO DO LINK
┃
┃ 🔍『 SEARCH - 検索 』
┃   🌐 ${prefix}searchc - Busca avançada
┃   📰 ${prefix}news - BREVE AINDA ARRUMADO
┃
${formatFooter()}`;

    // Seção de figurinhas reorganizada
    const stickerMenu = `
${formatSection('FIGURINHAS', '🎞️')}
┃
┃ 📱 『 COMANDOS DE STICKER 』
┃   🖼️ ${prefix}s - Cria figurinha de imagem/vídeo/gif
┃
┃ 💡 『 DICAS PARA FIGURINHAS 』
┃   📸 Salve a imagem/vídeo para melhor qualidade
┃   🎬 Vídeos serão convertidos em stickers animados (10s max)
┃   🔄 Responda com ${prefix}s para converter mídia
┃
${formatFooter()}`;

    // Seção de Pinterest melhorada e organizada
    const pinterestMenu = `
${formatSection('PINTEREST', '🖼️')}
┃
┃ 🎭 『 ANIME & PERSONAGENS 』
┃   🔥 ${prefix}pinterest anime    - Imagens de anime
┃   ⚔️ ${prefix}pinterest kimetsu  - Demon Slayer
┃   👹 ${prefix}pinterest nezuko   - Nezuko Kamado
┃   ⛩️ ${prefix}pinterest tanjiro  - Tanjiro Kamado
┃   🏀 ${prefix}pinterest bachira  - Meguru Bachira
┃   ⛩️ ${prefix}pinterest gojo     - Gojo Satoru
┃
┃ 👤 『 PERFIS & AVATARES 』
┃   👧 ${prefix}pinterest girlpfp   - Perfis femininos
┃   👦 ${prefix}pinterest malepfp   - Perfis masculinos
┃   🎭 ${prefix}pinterest girlart   - Arte feminina
┃   🦸‍♂️ ${prefix}pinterest maleart  - Arte masculina
┃   👸 ${prefix}pinterest femaleart - Arte feminina elegante
┃
┃ 🔥 『 ESTILOS & TEMAS 』
┃   🎤 ${prefix}pinterest sung     - Sung Jin-Woo
┃   🥷 ${prefix}pinterest samurai  - Samurais
┃   🌃 ${prefix}pinterest solo     - Arte solo
┃   🖤 ${prefix}pinterest goth     - Estilo gótico
┃   🌸 ${prefix}pinterest waifu    - Wallpapers waifu
┃
${formatFooter()}`;

    // Seção de Pinterest GIF organizada
    const pinterestGifMenu = `
${formatSection('PINTEREST GIF', '🎞️')}
┃
┃ 🧿 『 PERSONAGENS ANIMADOS 』
┃   ⛩️ ${prefix}pinterestgif gojo    - Gojo Satoru GIF
┃   🔥 ${prefix}pinterestgif anime   - Anime Demon GIFs
┃   💕 ${prefix}pinterestgif cute    - Cute GIF
┃   💃 ${prefix}pinterestgif dance   - Dance GIF
┃   🐱 ${prefix}pinterestgif cat     - Cat GIFs
┃   🎭 ${prefix}pinterestgif sung    - Sung Jin Woo GIFs
┃   👹 ${prefix}pinterestgif nezuko  - Nezuko Kamado GIF
┃   🏀 ${prefix}pinterestgif bachira - Bachira Meguru GIF
┃   😈 ${prefix}pinterestgif sukuna  - Ryomen Sukuna GIF
┃   💋 ${prefix}pinterestgif kiss    - Kiss GIF
┃   ❤️ ${prefix}pinterestgif love    - Anime Love GIF
┃
${formatFooter()}`;

    // Seção de Anime/Waifu mais organizada
    const animeMenu = `
${formatSection('ANIME/WAIFU', '🌸')}
┃
┃ 💝 ${prefix}anime - Conteúdo anime variado
┃ 👘 ${prefix}waifu - Wallpapers waifu
┃ 🎭 ${prefix}neko  - Imagens neko
┃
${formatFooter()}`;

    // Reações de anime em formato de tabela mais organizada
    const reactionMenu = `
${formatSection('REAÇÕES DE ANIME', '💕')}
┃
┃  😊 ${prefix}behappy  - Felicidade    😳 ${prefix}hug   - Abraçar
┃  😬 ${prefix}bite     - Morder        😘 ${prefix}kiss  - Beijar
┃  💫 ${prefix}bonk     - Bonkar        😅 ${prefix}pat   - Acariciar
┃  🤕 ${prefix}bully    - Provocar      👋 ${prefix}wave  - Acenar
┃  😭 ${prefix}cry      - Chorar        😉 ${prefix}wink  - Piscar
┃  💃 ${prefix}dance    - Dançar        ☠️ ${prefix}yeet  - Arremessar
┃  🤝 ${prefix}handhold - Mãos          😡 ${prefix}slap  - Dar tapa
┃  😄 ${prefix}happy    - Alegria       😈 ${prefix}kick  - Chutar
┃  🙌 ${prefix}highfive - Toca aqui     😺 ${prefix}smile - Sorrir
┃  ⚰️ ${prefix}kill     - Eliminar
┃
${formatFooter()}`;

    // Status do sistema com visual melhorado
    const systemStatus = `
${formatSection('STATUS DO SISTEMA', '📊')}
┃
┃  📌 Total de Comandos: ${commands?.size || 'N/A'}
┃  💫 Reações Disponíveis: 19
┃  🎮 Módulos Ativos: 7
┃  📈 Versão: Yakashi v3.0 OTAKU SUPREME
┃
${formatFooter()}`;

    // Rodapé com créditos
    const footer = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
     『⛩️』 YEN-SAMA CREATION 『⛩️』
 🌸 BOT YAKASHI VERSÃO OTAKU SUPREME 🌸
     🐉 PARA GRUPOS DE ANIME 🐉
        🎋 ありがとう！ 🎋
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

_Digite ${prefix}help [categoria] para mais detalhes_`;

    // Montagem do menu completo
    const txt = `${header}${mainMenu}${weebCommands}${downloadsMenu}${stickerMenu}${pinterestMenu}${pinterestGifMenu}${animeMenu}${reactionMenu}${systemStatus}${footer}`;

    try {
      // Usar o buffer em cache se disponível
      if (cachedImageBuffer) {
        await Yaka.sendMessage(
          m.from,
          {
            image: cachedImageBuffer,
            caption: txt,
            gifPlayback: true
          },
          { quoted: m }
        ).catch(err => {
          console.error('Erro ao enviar mensagem com GIF:', err);
          // Fallback para texto apenas em caso de erro
          Yaka.sendMessage(m.from, { text: txt }, { quoted: m });
        });
      } else {
        // Se não tiver o GIF em cache, envie apenas texto
        await Yaka.sendMessage(m.from, { text: txt }, { quoted: m });
      }
    } catch (error) {
      console.error('Erro no comando help:', error);
      // Garantir que o usuário receba uma resposta mesmo com erro
      await Yaka.sendMessage(m.from, { text: txt }, { quoted: m }).catch(e => {
        console.error('Falha crítica ao enviar mensagem:', e);
      });
    }
  },
};