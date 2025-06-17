/**
 * Script para testar se valores corretos estão sendo salvos durante downgrades
 * Verifica se a coluna 'valor' da tabela pagamentos contém o valor do plano e não créditos
 */

import { connectionManager } from './server/connection-manager.js';

async function testarValoresDowngrade() {
  console.log('🔍 TESTE: Verificando valores salvos em downgrades recentes');
  
  try {
    // Conectar ao banco
    await connectionManager.connect();
    
    // Buscar os últimos 5 pagamentos
    const result = await connectionManager.executeQuery(`
      SELECT 
        id,
        valor,
        valor_cartao,
        valor_credito,
        plano_nome,
        periodo,
        stripe_invoice_id,
        data_pagamento,
        created_at
      FROM pagamentos 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📊 ÚLTIMOS 5 PAGAMENTOS REGISTRADOS:');
    console.log('='.repeat(80));
    
    result.rows.forEach((pagamento, index) => {
      console.log(`\n${index + 1}. Pagamento ID: ${pagamento.id}`);
      console.log(`   💰 Valor principal: R$ ${Number(pagamento.valor).toFixed(2)}`);
      console.log(`   💳 Valor cartão: R$ ${Number(pagamento.valor_cartao || 0).toFixed(2)}`);
      console.log(`   🎁 Valor crédito: R$ ${Number(pagamento.valor_credito || 0).toFixed(2)}`);
      console.log(`   📋 Plano: ${pagamento.plano_nome}`);
      console.log(`   📅 Período: ${pagamento.periodo}`);
      console.log(`   🔗 Invoice: ${pagamento.stripe_invoice_id}`);
      console.log(`   ⏰ Data: ${pagamento.data_pagamento}`);
      
      // Verificar se pode ser um downgrade problemático
      const valor = Number(pagamento.valor);
      if (valor < 0 || valor < 10) {
        console.log(`   ⚠️  POSSÍVEL PROBLEMA: Valor muito baixo ou negativo!`);
      }
      
      if (pagamento.plano_nome && (
          (pagamento.plano_nome.includes('ESSENCIAL') && valor > 50) ||
          (pagamento.plano_nome.includes('PROFISSIONAL') && valor > 150) ||
          (pagamento.plano_nome.includes('EMPRESARIAL') && valor > 4500) ||
          (pagamento.plano_nome.includes('PREMIUM') && valor > 8000)
        )) {
        console.log(`   ⚠️  POSSÍVEL PROBLEMA: Valor muito alto para o plano!`);
      }
    });
    
    // Buscar pagamentos com valores suspeitos (negativos ou muito altos)
    const problemResults = await connectionManager.executeQuery(`
      SELECT 
        id,
        valor,
        plano_nome,
        periodo,
        stripe_invoice_id,
        data_pagamento
      FROM pagamentos 
      WHERE valor < 0 OR valor > 10000
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (problemResults.rows.length > 0) {
      console.log('\n🚨 VALORES SUSPEITOS ENCONTRADOS:');
      console.log('='.repeat(80));
      
      problemResults.rows.forEach((pagamento, index) => {
        console.log(`\n${index + 1}. Pagamento ID: ${pagamento.id}`);
        console.log(`   💰 Valor: R$ ${Number(pagamento.valor).toFixed(2)} ← SUSPEITO`);
        console.log(`   📋 Plano: ${pagamento.plano_nome}`);
        console.log(`   🔗 Invoice: ${pagamento.stripe_invoice_id}`);
        console.log(`   ⏰ Data: ${pagamento.data_pagamento}`);
      });
    } else {
      console.log('\n✅ Nenhum valor suspeito encontrado nos últimos registros!');
    }
    
    // Verificar se há logs recentes de downgrade
    console.log('\n🔍 Para verificar logs de downgrade em tempo real:');
    console.log('   Faça um downgrade e observe os logs no console que mostrarão:');
    console.log('   🔍 [DOWNGRADE LOG] CORREÇÃO: Usando valor do NOVO plano: R$ X.XX');
    console.log('   🔍 [WEBHOOK PAYMENT LOG] CORREÇÃO APLICADA: Usando valor do plano...');
    
  } catch (error) {
    console.error('❌ Erro ao testar valores de downgrade:', error);
  } finally {
    await connectionManager.disconnect();
  }
}

// Executar o teste
testarValoresDowngrade().catch(console.error);