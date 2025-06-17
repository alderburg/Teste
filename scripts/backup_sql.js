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

async function fazerBackupSQL() {
  console.log('Iniciando backup SQL do banco de dados...');
  
  // Criar diretório de backup
  const backupDir = path.join(__dirname, '../backups/database');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(backupDir, `backup_sql_${timestamp}.sql`);
  
  const pool = new Pool(dbConfig);
  let sqlContent = '';
  
  // Adicionar cabeçalho ao arquivo SQL
  sqlContent += `-- Backup do banco de dados ${dbConfig.database}\n`;
  sqlContent += `-- Data: ${new Date().toISOString()}\n`;
  sqlContent += `-- Gerado automaticamente\n\n`;
  
  try {
    // Coletar todos os nomes de tabelas no esquema public
    console.log('Obtendo lista de tabelas...');
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesRes.rows.map(row => row.table_name);
    console.log(`Encontradas ${tables.length} tabelas no banco de dados.`);
    
    // Para cada tabela, obter a estrutura e dados
    for (const table of tables) {
      try {
        console.log(`Processando tabela: ${table}`);
        
        // 1. Obter estrutura da tabela (DDL)
        const schemaRes = await pool.query(`
          SELECT column_name, data_type, character_maximum_length, 
                 is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        // Adicionar comando DROP TABLE
        sqlContent += `-- Estrutura da tabela ${table}\n`;
        sqlContent += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;
        
        // Construir o comando CREATE TABLE
        sqlContent += `CREATE TABLE "${table}" (\n`;
        
        const columns = schemaRes.rows.map(col => {
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
        
        // Adicionar constraints de chave primária se existirem
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
        
        // 2. Obter dados da tabela
        const dataRes = await pool.query(`SELECT * FROM "${table}"`);
        
        if (dataRes.rows.length > 0) {
          sqlContent += `-- Dados da tabela ${table}\n`;
          
          for (const row of dataRes.rows) {
            const columnNames = Object.keys(row).map(col => `"${col}"`).join(', ');
            
            // Preparar os valores adequadamente para SQL
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
        
        // 3. Obter sequências associadas e resetar seus valores
        try {
          const seqRes = await pool.query(`
            SELECT sequence_name 
            FROM information_schema.sequences
            WHERE sequence_name LIKE $1
          `, [`${table}_%_seq`]);
          
          for (const seq of seqRes.rows) {
            sqlContent += `-- Resetar sequência para ${seq.sequence_name}\n`;
            sqlContent += `SELECT setval('${seq.sequence_name}', (SELECT COALESCE(MAX("id"), 1) FROM "${table}"), true);\n\n`;
          }
        } catch (err) {
          console.error(`  → Erro ao obter sequências para ${table}:`, err.message);
        }
        
        console.log(`  → Estrutura e ${dataRes.rows.length} registros processados da tabela ${table}`);
      } catch (err) {
        console.error(`  → Erro ao processar tabela ${table}:`, err.message);
        sqlContent += `-- ERRO ao processar tabela ${table}: ${err.message}\n\n`;
      }
    }
    
    // Salvar backup em arquivo
    fs.writeFileSync(filename, sqlContent);
    console.log(`\nBackup SQL concluído com sucesso!`);
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
fazerBackupSQL().catch(err => {
  console.error('Erro fatal durante o processo de backup:', err);
});