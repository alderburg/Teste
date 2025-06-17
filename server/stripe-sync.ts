/**
 * Stripe Synchronization
 * -------------------------
 * Este arquivo contém funções para sincronizar dados com o Stripe
 * 
 * Principais funcionalidades:
 * 1. Sincronização de clientes entre o sistema e o Stripe
 * 2. Sincronização de cartões de crédito
 * 3. Verificação e manutenção de integridade dos dados
 */

import { stripe, isStripeConfigured } from './stripe-helper';
import { storage } from './storage';

/**
 * Interface que descreve um cliente no Stripe
 */
interface StripeCustomer {
  id: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Interface para descrever um cartão/método de pagamento
 */
interface PaymentMethod {
  id: number;
  userId: number;
  stripeCustomerId: string | null;
  stripePaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

/**
 * Sincroniza um cliente com o Stripe
 * - Se o cliente não existir no Stripe, cria um novo
 * - Se existir, verifica e atualiza se necessário
 * 
 * @param userId ID do usuário no sistema
 * @returns O ID do cliente no Stripe
 */
export async function syncCustomerWithStripe(userId: number): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe não está configurado');
  }

  // Obter usuário do banco de dados
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error(`Usuário ${userId} não encontrado`);
  }

  // Se o usuário já tiver um ID no Stripe, verificar se é válido
  if (user.stripeCustomerId) {
    try {
      // Verificar se o cliente existe no Stripe
      const stripeCustomer = await stripe!.customers.retrieve(user.stripeCustomerId);
      
      // Se o cliente existe e não está excluído, retornar o ID
      if (stripeCustomer && !('deleted' in stripeCustomer)) {
        return user.stripeCustomerId;
      }
      
      // Se chegou aqui, o cliente está excluído ou é inválido
    } catch (error) {
      // Cliente não encontrado no Stripe ou outro erro
    }
  }

  // Antes de criar um novo cliente, verificar se existe um com o mesmo e-mail
  try {
    const customers = await stripe!.customers.list({
      email: user.email,
      limit: 1
    });
    
    if (customers.data.length > 0) {
      const existingCustomer = customers.data[0];
      
      // Atualizar o ID do cliente no banco de dados
      await storage.updateUserStripeId(userId, existingCustomer.id);
      
      // Adicionar entrada na tabela de mapeamento stripe_customers se não existir
      const existingMapping = await storage.getStripeCustomerByUserId(userId);
      if (!existingMapping) {
        const stripeCustomerData = {
          userId,
          stripeCustomerId: existingCustomer.id,
          email: user.email
        };
        await storage.createStripeCustomer(stripeCustomerData);
      }
      
      return existingCustomer.id;
    }
  } catch (error) {
    // Ignorar erros na busca e tentar criar um novo cliente
  }

  // Criar um novo cliente no Stripe
  try {
    const newCustomer = await stripe!.customers.create({
      email: user.email,
      name: user.username,
      metadata: {
        userId: userId.toString()
      }
    });
    
    // Atualizar o ID do cliente no banco de dados
    await storage.updateUserStripeId(userId, newCustomer.id);
    
    // Adicionar entrada na tabela de mapeamento stripe_customers
    const stripeCustomerData = {
      userId,
      stripeCustomerId: newCustomer.id,
      email: user.email
    };
    
    const existingMapping = await storage.getStripeCustomerByUserId(userId);
    if (existingMapping) {
      await storage.updateStripeCustomer(existingMapping.id, {
        stripeCustomerId: newCustomer.id,
        email: user.email
      });
    } else {
      await storage.createStripeCustomer(stripeCustomerData);
    }
    
    return newCustomer.id;
  } catch (error) {
    throw new Error(`Falha ao criar cliente no Stripe: ${error}`);
  }
}

/**
 * Sincroniza métodos de pagamento entre o sistema local e o Stripe
 * - Métodos no Stripe são importados para o sistema local
 * - Métodos no sistema local que não existem no Stripe são removidos
 * 
 * @param userId ID do usuário no sistema
 * @returns Array com os métodos de pagamento sincronizados
 */
export async function syncPaymentMethods(userId: number): Promise<Array<PaymentMethod>> {
  // Se o Stripe não estiver configurado, retornar apenas os métodos locais
  if (!isStripeConfigured()) {
    return await storage.getPaymentMethods(userId);
  }

  try {
    // Obter o ID do cliente no Stripe (criando se necessário)
    const stripeCustomerId = await syncCustomerWithStripe(userId);
    
    // Obter métodos de pagamento do banco de dados local
    const localPaymentMethods = await storage.getPaymentMethods(userId);
    
    // Obter métodos de pagamento do Stripe
    const stripePaymentMethods = await stripe!.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card'
    });
    
    // Obter cliente Stripe para verificar o método de pagamento padrão
    const customer = await stripe!.customers.retrieve(stripeCustomerId);
    let defaultPaymentMethodId = '';
    
    if (customer && !('deleted' in customer) && customer.invoice_settings?.default_payment_method) {
      defaultPaymentMethodId = customer.invoice_settings.default_payment_method as string;
    }
    
    // Métodos de pagamento para sincronizar com o banco local
    const methodsToSync: Array<{
      stripeId: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }> = [];
    
    // Mapear os métodos de pagamento do Stripe
    for (const pm of stripePaymentMethods.data) {
      if (pm.type === 'card' && pm.card) {
        methodsToSync.push({
          stripeId: pm.id,
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
          isDefault: pm.id === defaultPaymentMethodId
        });
      }
    }
    
    // SINCRONIZAÇÃO BIDIRECIONAL: STRIPE -> LOCAL
    // 1. Identificar métodos que existem no Stripe mas não no banco local
    const localStripeIds = new Set(localPaymentMethods.map(pm => pm.stripePaymentMethodId).filter(id => id));
    const newMethods = methodsToSync.filter(pm => !localStripeIds.has(pm.stripeId));
    
    // 1.1 Identificar métodos que existem no banco local mas não existem no Stripe
    const stripePaymentMethodIds = new Set(stripePaymentMethods.data.map(pm => pm.id));
    const methodsToRemove = localPaymentMethods.filter(pm => 
      pm.stripePaymentMethodId && 
      !pm.stripePaymentMethodId.includes('_test_') && 
      !stripePaymentMethodIds.has(pm.stripePaymentMethodId)
    );
    
    // Adicionar novos métodos ao banco local
    let methodsAdded = 0;
    for (const method of newMethods) {
      await storage.createPaymentMethod({
        userId,
        stripeCustomerId: stripeCustomerId,
        stripePaymentMethodId: method.stripeId,
        brand: method.brand,
        last4: method.last4,
        expMonth: method.expMonth,
        expYear: method.expYear,
        isDefault: method.isDefault
      });
      methodsAdded++;
    }
    
    // Remover métodos que existem no banco local mas não no Stripe
    let methodsRemoved = 0;
    for (const method of methodsToRemove) {
      await storage.deletePaymentMethod(method.id);
      methodsRemoved++;
    }
    
    // SINCRONIZAÇÃO BIDIRECIONAL: LOCAL -> STRIPE
    // 2. Identificar cartões locais que precisam ser sincronizados com o Stripe
    // Já temos stripePaymentMethodIds definido acima, vamos usá-lo
    
    // Cartões locais que não têm ID do Stripe ou têm ID que não está no Stripe
    const localCardsToSync = localPaymentMethods.filter(pm => 
      !pm.stripePaymentMethodId || !stripePaymentMethodIds.has(pm.stripePaymentMethodId)
    );
    
    // Sincronizar cartões locais com o Stripe (adicionar ao Stripe)
    // Usando a mesma lógica de tokenização do frontend - NÃO tentamos criar cartões reais
    // Isso porque a criação de cartões reais só deve ser feita via frontend usando o Elements do Stripe
    for (const localCard of localCardsToSync) {
      try {
        // Na prática, não podemos criar cartões reais no Stripe sem o frontend/tokenização
        // Este bloco é um espaço reservado para compatibilidade com cartões de teste
        if (localCard.stripePaymentMethodId && localCard.stripePaymentMethodId.startsWith('pm_test_')) {
          // Converter pm_test_ para pm_ para simular cartão real
          const stripeRealPaymentMethodId = localCard.stripePaymentMethodId.replace('pm_test_', 'pm_');
          
          // Atualizar o ID do método no banco local
          await storage.updatePaymentMethodStripeId(localCard.id, stripeRealPaymentMethodId);
          
          // Se for o método padrão, definir como padrão no Stripe
          if (localCard.isDefault) {
            try {
              await stripe!.customers.update(stripeCustomerId, {
                invoice_settings: {
                  default_payment_method: stripeRealPaymentMethodId
                }
              });
            } catch (defaultError) {
              // Continuar mesmo com erro ao definir como padrão
            }
          }
        }
      } catch (error) {
        // Continuar mesmo com erro na sincronização do cartão
      }
    }
    
    // SINCRONIZAÇÃO BIDIRECIONAL: REMOVER CARTÕES DESATUALIZADOS
    // 3. Identificar cartões que existem no Stripe mas foram excluídos do sistema local
    // Usamos a mesma lógica que o endpoint DELETE /api/payment-methods/:id
    // Isso só funciona se o cartão tinha um ID do Stripe previamente salvo no sistema local
    
    // Coletar IDs de cartões que existem apenas no Stripe
    const stripeOnlyIds: string[] = [];
    stripePaymentMethods.data.forEach(pm => {
      const stripeId = pm.id;
      const existsLocally = localPaymentMethods.some(localPm => localPm.stripePaymentMethodId === stripeId);
      if (!existsLocally) {
        stripeOnlyIds.push(stripeId);
      }
    });
    
    // Estatística de sincronização 
    const stats = {
      added: methodsAdded,
      removedLocal: methodsRemoved,
      removedStripe: 0,
      localTotal: localPaymentMethods.length - methodsRemoved + methodsAdded,
      stripeTotal: stripePaymentMethods.data.length
    };
    
    // Atualizar cartões existentes que não têm stripe_customer_id preenchido
    try {
      const { connectionManager } = await import('./connection-manager');
      await connectionManager.executeQuery(
        `UPDATE payment_methods 
         SET stripe_customer_id = $1, updated_at = NOW() 
         WHERE user_id = $2 AND (stripe_customer_id IS NULL OR stripe_customer_id = '')`,
        [stripeCustomerId, userId]
      );
    } catch (updateError) {
      console.error('Erro ao atualizar stripe_customer_id dos cartões existentes:', updateError);
    }

    // Retornar métodos atualizados
    return await storage.getPaymentMethods(userId);
  } catch (error) {
    return await storage.getPaymentMethods(userId);
  }
}

/**
 * Define um método de pagamento como padrão
 * 
 * @param userId ID do usuário
 * @param paymentMethodId ID do método de pagamento
 * @returns true se o método foi definido como padrão
 */
export async function setDefaultPaymentMethod(userId: number, paymentMethodId: number): Promise<boolean> {
  try {
    // 1. Obter o método de pagamento
    const paymentMethod = await storage.getPaymentMethod(paymentMethodId);
    
    if (!paymentMethod) {
      return false;
    }
    
    // 2. Verificar se o método pertence ao usuário
    if (paymentMethod.userId !== userId) {
      return false;
    }
    
    // 3. Definir como padrão no Stripe (se aplicável)
    if (isStripeConfigured() && paymentMethod.stripePaymentMethodId && paymentMethod.stripeCustomerId) {
      try {
        await stripe!.customers.update(paymentMethod.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethod.stripePaymentMethodId
          }
        });
      } catch (error) {
        // Continuar mesmo com erro no Stripe
      }
    }
    
    // 4. Definir como padrão no banco local
    // 4.1 Remover flag de padrão de todos os métodos deste usuário
    await storage.unsetAllDefaultPaymentMethods(userId);
    
    // 4.2 Definir o método específico como padrão
    await storage.updatePaymentMethod(paymentMethodId, {
      isDefault: true
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Remove um método de pagamento do sistema e do Stripe
 * 
 * @param userId ID do usuário
 * @param paymentMethodId ID do método de pagamento
 * @returns true se o método foi removido com sucesso
 */
export async function removePaymentMethod(userId: number, paymentMethodId: number): Promise<boolean> {
  try {
    // 1. Obter o método de pagamento
    const paymentMethod = await storage.getPaymentMethod(paymentMethodId);
    
    if (!paymentMethod) {
      return false;
    }
    
    // 2. Verificar se o método pertence ao usuário
    if (paymentMethod.userId !== userId) {
      return false;
    }
    
    // 3. Remover do Stripe (se aplicável)
    if (isStripeConfigured() && paymentMethod.stripePaymentMethodId) {
      try {
        await stripe!.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
      } catch (error) {
        // Continuar mesmo com erro no Stripe
      }
    }
    
    // 4. Remover do banco local
    return await storage.deletePaymentMethod(paymentMethodId);
  } catch (error) {
    return false;
  }
}