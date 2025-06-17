
-- Script final para remover colunas não utilizadas da tabela pagamentos
-- Execute este script no banco de dados

-- Verificar se as colunas existem antes de tentar removê-las
DO $$ 
BEGIN
    -- Remover coluna resumo_pagamento se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pagamentos' 
        AND column_name = 'resumo_pagamento'
    ) THEN
        ALTER TABLE pagamentos DROP COLUMN resumo_pagamento;
        RAISE NOTICE 'Coluna resumo_pagamento removida';
    ELSE
        RAISE NOTICE 'Coluna resumo_pagamento não existe';
    END IF;

    -- Remover coluna metadata se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pagamentos' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE pagamentos DROP COLUMN metadata;
        RAISE NOTICE 'Coluna metadata removida';
    ELSE
        RAISE NOTICE 'Coluna metadata não existe';
    END IF;

    -- Remover coluna detalhes_credito se existir (não está sendo utilizada)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pagamentos' 
        AND column_name = 'detalhes_credito'
    ) THEN
        ALTER TABLE pagamentos DROP COLUMN detalhes_credito;
        RAISE NOTICE 'Coluna detalhes_credito removida';
    ELSE
        RAISE NOTICE 'Coluna detalhes_credito não existe';
    END IF;
END $$;

-- Verificar estrutura final da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'pagamentos' 
ORDER BY ordinal_position;
