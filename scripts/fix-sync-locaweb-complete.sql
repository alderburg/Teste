
-- Script Completo de Correção e Sincronização da Tabela Pagamentos - Locaweb
-- Execute este script diretamente no phpMyAdmin ou interface SQL da Locaweb

-- 1. Verificar estrutura atual da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'pagamentos' 
ORDER BY ordinal_position;

-- 2. Remover a coluna 'descricao' se existir (causa dos erros)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'descricao') > 0,
    'ALTER TABLE pagamentos DROP COLUMN descricao',
    'SELECT "Coluna descricao não existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Adicionar todas as colunas necessárias se não existirem
-- Coluna valor_cartao
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'valor_cartao') = 0,
    'ALTER TABLE pagamentos ADD COLUMN valor_cartao DECIMAL(10,2) DEFAULT 0.00',
    'SELECT "Coluna valor_cartao já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna valor_credito
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'valor_credito') = 0,
    'ALTER TABLE pagamentos ADD COLUMN valor_credito DECIMAL(10,2) DEFAULT 0.00',
    'SELECT "Coluna valor_credito já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna detalhes_credito
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'detalhes_credito') = 0,
    'ALTER TABLE pagamentos ADD COLUMN detalhes_credito TEXT',
    'SELECT "Coluna detalhes_credito já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna tem_credito
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'tem_credito') = 0,
    'ALTER TABLE pagamentos ADD COLUMN tem_credito BOOLEAN DEFAULT FALSE',
    'SELECT "Coluna tem_credito já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna is_full_credit
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'is_full_credit') = 0,
    'ALTER TABLE pagamentos ADD COLUMN is_full_credit BOOLEAN DEFAULT FALSE',
    'SELECT "Coluna is_full_credit já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna resumo_pagamento
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'resumo_pagamento') = 0,
    'ALTER TABLE pagamentos ADD COLUMN resumo_pagamento TEXT',
    'SELECT "Coluna resumo_pagamento já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna stripe_customer_id
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'stripe_customer_id') = 0,
    'ALTER TABLE pagamentos ADD COLUMN stripe_customer_id VARCHAR(255)',
    'SELECT "Coluna stripe_customer_id já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna stripe_subscription_id
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'stripe_subscription_id') = 0,
    'ALTER TABLE pagamentos ADD COLUMN stripe_subscription_id VARCHAR(255)',
    'SELECT "Coluna stripe_subscription_id já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna metadata (para MySQL usar JSON ao invés de JSONB)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'metadata') = 0,
    'ALTER TABLE pagamentos ADD COLUMN metadata JSON',
    'SELECT "Coluna metadata já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Coluna updated_at
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'pagamentos' AND column_name = 'updated_at') = 0,
    'ALTER TABLE pagamentos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'SELECT "Coluna updated_at já existe" as resultado'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Atualizar registros existentes para garantir consistência
UPDATE pagamentos 
SET valor_cartao = valor 
WHERE valor_cartao IS NULL OR valor_cartao = 0;

UPDATE pagamentos 
SET updated_at = CURRENT_TIMESTAMP 
WHERE updated_at IS NULL;

-- 5. Criar índices para melhor performance (somente se não existirem)
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_invoice ON pagamentos(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_subscription ON pagamentos(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_customer ON pagamentos(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_pagamento ON pagamentos(data_pagamento DESC);

-- 6. Garantir que stripe_invoice_id seja único quando não for NULL
ALTER TABLE pagamentos DROP INDEX IF EXISTS pagamentos_stripe_invoice_id_unique;
CREATE UNIQUE INDEX pagamentos_stripe_invoice_id_unique ON pagamentos(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- 7. Verificar a estrutura final da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'pagamentos' 
ORDER BY ordinal_position;

-- 8. Mostrar estatísticas da tabela
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN stripe_invoice_id IS NOT NULL THEN 1 END) as com_stripe_invoice,
    COUNT(CASE WHEN valor_cartao > 0 THEN 1 END) as com_valor_cartao,
    COUNT(CASE WHEN valor_credito > 0 THEN 1 END) as com_valor_credito,
    COUNT(CASE WHEN stripe_customer_id IS NOT NULL THEN 1 END) as com_stripe_customer
FROM pagamentos;

-- 9. Limpar registros órfãos ou inválidos se necessário
-- DELETE FROM pagamentos WHERE user_id IS NULL OR valor IS NULL OR valor <= 0;
