
-- Criar tabela para tokens de redefinição de senha de usuários adicionais
CREATE TABLE IF NOT EXISTS additional_user_password_reset_tokens (
  id SERIAL PRIMARY KEY,
  usuario_adicional_id INTEGER NOT NULL REFERENCES usuarios_adicionais(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_additional_user_password_reset_tokens_token ON additional_user_password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_additional_user_password_reset_tokens_usuario_id ON additional_user_password_reset_tokens(usuario_adicional_id);
CREATE INDEX IF NOT EXISTS idx_additional_user_password_reset_tokens_expires_at ON additional_user_password_reset_tokens(expires_at);
