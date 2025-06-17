/**
 * Script para adicionar a coluna credito_gerado na tabela pagamentos
 */

const { Pool } = require('pg');

// Configuração da conexão usando variáveis de ambiente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addCreditoGeradoColumn() {
  try {
    console.log('Verificando se a coluna credito_gerado já existe...');
    
    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' AND column_name = 'credito_gerado'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna credito_gerado já existe na tabela pagamentos');
      await pool.end();
      return;
    }
    
    console.log('Adicionando coluna credito_gerado...');
    
    // Adicionar a coluna credito_gerado
    await pool.query(`
      ALTER TABLE pagamentos 
      ADD COLUMN credito_gerado DECIMAL(10,2) DEFAULT 0.00
    `);
    
    console.log('✅ Coluna credito_gerado adicionada com sucesso à tabela pagamentos');
    
    // Verificar a estrutura atualizada
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estrutura atual da tabela pagamentos:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna credito_gerado:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addCreditoGeradoColumn();