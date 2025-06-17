// Script para remover a restrição de unicidade do username no banco de dados externo
import { pool } from '../server/db.js';

async function executeSQL() {
  try {
    console.log("Iniciando script para remover a restrição de unicidade do username...");
    
    // SQL para remover a restrição de unicidade
    const sqlQuery = "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;";
    
    console.log("SQL a ser executado:", sqlQuery);
    
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