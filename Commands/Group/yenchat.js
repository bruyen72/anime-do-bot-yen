const mongoose = require("mongoose");
require("../../config.js");
require("../../Core.js");
const { mk } = require("../../Database/dataschema.js");
const axios = require("axios");

// Chave da API Gemini
const GEMINI_API_KEY = "AIzaSyBA0RKoVJuwrVUydo6f7vQajpkNqDNFRjQ";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

module.exports = {
  name: "yenchat",
  alias: ["conversar", "falar"],
  desc: "Conversar com o chatbot inteligente YenChat",
  category: "Conversa",
  usage: "yenchat [sua mensagem]",
  react: "💬",
  start: async (
    Yaka,
    m,
    { text, args, prefix, pushName }
  ) => {
    // Verificar se o chatbot está ativado neste grupo
    const checkdata = await mk.findOne({ id: m.from });
    const chatbotAtivado = checkdata && checkdata.chatBot === "true";
    
    if (!chatbotAtivado) {
      return Yaka.sendMessage(
        m.from,
        {
          text: `*O Chatbot está desativado neste grupo.*\n\nPara ativar, um administrador precisa usar:\n${prefix}chatbotgc on`
        },
        { quoted: m }
      );
    }

    if (!text && args.length === 0) {
      return Yaka.sendMessage(
        m.from,
        {
          text: `*YenChat - Seu Assistente Virtual*\n\nOlá! Estou aqui para conversar sobre qualquer assunto. Pode me fazer perguntas, pedir informações ou apenas bater papo.\n\nBasta digitar:\n${prefix}yenchat seguido da sua mensagem`
        },
        { quoted: m }
      );
    }

    // Mensagem do usuário
    const mensagem = text || args.join(" ");
    
    // Mostrar ao usuário que o bot está "digitando"
    await Yaka.sendPresenceUpdate('composing', m.from);
    
    try {
      // Preparar a solicitação para a API Gemini
      const requestData = {
        contents: [
          {
            parts: [
              {
                text: `Você é o YenChat, um assistente virtual amigável e inteligente para grupos de WhatsApp.

INSTRUÇÕES:
- Responda em português brasileiro de forma clara e natural.
- Seja amigável, prestativo e conversacional.
- Mantenha respostas concisas (2-5 frases) para o ambiente de chat.
- Use emojis com moderação para manter o tom conversacional.
- Evite respostas muito formais - seja mais como um amigo conversando.
- Se não souber a resposta, seja honesto sobre isso.
- Responda a qualquer pergunta educadamente, mesmo que seja sobre você.

Mensagem do usuário: "${mensagem}"`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,       // Temperatura média para respostas naturais
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 250,   // Limite para não gerar respostas muito longas
        }
      };
      
      // Fazer requisição para a API Gemini
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extrair a resposta do modelo
      let resposta = "Desculpe, não consegui processar sua mensagem. Pode tentar novamente?";
      
      if (response.data && 
          response.data.candidates && 
          response.data.candidates[0] && 
          response.data.candidates[0].content && 
          response.data.candidates[0].content.parts && 
          response.data.candidates[0].content.parts[0] && 
          response.data.candidates[0].content.parts[0].text) {
        
        resposta = response.data.candidates[0].content.parts[0].text.trim();
      }
      
      // Enviar resposta para o usuário
      await Yaka.sendMessage(
        m.from,
        { text: resposta },
        { quoted: m }
      );
      
    } catch (error) {
      console.error("Erro na API:", error.response?.data || error.message || error);
      
      // Sistema de respostas offline para quando a API falha
      const mensagemLower = mensagem.toLowerCase().trim();
      
      // Respostas para perguntas comuns
      const respostasComuns = {
        "oi": "Olá! Como posso ajudar você hoje?",
        "olá": "Olá! Em que posso ser útil?",
        "bom dia": "Bom dia! Como está seu dia hoje?",
        "boa tarde": "Boa tarde! Em que posso ajudar?",
        "boa noite": "Boa noite! Precisa de alguma ajuda?",
        "como vai": "Estou ótimo! E você, como está?",
        "tudo bem": "Tudo ótimo por aqui! E com você?",
        "quem é você": "Sou o YenChat, seu assistente virtual para conversas no WhatsApp!",
        "o que você faz": "Estou aqui para conversar, responder perguntas e ajudar com informações. Como posso te ajudar hoje?",
        "como você funciona": "Funciono usando inteligência artificial para entender e responder suas mensagens da forma mais natural possível.",
        "obrigado": "Por nada! Estou sempre à disposição para ajudar!",
        "valeu": "Valeu! Qualquer coisa é só chamar!",
        "tchau": "Até mais! Foi bom conversar com você. Volte quando quiser!",
      };
      
      // Verificar se há alguma correspondência com as respostas comuns
      let respostaFallback = "";
      
      for (const chave in respostasComuns) {
        if (mensagemLower.includes(chave)) {
          respostaFallback = respostasComuns[chave];
          break;
        }
      }
      
      // Se não encontrou resposta específica, usar resposta genérica
      if (!respostaFallback) {
        const respostasGenericas = [
          `Desculpe, estou com dificuldade para me conectar aos meus servidores no momento. Pode tentar novamente em alguns instantes?`,
          `Parece que estou tendo problemas técnicos para processar sua mensagem. Vamos tentar novamente?`,
          `Ops! Estou com dificuldade para te responder agora. Pode reformular sua mensagem ou tentar mais tarde?`,
          `Estou enfrentando uma limitação temporária. Você poderia tentar me perguntar isso de outra forma?`
        ];
        
        respostaFallback = respostasGenericas[Math.floor(Math.random() * respostasGenericas.length)];
      }
      
      await Yaka.sendMessage(
        m.from,
        { text: respostaFallback },
        { quoted: m }
      );
    }
  },
};