
-- Script para corrigir registros de downgrade onde valor_cartao foi salvo incorretamente
-- Em downgrades 100% crédito, valor_cartao deve ser 0.00

-- Primeiro, vamos identificar os registros problemáticos
SELECT 
    id,
    plano_nome,
    periodo,
    valor,
    valor_cartao,
    valor_credito,
    metodo_pagamento,
    resumo_pagamento,
    data_pagamento
FROM pagamentos 
WHERE metodo_pagamento = 'Crédito MPC'
  AND valor_cartao > 0
  AND valor_cartao = valor_credito  -- Casos onde valor_cartao foi duplicado
ORDER BY data_pagamento DESC;

-- Corrigir os registros onde valor_cartao deveria ser 0.00
UPDATE pagamentos 
SET 
    valor_cartao = 0.00,
    resumo_pagamento = REPLACE(resumo_pagamento, 
        CONCAT('Cartão: R$ ', CAST(valor_cartao AS CHAR), ' + '), 
        ''
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE metodo_pagamento = 'Crédito MPC'
  AND valor_cartao > 0
  AND valor_cartao = valor_credito;

-- Verificar resultados após correção
SELECT 
    'APÓS CORREÇÃO' as status,
    id,
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
