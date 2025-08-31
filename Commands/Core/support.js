module.exports = {
  name: "suporte",
  alias: ["grupodesuporte"],
  desc: "Envia o link do grupo de suporte",
  cool: 3,
  react: "🥺",
  category: "Core",

  start: async (Yaka, m, { pushName }) => {
    // avisa no chat onde o comando foi chamado
    m.reply(`Verifique sua caixa de entrada, *${pushName}*!`);

    const botpic = botImage1;           // imagem padrão
    const txt = `*Link do grupo:* ${suppL}

*Observação:* não faça spam e não envie mensagens diretas aos administradores sem permissão. Peça ajuda dentro do grupo.

*Obrigado por usar o Yaka!*`;

    // envia a mensagem (com foto) no PV do usuário
    await Yaka.sendMessage(
      m.sender,
      { image: { url: botpic }, caption: txt },
      { quoted: m }
    );
  },
};
