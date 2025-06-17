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

async function fazerBackup() {
  console.log('Iniciando backup simplificado do banco de dados...');
  
  // Criar diretório de backup
  const backupDir = path.join(__dirname, '../backups/database');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(backupDir, `backup_${timestamp}.json`);
  
  const pool = new Pool(dbConfig);
  
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
    
    // Objeto para armazenar o backup completo
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        database: dbConfig.database,
        tablesCount: tables.length
      },
      tables: {}
    };
    
    // Processar cada tabela
    for (const table of tables) {
      try {
        console.log(`Processando tabela: ${table}`);
        const result = await pool.query(`SELECT * FROM "${table}"`);
        
        // Adicionar dados ao backup
        backup.tables[table] = {
          rowCount: result.rowCount,
          data: result.rows
        };
        
        console.log(`  → ${result.rowCount} registros obtidos da tabela ${table}`);
      } catch (err) {
        console.error(`  → Erro ao processar tabela ${table}:`, err.message);
        // Registrar erro no backup
        backup.tables[table] = {
          error: err.message,
          rowCount: 0,
          data: []
        };
      }
    }
    
    // Salvar backup em arquivo
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    console.log(`\nBackup concluído com sucesso!`);
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
fazerBackup().catch(err => {
  console.error('Erro fatal durante o processo de backup:', err);
});