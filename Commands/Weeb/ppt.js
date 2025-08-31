const fs = require('fs');
const path = require('path');

// Sistema de partidas
let partidas = new Map(); // grupoID -> { jogadores: [], emProgresso: false }
let jogadasSecretas = new Map(); // userID+grupoID -> jogada

// Determina o vencedor
function resultado(j1, j2) {
  if (j1.jogada === j2.jogada) return null;
  if ((j1.jogada === "pedra" && j2.jogada === "tesoura") ||
      (j1.jogada === "papel" && j2.jogada === "pedra") ||
      (j1.jogada === "tesoura" && j2.jogada === "papel")) {
    return j1;
  }
  return j2;
}

// Limpa partidas e jogadas antigas
function limparDados() {
  const MAX_PARTIDAS = 20;
  const agora = Date.now();
  
  // Limpa partidas
  if (partidas.size > MAX_PARTIDAS) {
    const chavesAntigas = Array.from(partidas.keys()).slice(0, 5);
    for (const chave of chavesAntigas) {
      partidas.delete(chave);
    }
  }
  
  // Limpa jogadas secretas antigas (mais de 1 hora)
  for (const [chave, dados] of jogadasSecretas.entries()) {
    if (agora - dados.timestamp > 3600000) { // 1 hora
      jogadasSecretas.delete(chave);
    }
  }
}

module.exports = {
  name: "ppt",
  category: "game",
  desc: "Jogo Pedra, Papel ou Tesoura sem vazamentos",
  usage: ".ppt <código>",
  start: async (Yaka, m, { args }) => {
    try {
      limparDados();
      
      const grupoID = m.from;
      const userID = m.sender;
      const chaveUsuario = `${userID}_${grupoID}`;
      
      // Sistema de duas etapas para esconder a jogada
      
      // ETAPA 1: Mostra os códigos secretos para jogadas
      if (!args[0] || args[0] === "ajuda" || args[0] === "help") {
        // Gera códigos aleatórios únicos para cada jogada
        const codigoPedra = Math.floor(1000 + Math.random() * 9000);
        const codigoPapel = Math.floor(1000 + Math.random() * 9000);
        const codigoTesoura = Math.floor(1000 + Math.random() * 9000);
        
        // Garante que não há duplicados
        if (codigoPapel === codigoPedra) codigoPapel += 1;
        if (codigoTesoura === codigoPedra || codigoTesoura === codigoPapel) codigoTesoura += 2;
        
        // Armazena os códigos secretos para este usuário
        jogadasSecretas.set(chaveUsuario, {
          pedra: codigoPedra,
          papel: codigoPapel,
          tesoura: codigoTesoura,
          timestamp: Date.now()
        });
        
        // Envia os códigos secretos APENAS para este usuário via DM
        try {
          await Yaka.sendMessage(userID, {
            text: `🎮 *Códigos secretos para jogar PPT*\n\n` +
                 `Para escolher *Pedra*: .ppt ${codigoPedra}\n` +
                 `Para escolher *Papel*: .ppt ${codigoPapel}\n` +
                 `Para escolher *Tesoura*: .ppt ${codigoTesoura}\n\n` +
                 `Use estes códigos no grupo para fazer sua jogada sem revelar sua escolha.`
          });
          
          // Notifica no grupo que os códigos foram enviados
          return m.reply("🔒 Códigos secretos enviados por mensagem privada! Use-os para jogar sem revelar sua escolha.");
        } catch (err) {
          console.error("Erro ao enviar DM:", err);
          
          // Alternativa: envia os códigos no grupo como mensagem única para o usuário
          return m.reply(`🎮 *Seus códigos secretos:*\n\n` +
                        `Pedra: ${codigoPedra}\n` +
                        `Papel: ${codigoPapel}\n` +
                        `Tesoura: ${codigoTesoura}\n\n` +
                        `Use .ppt seguido do código para jogar.`);
        }
      }
      
      // ETAPA 2: Processa o código da jogada
      const codigoJogada = args[0];
      
      // Verifica se o usuário tem códigos registrados
      if (!jogadasSecretas.has(chaveUsuario)) {
        return m.reply("❓ Você ainda não tem códigos secretos. Use `.ppt` para receber seus códigos.");
      }
      
      const codigosDoUsuario = jogadasSecretas.get(chaveUsuario);
      let jogadaEscolhida = null;
      
      // Determina qual jogada o código representa
      if (codigoJogada == codigosDoUsuario.pedra) {
        jogadaEscolhida = "pedra";
      } else if (codigoJogada == codigosDoUsuario.papel) {
        jogadaEscolhida = "papel";
      } else if (codigoJogada == codigosDoUsuario.tesoura) {
        jogadaEscolhida = "tesoura";
      } else {
        return m.reply("❌ Código inválido. Use `.ppt` para ver seus códigos secretos.");
      }
      
      // Inicializa a partida
      if (!partidas.has(grupoID)) {
        partidas.set(grupoID, {
          jogadores: [],
          emProgresso: false
        });
      }
      
      const partida = partidas.get(grupoID);
      
      // Verifica se há uma partida em andamento
      if (partida.emProgresso) {
        return m.reply("⏳ Um jogo já está em andamento. Aguarde ele terminar.");
      }
      
      // Verifica se o jogador já jogou
      const jogadorIndex = partida.jogadores.findIndex(j => j.id === userID);
      
      if (jogadorIndex !== -1) {
        // Atualiza a jogada
        partida.jogadores[jogadorIndex].jogada = jogadaEscolhida;
        await m.reply("✅ Jogada registrada! Aguardando outro jogador...");
      } else {
        // Adiciona novo jogador
        partida.jogadores.push({
          id: userID,
          jogada: jogadaEscolhida,
          nome: m.pushName || userID.split('@')[0]
        });
        
        await m.reply("✅ Jogada registrada! Aguardando outro jogador...");
      }
      
      // Verifica se temos jogadores suficientes
      if (partida.jogadores.length < 2) {
        return; // Continua aguardando
      }
      
      // Marca como em progresso
      partida.emProgresso = true;
      
      try {
        // Anuncia o início do jogo sem revelar jogadas
        await Yaka.sendMessage(grupoID, {
          text: "🎮 *Duelo de Pedra, Papel ou Tesoura*\n\nCalculando resultado...",
        });
        
        // Aguarda para criar suspense
        await new Promise(r => setTimeout(r, 2000));
        
        // Pega os dois primeiros jogadores
        const [j1, j2] = partida.jogadores.slice(0, 2);
        
        // Emoji para cada jogada
        const emoji = { pedra: "✊", papel: "✋", tesoura: "✌️" };
        
        // Tenta enviar os stickers, se existirem
        const stickerDir = path.join(__dirname, "stickers", "ppt");
        const sticker1Path = path.join(stickerDir, `${j1.jogada}.webp`);
        const sticker2Path = path.join(stickerDir, `${j2.jogada}.webp`);
        
        if (fs.existsSync(sticker1Path)) {
          await Yaka.sendMessage(grupoID, { sticker: fs.readFileSync(sticker1Path) });
          await new Promise(r => setTimeout(r, 1500));
        }
        
        if (fs.existsSync(sticker2Path)) {
          await Yaka.sendMessage(grupoID, { sticker: fs.readFileSync(sticker2Path) });
          await new Promise(r => setTimeout(r, 1500));
        }
        
        // Determina o vencedor
        const vencedor = resultado(j1, j2);
        
        // Formata IDs de forma segura
        const formatarID = id => id.split('@')[0];
        
        // Cria a mensagem de resultado
        const texto =
          "🎮 *Resultado do Duelo PPT*\n\n" +
          `👤 @${formatarID(j1.id)} jogou: ${emoji[j1.jogada]} ${j1.jogada}\n` +
          `👤 @${formatarID(j2.id)} jogou: ${emoji[j2.jogada]} ${j2.jogada}\n\n` +
          (vencedor ? `🏆 Vitória de @${formatarID(vencedor.id)}!` : "🤝 Empate!");
        
        // Envia o resultado
        await Yaka.sendMessage(grupoID, {
          text: texto,
          mentions: [j1.id, j2.id]
        });
        
        // Limpa esta partida
        partida.jogadores.splice(0, 2);
        partida.emProgresso = false;
        
        // Remove a partida se não tiver mais jogadores
        if (partida.jogadores.length === 0) {
          partidas.delete(grupoID);
        }
      } catch (erro) {
        console.error("Erro na execução do jogo:", erro);
        await m.reply("⚠️ Ocorreu um erro ao processar o jogo. Tente novamente.");
        
        // Reseta o estado da partida em caso de erro
        partida.emProgresso = false;
      }
    } catch (erro) {
      console.error("Erro no PPT:", erro);
      m.reply("⚠️ Erro no jogo. Por favor, tente novamente.");
    }
  }
};