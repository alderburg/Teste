
/**
 * Script de Sincronização Completa do Stripe - Versão Corrigida
 * Remove referências à coluna 'descricao' que não existe
 */

import Stripe from 'stripe';
import { Client } from 'pg';

// Verificar se as variáveis de ambiente estão configuradas
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!stripeSecretKey) {
  console.log('Chave secreta do Stripe não configurada (STRIPE_SECRET_KEY)');
  process.exit(1);
}

if (!databaseUrl) {
  console.log('URL do banco de dados não configurada (DATABASE_URL)');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia'
});

async function syncStripePayments() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🚀 Iniciando sincronização completa do Stripe...');

    // Buscar todas as faturas pagas do Stripe
    const invoices = await stripe.invoices.list({
      status: 'paid',
      limit: 100,
    });

    console.log(`📊 Encontradas ${invoices.data.length} faturas pagas no Stripe`);

    let processedCount = 0;
    let errorCount = 0;

    for (const invoice of invoices.data) {
      try {
        // Buscar informações da assinatura se existir
        let subscription = null;
        let customerId = invoice.customer as string;
        
        if (invoice.subscription) {
          subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        }

        // Buscar usuário no banco pelo customer_id do Stripe
        const userQuery = await client.query(
          'SELECT id FROM users WHERE stripe_customer_id = $1',
          [customerId]
        );

        if (userQuery.rows.length === 0) {
          console.log(`⚠️ Usuário não encontrado para customer_id: ${customerId}`);
          continue;
        }

        const userId = userQuery.rows[0].id;

        // Verificar se o pagamento já existe
        const existingPayment = await client.query(
          'SELECT id FROM pagamentos WHERE stripe_invoice_id = $1',
          [invoice.id]
        );

        if (existingPayment.rows.length > 0) {
          console.log(`⏭️ Pagamento já existe para invoice: ${invoice.id}`);
          continue;
        }

        // Determinar o plano baseado no valor
        const valor = invoice.amount_paid / 100; // Converter de centavos para reais
        let planoNome = 'Assinatura Premium';
        let periodo = 'mensal';
        let planoId = null;

        // Buscar plano no banco baseado no valor
        const planoQuery = await client.query(
          'SELECT id, nome FROM planos WHERE preco <= $1 ORDER BY preco DESC LIMIT 1',
          [valor]
        );

        if (planoQuery.rows.length > 0) {
          planoId = planoQuery.rows[0].id;
          planoNome = planoQuery.rows[0].nome;
        }

        // Determinar período baseado na assinatura
        if (subscription) {
          const interval = subscription.items.data[0]?.price?.recurring?.interval;
          periodo = interval === 'year' ? 'anual' : 'mensal';
        }

        // Inserir pagamento na base de dados (SEM a coluna descricao)
        const insertQuery = `
          INSERT INTO pagamentos (
            user_id,
            plano_id,
            valor,
            valor_cartao,
            valor_credito,
            status,
            metodo_pagamento,
            stripe_payment_intent_id,
            stripe_invoice_id,
            stripe_subscription_id,
            stripe_customer_id,
            data_pagamento,
            plano_nome,
            periodo,
            fatura_url,
            tem_credito,
            is_full_credit,
            resumo_pagamento,
            metadata,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          )
        `;

        const dataPagamento = new Date(invoice.status_transitions.paid_at! * 1000);
        const now = new Date();

        await client.query(insertQuery, [
          userId,                                    // user_id
          planoId,                                   // plano_id
          valor,                                     // valor
          valor,                                     // valor_cartao (mesmo que valor por padrão)
          0,                                         // valor_credito
          'pago',                                    // status
          'Cartão de Crédito',                      // metodo_pagamento
          invoice.payment_intent,                    // stripe_payment_intent_id
          invoice.id,                               // stripe_invoice_id
          invoice.subscription,                      // stripe_subscription_id
          customerId,                               // stripe_customer_id
          dataPagamento,                            // data_pagamento
          planoNome,                                // plano_nome
          periodo,                                  // periodo
          invoice.hosted_invoice_url,               // fatura_url
          false,                                    // tem_credito
          false,                                    // is_full_credit
          `Pagamento via Stripe - ${planoNome}`,    // resumo_pagamento
          JSON.stringify({                          // metadata
            invoice_number: invoice.number,
            stripe_invoice_id: invoice.id,
            amount_paid: invoice.amount_paid,
            currency: invoice.currency
          }),
          now,                                      // created_at
          now                                       // updated_at
        ]);

        processedCount++;
        console.log(`✅ Pagamento sincronizado: ${invoice.id} - Valor: R$ ${valor}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar fatura ${invoice.id}:`, error);
      }
    }

    console.log(`\n📈 Sincronização concluída:`);
    console.log(`✅ Pagamentos processados: ${processedCount}`);
    console.log(`❌ Erros encontrados: ${errorCount}`);

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  } finally {
    await client.end();
    console.log('✅ Script finalizado');
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  syncStripePayments();
}

export { syncStripePayments };
