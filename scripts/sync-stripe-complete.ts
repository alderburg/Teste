
import { stripe } from '../server/stripe-helper';
import { executeQuery } from '../server/connection-manager';
import { timestampToBrazilianDate } from '../server/utils/timezone';

async function syncStripePayments() {
  console.log('🚀 Iniciando sincronização completa do Stripe...');
  
  try {
    // Primeiro, verificar estrutura da tabela
    console.log('🔍 Verificando colunas disponíveis na tabela...');
    const structure = await executeQuery(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pagamentos' 
      ORDER BY ordinal_position
    `);

    const availableColumns = structure.rows.map(row => row.column_name);
    console.log('📋 Colunas disponíveis:', availableColumns.join(', '));

    // Verificar se o Stripe está configurado
    if (!stripe) {
      console.log('❌ Chave secreta do Stripe não configurada (STRIPE_SECRET_KEY)');
      return;
    }

    // Buscar todas as invoices do Stripe (últimos 3 meses)
    const invoices = await stripe.invoices.list({
      limit: 100,
      status: 'paid',
      created: {
        gte: Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // 90 dias atrás
      }
    });

    console.log(`📋 Encontradas ${invoices.data.length} faturas pagas no Stripe`);

    let processados = 0;
    let erros = 0;

    for (const invoice of invoices.data) {
      try {
        // Extrair informações da subscription se existir
        let subscription = null;
        let planName = 'Pagamento Avulso';
        let period = 'unico';
        
        if (invoice.subscription) {
          subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const price = subscription.items.data[0]?.price;
          period = price?.recurring?.interval || 'mensal';
          
          // Mapear price_id para nome do plano
          const priceToPlanoMap: { [key: string]: string } = {
            'price_1QrwxsGLlqAwF2i9zp8cllq2': 'Básico',
            'price_1QrwyGGLlqAwF2i9fE8JcjLv': 'Profissional',
            'price_1QrwyaGLlqAwF2i9U2fqTJMU': 'Empresarial'
          };
          
          planName = priceToPlanoMap[price?.id || ''] || 'Plano Personalizado';
        }

        // Buscar customer para obter user_id
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        const userIdFromMetadata = (customer as any).metadata?.user_id;
        
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

        // Construir query de inserção baseada nas colunas disponíveis
        const columnMappings = {
          user_id: parseInt(userIdFromMetadata),
          valor: invoice.amount_paid / 100,
          status: 'confirmado',
          metodo_pagamento: 'Cartão de Crédito',
          stripe_payment_intent_id: invoice.payment_intent as string,
          stripe_invoice_id: invoice.id,
          data_pagamento: timestampToBrazilianDate(invoice.created),
          created_at: timestampToBrazilianDate(invoice.created)zilianDate(invoice.created)
        };

        // Adicionar colunas opcionais se existirem
        if (availableColumns.includes('valor_cartao')) {
          columnMappings['valor_cartao'] = invoice.amount_paid / 100;
        }
        if (availableColumns.includes('valor_credito')) {
          columnMappings['valor_credito'] = 0;
        }
        if (availableColumns.includes('stripe_subscription_id')) {
          columnMappings['stripe_subscription_id'] = invoice.subscription as string || null;
        }
        if (availableColumns.includes('stripe_customer_id')) {
          columnMappings['stripe_customer_id'] = invoice.customer as string;
        }
        if (availableColumns.includes('plano_nome')) {
          columnMappings['plano_nome'] = planName;
        }
        if (availableColumns.includes('periodo')) {
          columnMappings['periodo'] = period;
        }
        if (availableColumns.includes('fatura_url')) {
          columnMappings['fatura_url'] = invoice.hosted_invoice_url;
        }
        if (availableColumns.includes('tem_credito')) {
          columnMappings['tem_credito'] = false;
        }
        if (availableColumns.includes('is_full_credit')) {
          columnMappings['is_full_credit'] = false;
        }
        if (availableColumns.includes('metadata')) {
          columnMappings['metadata'] = JSON.stringify({
            stripe_invoice_number: invoice.number,
            stripe_currency: invoice.currency,
            stripe_status: invoice.status
          });
        }
        if (availableColumns.includes('updated_at')) {
          columnMappings['updated_at'] = new Date();
        }

        // Construir query dinamicamente
        const columns = Object.keys(columnMappings);
        const values = Object.values(columnMappings);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO pagamentos (${columns.join(', ')}) 
          VALUES (${placeholders})
        `;

        await executeQuery(insertQuery, values);

        processados++;
        console.log(`✅ Pagamento ${invoice.id} sincronizado (${processados}/${invoices.data.length})`);

      } catch (error) {
        erros++;
        console.error(`❌ Erro ao processar fatura ${invoice.id}:`, error);
      }
    }

    console.log(`\n🎉 Sincronização concluída!`);
    console.log(`📊 Processados: ${processados}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📋 Total de faturas verificadas: ${invoices.data.length}`);

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  syncStripePayments().then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { syncStripePayments };
