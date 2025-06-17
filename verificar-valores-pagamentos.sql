
-- Script para verificar valores salvos na tabela pagamentos
-- Execute este script após fazer um downgrade para verificar se os valores estão corretos

-- Últimos 10 pagamentos
SELECT 
    id,
    user_id,
    plano_nome,
    periodo,
    valor as valor_salvo,
    valor_cartao,
    valor_credito,
    metodo_pagamento,
    resumo_pagamento,
    data_pagamento,
    created_at
FROM pagamentos 
WHERE user_id = 3  -- Substitua pelo ID do seu usuário
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar se há valores suspeitos (muito altos para serem valores de planos)
SELECT 
    'VALORES SUSPEITOS' as tipo,
    id,
    plano_nome,
    valor as valor_suspeito,
    'Valor muito alto para ser valor de plano' as observacao
FROM pagamentos 
WHERE valor > 500  -- Valores acima de R$ 500 podem ser créditos ao invés de valores de planos
  AND user_id = 3
ORDER BY created_at DESC;

-- Verificar valores esperados por plano
SELECT 
    'VALORES ESPERADOS' as info,
    'ESSENCIAL mensal: R$ 25.00, anual: R$ 250.00' as essencial,
    'PROFISSIONAL mensal: R$ 164.92, anual: R$ 1979.04' as profissional,
    'EMPRESARIAL mensal: R$ 314.83, anual: R$ 3978.96' as empresarial,
    'PREMIUM mensal: R$ 414.75, anual: R$ 4977.00' as premium;
