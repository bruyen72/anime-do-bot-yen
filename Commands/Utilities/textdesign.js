const { styletext } = require('../../lib/scrapper');

module.exports = {
    name: "textdesign",
    alias: ["fonts"],
    desc: "Para aplicar fontes legais no texto.",
    category: "Mídia",
    usage: `fonts <texto>`,
    react: "👹",
    start: async (Yaka, m, { text, prefix, args, mime }) => {
        try {
            // Verificar se há texto
            if (!text && (!args || args.length === 0)) {
                return Yaka.sendMessage(
                    m.from,
                    { text: `Por favor, forneça um texto! Uso: ${prefix}fonts <seu texto>` },
                    { quoted: m }
                );
            }

            const textoEntrada = text || args.join(" ");
            
            if (!textoEntrada.trim()) {
                return Yaka.sendMessage(
                    m.from,
                    { text: `Por favor, forneça um texto válido!` },
                    { quoted: m }
                );
            }

            // Verificar se a função styletext existe
            if (typeof styletext !== 'function') {
                return m.reply('Função de estilo de texto não está disponível!');
            }

            const resultado = await styletext(textoEntrada);
            
            if (!resultado || resultado.length === 0) {
                return m.reply('Nenhum texto estilizado disponível para esta entrada!');
            }

            let textoFinal = `*Texto Estilizado para:* "${textoEntrada}"\n\n`;
            for (let i of resultado) {
                if (i && i.result) {
                    textoFinal += `〄 ${i.result}\n\n`;
                }
            }
            
            await m.reply(textoFinal);
            
        } catch (error) {
            console.error('Erro no textdesign:', error);
            await m.reply('Ocorreu um erro ao estilizar o texto!');
        }
    }
};