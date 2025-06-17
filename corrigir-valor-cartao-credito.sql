
-- Script para corrigir registros onde valor_cartao > 0 mas o pagamento é 100% crédito
-- Identifica casos onde metodo_pagamento = 'Crédito MPC' mas valor_cartao > 0

-- Primeiro, identificar registros problemáticos
SELECT 
    'ANTES DA CORREÇÃO' as status,
    id,
    user_id,
    plano_nome,
    periodo,
    valor,
    valor_cartao,
    valor_credito,
    metodo_pagamento,
    resumo_pagamento,
    stripe_invoice_id,
    data_pagamento
FROM pagamentos 
WHERE metodo_pagamento = 'Crédito MPC' 
  AND valor_cartao > 0
ORDER BY data_pagamento DESC;

-- Mostrar estatísticas do problema
SELECT 
    'ESTATÍSTICAS' as info,
    COUNT(*) as total_registros_problematicos,
    SUM(valor_cartao) as soma_valores_cartao_incorretos,
    MIN(data_pagamento) as primeiro_registro_problema,
    MAX(data_pagamento) as ultimo_registro_problema
FROM pagamentos 
WHERE metodo_pagamento = 'Crédito MPC' 
  AND valor_cartao > 0;

-- EXECUTAR CORREÇÃO: Zerar valor_cartao para pagamentos 100% crédito
UPDATE pagamentos 
SET 
    valor_cartao = 0.00,
    resumo_pagamento = CASE 
        WHEN resumo_pagamento LIKE 'Cartão: R$ % + Créditos: R$ %' THEN
            CONCAT('Pagamento integral com créditos: R$ ', CAST(valor_credito AS CHAR))
        WHEN resumo_pagamento LIKE '%Cartão: R$ %' THEN
            REPLACE(resumo_pagamento, 
                SUBSTRING(resumo_pagamento, 
                    LOCATE('Cartão: R$ ', resumo_pagamento), 
                    LOCATE(' + ', resumo_pagamento) - LOCATE('Cartão: R$ ', resumo_pagamento) + 3
                ), 
                ''
            )
        ELSE resumo_pagamento
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE metodo_pagamento = 'Crédito MPC' 
  AND valor_cartao > 0;

-- Verificar resultado da correção
SELECT 
    'APÓS CORREÇÃO' as status,
    id,
    user_id,
    plano_nome,
    valor,
    valor_cartao,
    valor_credito,
    metodo_pagamento,
    resumo_pagamento
FROM pagamentos 
WHERE metodo_pagamento = 'Crédito MPC'
ORDER BY data_pagamento DESC
LIMIT 10;

-- Verificar se ainda há registros problemáticos
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    COUNT(*) as registros_ainda_problematicos
FROM pagamentos 
WHERE metodo_pagamento = 'Crédito MPC' 
  AND valor_cartao > 0;
