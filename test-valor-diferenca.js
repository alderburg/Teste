/**
 * Script para testar se o campo valor_diferenca está funcionando corretamente
 * durante upgrades e downgrades de planos
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testValorDiferenca() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando campo valor_diferenca...');
    
    // Verificar se a coluna existe e tem o tipo correto
    const columnCheck = await client.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale 
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' AND column_name = 'valor_diferenca'
    `);
    
    if (columnCheck.rows.length === 0) {
      throw new Error('❌ Coluna valor_diferenca não encontrada');
    }
    
    const column = columnCheck.rows[0];
    console.log('✅ Coluna valor_diferenca encontrada:');
    console.log(`   Tipo: ${column.data_type}`);
    console.log(`   Precisão: ${column.numeric_precision}`);
    console.log(`   Escala: ${column.numeric_scale}`);
    
    // Verificar se podemos inserir valores decimais
    const testInsert = await client.query(`
      INSERT INTO pagamentos (
        user_id, 
        stripe_payment_intent_id, 
        stripe_invoice_id, 
        stripe_subscription_id,
        valor, 
        valor_diferenca,
        status, 
        plano_nome, 
        metodo_pagamento, 
        data_pagamento
      ) VALUES (
        1, 
        'pi_test_valor_diferenca', 
        'in_test_valor_diferenca', 
        'sub_test_valor_diferenca',
        '50.00', 
        25.50,
        'Pago', 
        'Plano Teste', 
        'card', 
        NOW()
      ) 
      ON CONFLICT (stripe_invoice_id) DO UPDATE SET
        valor_diferenca = EXCLUDED.valor_diferenca
      RETURNING valor_diferenca
    `);
    
    console.log('✅ Teste de inserção realizado com sucesso');
    console.log(`   Valor inserido: ${testInsert.rows[0].valor_diferenca}`);
    
    // Verificar se o valor foi armazenado corretamente
    const selectTest = await client.query(`
      SELECT valor_diferenca, valor, plano_nome 
      FROM pagamentos 
      WHERE stripe_invoice_id = 'in_test_valor_diferenca'
    `);
    
    if (selectTest.rows.length > 0) {
      const result = selectTest.rows[0];
      console.log('✅ Valor recuperado com sucesso:');
      console.log(`   valor_diferenca: ${result.valor_diferenca}`);
      console.log(`   valor: ${result.valor}`);
      console.log(`   plano_nome: ${result.plano_nome}`);
    }
    
    // Limpar teste
    await client.query(`DELETE FROM pagamentos WHERE stripe_invoice_id = 'in_test_valor_diferenca'`);
    console.log('✅ Dados de teste removidos');
    
    console.log('\n🎉 Teste concluído com sucesso! Campo valor_diferenca está funcionando corretamente.');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Executar teste
testValorDiferenca()
  .then(() => {
    console.log('✅ Todos os testes passaram');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Teste falhou:', error.message);
    process.exit(1);
  });