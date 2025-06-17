-- Script para remover as colunas resumo_pagamento e metadata da tabela pagamentos
-- Essas colunas não estão sendo utilizadas no frontend

-- Remover coluna resumo_pagamento
ALTER TABLE pagamentos DROP COLUMN IF EXISTS resumo_pagamento;

-- Remover coluna metadata  
ALTER TABLE pagamentos DROP COLUMN IF EXISTS metadata;

-- Verificar estrutura final da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pagamentos' 
ORDER BY ordinal_position;