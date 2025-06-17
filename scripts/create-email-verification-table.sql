-- Script para criar a tabela de tokens de verificação de email
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

-- Adicionando índice para pesquisas por token
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Adicionando índice para pesquisas por user_id
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Permissões (se necessário)
GRANT ALL PRIVILEGES ON TABLE email_verification_tokens TO current_user;
GRANT USAGE, SELECT ON SEQUENCE email_verification_tokens_id_seq TO current_user;