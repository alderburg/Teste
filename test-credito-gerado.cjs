/**
 * Script para testar se o campo credito_gerado está funcionando corretamente
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testCreditoGerado() {
  try {
    console.log('🔍 Verificando se a coluna credito_gerado existe...');
    
    // Verificar se a coluna existe
    const checkColumn = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' AND column_name = 'credito_gerado'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('❌ Coluna credito_gerado não encontrada. Criando...');
      
      await pool.query(`
        ALTER TABLE pagamentos 
        ADD COLUMN credito_gerado DECIMAL(10,2) DEFAULT 0.00
      `);
      
      console.log('✅ Coluna credito_gerado criada com sucesso');
    } else {
      console.log('✅ Coluna credito_gerado já existe:', checkColumn.rows[0]);
    }
    
    // Verificar estrutura da tabela pagamentos
    console.log('\n📊 Estrutura atual da tabela pagamentos:');
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos'
      ORDER BY ordinal_position
    `);
    
    structure.rows.forEach(row => {
      const defaultValue = row.column_default ? ` (default: ${row.column_default})` : '';
      console.log(`- ${row.column_name}: ${row.data_type}${defaultValue}`);
    });
    
    // Verificar dados de pagamentos existentes
    console.log('\n💰 Consultando pagamentos existentes:');
    const pagamentos = await pool.query(`
      SELECT 
        id, 
        valor, 
        COALESCE(valor_cartao, 0) as valor_cartao,
        COALESCE(valor_credito, 0) as valor_credito,
        COALESCE(valor_diferenca, 0) as valor_diferenca,
        COALESCE(credito_gerado, 0) as credito_gerado,
        plano_nome,
        data_pagamento
      FROM pagamentos 
      ORDER BY data_pagamento DESC 
      LIMIT 5
    `);
    
    if (pagamentos.rows.length > 0) {
      console.log(`Encontrados ${pagamentos.rows.length} pagamentos:`);
      pagamentos.rows.forEach((p, index) => {
        console.log(`${index + 1}. ID: ${p.id} | Valor: R$ ${p.valor} | Cartão: R$ ${p.valor_cartao} | Crédito: R$ ${p.valor_credito} | Diferença: R$ ${p.valor_diferenca} | Crédito Gerado: R$ ${p.credito_gerado} | Plano: ${p.plano_nome}`);
      });
    } else {
      console.log('Nenhum pagamento encontrado na tabela.');
    }
    
    // Testar inserção de pagamento com credito_gerado
    console.log('\n🧪 Testando inserção de pagamento com credito_gerado...');
    const testPayment = await pool.query(`
      INSERT INTO pagamentos (
        user_id, 
        valor, 
        valor_cartao, 
        valor_credito, 
        valor_diferenca, 
        credito_gerado, 
        status, 
        plano_nome, 
        metodo_pagamento
      ) VALUES (
        1, 
        '99.90', 
        '50.00', 
        '49.90', 
        '10.00', 
        '25.50', 
        'paid', 
        'TESTE - Plano Premium', 
        'Cartão de Crédito'
      ) RETURNING *
    `);
    
    if (testPayment.rows.length > 0) {
      const payment = testPayment.rows[0];
      console.log('✅ Pagamento de teste inserido com sucesso:');
      console.log(`   ID: ${payment.id}`);
      console.log(`   Valor: R$ ${payment.valor}`);
      console.log(`   Valor Cartão: R$ ${payment.valor_cartao}`);
      console.log(`   Valor Crédito: R$ ${payment.valor_credito}`);
      console.log(`   Valor Diferença: R$ ${payment.valor_diferenca}`);
      console.log(`   Crédito Gerado: R$ ${payment.credito_gerado}`);
      
      // Remover o pagamento de teste
      await pool.query('DELETE FROM pagamentos WHERE id = $1', [payment.id]);
      console.log('🗑️ Pagamento de teste removido');
    }
    
    console.log('\n✅ Teste concluído com sucesso! O campo credito_gerado está funcionando corretamente.');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    await pool.end();
  }
}

testCreditoGerado();