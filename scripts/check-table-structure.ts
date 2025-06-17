import { executeQuery } from '../server/connection-manager';

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estrutura atual da tabela pagamentos...\n');

    // Verificar se a tabela existe
    const tableExists = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'pagamentos'
    `);

    if (!tableExists.rows || tableExists.rows.length === 0) {
      console.log('❌ A tabela pagamentos não existe!');
      return;
    }

    // Buscar estrutura da tabela
    const structure = await executeQuery(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      ORDER BY ordinal_position
    `);

    console.log('📋 Estrutura atual da tabela pagamentos:');
    console.log('================================================');

    structure.rows.forEach((row, index) => {
      const maxLength = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = row.column_default ? ` DEFAULT ${row.column_default}` : '';

      console.log(`${index + 1}. ${row.column_name}: ${row.data_type}${maxLength} ${nullable}${defaultValue}`);
    });

    // Contar registros
    const countResult = await executeQuery('SELECT COUNT(*) as total FROM pagamentos');
    console.log(`\n📈 Total de registros na tabela: ${countResult.rows[0].total}`);

    // Listar todas as colunas para usar no script de sincronização
    const columnNames = structure.rows.map(row => row.column_name);
    console.log('\n🔧 Colunas disponíveis para usar no script:');
    console.log(columnNames.join(', '));

    return columnNames;

  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkTableStructure().then(() => {
    console.log('\n✅ Verificação concluída');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { checkTableStructure };