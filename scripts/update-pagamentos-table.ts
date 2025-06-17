/**
 * Script para atualizar a tabela de pagamentos com as novas colunas de créditos
 * Adiciona as colunas: valor_cartao, valor_credito, detalhes_credito
 */

import { Client } from 'pg';

async function updatePagamentosTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    // Verificar se as colunas já existem
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      AND column_name IN ('valor_cartao', 'valor_credito', 'detalhes_credito')
    `);

    const existingColumns = checkColumns.rows.map(row => row.column_name);
    console.log('🔍 Colunas existentes:', existingColumns);

    // Adicionar colunas se não existirem
    if (!existingColumns.includes('valor_cartao')) {
      await client.query(`
        ALTER TABLE pagamentos 
        ADD COLUMN valor_cartao DECIMAL(10, 2) DEFAULT 0
      `);
      console.log('✅ Coluna valor_cartao adicionada');
    }

    if (!existingColumns.includes('valor_credito')) {
      await client.query(`
        ALTER TABLE pagamentos 
        ADD COLUMN valor_credito DECIMAL(10, 2) DEFAULT 0
      `);
      console.log('✅ Coluna valor_credito adicionada');
    }

    if (!existingColumns.includes('detalhes_credito')) {
      await client.query(`
        ALTER TABLE pagamentos 
        ADD COLUMN detalhes_credito TEXT
      `);
      console.log('✅ Coluna detalhes_credito adicionada');
    }

    // Atualizar registros existentes para definir valor_cartao = valor onde valor_cartao é null/0
    await client.query(`
      UPDATE pagamentos 
      SET valor_cartao = valor 
      WHERE valor_cartao IS NULL OR valor_cartao = 0
    `);
    console.log('✅ Registros existentes atualizados');

    // Verificar estrutura final
    const finalStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      ORDER BY ordinal_position
    `);

    console.log('📋 Estrutura final da tabela pagamentos:');
    finalStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });

    console.log('🎉 Atualização da tabela pagamentos concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao atualizar tabela:', error);
  } finally {
    await client.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updatePagamentosTable();
}

export { updatePagamentosTable };