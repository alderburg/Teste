# Correções Implementadas para Downgrades - Valores na Tabela Pagamentos

## Problema Identificado
Durante downgrades, valores incorretos estavam sendo salvos na coluna `valor` da tabela `pagamentos`. Em vez de salvar o valor do plano de destino, estava salvando créditos ou outros valores negativos.

## Locais Corrigidos

### 1. server/routes-assinatura.ts (Linhas 347-357)
**Correção Principal:**
- Implementada lógica específica para downgrades
- Para DOWNGRADE: usa `valorPago` (valor do novo plano menor)
- Para outras operações: usa `subtotal` da invoice
- Logs detalhados adicionados para rastreamento

```javascript
// CORREÇÃO CRÍTICA: Para downgrades, usar sempre o valor do NOVO plano
let valorTotalPlano;
if (tipoOperacao === 'DOWNGRADE') {
  // Para downgrade, usar o valor do NOVO plano (menor)
  valorTotalPlano = Number(valorPago);
  console.log(`🔍 [DOWNGRADE LOG] CORREÇÃO: Usando valor do NOVO plano: R$ ${valorTotalPlano.toFixed(2)}`);
} else {
  // Para upgrade e nova assinatura, usar subtotal
  valorTotalPlano = Math.abs(latestInvoice.subtotal / 100);
}
```

### 2. server/routes.ts - Webhook Payment Handler (Linhas 4325-4343)
**Correção Crítica no Webhook:**
- SEMPRE usa valor do plano ao invés de valores da invoice
- Detecta downgrades por subtotal negativo ou muito baixo
- Garante consistência usando sempre valor esperado do plano

```javascript
// CRÍTICO: Para downgrades/upgrades, sempre usar o valor do plano, não da invoice
const valorEsperadoPlano = assinaturaLocal.tipoCobranca === 'anual' 
  ? Number(plano.valorAnualTotal) 
  : Number(plano.valorMensal);

// Detectar downgrades: subtotal negativo ou muito menor que valor do plano
if (invoice.subtotal < 0 || valorInvoiceReal < valorEsperadoPlano * 0.5) {
  isDowngrade = true;
  valorTotalPlano = valorEsperadoPlano; // SEMPRE usar valor do plano em downgrades
} else {
  valorTotalPlano = valorEsperadoPlano; // SEMPRE usar valor do plano para consistência
}
```

### 3. server/index.ts - handlePaymentFailed (Linhas 228-249)
**Correção para Pagamentos Falhados:**
- Detecta downgrades em pagamentos que falharam
- Busca valor correto do plano via API do Stripe
- Usa valor do plano ao invés de amount_due que pode ser negativo

```javascript
// CORREÇÃO: Para downgrades, usar valor do plano ao invés de amount_due que pode ser crédito
let valorCorrigido = invoice.amount_due / 100;

if (invoice.amount_due < 0 || invoice.subscription) {
  // Buscar valor correto do plano da assinatura
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const priceId = subscription.items?.data?.[0]?.price?.id;
  
  if (priceId) {
    const price = await stripe.prices.retrieve(priceId);
    valorCorrigido = (price.unit_amount || 0) / 100;
  }
}
```

## Logs Implementados

### Logs de Downgrade (routes-assinatura.ts)
```
🔍 [DOWNGRADE LOG] Operação: DOWNGRADE
🔍 [DOWNGRADE LOG] Plano anterior: PREMIUM (ID: 4)
🔍 [DOWNGRADE LOG] Plano novo: ESSENCIAL (ID: 1)
🔍 [DOWNGRADE LOG] Stripe Invoice Data:
   - subtotal: 2500 centavos (R$ 25.00)
   - amount_paid: -7500 centavos (R$ -75.00)
   - total: 2500 centavos (R$ 25.00)
🔍 [DOWNGRADE LOG] CORREÇÃO: Usando valor do NOVO plano: R$ 25.00
```

### Logs de Webhook (routes.ts)
```
🔍 [WEBHOOK PAYMENT LOG] Invoice ID: in_xxxxx
🔍 [WEBHOOK PAYMENT LOG] Assinatura: sub_xxxxx
🔍 [WEBHOOK PAYMENT LOG] Plano: ESSENCIAL (ID: 1)
🔍 [WEBHOOK PAYMENT LOG] DOWNGRADE DETECTADO: Invoice R$ 25.00 < Plano R$ 100.00
🔍 [WEBHOOK PAYMENT LOG] CORREÇÃO: Usando valor do plano: R$ 25.00
```

## Como Verificar as Correções

1. **Fazer um downgrade** de qualquer plano superior para um inferior
2. **Verificar os logs** no console do servidor
3. **Consultar a tabela pagamentos** para confirmar que o valor salvo é o valor do plano de destino
4. **Verificar que não há valores negativos** ou de créditos salvos como valor principal

## Resultado Esperado

Após as correções:
- ✅ Valor salvo na coluna `valor` = valor do plano de destino
- ✅ Valores de crédito separados na coluna `valorCredito`
- ✅ Logs detalhados para debug
- ✅ Comportamento consistente entre downgrades via interface e webhooks

## Teste Recomendado

1. Downgrade: PREMIUM (R$ 100) → ESSENCIAL (R$ 25)
   - Valor esperado na tabela: R$ 25.00
   - Não: valor de crédito ou valor negativo

2. Verificar logs para confirmar detecção correta do downgrade
3. Confirmar que webhooks também aplicam a correção