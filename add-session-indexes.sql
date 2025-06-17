-- Índices para otimizar performance da limpeza de sessões

-- Índice composto para consultas de limpeza (expires_at + is_active)
CREATE INDEX IF NOT EXISTS idx_user_sessions_cleanup 
ON user_sessions (expires_at, is_active);

-- Índice para last_activity (usado para marcar como inativas)
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity 
ON user_sessions (last_activity) 
WHERE is_active = true;

-- Índice para busca por token (usado no logout)
CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
ON user_sessions (token);

-- Índice para user_id (usado na consulta de sessões ativas)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
ON user_sessions (user_id, is_active, expires_at);

-- Estatísticas da tabela após criar índices
ANALYZE user_sessions;