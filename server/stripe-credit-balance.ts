
import { stripe, isStripeConfigured } from './stripe-helper';

/**
 * Busca o saldo de créditos disponível na conta do cliente Stripe
 * @param stripeCustomerId ID do cliente no Stripe
 * @returns Saldo de créditos em centavos
 */
export async function getCustomerCreditBalance(stripeCustomerId: string): Promise<number> {
  if (!isStripeConfigured() || !stripe) {
    console.log('Stripe não configurado, retornando saldo 0');
    return 0;
  }

  try {
    // Buscar o cliente no Stripe
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    
    if ('deleted' in customer) {
      console.log('Cliente foi deletado do Stripe');
      return 0;
    }

    // O saldo de créditos está disponível na propriedade 'balance'
    // Valores negativos representam créditos disponíveis
    const creditBalance = Math.abs(customer.balance || 0);
    
    console.log(`Saldo de créditos para cliente ${stripeCustomerId}: ${creditBalance} centavos`);
    return creditBalance;
  } catch (error) {
    console.error('Erro ao buscar saldo de créditos:', error);
    return 0;
  }
}

/**
 * Converte o saldo de créditos de centavos para reais
 * @param balanceInCents Saldo em centavos
 * @returns Saldo formatado em reais
 */
export function formatCreditBalance(balanceInCents: number): string {
  const balanceInReais = balanceInCents / 100;
  return balanceInReais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}
