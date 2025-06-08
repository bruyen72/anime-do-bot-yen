const fs = require('fs');
const path = require('path');

// Script para arrumar TODOS os comandos NSFW automaticamente
function fixAllNSFWCommands() {
  const nsfwDir = path.join(__dirname, 'Commands', 'NSFW');
  
  if (!fs.existsSync(nsfwDir)) {
    console.log('❌ Pasta NSFW não encontrada!');
    return;
  }
  
  const files = fs.readdirSync(nsfwDir).filter(file => file.endsWith('.js'));
  let fixedCount = 0;
  
  console.log(`🔧 Arrumando ${files.length} comandos NSFW...`);
  
  files.forEach(file => {
    const filePath = path.join(nsfwDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Backup do arquivo original
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content);
    }
    
    let modified = false;
    
    // 1. Mudar categoria para "NSFW"
    if (content.includes('category: "Nsfw"')) {
      content = content.replace(/category: "Nsfw"/g, 'category: "NSFW"');
      modified = true;
    }
    
    // 2. Remover verificação NSFWstatus antiga
    const oldCheck = /if \(NSFWstatus == "false"\)[^}]*}/g;
    if (oldCheck.test(content)) {
      content = content.replace(oldCheck, '// ✅ Verificação removida - Core.js controla automaticamente');
      modified = true;
    }
    
    // 3. Remover return com mensagem de NSFW
    const oldReturn = /if \(NSFWstatus == "false"\) return m\.reply\([^)]*\);/g;
    if (oldReturn.test(content)) {
      content = content.replace(oldReturn, '// ✅ Verificação removida - Core.js controla automaticamente');
      modified = true;
    }
    
    // 4. Adicionar tratamento de erro se não existir
    if (!content.includes('try {') && !content.includes('catch')) {
      // Encontrar onde começa a execução do comando
      const startIndex = content.indexOf('start: async');
      if (startIndex !== -1) {
        const beforeStart = content.substring(0, startIndex);
        const afterStart = content.substring(startIndex);
        
        // Wrapar o conteúdo em try/catch
        const wrappedContent = afterStart.replace(
          /(start: async[^{]*{)([^]*)(}\s*,?\s*};?\s*$)/,
          '$1\n    try {\n$2\n    } catch (error) {\n      console.error("Erro no comando NSFW:", error);\n      m.reply("❌ Erro ao executar comando!");\n    }\n  $3'
        );
        
        content = beforeStart + wrappedContent;
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      fixedCount++;
      console.log(`✅ ${file} arrumado!`);
    } else {
      console.log(`⚪ ${file} já está correto`);
    }
  });
  
  console.log(`\n🎯 Processo concluído!`);
  console.log(`✅ ${fixedCount} comandos arrumados`);
  console.log(`📁 ${files.length - fixedCount} comandos já estavam corretos`);
  console.log(`💾 Backups salvos como .backup`);
  console.log(`\n🚀 Agora teste um comando NSFW!`);
}

// Executar o script
fixAllNSFWCommands();