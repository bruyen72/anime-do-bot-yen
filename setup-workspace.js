#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Configurando ambiente para /workspace...');

async function setupWorkspace() {
    try {
        const currentDir = process.cwd();
        console.log('📂 Diretório atual:', currentDir);
        
        // Verificar se estamos no workspace
        const isWorkspace = currentDir.includes('/workspace');
        console.log('🌐 Em workspace:', isWorkspace ? 'Sim' : 'Não');
        
        if (isWorkspace) {
            // 1. Verificar ffmpeg-static local
            const localFfmpegStatic = path.join(currentDir, 'node_modules', 'ffmpeg-static');
            if (fs.existsSync(localFfmpegStatic)) {
                console.log('✅ ffmpeg-static encontrado localmente:', localFfmpegStatic);
            } else {
                console.log('⚠️ ffmpeg-static não encontrado, instalando...');
                const { exec } = require('child_process');
                await new Promise((resolve, reject) => {
                    exec('npm install ffmpeg-static --save', (error, stdout, stderr) => {
                        if (error) {
                            console.log('❌ Erro ao instalar ffmpeg-static:', error.message);
                            resolve(); // Continue sem falhar
                        } else {
                            console.log('✅ ffmpeg-static instalado com sucesso');
                            resolve();
                        }
                    });
                });
            }
            
            // 2. Verificar se podemos copiar ffmpeg.exe para local acessível
            const ffmpegExe = path.join(currentDir, 'ffmpeg.exe');
            if (fs.existsSync(ffmpegExe)) {
                console.log('✅ ffmpeg.exe encontrado:', ffmpegExe);
                
                // Tentar tornar executável
                try {
                    fs.chmodSync(ffmpegExe, 0o755);
                    console.log('✅ ffmpeg.exe marcado como executável');
                } catch (e) {
                    console.log('⚠️ Não foi possível tornar ffmpeg.exe executável:', e.message);
                }
            }
            
            // 3. Criar diretório de temporários se não existir
            const tempDir = path.join(currentDir, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
                console.log('✅ Diretório temporário criado:', tempDir);
            }
            
            // 4. Verificar se tem ffmpeg no sistema
            const { exec } = require('child_process');
            await new Promise((resolve) => {
                exec('which ffmpeg', (error, stdout) => {
                    if (!error && stdout.trim()) {
                        console.log('✅ FFmpeg do sistema:', stdout.trim());
                    } else {
                        console.log('⚠️ FFmpeg não encontrado no sistema');
                    }
                    resolve();
                });
            });
            
        }
        
        // 5. Verificar dependências críticas
        console.log('\n📦 Verificando dependências críticas...');
        const criticalModules = ['sharp', '@whiskeysockets/baileys'];
        
        for (const mod of criticalModules) {
            try {
                require(mod);
                console.log(`  ✅ ${mod}: OK`);
            } catch (error) {
                console.log(`  ❌ ${mod}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Setup concluído!');
        
    } catch (error) {
        console.error('❌ Erro no setup:', error);
    }
}

// Executar setup apenas se chamado diretamente
if (require.main === module) {
    setupWorkspace();
}

module.exports = { setupWorkspace };