// Script para executar migrações no banco de dados
import { executeQuery, pool } from './db';
import { log } from './vite';

// Função para executar alterações na estrutura do banco
export async function executeDatabaseMigrations() {
  try {
    log("Iniciando migrações do banco de dados...", "db-migration");
    
    // Verificar se a restrição de unicidade existe
    const checkConstraintQuery = `
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'users_username_key' 
      AND conrelid = 'users'::regclass;
    `;
    
    const constraintCheck = await executeQuery(checkConstraintQuery);
    
    if (constraintCheck.rows && constraintCheck.rows.length > 0) {
      log("Encontrada restrição de unicidade para username. Removendo...", "db-migration");
      
      // Remover a restrição de unicidade
      const dropConstraintQuery = `
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
      `;
      
      await executeQuery(dropConstraintQuery);
      log("✅ Restrição de unicidade do username removida com sucesso!", "db-migration");
    } else {
      log("Restrição de unicidade para username não encontrada. Nenhuma ação necessária.", "db-migration");
    }
    
    return true;
  } catch (error) {
    log(`❌ Erro ao executar migrações: ${error}`, "db-migration");
    console.error("Erro completo:", error);
    return false;
  }
}

// Função para verificar e executar a migração na inicialização
export async function runDatabaseMigrations() {
  try {
    const result = await executeDatabaseMigrations();
    return result;
  } catch (error) {
    console.error("Erro ao executar migrações do banco:", error);
    return false;
  }
}