import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuração para obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações do banco de dados
const dbConfig = {
  host: 'meuprecocerto.postgresql.dbaas.com.br',
  port: 5432,
  user: 'meuprecocerto',
  password: 'Dr19122010@@',
  database: 'meuprecocerto'
};

// Tabelas para incluir no backup (as mais importantes)
// Isso ajuda a reduzir o tempo de execução
const TABELAS_IMPORTANTES = [
  'users',
  'user_profiles',
  'planos',
  'assinaturas',
  'categorias',
  'payment_methods'
];

async function fazerBackupRapido() {
  console.log('Iniciando backup rápido do banco de dados...');
  
  // Criar diretório de backup
  const backupDir = path.join(__dirname, '../backups/database');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(backupDir, `backup_rapido_${timestamp}.sql`);
  
  // Criar arquivo de backup
  let sqlContent = '';
  
  // Adicionar cabeçalho
  sqlContent += `-- Backup rápido do banco de dados ${dbConfig.database}\n`;
  sqlContent += `-- Data: ${new Date().toISOString()}\n`;
  sqlContent += `-- Contém apenas as tabelas mais importantes\n\n`;
  
  const pool = new Pool(dbConfig);
  
  try {
    // Coletar nomes de tabelas
    console.log('Verificando tabelas disponíveis...');
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const todasTabelas = tablesRes.rows.map(row => row.table_name);
    console.log(`Encontradas ${todasTabelas.length} tabelas no banco de dados.`);
    
    // Filtrar apenas as tabelas importantes
    const tabelasParaBackup = TABELAS_IMPORTANTES.filter(t => todasTabelas.includes(t));
    console.log(`Realizando backup de ${tabelasParaBackup.length} tabelas importantes.`);
    
    // Para cada tabela importante
    for (const table of tabelasParaBackup) {
      console.log(`Processando tabela: ${table}`);
      
      try {
        // 1. Exportar estrutura da tabela
        sqlContent += `-- Estrutura da tabela ${table}\n`;
        sqlContent += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;
        
        // Obter definição da tabela
        const schemaRes = await pool.query(`
          SELECT column_name, data_type, character_maximum_length, 
                is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        // Construir comando CREATE TABLE
        sqlContent += `CREATE TABLE "${table}" (\n`;
        
        const columns = schemaRes.rows.map((col, index) => {
          let dataType = col.data_type;
          if (col.character_maximum_length) {
            dataType += `(${col.character_maximum_length})`;
          }
          
          let columnDef = `  "${col.column_name}" ${dataType}`;
          
          if (col.is_nullable === 'NO') {
            columnDef += ' NOT NULL';
          }
          
          if (col.column_default) {
            columnDef += ` DEFAULT ${col.column_default}`;
          }
          
          return columnDef;
        });
        
        // Adicionar chave primária se existir
        try {
          const pkRes = await pool.query(`
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = $1::regclass AND i.indisprimary
          `, [table]);
          
          if (pkRes.rows.length > 0) {
            const pkColumns = pkRes.rows.map(row => `"${row.attname}"`).join(', ');
            columns.push(`  PRIMARY KEY (${pkColumns})`);
          }
        } catch (err) {
          console.error(`  → Erro ao obter chave primária para ${table}:`, err.message);
        }
        
        sqlContent += columns.join(',\n');
        sqlContent += '\n);\n\n';
        
        // 2. Exportar dados da tabela (limitado a 100 registros para maior velocidade)
        const dataRes = await pool.query(`SELECT * FROM "${table}" LIMIT 100`);
        
        if (dataRes.rows.length > 0) {
          sqlContent += `-- Dados da tabela ${table}\n`;
          
          for (const row of dataRes.rows) {
            const columnNames = Object.keys(row).map(col => `"${col}"`).join(', ');
            
            // Preparar valores adequadamente
            const values = Object.values(row).map(val => {
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === 'object' && val instanceof Date) return `'${val.toISOString()}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return val;
            }).join(', ');
            
            sqlContent += `INSERT INTO "${table}" (${columnNames}) VALUES (${values});\n`;
          }
          sqlContent += '\n';
        }
        
        console.log(`  → ${dataRes.rows.length} registros processados da tabela ${table}`);
      } catch (err) {
        console.error(`  → Erro ao processar tabela ${table}:`, err.message);
        sqlContent += `-- ERRO ao processar tabela ${table}: ${err.message}\n\n`;
      }
    }
    
    // Adicionar comando para resetar sequências
    sqlContent += `-- Resetar sequências para último valor\n`;
    for (const table of tabelasParaBackup) {
      if (table.endsWith('s')) { // Convenção simples para detectar nome da sequência
        const seqName = `${table.substring(0, table.length - 1)}_id_seq`;
        sqlContent += `SELECT setval('${seqName}', (SELECT COALESCE(MAX(id), 1) FROM "${table}"), true);\n`;
      }
    }
    sqlContent += '\n';
    
    // Salvar o conteúdo no arquivo
    fs.writeFileSync(filename, sqlContent);
    console.log(`\nBackup rápido concluído com sucesso!`);
    console.log(`Arquivo: ${filename}`);
    console.log(`Tamanho: ${(fs.statSync(filename).size / (1024 * 1024)).toFixed(2)} MB`);
    
  } catch (err) {
    console.error('Erro durante o backup:', err);
  } finally {
    // Encerrar conexão com o pool
    await pool.end();
    console.log('Conexão com o banco de dados encerrada.');
  }
}

// Executar o backup
fazerBackupRapido().catch(err => {
  console.error('Erro fatal durante o processo de backup:', err);
});