/**
 * Script para verificar a estrutura real da tabela pagamentos
 */
import { connectionManager } from './server/connection-manager.js';

async function checkRealPagamentosStructure() {
  try {
    console.log('🔍 Verificando estrutura real da tabela pagamentos...');
    
    const result = await connectionManager.executeQuery(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      ORDER BY ordinal_position;
    `);

    console.log('📋 Estrutura da tabela pagamentos:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\n🔍 Verificando dados de exemplo...');
    const sampleData = await connectionManager.executeQuery(`
      SELECT * FROM pagamentos 
      ORDER BY id DESC 
      LIMIT 3;
    `);

    console.log('📊 Últimos 3 registros:');
    sampleData.rows.forEach((row, index) => {
      console.log(`\nRegistro ${index + 1}:`, row);
    });

  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  } finally {
    await connectionManager.shutdown();
  }
}

checkRealPagamentosStructure();