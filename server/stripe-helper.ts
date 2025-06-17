import Stripe from 'stripe';

// Criar e exportar a instância do Stripe
const createStripeInstance = (): Stripe | null => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('Chave secreta do Stripe não configurada (STRIPE_SECRET_KEY)');
    return null;
  }

  try {
    const instance = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    console.log('✅ Instância do Stripe criada com sucesso');

    // Verificar imediatamente se a chave é válida fazendo uma chamada simples à API
    (async () => {
      try {
        // Testa a conexão com o Stripe
        await instance.balance.retrieve();
        console.log('✅ Chave do Stripe validada com sucesso - Conexão estabelecida com a API do Stripe');
      } catch (validationError: any) {
        console.error('❌ ERRO DE AUTENTICAÇÃO STRIPE: Chave inválida ou problema de conexão');
        console.error('Detalhes do erro:', validationError?.message || 'Erro desconhecido');
      }
    })();

    return instance;
  } catch (error) {
    console.error('Erro ao criar instância do Stripe:', error);
    return null;
  }
};

// Exportar a instância do Stripe para ser usada em outros módulos
export const stripe = createStripeInstance();

// Verificar se o Stripe está configurado
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Mapeamento de preços do Stripe para os planos no sistema
 * Todos os planos pertencem ao produto "Meu Preço Certo"
 */
export const stripePriceMapping = {
  'ESSENCIAL': {
    'mensal': 'price_1RBo8nGLlqAwF2i9kZiSWrhk',
    'anual': 'price_1RBo9BGLlqAwF2i9yKt42KW4'
  },
  'PROFISSIONAL': {
    'mensal': 'price_1RBo9hGLlqAwF2i94PLPd69I',
    'anual': 'price_1RBoAmGLlqAwF2i9WYP2WMhj'
  },
  'EMPRESARIAL': {
    'mensal': 'price_1RBoCRGLlqAwF2i9nqDJu0j6',
    'anual': 'price_1RBoDQGLlqAwF2i9gEOZpQlD'
  },
  'PREMIUM': {
    'mensal': 'price_1RBoE4GLllqAwF2i9jTsrAb6l',
    'anual': 'price_1RBoEcGLlqAwF2i9yZC00VNY'
  }
};

/**
 * Mapeamento de IDs de preço Stripe para informações de plano
 */
export const stripePriceToPlanoMapping = {
  'price_1RBo8nGLlqAwF2i9kZiSWrhk': { nome: 'ESSENCIAL', periodo: 'mensal', id: 1 },
  'price_1RBo9BGLlqAwF2i9yKt42KW4': { nome: 'ESSENCIAL', periodo: 'anual', id: 1 },
  'price_1RBo9hGLlqAwF2i94PLPd69I': { nome: 'PROFISSIONAL', periodo: 'mensal', id: 2 },
  'price_1RBoAmGLlqAwF2i9WYP2WMhj': { nome: 'PROFISSIONAL', periodo: 'anual', id: 2 },
  'price_1RBoCRGLlqAwF2i9nqDJu0j6': { nome: 'EMPRESARIAL', periodo: 'mensal', id: 3 },
  'price_1RBoDQGLlqAwF2i9gEOZpQlD': { nome: 'EMPRESARIAL', periodo: 'anual', id: 3 },
  'price_1RBoE4GLllqAwF2i9jTsrAb6l': { nome: 'PREMIUM', periodo: 'mensal', id: 4 },
  'price_1RBoEcGLlqAwF2i9yZC00VNY': { nome: 'PREMIUM', periodo: 'anual', id: 4 }
};

/**
 * Obtém o ID do preço Stripe para um plano e período específicos
 * @param planoNome Nome do plano (ESSENCIAL, PROFISSIONAL, etc.)
 * @param periodo Período de cobrança ('mensal' ou 'anual')
 * @returns ID do preço no Stripe ou null se não encontrado
 */
export function getStripePriceId(planoNome: string, periodo: 'mensal' | 'anual'): string | null {
  if (!stripePriceMapping[planoNome] || !stripePriceMapping[planoNome][periodo]) {
    return null;
  }

  return stripePriceMapping[planoNome][periodo];
}

/**
 * Obtém informações de plano a partir de um ID de preço Stripe
 * @param priceId ID do preço no Stripe
 * @returns Informações do plano ou null se não encontrado
 */
export function getPlanoInfoFromStripePrice(priceId: string): { nome: string, periodo: string, id: number } | null {
  return stripePriceToPlanoMapping[priceId] || null;
}

/**
 * Mapeia status da assinatura do Stripe para status local
 * @param stripeStatus Status da assinatura no Stripe
 * @returns Status equivalente no sistema local
 */
export function mapStripeSubscriptionStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'ativa',
    'past_due': 'inadimplente',
    'canceled': 'cancelada',
    'unpaid': 'inadimplente',
    'trialing': 'teste',
    'incomplete': 'pendente',
    'incomplete_expired': 'expirada'
  };

  return statusMap[stripeStatus] || 'pendente';
}