const axios = require("axios");

module.exports = {
  name: "iguser",
  alias: ["instagramuser", "instauser", "iginfo", "igstalk"],
  desc: "Obter informações detalhadas de um usuário do Instagram",
  category: "Essentials",
  usage: "iguser <nome de usuário>",
  react: "📸",
  start: async (Yaka, m, { text, prefix }) => {
    try {
      if (!text) {
        return m.reply(`❌ *Uso incorreto!*\n\n📋 *Exemplo:* ${prefix}iguser cristiano\n💡 *Dica:* Use sem o símbolo @`);
      }

      const igUsername = text.trim().replace(/^@/, '').toLowerCase();

      if (!/^[a-zA-Z0-9._]{1,30}$/.test(igUsername)) {
        return m.reply(`❌ *Nome de usuário inválido!*\n\n✅ Use apenas: letras, números, pontos e underscores\n📝 *Exemplo:* ${prefix}iguser selenagomez`);
      }

      await m.reply(`🔍 Buscando perfil de @${igUsername}...\n⏳ Aguarde alguns segundos...`);

      // API pública para obter informações de perfil
      const response = await axios.get(`https://api.popcat.xyz/instagram?user=${igUsername}`);

      if (response.status !== 200 || !response.data.username) {
        return m.reply(`❌ Usuário @${igUsername} não encontrado.`);
      }

      const data = response.data;

      const formatNumber = (num) => {
        const number = parseInt(num) || 0;
        if (number >= 1000000) {
          return (number / 1000000).toFixed(1) + 'M';
        } else if (number >= 1000) {
          return (number / 1000).toFixed(1) + 'K';
        } else {
          return number.toLocaleString('pt-BR');
        }
      };

      const reply = `✅ *PERFIL INSTAGRAM ENCONTRADO*

👤 *Nome:* ${data.full_name || 'Não informado'}
🔗 *Usuário:* @${data.username}
👥 *Seguidores:* ${formatNumber(data.followers)}
➕ *Seguindo:* ${formatNumber(data.following)}
📸 *Posts:* ${formatNumber(data.posts)}
${data.verified ? '✅ *Verificado:* Sim' : '❌ *Verificado:* Não'}
${data.private ? '🔒 *Privado:* Sim' : '🔓 *Privado:* Não'}
📝 *Bio:* ${data.biography || 'Sem biografia'}

🌐 *Link:* https://instagram.com/${data.username}
🔧 *API:* PopCat
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}`;

      if (data.profile_pic && data.profile_pic.startsWith('http')) {
        await Yaka.sendMessage(m.from, {
          image: { url: data.profile_pic },
          caption: reply
        }, { quoted: m });
      } else {
        await m.reply(reply);
      }

    } catch (error) {
      console.error(`❌ Erro no comando .iguser:`, error);
      await m.reply(`❌ Ocorreu um erro ao buscar o perfil @${text.trim()}. Por favor, tente novamente mais tarde.`);
    }
  },
};
