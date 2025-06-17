/**
 * Script para verificar a estrutura da tabela pagamentos
 */
const { connectionManager } = require('./server/connection-manager.ts');

async function checkPagamentosStructure() {
  try {
    
    console.log('🔍 Verificando estrutura da tabela pagamentos...');
    
    const result = await connectionManager.executeQuery(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura da tabela pagamentos:');
    console.log('=====================================');
    
    result.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const maxLength = row.character_maximum_length ? ` (${row.character_maximum_length})` : '';
      const defaultVal = row.column_default ? ` DEFAULT: ${row.column_default}` : '';
      
      console.log(`${row.column_name}: ${row.data_type}${maxLength} ${nullable}${defaultVal}`);
    });
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  }
}

checkPagamentosStructure();