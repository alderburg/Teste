import Stripe from 'stripe';
import { storage } from './storage';
import { timestampToBrazilianDate } from './utils/timezone';

// Script para sincronizar dados da Stripe com o banco da Locaweb
export async function syncStripeToDatabase() {
  try {
    console.log('🔄 Iniciando sincronização completa dos dados da Stripe...');

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Chave secreta da Stripe não configurada');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Buscar todos os usuários com customer ID da Stripe
    const { connectionManager } = await import('./connection-manager');
    
    const usersResult = await connectionManager.executeQuery(`
      SELECT id, email, "stripeCustomerId" 
      FROM users 
      WHERE "stripeCustomerId" IS NOT NULL
    `);

    console.log(`📊 Encontrados ${usersResult.rows.length} usuários com Stripe Customer ID`);

    let totalSynced = 0;

    for (const user of usersResult.rows) {
      console.log(`🔍 Sincronizando dados para usuário ${user.email} (ID: ${user.id})`);

      try {
        // Buscar faturas da Stripe para este cliente
        const invoices = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 100,
          expand: ['data.payment_intent', 'data.charge', 'data.subscription']
        });

        console.log(`📋 Encontradas ${invoices.data.length} faturas para ${user.email}`);

        // Limpar dados antigos do usuário
        await connectionManager.executeQuery(`
          DELETE FROM pagamentos WHERE user_id = $1
        `, [user.id]);

        for (const invoice of invoices.data) {
          try {
            // Calcular valores detalhados
            const totalAmount = invoice.total / 100; // Converter de centavos
            const amountPaid = invoice.amount_paid / 100;
            const amountDue = invoice.amount_due / 100;
            
            // Calcular créditos utilizados
            const creditUsed = Math.max(0, totalAmount - amountPaid);
            const cardAmount = amountPaid;

            // Determinar status
            let status = 'Pendente';
            if (invoice.status === 'paid') {
              status = 'Pago';
            } else if (invoice.status === 'void' || invoice.status === 'uncollectible') {
              status = 'Falhou';
            } else if (invoice.status === 'open') {
              status = 'Pendente';
            }

            // Extrair informações do plano
            let planName = 'Plano Padrão';
            let period = 'Mensal';
            let planDescription = 'Assinatura';
            
            if (invoice.lines.data.length > 0) {
              const lineItem = invoice.lines.data[0];
              
              if (lineItem.price?.nickname) {
                planName = lineItem.price.nickname;
              } else if (lineItem.description) {
                planName = lineItem.description;
              }
              
              if (lineItem.price?.recurring?.interval === 'year') {
                period = 'Anual';
              } else if (lineItem.price?.recurring?.interval === 'month') {
                period = 'Mensal';
              }

              planDescription = lineItem.description || planName;
            }

            // Inserir dados atualizados
            const paymentData = {
              user_id: user.id,
              stripe_invoice_id: invoice.id,
              stripe_payment_intent_id: invoice.payment_intent?.id || null,
              stripe_customer_id: user.stripeCustomerId,
              valor: totalAmount,
              valor_credito: creditUsed,
              valor_cartao: cardAmount,
              valor_original: invoice.subtotal / 100,
              status: status,
              plano: planName,
              periodo: period,
              descricao: planDescription,
              metodo_pagamento: invoice.payment_intent?.payment_method_types?.[0] || 'card',
              data_pagamento: timestampToBrazilianDate(invoice.created),
              data_vencimento: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
              stripe_invoice_url: invoice.hosted_invoice_url,
              stripe_invoice_pdf: invoice.invoice_pdf,
              moeda: invoice.currency.toUpperCase(),
              created_at: new Date(),
              updated_at: new Date()
            };

            await connectionManager.executeQuery(`
              INSERT INTO pagamentos (
                user_id, stripe_invoice_id, stripe_payment_intent_id, stripe_customer_id,
                valor, valor_credito, valor_cartao, valor_original, status, plano, periodo, 
                descricao, metodo_pagamento, data_pagamento, data_vencimento,
                stripe_invoice_url, stripe_invoice_pdf, moeda, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
              )
            `, [
              paymentData.user_id,
              paymentData.stripe_invoice_id,
              paymentData.stripe_payment_intent_id,
              paymentData.stripe_customer_id,
              paymentData.valor,
              paymentData.valor_credito,
              paymentData.valor_cartao,
              paymentData.valor_original,
              paymentData.status,
              paymentData.plano,
              paymentData.periodo,
              paymentData.descricao,
              paymentData.metodo_pagamento,
              paymentData.data_pagamento,
              paymentData.data_vencimento,
              paymentData.stripe_invoice_url,
              paymentData.stripe_invoice_pdf,
              paymentData.moeda,
              paymentData.created_at,
              paymentData.updated_at
            ]);

            totalSynced++;
            console.log(`✅ Fatura ${invoice.id} sincronizada - Valor: R$${totalAmount.toFixed(2)} (Cartão: R$${cardAmount.toFixed(2)}, Crédito: R$${creditUsed.toFixed(2)})`);

          } catch (invoiceError) {
            console.error(`❌ Erro ao processar fatura ${invoice.id}:`, invoiceError);
          }
        }

      } catch (userError) {
        console.error(`❌ Erro ao sincronizar usuário ${user.email}:`, userError);
      }
    }

    console.log(`🎉 Sincronização concluída! ${totalSynced} pagamentos sincronizados com sucesso`);
    return { success: true, totalSynced };

  } catch (error) {
    console.error('❌ Erro na sincronização geral:', error);
    throw error;
  }
}

// Executar sincronização se chamado diretamente
if (require.main === module) {
  syncStripeToDatabase()
    .then(result => {
      console.log('✅ Sincronização finalizada:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Falha na sincronização:', error);
      process.exit(1);
    });
}