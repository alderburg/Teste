-- Atualizar estrutura da tabela pagamentos para incluir informações de créditos
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS valor_cartao DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS valor_credito DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS detalhes_credito TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS tem_credito BOOLEAN DEFAULT FALSE;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS is_full_credit BOOLEAN DEFAULT FALSE;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS resumo_pagamento TEXT;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_data ON pagamentos(user_id, data_pagamento DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_invoice ON pagamentos(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_subscription ON pagamentos(stripe_subscription_id);

-- Garantir que a coluna stripe_invoice_id seja única
ALTER TABLE pagamentos DROP CONSTRAINT IF EXISTS pagamentos_stripe_invoice_id_key;
ALTER TABLE pagamentos ADD CONSTRAINT pagamentos_stripe_invoice_id_unique UNIQUE (stripe_invoice_id);