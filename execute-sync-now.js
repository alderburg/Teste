import { storage } from './server/storage.js';
import Stripe from 'stripe';

async function syncStripeDataDirectly() {
  try {
    console.log('🔄 Executando sincronização direta dos dados da Stripe...');

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Chave secreta da Stripe não configurada');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Buscar usuário admin (ID 3)
    const user = await storage.getUser(3);
    if (!user?.stripeCustomerId) {
      console.log('❌ Cliente Stripe não encontrado para o usuário admin');
      return;
    }

    console.log(`📋 Sincronizando dados para cliente Stripe: ${user.stripeCustomerId}`);

    // Buscar faturas da Stripe
    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 100,
      expand: ['data.payment_intent', 'data.charge', 'data.subscription']
    });

    console.log(`📊 Encontradas ${invoices.data.length} faturas da Stripe`);

    // Limpar dados antigos
    const { connectionManager } = await import('./server/connection-manager.js');
    await connectionManager.executeQuery(`DELETE FROM pagamentos WHERE user_id = $1`, [3]);

    let syncCount = 0;

    // Importar função de timezone
    const { timestampToBrazilianDate } = require('./server/utils/timezone');

    for (const invoice of invoices.data) {
      try {
        // Calcular valores detalhados
        const totalAmount = invoice.total / 100;
        const amountPaid = invoice.amount_paid / 100;
        const creditUsed = Math.max(0, totalAmount - amountPaid);
        const cardAmount = amountPaid;

        // Determinar status
        let status = 'Pendente';
        if (invoice.status === 'paid') {
          status = 'Pago';
        } else if (invoice.status === 'void' || invoice.status === 'uncollectible') {
          status = 'Falhou';
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
          }
          planDescription = lineItem.description || 'Assinatura';
        }

        // Buscar customer para obter user_id
        const customer = await stripe.customers.retrieve(invoice.customer);
        const userIdFromMetadata = customer.metadata?.user_id;
        
        if (!userIdFromMetadata) {
          console.log(`⚠️  Customer ${invoice.customer} sem user_id no metadata`);
          continue;
        }

        // Verificar se já existe na base
        const existingPayment = await executeQuery(`
          SELECT id FROM pagamentos 
          WHERE stripe_invoice_id = $1
        `, [invoice.id]);

        if (existingPayment.rows.length > 0) {
          console.log(`✅ Pagamento ${invoice.id} já existe, pulando...`);
          continue;
        }

        // Inserir pagamento com data corrigida
        await executeQuery(`
          INSERT INTO pagamentos (
            user_id, valor, status, metodo_pagamento,
            stripe_invoice_id, data_pagamento, plano_nome,
            periodo, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          parseInt(userIdFromMetadata),
          totalAmount,
          status,
          'Cartão de Crédito',
          invoice.id,
          timestampToBrazilianDate(invoice.created), // Usando função correta
          planName,
          period,
          timestampToBrazilianDate(invoice.created), // Usando função correta
          timestampToBrazilianDate(invoice.created)  // Usando função correta
        ]);

        processados++;
        console.log(`✅ Pagamento ${invoice.id} sincronizado com data brasileira`) planName;
        }

        // Inserir dados no banco
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
          3, // user_id
          invoice.id,
          invoice.payment_intent?.id || null,
          user.stripeCustomerId,
          totalAmount,
          creditUsed,
          cardAmount,
          invoice.subtotal / 100,
          status,
          planName,
          period,
          planDescription,
          'card',
          new Date(invoice.created * 1000),
          invoice.due_date ? new Date(invoice.due_date * 1000) : null,
          invoice.hosted_invoice_url,
          invoice.invoice_pdf,
          invoice.currency.toUpperCase(),
          new Date(),
          new Date()
        ]);

        syncCount++;
        console.log(`✅ Fatura ${invoice.id} sincronizada - Valor: R$${totalAmount.toFixed(2)} (Cartão: R$${cardAmount.toFixed(2)}, Crédito: R$${creditUsed.toFixed(2)})`);

      } catch (error) {
        console.error(`❌ Erro ao processar fatura ${invoice.id}:`, error);
      }
    }

    console.log(`🎉 Sincronização concluída! ${syncCount} pagamentos sincronizados`);
    console.log('📋 A partir de agora o sistema usará apenas webhooks para atualizações automáticas');

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

syncStripeDataDirectly();