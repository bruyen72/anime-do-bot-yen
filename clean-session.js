#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Limpando sessão do WhatsApp...');

try {
    // Limpar pasta de sessão
    const sessionDir = './baileys-session';
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log('✅ Pasta baileys-session removida');
    }
    
    // Recriar pasta vazia
    fs.mkdirSync(sessionDir, { recursive: true });
    console.log('📁 Nova pasta de sessão criada');
    
    // Limpar cache temporário
    const tempDirs = ['./cache', './temp', '/tmp/yaka_temp', '/tmp/yaka_stickers'];
    tempDirs.forEach(dir => {
        try {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                fs.mkdirSync(dir, { recursive: true });
                console.log(`🗑️ Cache limpo: ${dir}`);
            }
        } catch (e) {}
    });
    
    console.log('\n✅ Limpeza concluída!');
    console.log('🚀 Agora execute: node index.js');
    
} catch (error) {
    console.error('❌ Erro na limpeza:', error.message);
    process.exit(1);
}