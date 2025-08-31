#!/usr/bin/env node

const smartVideoProcessor = require('./lib/SmartVideoProcessor');

async function testSmartVideo() {
    console.log('🧪 Testando SmartVideoProcessor...');
    
    try {
        // Verificar status do sistema
        const status = smartVideoProcessor.getStatus();
        console.log('📊 Status do sistema:');
        console.log(`   FFmpeg disponível: ${status.hasFFmpeg ? 'Sim' : 'Não'}`);
        console.log(`   Caminho: ${status.ffmpegPath || 'N/A'}`);
        console.log(`   Pode extrair frames: ${status.canExtractFrames ? 'Sim' : 'Não'}`);
        console.log(`   Modo fallback: ${status.fallbackMode ? 'Ativo' : 'Inativo'}`);
        
        // Testar validação de vídeo
        console.log('\n🔍 Testando validação de vídeo...');
        
        const fakeVideoBuffer = Buffer.concat([
            Buffer.from('ftypisom'), // MP4 signature
            Buffer.alloc(5000)       // Fake video data
        ]);
        
        const isValid = smartVideoProcessor.isValidVideo(fakeVideoBuffer);
        console.log(`   Vídeo fake válido: ${isValid ? 'Sim ✅' : 'Não ❌'}`);
        
        // Testar criação de placeholder
        console.log('\n🎨 Testando criação de placeholder...');
        const placeholder = await smartVideoProcessor.createVideoPlaceholder(fakeVideoBuffer);
        console.log(`   Placeholder criado: ${Math.round(placeholder.length / 1024)}KB ✅`);
        
        // Testar processamento (vai usar fallback se FFmpeg não estiver disponível)
        console.log('\n⚙️ Testando processamento...');
        const processed = await smartVideoProcessor.processVideo(fakeVideoBuffer, {
            timePosition: '00:00:01'
        });
        console.log(`   Vídeo processado: ${Math.round(processed.length / 1024)}KB ✅`);
        
        console.log('\n🎉 SmartVideoProcessor está funcionando!');
        console.log(`🎬 ${status.hasFFmpeg ? 'Frames reais serão extraídos' : 'Stickers informativos serão criados'}`);
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testSmartVideo().then(() => {
        console.log('\n✨ Teste concluído com sucesso!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Teste falhou:', error.message);
        process.exit(1);
    });
}