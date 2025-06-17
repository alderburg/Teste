-- Script SQL para adicionar a coluna credito_gerado na tabela pagamentos
-- Este script adiciona a coluna apenas se ela não existir

DO $$ 
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pagamentos' 
        AND column_name = 'credito_gerado'
    ) THEN
        -- Adicionar a coluna credito_gerado
        ALTER TABLE pagamentos 
        ADD COLUMN credito_gerado DECIMAL(10,2) DEFAULT 0.00;
        
        RAISE NOTICE 'Coluna credito_gerado adicionada com sucesso na tabela pagamentos';
    ELSE
        RAISE NOTICE 'Coluna credito_gerado já existe na tabela pagamentos';
    END IF;
END $$;

-- Verificar a estrutura da tabela após a alteração
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'pagamentos'
ORDER BY ordinal_position;