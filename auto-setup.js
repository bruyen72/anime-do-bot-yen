#!/usr/bin/env node

// Auto-setup que roda quando o bot é iniciado
const fs = require('fs');
const path = require('path');

async function autoSetup() {
    const currentDir = process.cwd();
    const isWorkspace = currentDir.includes('/workspace');
    
    if (isWorkspace) {
        console.log('🔧 Auto-setup para ambiente /workspace detectado...');
        
        try {
            // Verificar e instalar ffmpeg-static se necessário
            const ffmpegStaticPath = path.join(currentDir, 'node_modules', 'ffmpeg-static');
            if (!fs.existsSync(ffmpegStaticPath)) {
                console.log('⚡ Instalando ffmpeg-static...');
                const { exec } = require('child_process');
                await new Promise((resolve) => {
                    exec('npm install ffmpeg-static --save --silent', (error) => {
                        if (error) {
                            console.log('⚠️ Instalação do ffmpeg-static falhou, continuando sem ele...');
                        } else {
                            console.log('✅ ffmpeg-static instalado com sucesso');
                        }
                        resolve();
                    });
                });
            } else {
                console.log('✅ ffmpeg-static já disponível');
            }
            
            console.log('✅ Auto-setup concluído');
        } catch (error) {
            console.log('⚠️ Auto-setup falhou, mas o sistema funcionará com fallbacks');
        }
    }
}

// Executar apenas se for o módulo principal
if (require.main === module) {
    autoSetup();
}

module.exports = { autoSetup };