# Integração com Stripe para Assinaturas

Este documento descreve como o sistema de assinaturas é integrado com o Stripe para processar pagamentos recorrentes.

## Visão Geral

O sistema utiliza o Stripe para gerenciar:
- Métodos de pagamento (cartões)
- Assinaturas recorrentes (mensais e anuais)
- Processamento de pagamentos
- Notificações de eventos (webhooks)

Todos os planos no sistema estão configurados sob um único produto Stripe chamado "Meu Preço Certo", com diferentes preços para cada combinação de plano e período.

## Mapeamento de Planos

Cada plano no sistema corresponde a dois preços no Stripe:
1. Preço para cobrança mensal
2. Preço para cobrança anual

Os mapeamentos são definidos em `server/stripe-helper.ts`.

## Fluxo de Assinatura

1. Usuário seleciona um plano (ESSENCIAL, PROFISSIONAL, EMPRESARIAL ou PREMIUM)
2. Usuário escolhe a periodicidade (mensal ou anual)
3. O sistema verifica se o usuário tem um cartão cadastrado
   - Se não tiver, solicita o cadastro de um método de pagamento
4. O sistema cria uma assinatura no Stripe usando o ID de preço correspondente
5. O sistema cria uma assinatura no banco de dados local
6. O Stripe processa o pagamento e envia eventos via webhook

## Webhook

O sistema processa os seguintes eventos do Stripe:
- `invoice.payment_succeeded`: Pagamento bem-sucedido
- `invoice.payment_failed`: Falha no pagamento
- `customer.subscription.updated`: Atualização de assinatura
- `customer.subscription.deleted`: Cancelamento de assinatura

## Tratamento de Cancelamentos

O sistema suporta dois tipos de cancelamento:
1. **Cancelamento imediato**: A assinatura é encerrada imediatamente
2. **Cancelamento no fim do período**: A assinatura permanece ativa até o final do período pago

## Exemplo de Uso

```typescript
import { getStripePriceId } from '../server/stripe-helper';

// Obter o ID do preço do Stripe para um plano e período
const priceId = getStripePriceId('PROFISSIONAL', 'mensal');

// Criar uma assinatura
const response = await fetch('/api/create-subscription', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planoId: 2, // ID do plano PROFISSIONAL
    tipoCobranca: 'mensal'
  })
});

const data = await response.json();
console.log('Assinatura criada:', data);
```

## Sincronização de Dados

Quando eventos ocorrem no Stripe (pagamentos, cancelamentos, etc.), o sistema mantém os dados locais sincronizados através do processamento de webhooks.

## Testes e Depuração

Para testar a integração:
1. Use o modo de teste do Stripe
2. Use cartões de teste (ex: 4242 4242 4242 4242)
3. Verifique os logs detalhados no console do servidor