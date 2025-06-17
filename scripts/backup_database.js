// Script para fazer backup do banco de dados usando a conexão existente no sistema
// Este script utiliza a conexão já configurada para obter os dados e salvar em arquivo

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function backupDatabase() {
  console.log('Iniciando backup do banco de dados...');
  
  // Configurações do banco de dados
  const dbConfig = {
    host: process.env.DB_HOST || 'meuprecocerto.postgresql.dbaas.com.br',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'meuprecocerto',
    password: process.env.DB_PASSWORD || 'Dr19122010@@',
    database: process.env.DB_NAME || 'meuprecocerto',
    ssl: false // Ajuste conforme necessário para seu banco
  };
  
  console.log(`Conectando ao banco de dados: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  
  // Cria pool de conexão
  const pool = new Pool(dbConfig);
  
  try {
    // Primeiro, listar todas as tabelas
    console.log('Obtendo lista de tabelas...');
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tableResult.rows.map(row => row.table_name);
    console.log(`Tabelas encontradas: ${tables.length}`);
    
    // Criar diretório para backup se não existir
    const backupDir = path.join(__dirname, '../backups/database');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Nome do arquivo de backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
    
    // Objeto para armazenar os dados do backup
    const backup = {
      metadata: {
        createdAt: new Date().toISOString(),
        databaseName: dbConfig.database,
        serverVersion: 'PostgreSQL',
        tables: tables.length
      },
      tables: {}
    };
    
    // Para cada tabela, extrair os dados
    for (const table of tables) {
      console.log(`Extraindo dados da tabela: ${table}`);
      
      try {
        // Obter os dados da tabela
        const dataResult = await pool.query(`SELECT * FROM "${table}"`);
        backup.tables[table] = dataResult.rows;
        console.log(`  → ${dataResult.rows.length} registros extraídos`);
      } catch (error) {
        console.error(`  → Erro ao extrair dados da tabela ${table}: ${error.message}`);
        backup.tables[table] = { error: error.message };
      }
    }
    
    // Salvar o backup em formato JSON
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`\nBackup concluído com sucesso!`);
    console.log(`Arquivo de backup: ${backupFile}`);
    console.log(`Tamanho do arquivo: ${(fs.statSync(backupFile).size / (1024 * 1024)).toFixed(2)} MB`);
    
  } catch (error) {
    console.error(`Erro durante o backup: ${error.message}`);
  } finally {
    // Fechar a conexão com o banco
    await pool.end();
    console.log('Conexão com o banco fechada');
  }
}

// Executar a função de backup
backupDatabase().catch(err => {
  console.error('Erro fatal durante o backup:', err);
  process.exit(1);
});