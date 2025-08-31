module.exports = {
  name: "ping",
  alias: ["teste", "online", ".", "status"],
  desc: "Verifica se o bot está funcionando",
  cool: 3,
  react: "🈁",
  category: "Core",

  start: async (Yaka, m, { pushName }) => {
    // avisa no chat atual
    m.reply(
      `*Confira sua caixa de entrada, ${pushName}!*` +
      `\n*Acabei de lhe enviar uma mensagem…*`
    );

    const botpic = botImage1;          // imagem padrão do bot
    const txt    = `|| Olá, Senpai-kun! ||`;

    // envia a “surpresa” no PV do autor da mensagem
    await Yaka.sendMessage(
      m.sender,
      { image: { url: botpic }, caption: txt },
      { quoted: m }
    );
  },
};
