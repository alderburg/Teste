// Script para executar alterações diretamente no banco de dados
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  // Configuração do cliente PostgreSQL
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  console.log("Iniciando script para remover a restrição de unicidade do username...");
  
  try {
    const client = await pool.connect();
    
    try {
      console.log("Executando alteração no banco de dados...");
      
      // Comando SQL para remover a restrição de unicidade
      const result = await client.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
      `);
      
      console.log("Resultado da operação:", result);
      console.log("✅ Restrição de unicidade do username removida com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao executar SQL:", error);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
  }
}

// Executar o script
run().catch(error => {
  console.error("Erro geral:", error);
  process.exit(1);
});