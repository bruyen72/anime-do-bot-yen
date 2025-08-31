#!/usr/bin/env node

const axios = require('axios');

async function testErrorSystem() {
    console.log('🧪 Testando sistema de tratamento de erros...');
    
    try {
        // Teste 1: Rota que não existe (deve retornar 404)
        console.log('\n📋 Teste 1: Rota inexistente');
        try {
            const response = await axios.get('http://localhost:3000/rota-inexistente');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ 404 funcionando corretamente');
                console.log(`📄 Resposta: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }
        
        // Teste 2: Status do sistema
        console.log('\n📋 Teste 2: Status do sistema');
        try {
            const response = await axios.get('http://localhost:3000/status');
            console.log('✅ Status respondendo normalmente');
            console.log(`📊 Status: ${response.data.status}`);
        } catch (error) {
            console.log('❌ Erro no status:', error.message);
        }
        
        // Teste 3: Página principal
        console.log('\n📋 Teste 3: Página principal');
        try {
            const response = await axios.get('http://localhost:3000/');
            console.log('✅ Página principal funcionando');
            console.log(`📄 Tipo de conteúdo: ${response.headers['content-type']}`);
        } catch (error) {
            console.log('❌ Erro na página principal:', error.message);
        }
        
        // Teste 4: Monitoramento de erros (requer token)
        console.log('\n📋 Teste 4: Monitoramento de erros');
        try {
            const response = await axios.get('http://localhost:3000/errors?token=yaka_debug');
            console.log('✅ Sistema de monitoramento ativo');
            console.log(`📊 Total de erros: ${response.data.total_errors}`);
            if (response.data.recent_errors.length > 0) {
                console.log(`🔍 Último erro: ${response.data.last_error?.message}`);
            }
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('🔐 Sistema de monitoramento protegido corretamente');
            } else {
                console.log('❌ Erro no monitoramento:', error.message);
            }
        }
        
    } catch (error) {
        console.log('❌ Erro geral no teste:', error.message);
        console.log('💡 Certifique-se de que o servidor está rodando na porta 3000');
    }
}

// Executar teste após delay para garantir que o servidor iniciou
setTimeout(() => {
    testErrorSystem();
}, 3000);

console.log('⏳ Aguardando 3 segundos para o servidor inicializar...');