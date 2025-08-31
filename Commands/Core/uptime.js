const os = require("os");

module.exports = {
  name: "uptime",
  alias: ["alive", "up", "time", "server", "runtime", "run"],
  desc: "Verifica o tempo em que o bot está online",
  cool: 3,
  react: "👻",
  category: "Core",

  start: async (Yaka, m, { uptime, prefix }) => {
    const loadavg = os.loadavg();                     // carga média (1, 5, 15 min)
    const cpu = {
      model: os.cpus()[0].model,
      speed: `${os.cpus()[0].speed} MHz`,
      cores: os.cpus().length,
    };
    const memTotal = Math.round(os.totalmem() / 1024 ** 2);
    const memFree  = Math.round(os.freemem()  / 1024 ** 2);
    const memUsed  = memTotal - memFree;

    const message =
      `*${botName}* está ativo e funcionando!\n\n` +
      `⭕ *Tempo online:*  ${uptime}\n` +
      `| • ━━━━━━━━━━━━━━━━━━━━\n` +
      `⭕ *Carga média:*   ${loadavg.join(", ")}\n` +
      `| • ━━━━━━━━━━━━━━━━━━━━\n` +
      `⭕ *CPU:*  ${cpu.model} (${cpu.cores} núcleos @ ${cpu.speed})\n` +
      `| • ━━━━━━━━━━━━━━━━━━━━\n` +
      `⭕ *Memória:*  ${memUsed} MB usados / ${memTotal} MB totais\n` +
      `| • ━━━━━━━━━━━━━━━━━━━━`;

    await Yaka.sendMessage(m.from, { text: message }, { quoted: m });
  },
};
