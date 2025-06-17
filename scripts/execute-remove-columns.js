/**
 * Script para remover as colunas resumo_pagamento e metadata da tabela pagamentos
 */
import { connectionManager } from '../server/connection-manager.ts';

async function removeUnusedColumns() {
  try {
    console.log('🔧 Iniciando remoção de colunas não utilizadas...');
    
    // Verificar se as colunas existem antes de remover
    const checkColumns = await connectionManager.executeQuery(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      AND column_name IN ('resumo_pagamento', 'metadata')
    `);
    
    console.log('🔍 Colunas encontradas:', checkColumns.rows.map(row => row.column_name));
    
    // Remover coluna resumo_pagamento se existir
    if (checkColumns.rows.some(row => row.column_name === 'resumo_pagamento')) {
      await connectionManager.executeQuery('ALTER TABLE pagamentos DROP COLUMN resumo_pagamento');
      console.log('✅ Coluna resumo_pagamento removida');
    } else {
      console.log('ℹ️  Coluna resumo_pagamento não existe');
    }
    
    // Remover coluna metadata se existir
    if (checkColumns.rows.some(row => row.column_name === 'metadata')) {
      await connectionManager.executeQuery('ALTER TABLE pagamentos DROP COLUMN metadata');
      console.log('✅ Coluna metadata removida');
    } else {
      console.log('ℹ️  Coluna metadata não existe');
    }
    
    // Verificar estrutura final
    const finalStructure = await connectionManager.executeQuery(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura final da tabela pagamentos:');
    finalStructure.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n✅ Remoção de colunas concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao remover colunas:', error);
  } finally {
    await connectionManager.shutdown();
  }
}

removeUnusedColumns();