/**
 * Script para criar a tabela de tokens de redefinição de senha para usuários adicionais
 */
import { executeQuery } from './server/db.js';

async function createPasswordResetTokensTable() {
  try {
    console.log('Criando tabela additional_user_password_reset_tokens...');
    
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS additional_user_password_reset_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        usuario_adicional_id INTEGER NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (usuario_adicional_id) REFERENCES usuarios_adicionais(id) ON DELETE CASCADE,
        UNIQUE(usuario_adicional_id)
      )
    `);
    
    console.log('Criando índices...');
    
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_additional_password_tokens_usuario 
      ON additional_user_password_reset_tokens(usuario_adicional_id)
    `);
    
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_additional_password_tokens_expires 
      ON additional_user_password_reset_tokens(expires_at)
    `);
    
    console.log('✅ Tabela additional_user_password_reset_tokens criada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  }
}

createPasswordResetTokensTable();