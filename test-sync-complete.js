
#!/usr/bin/env node

/**
 * Script para testar a sincronização completa de pagamentos Stripe
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

async function testSyncComplete() {
  try {
    console.log('🔄 Testando sincronização completa de pagamentos Stripe...');
    
    // Fazer login primeiro (usando dados do admin)
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@meuprecocerto.com',
        password: 'Admin123!'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Erro no login: ${loginResponse.status}`);
    }

    // Extrair cookies da resposta
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login realizado com sucesso');

    // Executar sincronização
    const syncResponse = await fetch('http://localhost:5000/api/sync-stripe-payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    });

    const syncResult = await syncResponse.json();
    
    if (syncResponse.ok) {
      console.log('✅ Sincronização bem-sucedida:');
      console.log(`   - Pagamentos sincronizados: ${syncResult.syncedCount}`);
      if (syncResult.errors && syncResult.errors.length > 0) {
        console.log('⚠️ Erros encontrados:');
        syncResult.errors.forEach(error => console.log(`   - ${error}`));
      }
    } else {
      console.error('❌ Erro na sincronização:', syncResult);
    }

    // Verificar dados sincronizados
    const historyResponse = await fetch('http://localhost:5000/api/historico-financeiro', {
      headers: {
        'Cookie': cookies || ''
      }
    });

    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log(`\n📊 Dados do histórico após sincronização:`);
      console.log(`   - Total de transações: ${historyData.historico?.length || 0}`);
      console.log(`   - Total pago: R$ ${historyData.estatisticas?.totalPago?.toFixed(2) || '0.00'}`);
      console.log(`   - Total créditos: R$ ${historyData.estatisticas?.totalCreditos?.toFixed(2) || '0.00'}`);
      console.log(`   - Total cartão: R$ ${historyData.estatisticas?.totalCartao?.toFixed(2) || '0.00'}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testSyncComplete();
