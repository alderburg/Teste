-- Script para remover campos desnecessários da tabela pagamentos
-- Execute este script no banco de dados da Locaweb

-- Remover os campos que não são mais necessários
ALTER TABLE pagamentos 
DROP COLUMN IF EXISTS detalhes_credito,
DROP COLUMN IF EXISTS tem_credito,
DROP COLUMN IF EXISTS is_full_credit;

-- Verificar a estrutura atualizada da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pagamentos' 
ORDER BY ordinal_position;