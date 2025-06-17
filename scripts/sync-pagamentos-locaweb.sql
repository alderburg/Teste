
-- Script de Sincronização Completa da Tabela Pagamentos - Locaweb
-- Execute este script diretamente no phpMyAdmin ou interface SQL da Locaweb

-- 1. Primeiro, vamos garantir que a tabela tenha todas as colunas necessárias
ALTER TABLE pagamentos 
ADD COLUMN IF NOT EXISTS valor_cartao DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS valor_credito DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS detalhes_credito TEXT,
ADD COLUMN IF NOT EXISTS tem_credito BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_full_credit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS resumo_pagamento TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Remover a coluna 'descricao' se existir (causa dos erros)
ALTER TABLE pagamentos DROP COLUMN IF EXISTS descricao;

-- 3. Atualizar registros existentes para garantir consistência
UPDATE pagamentos 
SET valor_cartao = valor 
WHERE valor_cartao IS NULL OR valor_cartao = 0;

UPDATE pagamentos 
SET updated_at = CURRENT_TIMESTAMP 
WHERE updated_at IS NULL;

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_invoice ON pagamentos(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_subscription ON pagamentos(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_customer ON pagamentos(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_pagamento ON pagamentos(data_pagamento DESC);

-- 5. Garantir que stripe_invoice_id seja único quando não for NULL
DROP INDEX IF EXISTS pagamentos_stripe_invoice_id_unique;
CREATE UNIQUE INDEX pagamentos_stripe_invoice_id_unique ON pagamentos(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- 6. Verificar a estrutura final da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'pagamentos' 
ORDER BY ordinal_position;

-- 7. Mostrar estatísticas da tabela
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN stripe_invoice_id IS NOT NULL THEN 1 END) as com_stripe_invoice,
    COUNT(CASE WHEN valor_cartao > 0 THEN 1 END) as com_valor_cartao,
    COUNT(CASE WHEN valor_credito > 0 THEN 1 END) as com_valor_credito
FROM pagamentos;
