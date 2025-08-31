const canvacord = require("canvacord");
const { fetchBuffer } = require("../../lib/Function");

module.exports = {
  name: "rank",
  alias: ["rank"],
  desc: "Mostra o ranking do usuário",
  cool: 3,
  react: "🔮️",
  category: "Geral",

  start: async (Yaka, m, { text, pushName, sender }) => {
    const userq = await Levels.fetch(m.sender, "bot");
    const levelRole = userq.level;

    // ----- Títulos conforme o nível -----
    let role = "Cidadão";
    if (levelRole <= 2) role = "Beginner";
    else if (levelRole <= 4) role = "Fiend";
    else if (levelRole <= 6) role = "Hellion";
    else if (levelRole <= 8) role = "Abomination";
    else if (levelRole <= 10) role = "Demon";
    else if (levelRole <= 12) role = "Archdemon";
    else if (levelRole <= 14) role = "Infernal Lord";
    else if (levelRole <= 16) role = "Demon King";
    else if (levelRole <= 18) role = "Demon Emperor";
    else if (levelRole <= 20) role = "Dark Lord";
    else if (levelRole <= 22) role = "Shadow Emperor";
    else if (levelRole <= 24) role = "Hellfire Emperor";
    else if (levelRole <= 26) role = "Demon Overlord";
    else if (levelRole <= 28) role = "Devil King";
    else if (levelRole <= 30) role = "Underworld Emperor";
    else if (levelRole <= 32) role = "Prince of Darkness";
    else if (levelRole <= 34) role = "Lord of the Underworld";
    else if (levelRole <= 36) role = "Demon Lord Supreme";
    else if (levelRole <= 38) role = "Master of the Inferno";
    else if (levelRole <= 40) role = "Emperor of the Dark Realms";
    else if (levelRole <= 42) role = "Lord of the Flames";
    else if (levelRole <= 44) role = "Shadow Lord";
    else if (levelRole <= 46) role = "Devil Emperor";
    else if (levelRole <= 48) role = "Demon General";
    else if (levelRole <= 50) role = "Devil King Supreme";
    else if (levelRole <= 52) role = "Inferno Lord";
    else if (levelRole <= 54) role = "Demon Warlord";
    else if (levelRole <= 56) role = "Supreme";
    else if (levelRole <= 58) role = "Emperor";
    else if (levelRole <= 60) role = "Yaksa";
    else if (levelRole <= 62) role = "Ancient Vampire";
    else if (levelRole <= 64) role = "Hellfire King";
    else if (levelRole <= 66) role = "Supreme Demon Lord";
    else if (levelRole <= 68) role = "Revered Ruler";
    else if (levelRole <= 70) role = "Divine Ruler";
    else if (levelRole <= 72) role = "Eternal Ruler";
    else if (levelRole <= 74) role = "Prime";
    else if (levelRole <= 76) role = "Prime Lord";
    else if (levelRole <= 78) role = "The Prime Emperor";
    else if (levelRole <= 80) role = "The Original";
    else if (levelRole <= 100) role = "High Level Bitch";

    // ----- Texto de cabeçalho -----
    const disc = m.sender.substring(3, 7);
    let textr = "";

    if (pushName) textr += `*XP de ${pushName}#${disc}*\n\n`;
    else textr += `*XP de ${m.sender}#${disc}*\n\n`;

    textr += `*🎯 XP:* ${userq.xp} / ${Levels.xpFor(userq.level + 1)}\n`;
    textr += `*❤️ Nível:* ${userq.level}\n`;
    textr += `*🔮 Título:* ${role}`;

    // ----- Avatar -----
    let ppuser;
    try {
      ppuser = await Yaka.profilePictureUrl(m.sender, "image");
    } catch {
      const fallback =
        "https://www.linkpicture.com/q/IMG-20220118-WA0387.png";
      ppuser = await fetchBuffer(fallback);
    }

    // ----- Cores aleatórias -----
    const randHex = () =>
      `#${((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0")}`;
    const color1 = randHex();
    const color2 = randHex();
    const color3 = randHex();

    // ----- Card de rank -----
    const rankCard = new canvacord.Rank()
      .setAvatar(ppuser)
      .setLevel(userq.level)
      .setLevelColor(color1, color2)
      .setCurrentXP(userq.xp)
      .setOverlay(color2, 100, false)
      .setRequiredXP(Levels.xpFor(userq.level + 1))
      .setProgressBar(color1, "COLOR")
      .setRank(0, role, false)
      .setBackground("COLOR", color3)
      .setUsername(pushName || "Usuário")
      .setDiscriminator(disc);

    // ----- Envia resultado -----
    rankCard.build().then(async (img) => {
      await Yaka.sendMessage(
        m.from,
        { image: img, caption: textr },
        { quoted: m }
      );
    });
  },
};
