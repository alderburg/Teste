import Stripe from 'stripe';
import { storage } from './storage';

// Função para criar uma assinatura Stripe
export async function criarAssinaturaStripe(
  stripe: Stripe,
  usuarioId: number,
  planoId: number,
  tipoCobranca: 'mensal' | 'anual',
  paymentMethodId?: string
) {
  try {
    // 1. Buscar detalhes do usuário
    const usuario = await storage.getUser(usuarioId);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // 2. Buscar detalhes do plano
    const plano = await storage.getPlano(planoId);
    if (!plano) {
      throw new Error('Plano não encontrado');
    }

    // 3. Verificar se já existe um cliente Stripe para o usuário
    let stripeCustomerId = usuario.stripeCustomerId;

    // Se não existe, criar um novo cliente
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: usuario.email || `usuario-${usuario.id}@exemplo.com`,
        name: usuario.nome || usuario.username,
        metadata: {
          usuarioId: usuario.id.toString()
        }
      });

      stripeCustomerId = customer.id;

      // Atualizar o ID do cliente no banco de dados
      await storage.updateUserStripeCustomerId(usuario.id, stripeCustomerId);
    }

    // 4. Se fornecido um método de pagamento, anexá-lo ao cliente
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId
      });

      // Definir como método de pagamento padrão
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
    }

    // 5. Calcular valores com base no plano e tipo de cobrança
    const valorBase = tipoCobranca === 'mensal' 
      ? parseFloat(plano.valorMensal.replace(/[^0-9,]/g, '').replace(',', '.'))
      : parseFloat(plano.valorAnual.replace(/[^0-9,]/g, '').replace(',', '.'));

    // Converter para centavos como requer o Stripe
    const valorEmCentavos = Math.round(valorBase * 100);

    // 6. Criar a assinatura no Stripe
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Plano ${plano.nome} (${tipoCobranca})`,
              description: plano.descricao
            },
            unit_amount: valorEmCentavos,
            recurring: {
              interval: tipoCobranca === 'mensal' ? 'month' : 'year',
              interval_count: 1
            }
          }
        }
      ],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      metadata: {
        planoId: planoId.toString(),
        tipoCobranca,
        valorBase: valorBase.toString()
      }
    });

    // 7. Criar a assinatura no banco de dados
    const novaAssinatura = await storage.createAssinatura({
      usuarioId,
      planoId,
      tipoCobranca,
      status: subscription.status,
      valorPago: valorBase,
      stripeSubscriptionId: subscription.id,
      dataInicio: new Date(),
      dataProximoVencimento: tipoCobranca === 'mensal' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
      metadados: JSON.stringify({
        stripeSubscriptionId: subscription.id,
        planoId,
        tipoCobranca
      })
    });

    return {
      success: true,
      assinatura: novaAssinatura,
      stripeSubscription: subscription
    };
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    throw error;
  }
}