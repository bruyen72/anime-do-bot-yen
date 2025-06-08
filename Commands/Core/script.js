const axios = require("axios");
const fs    = require("fs");

module.exports = {
  name: "script",
  alias: ["repo", "sc", "sourcecode"],
  desc: "Mostra informações sobre o repositório do bot",
  react: "📃",
  category: "Core",

  start: async (Yaka, m, { pushName, prefix }) => {
    // imagem local — pode trocar pelo logo que preferir
    const picURL = fs.readFileSync("./Page/yaka.jpg");

    // busca dados do repositório no GitHub
    const repoInfo = await axios.get(
      "https://api.github.com/repos/Yakashi13/Yaka-bot"
    );
    const repo = repoInfo.data;

    // mensagem formatada
    const txt = `      ⭕️ *| Script do Y A K A  B O T |* ⭕️

*🔄 Forks:* ${repo.forks_count}
*⭐ Stars:* ${repo.stargazers_count}
*📜 Licença:* ${repo.license.name}
*📁 Tamanho do repo:* ${(repo.size / 1024).toFixed(2)} MB
*📅 Última atualização:* ${repo.updated_at}

❝ *Obrigado por usar o Y A K A – B O T.* ❞

©️ 𝖄𝖆𝖐𝖆𝖘𝖍𝖎 • 2023`;

    await Yaka.sendMessage(
      m.from,
      { image: picURL, caption: txt },
      { quoted: m }
    );
  },
};
