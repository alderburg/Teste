-- Script para verificar se os valores de pagamento estão corretos após as correções
-- Analisa os campos valor_credito e valor_cartao para identificar problemas

-- 1. Verificar últimos pagamentos com análise de valores
SELECT 
  id,
  valor::numeric(10,2) as valor_total,
  valor_cartao::numeric(10,2) as valor_cartao,
  valor_credito::numeric(10,2) as valor_credito,
  (valor_cartao + valor_credito)::numeric(10,2) as soma_valores,
  metodo_pagamento,
  resumo_pagamento,
  plano_nome,
  data_pagamento::date,
  stripe_invoice_id,
  CASE 
    WHEN valor_cartao = 0 AND valor_credito > 0 THEN '✅ 100% Crédito'
    WHEN valor_credito = 0 AND valor_cartao > 0 THEN '✅ 100% Cartão'
    WHEN valor_cartao > 0 AND valor_credito > 0 THEN '✅ Híbrido'
    WHEN valor_cartao = 0 AND valor_credito = 0 THEN '❌ Ambos Zero'
    ELSE '⚠️ Outros'
  END as status_valores,
  CASE 
    WHEN ABS((valor_cartao + valor_credito) - valor) > 0.01 THEN '❌ Soma não confere'
    ELSE '✅ Soma OK'
  END as verificacao_soma
FROM pagamentos 
ORDER BY data_pagamento DESC 
LIMIT 15;

-- 2. Resumo estatístico dos tipos de pagamento
SELECT 
  CASE 
    WHEN valor_cartao = 0 AND valor_credito > 0 THEN '100% Crédito'
    WHEN valor_credito = 0 AND valor_cartao > 0 THEN '100% Cartão'
    WHEN valor_cartao > 0 AND valor_credito > 0 THEN 'Híbrido'
    WHEN valor_cartao = 0 AND valor_credito = 0 THEN 'Ambos Zero (ERRO)'
    ELSE 'Outros (ERRO)'
  END as tipo_pagamento,
  COUNT(*) as quantidade,
  ROUND(AVG(valor), 2) as valor_medio,
  ROUND(SUM(valor), 2) as valor_total
FROM pagamentos 
WHERE data_pagamento >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
  CASE 
    WHEN valor_cartao = 0 AND valor_credito > 0 THEN '100% Crédito'
    WHEN valor_credito = 0 AND valor_cartao > 0 THEN '100% Cartão'
    WHEN valor_cartao > 0 AND valor_credito > 0 THEN 'Híbrido'
    WHEN valor_cartao = 0 AND valor_credito = 0 THEN 'Ambos Zero (ERRO)'
    ELSE 'Outros (ERRO)'
  END
ORDER BY quantidade DESC;

-- 3. Verificar problemas específicos
SELECT 
  'Problemas encontrados:' as analise,
  '' as detalhes
UNION ALL
SELECT 
  'Pagamentos com soma incorreta:',
  COUNT(*)::text
FROM pagamentos 
WHERE ABS((valor_cartao + valor_credito) - valor) > 0.01
UNION ALL
SELECT 
  'Pagamentos com ambos valores zero:',
  COUNT(*)::text
FROM pagamentos 
WHERE valor_cartao = 0 AND valor_credito = 0
UNION ALL
SELECT 
  'Pagamentos híbridos:',
  COUNT(*)::text
FROM pagamentos 
WHERE valor_cartao > 0 AND valor_credito > 0;