import Stripe from 'stripe';
import { executeQuery } from './db';
import { timestampToBrazilianDate } from './utils/timezone';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
}) : null;

// Mapeamento dos IDs de preços reais do Stripe para informações dos planos
const stripePriceToPlanoMapping: Record<string, { nome: string; periodo: string }> = {
  // IDs de preços mensais do Stripe
  'price_1RBo8nGLlqAwF2i9kZiSWrhk': { nome: 'ESSENCIAL', periodo: 'mensal' },
  'price_1RBo9BGLlqAwF2i9yKt42KW4': { nome: 'PROFISSIONAL', periodo: 'mensal' },
  'price_1RBo9hGLlqAwF2i94PLPd69I': { nome: 'EMPRESARIAL', periodo: 'mensal' },
  'price_1RBoEcGLlqAwF2i9yZC00VNY': { nome: 'PREMIUM', periodo: 'mensal' },
  
  // IDs de preços anuais do Stripe  
  'price_1RRkxeGLlqAwF2i94tV90Ubm': { nome: 'ESSENCIAL', periodo: 'anual' },
  'price_1RRkyDGLlqAwF2i9LQPQoSJE': { nome: 'PROFISSIONAL', periodo: 'anual' },
  'price_1RRkygGLlqAwF2i9CFLF6ue3': { nome: 'EMPRESARIAL', periodo: 'anual' },
  'price_1RRkzAGLlqAwF2i9YGp0bfGI': { nome: 'PREMIUM', periodo: 'anual' },
};

export async function syncStripePayments(userId: number) {
  if (!stripe) {
    console.log('Stripe não configurado, pulando sincronização');
    return null;
  }

  try {
    console.log(`🔄 Sincronizando pagamentos do Stripe para usuário ${userId}...`);
    
    // Buscar customer do Stripe no banco
    const userResult = await executeQuery(`
      SELECT stripe_customer_id 
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (!userResult || !Array.isArray(userResult) || userResult.length === 0 || !userResult[0].stripe_customer_id) {
      console.log('Customer ID do Stripe não encontrado para este usuário');
      return null;
    }

    const stripeCustomerId = userResult[0].stripe_customer_id;
    
    // Buscar invoices do Stripe
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 24,
      status: 'paid'
    });

    console.log(`Encontradas ${invoices.data.length} faturas pagas no Stripe`);

    // Criar tabela de pagamentos se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        plano_id INTEGER,
        valor DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pendente',
        metodo_pagamento VARCHAR(100),
        stripe_payment_intent_id VARCHAR(255),
        stripe_invoice_id VARCHAR(255) UNIQUE,
        data_pagamento TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        plano_nome VARCHAR(100),
        periodo VARCHAR(20),
        fatura_url TEXT
      )
    `);

    // Sincronizar invoices com o banco da Locaweb
    let sincronizados = 0;
    for (const invoice of invoices.data) {
      try {
        // Extrair informações do plano e período da subscription
        const subscription = invoice.subscription ? await stripe.subscriptions.retrieve(invoice.subscription as string) : null;
        const priceId = subscription?.items.data[0]?.price.id;
        
        // Buscar informações do preço diretamente
        const price = subscription?.items.data[0]?.price;
        const interval = price?.recurring?.interval;
        const planoInfo = stripePriceToPlanoMapping[priceId || ''];

        // Determinar nome e período do plano com fallback para dados do Stripe
        const nomePlano = planoInfo?.nome || price?.nickname || price?.product?.name || 'Plano não identificado';
        const periodo = planoInfo?.periodo || (interval === 'year' ? 'anual' : 'mensal');
        
        // Obter payment_intent_id - pode ser string ou objeto
        const paymentIntentId = typeof invoice.payment_intent === 'string' 
          ? invoice.payment_intent 
          : invoice.payment_intent?.id || null;

        // Determinar método de pagamento baseado no payment_intent
        let metodoPagamento = 'card'; // padrão
        if (paymentIntentId && typeof invoice.payment_intent === 'object') {
          const paymentMethod = invoice.payment_intent.payment_method;
          if (typeof paymentMethod === 'object' && paymentMethod?.type) {
            metodoPagamento = paymentMethod.type;
          }
        }
        
        // Buscar assinatura do banco para obter assinatura_id
        const assinaturaResult = await executeQuery(`
          SELECT id FROM assinaturas 
          WHERE stripe_subscription_id = $1 AND user_id = $2
        `, [subscription?.id, userId]);
        
        const assinaturaId = assinaturaResult && Array.isArray(assinaturaResult) && assinaturaResult.length > 0 
          ? assinaturaResult[0].id : null;

        // Calcular valores corretos para cartão e crédito
        const valorPago = invoice.amount_paid / 100; // Valor realmente pago no cartão
        const valorSubtotal = invoice.subtotal / 100; // Valor total do plano
        const isDowngrade = invoice.subtotal < 0;
        
        let valorCredito = 0;
        let valorCartao = 0;
        
        if (isDowngrade) {
          // Downgrade: 100% crédito
          valorCredito = Math.abs(valorSubtotal);
          valorCartao = 0.00;
        } else if (valorPago <= 0) {
          // Pagamento 100% com créditos
          valorCredito = valorSubtotal;
          valorCartao = 0.00;
        } else if (valorSubtotal > valorPago && valorPago > 0) {
          // Pagamento híbrido
          valorCredito = valorSubtotal - valorPago;
          valorCartao = valorPago;
        } else {
          // Pagamento 100% no cartão
          valorCredito = 0.00;
          valorCartao = valorPago;
        }
        
        const valorTotal = valorCredito + valorCartao;

        await executeQuery(`
          INSERT INTO pagamentos (
            user_id, valor, status, metodo_pagamento, 
            stripe_invoice_id, stripe_payment_intent_id, data_pagamento, 
            plano_nome, periodo, fatura_url, stripe_customer_id, 
            stripe_subscription_id, assinatura_id, valor_cartao, valor_credito,
            detalhes_credito, tem_credito, is_full_credit, resumo_pagamento, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (stripe_invoice_id) DO UPDATE SET
            stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
            valor_cartao = EXCLUDED.valor_cartao,
            valor_credito = EXCLUDED.valor_credito,
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            stripe_subscription_id = EXCLUDED.stripe_subscription_id,
            assinatura_id = EXCLUDED.assinatura_id,
            tem_credito = EXCLUDED.tem_credito,
            is_full_credit = EXCLUDED.is_full_credit,
            resumo_pagamento = EXCLUDED.resumo_pagamento,
            metadata = EXCLUDED.metadata
        `, [
          userId,                                                    // $1
          valorTotal,                                                // $2
          invoice.status === 'paid' ? 'Pago' : 
          invoice.status === 'open' ? 'Pendente' : 'Falhado',      // $3
          metodoPagamento,                                           // $4
          invoice.id,                                                // $5
          paymentIntentId,                                           // $6
          invoice.created ? timestampToBrazilianDate(invoice.created) : timestampToBrazilianDate(Math.floor(Date.now() / 1000)), // $7
          nomePlano,                                                 // $8
          periodo,                                                   // $9
          invoice.invoice_pdf,                                       // $10
          stripeCustomerId,                                          // $11
          subscription?.id || null,                                  // $12
          assinaturaId,                                             // $13
          valorCartao,                                              // $14
          valorCredito,                                             // $15
          valorCredito > 0 ? `Crédito aplicado: R$ ${valorCredito.toFixed(2)}` : null, // $16
          valorCredito > 0,                                         // $17
          valorCredito >= valorTotal,                               // $18
          `${nomePlano} - ${periodo} - ${invoice.status === 'paid' ? 'Pago' : 'Pendente'}`, // $19
          JSON.stringify({                                          // $20
            invoice_number: invoice.number,
            currency: invoice.currency,
            amount_due: invoice.amount_due,
            amount_paid: invoice.amount_paid,
            subtotal: invoice.subtotal,
            starting_balance: invoice.starting_balance,
            ending_balance: invoice.ending_balance,
            created: invoice.created,
            period_start: invoice.period_start,
            period_end: invoice.period_end
          })
        ]);
        sincronizados++;
      } catch (insertError) {
        console.log("Pagamento já existe ou erro ao inserir:", insertError);
      }
    }

    console.log(`✅ ${sincronizados} pagamentos sincronizados com sucesso`);
    return true;

  } catch (error) {
    console.error("Erro ao sincronizar com Stripe:", error);
    return null;
  }
}

export async function syncStripeSubscriptions(userId: number) {
  if (!stripe) {
    console.log('Stripe não configurado, pulando sincronização de assinaturas');
    return null;
  }

  try {
    console.log(`🔄 Sincronizando assinaturas do Stripe para usuário ${userId}...`);
    
    // Buscar customer do Stripe no banco
    const userResult = await executeQuery(`
      SELECT stripe_customer_id 
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (!userResult || !Array.isArray(userResult) || userResult.length === 0 || !userResult[0].stripe_customer_id) {
      console.log('Customer ID do Stripe não encontrado para este usuário');
      return null;
    }

    const stripeCustomerId = userResult[0].stripe_customer_id;
    
    // Buscar assinaturas do Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 24,
    });

    console.log(`Encontradas ${subscriptions.data.length} assinaturas no Stripe`);

    // Criar tabela de assinaturas se não existir
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS assinaturas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL,
        plano_nome VARCHAR(100),
        valor DECIMAL(10,2),
        periodo VARCHAR(20),
        data_inicio TIMESTAMP,
        data_fim TIMESTAMP,
        data_proximo_pagamento TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sincronizar assinaturas com o banco da Locaweb
    let sincronizados = 0;
    for (const subscription of subscriptions.data) {
      try {
        const priceId = subscription.items.data[0]?.price?.id;
        const amount = subscription.items.data[0]?.price?.unit_amount || 0;
        
        await executeQuery(`
          INSERT INTO assinaturas (
            user_id, stripe_subscription_id, status, plano_nome, valor, periodo,
            data_inicio, data_fim, data_proximo_pagamento
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (stripe_subscription_id) DO UPDATE SET
            status = EXCLUDED.status,
            data_proximo_pagamento = EXCLUDED.data_proximo_pagamento,
            updated_at = CURRENT_TIMESTAMP
        `, [
          userId,
          subscription.id,
          subscription.status,
          'Assinatura Premium',
          (amount / 100).toFixed(2),
          subscription.items.data[0]?.price?.recurring?.interval || 'month',
          new Date(subscription.created * 1000),
          subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
          subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
        ]);
        sincronizados++;
      } catch (insertError) {
        console.log("Assinatura já existe ou erro ao inserir:", insertError);
      }
    }

    console.log(`✅ ${sincronizados} assinaturas sincronizadas com sucesso`);
    return true;

  } catch (error) {
    console.error("Erro ao sincronizar assinaturas com Stripe:", error);
    return null;
  }
}