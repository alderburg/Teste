import { pool } from '../server/db';
import dotenv from 'dotenv';

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

/**
 * Script para criar a tabela de tokens de verificação de email no banco de dados
 */
async function createEmailVerificationTable() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando criação da tabela email_verification_tokens...');
    
    // Iniciando transação
    await client.query('BEGIN');
    
    // Criar a tabela se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    
    // Criar índices para melhorar a performance das consultas
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
    `);
    
    // Commit da transação
    await client.query('COMMIT');
    
    console.log('✅ Tabela email_verification_tokens criada com sucesso!');
    console.log('O sistema de verificação de email agora está pronto para ser utilizado.');
    
  } catch (error) {
    // Em caso de erro, reverter transação
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar tabela email_verification_tokens:', error);
  } finally {
    // Liberar a conexão
    client.release();
  }
}

// Executar a função e encerrar o script
createEmailVerificationTable()
  .then(() => {
    console.log('Script concluído.');
    // Dar tempo para que as mensagens de log sejam exibidas antes de encerrar
    setTimeout(() => process.exit(0), 1000);
  })
  .catch((error) => {
    console.error('Erro ao executar script:', error);
    process.exit(1);
  });