# Implementação do Proration Behavior - Sistema de Upgrades e Downgrades

## Visão Geral

Este documento descreve como o sistema de proração (proration_behavior) foi implementado para gerenciar upgrades, downgrades e mudanças de período de assinatura de forma automática e justa tanto para o cliente quanto para a empresa.

## Como Funciona o Proration Behavior

### 1. **Upgrades (Mudança para Plano Superior)**

**Comportamento:** `proration_behavior: 'create_prorations'` + `billing_cycle_anchor: 'now'`

- **O que acontece:** O cliente é cobrado imediatamente pela diferença proporcional ao tempo restante do período atual
- **Exemplo:** Cliente no plano Essencial (R$ 50/mês) muda para Profissional (R$ 100/mês) no dia 15 do mês
  - Diferença: R$ 50/mês
  - Tempo restante: 15 dias (50% do mês)
  - Cobrança imediata: R$ 25 (50% da diferença)
  - Próximo ciclo: Inicia imediatamente com valor total do novo plano

**Vantagens:**
- Cliente tem acesso imediato aos recursos do plano superior
- Empresa recebe pagamento justo pelo valor adicional
- Transparência total na cobrança

### 2. **Downgrades (Mudança para Plano Inferior)**

**Comportamento:** `proration_behavior: 'create_prorations'`

- **O que acontece:** O sistema cria um crédito proporcional que será aplicado no próximo período de cobrança
- **Exemplo:** Cliente no plano Profissional (R$ 100/mês) muda para Essencial (R$ 50/mês) no dia 15 do mês
  - Diferença: -R$ 50/mês
  - Tempo restante: 15 dias (50% do mês)
  - Crédito gerado: R$ 25 (50% da diferença)
  - Próximo ciclo: R$ 50 - R$ 25 = R$ 25 a pagar

**Vantagens:**
- Cliente recebe crédito justo pelo valor pago antecipadamente
- Mudança imediata para o novo plano
- Não há reembolso imediato, mantendo cash flow

### 3. **Mudança de Período (Mensal ↔ Anual)**

**Comportamento:** `proration_behavior: 'create_prorations'`

- **O que acontece:** Calcula proporcionalmente o valor já pago e ajusta para o novo período
- **Exemplo:** Cliente mensal (R$ 100/mês) muda para anual (R$ 1000/ano) no dia 15
  - Valor pago no mês atual: R$ 100
  - Valor usado: R$ 50 (15 dias)
  - Crédito: R$ 50
  - Cobrança anual: R$ 1000 - R$ 50 = R$ 950

## Implementação Técnica

### Endpoint Principal: `/api/assinaturas`

O endpoint detecta automaticamente o tipo de operação:

```typescript
// Detecta o tipo de operação
let tipoOperacao = 'NOVA_ASSINATURA';
if (assinaturaExistente) {
  if (assinaturaExistente.planoId < planoId) {
    tipoOperacao = 'UPGRADE';
  } else if (assinaturaExistente.planoId > planoId) {
    tipoOperacao = 'DOWNGRADE';
  } else if (assinaturaExistente.tipoCobranca !== tipoCobranca) {
    tipoOperacao = 'MUDANCA_PERIODO';
  }
}
```

### Configuração do Stripe

Para cada tipo de operação, diferentes configurações são aplicadas:

```typescript
// Upgrades: Cobrança imediata
if (tipoOperacao === 'UPGRADE') {
  prorationBehavior = 'create_prorations';
  billing_cycle_anchor = 'now';
}

// Downgrades: Crédito para próximo período
if (tipoOperacao === 'DOWNGRADE') {
  prorationBehavior = 'create_prorations';
  // Sem billing_cycle_anchor para manter o ciclo atual
}
```

### Sincronização com Sistema Local

1. **Cancelamento da Assinatura Anterior**
   - A assinatura antiga é cancelada no sistema local
   - Mantém o histórico para auditoria

2. **Criação da Nova Assinatura**
   - Nova entrada é criada com os dados atualizados
   - Mesma `stripeSubscriptionId` (atualizada no Stripe)

3. **Atualização via Webhooks**
   - Webhooks do Stripe sincronizam automaticamente
   - Processa eventos de `subscription.updated` e `invoice.created`

## Fluxo de Funcionamento

### Para Upgrades:

1. **Cliente solicita upgrade** → Frontend envia requisição
2. **Sistema detecta upgrade** → `tipoOperacao = 'UPGRADE'`
3. **Stripe atualiza assinatura** → Com `create_prorations` + `billing_cycle_anchor: 'now'`
4. **Cobrança imediata** → Cliente paga diferença proporcional
5. **Sistema local atualiza** → Cancela antiga, cria nova entrada
6. **Webhook confirma** → Sincroniza status final

### Para Downgrades:

1. **Cliente solicita downgrade** → Frontend envia requisição
2. **Sistema detecta downgrade** → `tipoOperacao = 'DOWNGRADE'`
3. **Stripe atualiza assinatura** → Com `create_prorations`
4. **Crédito gerado** → Para próximo período
5. **Sistema local atualiza** → Cancela antiga, cria nova entrada
6. **Webhook confirma** → Sincroniza status final

## Benefícios da Implementação

### Para o Cliente:
- ✅ **Transparência total** nas cobranças e créditos
- ✅ **Justiça** - paga apenas pelo que usa
- ✅ **Flexibilidade** - pode mudar de plano a qualquer momento
- ✅ **Sem surpresas** - valores calculados proporcionalmente

### Para a Empresa:
- ✅ **Cash flow preservado** - downgrades geram crédito, não reembolso
- ✅ **Receita justa** - upgrades cobram diferença imediatamente
- ✅ **Automação completa** - sem intervenção manual
- ✅ **Auditoria completa** - histórico de todas as mudanças

### Para o Sistema:
- ✅ **Sincronização bidirecional** - Stripe ↔ Sistema local
- ✅ **Tratamento de erros** - fallbacks e validações
- ✅ **Logs detalhados** - rastreamento completo
- ✅ **Webhooks confiáveis** - sincronização automática

## Monitoramento e Logs

O sistema registra detalhadamente cada operação:

```
🆕 Criando nova assinatura no Stripe para usuário 123
📈 UPGRADE: Aplicando proração com cobrança imediata da diferença
📉 DOWNGRADE: Aplicando proração com crédito para próximo período
🔄 MUDANÇA DE PERÍODO: Aplicando proração
✅ UPGRADE realizado com sucesso no Stripe. Status: active
```

## Tratamento de Casos Especiais

1. **Assinatura sem Stripe ID**: Erro controlado, orientação para suporte
2. **Assinatura cancelada no Stripe**: Validação antes da operação
3. **Falhas de pagamento**: Webhook processa automaticamente
4. **Mudança para mesmo plano**: Validação impede operação desnecessária

Esta implementação garante que todas as mudanças de plano sejam processadas de forma justa, transparente e automatizada, proporcionando uma excelente experiência tanto para clientes quanto para a operação do negócio.