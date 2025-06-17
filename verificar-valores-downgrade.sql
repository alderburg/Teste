-- Verificar os últimos 10 pagamentos registrados
SELECT 
    id,
    valor,
    valor_cartao,
    valor_credito,
    plano_nome,
    periodo,
    stripe_invoice_id,
    data_pagamento,
    created_at
FROM pagamentos 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar pagamentos com valores suspeitos (negativos ou muito altos)
SELECT 
    id,
    valor,
    plano_nome,
    stripe_invoice_id,
    data_pagamento
FROM pagamentos 
WHERE valor < 0 OR valor > 10000
ORDER BY created_at DESC 
LIMIT 5;
