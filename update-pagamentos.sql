-- Script para atualizar a tabela de pagamentos com colunas de créditos
-- Adiciona as colunas: valor_cartao, valor_credito, detalhes_credito

-- Verificar se as colunas já existem e adicionar se necessário
DO $$ 
BEGIN
    -- Adicionar coluna valor_cartao
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pagamentos' AND column_name = 'valor_cartao') THEN
        ALTER TABLE pagamentos ADD COLUMN valor_cartao DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Coluna valor_cartao adicionada';
    ELSE
        RAISE NOTICE 'Coluna valor_cartao já existe';
    END IF;

    -- Adicionar coluna valor_credito
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pagamentos' AND column_name = 'valor_credito') THEN
        ALTER TABLE pagamentos ADD COLUMN valor_credito DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Coluna valor_credito adicionada';
    ELSE
        RAISE NOTICE 'Coluna valor_credito já existe';
    END IF;

    -- Adicionar coluna detalhes_credito
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pagamentos' AND column_name = 'detalhes_credito') THEN
        ALTER TABLE pagamentos ADD COLUMN detalhes_credito TEXT;
        RAISE NOTICE 'Coluna detalhes_credito adicionada';
    ELSE
        RAISE NOTICE 'Coluna detalhes_credito já existe';
    END IF;
END $$;

-- Atualizar registros existentes para definir valor_cartao = valor onde valor_cartao é 0 ou null
UPDATE pagamentos 
SET valor_cartao = valor 
WHERE valor_cartao IS NULL OR valor_cartao = 0;

-- Mostrar estrutura final da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pagamentos' 
ORDER BY ordinal_position;