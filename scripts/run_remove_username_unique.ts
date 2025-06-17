// Script para remover a restrição de unicidade do username no banco de dados externo
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { db, pool } from '../server/db';
import { ConnectionManager } from '../server/connection-manager';

dotenv.config();

async function executeSQL() {
  try {
    console.log("Iniciando script para remover a restrição de unicidade do username...");
    
    // Lendo o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'remove_username_unique.sql');
    const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log("SQL a ser executado:");
    console.log(sqlQuery);
    
    // Obtendo conexão do pool
    const client = await pool.connect();
    
    try {
      console.log("Executando alteração...");
      await client.query(sqlQuery);
      console.log("✅ Restrição de unicidade do username removida com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao executar SQL:", error);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Erro geral:", error);
  } finally {
    // Fechar conexões
    await pool.end();
    process.exit(0);
  }
}

// Executar o script
executeSQL();