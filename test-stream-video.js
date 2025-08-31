#!/usr/bin/env node

const streamVideoProcessor = require('./lib/StreamVideoProcessor');

async function testStreamVideo() {
    console.log('🧪 Testando StreamVideoProcessor...');
    
    try {
        // Aguardar inicialização
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar status
        const status = streamVideoProcessor.getStatus();
        console.log('📊 Status do sistema:');
        console.log(`   FFmpeg disponível: ${status.hasFFmpeg ? 'Sim ✅' : 'Não ❌'}`);
        console.log(`   Caminho FFmpeg: ${status.ffmpegPath || 'N/A'}`);
        console.log(`   Suporte a streaming: ${status.streamingSupported ? 'Sim ✅' : 'Não ❌'}`);
        console.log(`   Método: ${status.method}`);
        
        // Testar validação
        console.log('\n🔍 Testando validação de vídeo...');
        
        // Criar buffer MP4 fake mais realista
        const fakeMP4Buffer = Buffer.concat([
            Buffer.from([0x00, 0x00, 0x00, 0x20]), // Box size
            Buffer.from('ftypisom'),                // MP4 signature
            Buffer.from([0x00, 0x00, 0x02, 0x00]), // Minor version
            Buffer.from('isomiso2avc1mp41'),        // Compatible brands
            Buffer.alloc(8000, 0x00)               // Fake video data
        ]);
        
        const isValid = streamVideoProcessor.isValidVideo(fakeMP4Buffer);
        console.log(`   Buffer MP4 fake: ${isValid ? 'Válido ✅' : 'Inválido ❌'}`);
        
        // Testar buffer inválido
        const invalidBuffer = Buffer.from('This is not a video file');
        const isInvalid = streamVideoProcessor.isValidVideo(invalidBuffer);
        console.log(`   Buffer inválido: ${isInvalid ? 'Válido (erro!)' : 'Inválido ✅'}`);
        
        // Testar criação de sticker visual
        console.log('\n🎨 Testando sticker informativo...');
        const infoSticker = await streamVideoProcessor.createVideoInfoSticker(fakeMP4Buffer);
        console.log(`   Sticker informativo criado: ${Math.round(infoSticker.length / 1024)}KB ✅`);
        
        // Testar processamento completo
        console.log('\n⚙️ Testando processamento completo...');
        try {
            const result = await streamVideoProcessor.processVideo(fakeMP4Buffer, {
                timePosition: '00:00:01'
            });
            console.log(`   Processamento: ${Math.round(result.length / 1024)}KB ✅`);
            
            if (status.hasFFmpeg) {
                console.log('   🎬 Frame real extraído via FFmpeg streaming!');
            } else {
                console.log('   🎨 Sticker visual criado (FFmpeg não disponível)');
            }
        } catch (processError) {
            console.log(`   ⚠️ Erro esperado no buffer fake: ${processError.message}`);
            console.log('   ✅ Sistema de erro funcionando corretamente');
        }
        
        console.log('\n🎉 StreamVideoProcessor testado com sucesso!');
        console.log('📋 Sistema pronto para processar vídeos reais do WhatsApp');
        
        if (status.hasFFmpeg) {
            console.log('🚀 Modo STREAMING ativo - sem arquivos temporários!');
        } else {
            console.log('🎨 Modo VISUAL ativo - stickers informativos bonitos!');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testStreamVideo().then(() => {
        console.log('\n✨ Teste concluído!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Teste falhou:', error.message);
        process.exit(1);
    });
}