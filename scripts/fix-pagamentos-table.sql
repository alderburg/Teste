
-- Script para corrigir e padronizar a estrutura da tabela pagamentos
-- Adiciona todas as colunas necessárias para sincronização com Stripe

-- Verificar se a tabela existe e criar se necessário
CREATE TABLE IF NOT EXISTS pagamentos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plano_id INTEGER,
    valor DECIMAL(10,2) NOT NULL,
    valor_cartao DECIMAL(10,2) DEFAULT 0.00,
    valor_credito DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente',
    metodo_pagamento VARCHAR(100) DEFAULT 'Cartão de Crédito',
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    data_pagamento TIMESTAMP,
    plano_nome VARCHAR(100),
    periodo VARCHAR(20),
    fatura_url TEXT,
    detalhes_credito TEXT,
    tem_credito BOOLEAN DEFAULT FALSE,
    is_full_credit BOOLEAN DEFAULT FALSE,
    resumo_pagamento TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar colunas se não existirem (para tabelas existentes)
DO $$ 
BEGIN
    -- Adicionar valor_cartao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'valor_cartao') THEN
        ALTER TABLE pagamentos ADD COLUMN valor_cartao DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    -- Adicionar valor_credito se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'valor_credito') THEN
        ALTER TABLE pagamentos ADD COLUMN valor_credito DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    -- Adicionar detalhes_credito se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'detalhes_credito') THEN
        ALTER TABLE pagamentos ADD COLUMN detalhes_credito TEXT;
    END IF;
    
    -- Adicionar tem_credito se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'tem_credito') THEN
        ALTER TABLE pagamentos ADD COLUMN tem_credito BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Adicionar is_full_credit se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'is_full_credit') THEN
        ALTER TABLE pagamentos ADD COLUMN is_full_credit BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Adicionar resumo_pagamento se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'resumo_pagamento') THEN
        ALTER TABLE pagamentos ADD COLUMN resumo_pagamento TEXT;
    END IF;
    
    -- Adicionar stripe_customer_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE pagamentos ADD COLUMN stripe_customer_id VARCHAR(255);
    END IF;
    
    -- Adicionar stripe_subscription_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE pagamentos ADD COLUMN stripe_subscription_id VARCHAR(255);
    END IF;
    
    -- Adicionar metadata se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'metadata') THEN
        ALTER TABLE pagamentos ADD COLUMN metadata JSONB;
    END IF;
    
    -- Adicionar updated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pagamentos' AND column_name = 'updated_at') THEN
        ALTER TABLE pagamentos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Atualizar registros existentes para preencher valor_cartao onde é NULL ou 0
UPDATE pagamentos 
SET valor_cartao = valor 
WHERE valor_cartao IS NULL OR valor_cartao = 0;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_invoice ON pagamentos(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_subscription ON pagamentos(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_pagamento ON pagamentos(data_pagamento DESC);

-- Garantir que stripe_invoice_id seja único quando não for NULL
DROP INDEX IF EXISTS pagamentos_stripe_invoice_id_unique;
CREATE UNIQUE INDEX pagamentos_stripe_invoice_id_unique ON pagamentos(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
