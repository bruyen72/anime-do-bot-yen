const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mk } = require("../../Database/dataschema.js");

module.exports = {
  name: "nsfw",
  alias: ["nsfwswitch", "nsfwmode"],
  desc: "Enable or disable NSFW commands in a group",
  category: "Group",
  usage: "nsfw [on/off]",
  react: "🍃",
  start: async (
    Yaka,
    m,
    { args, isBotAdmin, isCreator, reply, prefix, pushName }
  ) => {
    try {
      // Se for no PRIVADO
      if (!m.isGroup) {
        // Enviar mensagem mais explicativa
        let nsfwMessage = {
          text: `🔞 *NSFW PRIVADO ATIVO* 🔞\n\n✅ *${pushName}*, você está no ambiente seguro!\n\n🎯 **Comandos NSFW disponíveis:**\n• \`${prefix}ass\` - Imagens sensuais\n• \`${prefix}pussy\` - Conteúdo específico\n• \`${prefix}hentai\` - Anime adulto\n• \`${prefix}sex\` - Conteúdo adulto\n• \`${prefix}yuri\` - Yuri content\n• E mais 100+ comandos...\n\n💡 **Teste agora:**\nDigite \`${prefix}ass\` aqui mesmo!\n\n📱 **Sistema:**\n✓ Todos os comandos funcionam aqui\n✓ Grupos ficam limpos automaticamente\n✓ Redirecionamento discreto\n✓ Sem restrições no privado\n\n⚠️ _Conteúdo apenas para maiores de 18 anos_\n\n🔥 **Experimente alguns comandos agora!**`
        };
        
        return Yaka.sendMessage(m.from, nsfwMessage, { quoted: m });
      }

      // Para GRUPOS
      let checkdata = await mk.findOne({ id: m.from });
      var groupe = await Yaka.groupMetadata(m.from);
      var members = groupe["participants"];
      var mems = [];
      
      members.map(async (adm) => {
        mems.push(adm.id.replace("c.us", "s.whatsapp.net"));
      });

      if (args[0] === "on") {
        if (!checkdata) {
          await new mk({ id: m.from, switchNSFW: "redirect" }).save();
          
          await Yaka.sendMessage(
            m.from,
            {
              text: `✅ *Sistema de redirecionamento* ativado neste grupo!`,
              contextInfo: { mentionedJid: mems },
            },
            { quoted: m }
          );
          
          return Yaka.sendMessage(
            m.sender,
            {
              text: `🔞 *NSFW CONFIGURADO* 🔞\n\n👋 *${pushName}*, você ativou o sistema!\n\n📱 **No grupo:** Comandos são redirecionados\n🔞 **Aqui no privado:** Todos funcionam!\n\n💡 *Teste agora: digite \`${prefix}ass\` aqui!*`
            }
          );
          
        } else {
          if (checkdata.switchNSFW == "redirect")
            return Yaka.sendMessage(
              m.from,
              { text: `✅ *Sistema de redirecionamento* já está ativo neste grupo!` },
              { quoted: m }
            );
            
          await mk.updateOne({ id: m.from }, { switchNSFW: "redirect" });
          return Yaka.sendMessage(
            m.from,
            { text: `✅ *SISTEMA NSFW ATIVO* - Redirecionamento ativado neste grupo!` },
            { quoted: m }
          );
        }
      } else if (args[0] === "off") {
        if (!checkdata) {
          await new mk({ id: m.from, switchNSFW: "false" }).save();
          return Yaka.sendMessage(
            m.from,
            { text: `🚫 *NSFW DESATIVADO* - Todos os comandos NSFW foram bloqueados!` },
            { quoted: m }
          );
        } else {
          if (checkdata.switchNSFW == "false")
            return Yaka.sendMessage(
              m.from,
              { text: `🚫 *NSFW* já está desativado neste grupo!` },
              { quoted: m }
            );
            
          await mk.updateOne({ id: m.from }, { switchNSFW: "false" });
          return Yaka.sendMessage(
            m.from,
            { text: `🚫 *NSFW DESATIVADO* - Comandos NSFW bloqueados neste grupo!` },
            { quoted: m }
          );
        }
      } else {
        let buttonsntilink = [
          {
            buttonId: `${prefix}nsfw on`,
            buttonText: { displayText: "📱 Ativar Redirecionamento" },
            type: 1,
          },
          {
            buttonId: `${prefix}nsfw off`,
            buttonText: { displayText: "🚫 Bloquear Totalmente" },
            type: 1,
          },
        ];
        
        let bmffg = {
          text: `🔐 *CONTROLE NSFW INTELIGENTE* 🔐\n\n📱 **Redirecionamento** (Recomendado)\n• Comandos NSFW vão para o privado\n• Grupos ficam limpos automaticamente\n• Usuários recebem conteúdo no DM\n\n🚫 **Bloqueio Total**\n• Todos os comandos NSFW são negados\n• Nenhum redirecionamento\n• Bloqueio completo\n\n⚡ *Escolha o modo de proteção:*`,
          footer: `*${botName} - Sistema NSFW*`,
          buttons: buttonsntilink,
          headerType: 1,
        };
        
        await Yaka.sendMessage(m.from, bmffg, { quoted: m });
      }
    } catch (error) {
      console.error("Erro no comando NSFW:", error);
      m.reply("❌ Erro ao executar comando!");
    }
  },
};