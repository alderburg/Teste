-- Adicionar coluna user_type na tabela activity_logs
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'main' NOT NULL;

-- Adicionar constraint para validar valores
ALTER TABLE activity_logs 
ADD CONSTRAINT IF NOT EXISTS check_activity_user_type 
CHECK (user_type IN ('main', 'additional'));

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type 
ON activity_logs(user_type);

-- Atualizar registros existentes para 'main' se necessário
UPDATE activity_logs 
SET user_type = 'main' 
WHERE user_type IS NULL;