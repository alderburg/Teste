
-- Script para corrigir valores errados já salvos na tabela pagamentos
-- EXECUTE COM CUIDADO - Este script altera dados existentes

-- Primeiro, vamos ver quais registros precisam ser corrigidos
SELECT 
    id,
    plano_nome,
    periodo,
    valor as valor_atual,
    CASE 
        WHEN plano_nome = 'ESSENCIAL' AND periodo = 'Mensal' THEN 25.00
        WHEN plano_nome = 'ESSENCIAL' AND periodo = 'Anual' THEN 250.00
        WHEN plano_nome = 'PROFISSIONAL' AND periodo = 'Mensal' THEN 164.92
        WHEN plano_nome = 'PROFISSIONAL' AND periodo = 'Anual' THEN 1979.04
        WHEN plano_nome = 'EMPRESARIAL' AND periodo = 'Mensal' THEN 314.83
        WHEN plano_nome = 'EMPRESARIAL' AND periodo = 'Anual' THEN 3978.96
        WHEN plano_nome = 'PREMIUM' AND periodo = 'Mensal' THEN 414.75
        WHEN plano_nome = 'PREMIUM' AND periodo = 'Anual' THEN 4977.00
        ELSE valor
    END as valor_correto,
    data_pagamento
FROM pagamentos 
WHERE user_id = 3
ORDER BY created_at DESC;

-- DESCOMENTE AS LINHAS ABAIXO PARA EXECUTAR A CORREÇÃO
-- ⚠️ ATENÇÃO: Execute apenas após confirmar que os valores estão incorretos

/*
UPDATE pagamentos 
SET valor = CASE 
    WHEN plano_nome = 'ESSENCIAL' AND periodo = 'Mensal' THEN 25.00
    WHEN plano_nome = 'ESSENCIAL' AND periodo = 'Anual' THEN 250.00
    WHEN plano_nome = 'PROFISSIONAL' AND periodo = 'Mensal' THEN 164.92
    WHEN plano_nome = 'PROFISSIONAL' AND periodo = 'Anual' THEN 1979.04
    WHEN plano_nome = 'EMPRESARIAL' AND periodo = 'Mensal' THEN 314.83
    WHEN plano_nome = 'EMPRESARIAL' AND periodo = 'Anual' THEN 3978.96
    WHEN plano_nome = 'PREMIUM' AND periodo = 'Mensal' THEN 414.75
    WHEN plano_nome = 'PREMIUM' AND periodo = 'Anual' THEN 4977.00
    ELSE valor
END,
updated_at = CURRENT_TIMESTAMP
WHERE user_id = 3
  AND (
    (plano_nome = 'ESSENCIAL' AND periodo = 'Mensal' AND valor != 25.00) OR
    (plano_nome = 'ESSENCIAL' AND periodo = 'Anual' AND valor != 250.00) OR
    (plano_nome = 'PROFISSIONAL' AND periodo = 'Mensal' AND valor != 164.92) OR
    (plano_nome = 'PROFISSIONAL' AND periodo = 'Anual' AND valor != 1979.04) OR
    (plano_nome = 'EMPRESARIAL' AND periodo = 'Mensal' AND valor != 314.83) OR
    (plano_nome = 'EMPRESARIAL' AND periodo = 'Anual' AND valor != 3978.96) OR
    (plano_nome = 'PREMIUM' AND periodo = 'Mensal' AND valor != 414.75) OR
    (plano_nome = 'PREMIUM' AND periodo = 'Anual' AND valor != 4977.00)
  );
*/
