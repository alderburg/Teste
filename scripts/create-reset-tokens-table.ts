import { executeQuery } from "../server/db";

/**
 * Script para criar a tabela de tokens de recuperação de senha no banco de dados
 */
async function createPasswordResetTable() {
  try {
    console.log("Criando tabela de tokens de recuperação de senha...");
    
    // Verificar se a tabela já existe
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
      );
    `;
    
    const tableExists = await executeQuery(checkTableQuery);
    
    if (tableExists.rows[0].exists) {
      console.log("A tabela password_reset_tokens já existe.");
      return;
    }
    
    // SQL para criar a tabela
    const createTableQuery = `
      CREATE TABLE password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE NOT NULL
      );
    `;
    
    await executeQuery(createTableQuery);
    console.log("Tabela password_reset_tokens criada com sucesso!");
    
  } catch (error) {
    console.error("Erro ao criar tabela de recuperação de senha:", error);
  }
}

// Executar a função
createPasswordResetTable()
  .then(() => {
    console.log("Processo concluído.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Erro ao executar script:", error);
    process.exit(1);
  });