
/**
 * Sincronização Completa de Pagamentos da Stripe
 * -----------------------------------------------
 * Este script faz a sincronização completa dos dados de pagamentos da Stripe
 * com a tabela local pagamentos, garantindo que todas as informações sejam
 * corretamente mapeadas e inseridas.
 */

import { stripe } from './stripe-helper';
import { storage } from './storage';

interface StripeInvoiceData {
  id: string;
  customer: string;
  amount_paid: number;
  amount_due: number;
  total: number;
  starting_balance: number;
  ending_balance: number;
  status: string;
  created: number;
  payment_intent: string | null;
  subscription: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  lines: {
    data: Array<{
      description: string | null;
      price?: {
        nickname?: string;
        recurring?: {
          interval: string;
        };
      };
    }>;
  };
}

/**
 * Sincroniza todos os pagamentos da Stripe para um usuário específico
 */
export async function syncStripePaymentsComplete(userId: number): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    console.log(`🔄 Iniciando sincronização completa para usuário ${userId}`);

    if (!stripe) {
      throw new Error('Stripe não está configurado');
    }

    // Buscar dados do usuário
    const user = await storage.getUser(userId);
    if (!user?.stripeCustomerId) {
      throw new Error(`Usuário ${userId} não possui Stripe Customer ID`);
    }

    console.log(`📋 Sincronizando dados do cliente Stripe: ${user.stripeCustomerId}`);

    // Limpar dados existentes para garantir sincronização completa
    const { connectionManager } = await import('./connection-manager');
    await connectionManager.executeQuery(
      'DELETE FROM pagamentos WHERE user_id = $1',
      [userId]
    );

    console.log(`🗑️ Dados antigos removidos para o usuário ${userId}`);

    // Buscar todas as faturas do Stripe
    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 100,
      expand: ['data.payment_intent', 'data.subscription']
    });

    console.log(`📊 Encontradas ${invoices.data.length} faturas da Stripe`);

    // Processar cada fatura
    for (const invoice of invoices.data) {
      try {
        await processStripeInvoice(userId, invoice as StripeInvoiceData);
        syncedCount++;
      } catch (invoiceError) {
        const errorMsg = `Erro ao processar fatura ${invoice.id}: ${invoiceError}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`✅ Sincronização concluída: ${syncedCount} pagamentos sincronizados`);
    
    return {
      success: true,
      syncedCount,
      errors
    };

  } catch (error) {
    const errorMsg = `Erro geral na sincronização: ${error}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
    
    return {
      success: false,
      syncedCount,
      errors
    };
  }
}

/**
 * Processa uma fatura individual da Stripe
 */
async function processStripeInvoice(userId: number, invoice: StripeInvoiceData): Promise<void> {
  const { connectionManager } = await import('./connection-manager');

  // Calcular valores
  const valorTotal = invoice.amount_paid / 100; // Valor total pago
  const valorDue = invoice.amount_due / 100; // Valor devido
  const totalInvoice = invoice.total / 100; // Valor total da fatura

  // Calcular créditos utilizados
  let valorCredito = 0;
  let valorCartao = valorTotal;
  
  if (invoice.starting_balance && invoice.starting_balance < 0) {
    // Saldo negativo significa crédito disponível
    const creditoDisponivel = Math.abs(invoice.starting_balance) / 100;
    valorCredito = Math.min(creditoDisponivel, totalInvoice);
    valorCartao = Math.max(0, valorTotal);
  }

  // Determinar status
  let status = 'Pendente';
  switch (invoice.status) {
    case 'paid':
      status = 'Pago';
      break;
    case 'open':
      status = 'Pendente';
      break;
    case 'void':
    case 'uncollectible':
      status = 'Falhou';
      break;
    case 'draft':
      status = 'Rascunho';
      break;
  }

  // Extrair informações do plano
  let planoNome = 'Plano Padrão';
  let periodo = 'Mensal';
  
  if (invoice.lines.data.length > 0) {
    const lineItem = invoice.lines.data[0];
    
    if (lineItem.price?.nickname) {
      planoNome = lineItem.price.nickname;
    } else if (lineItem.description) {
      planoNome = lineItem.description;
    }
    
    if (lineItem.price?.recurring?.interval === 'year') {
      periodo = 'Anual';
    } else if (lineItem.price?.recurring?.interval === 'month') {
      periodo = 'Mensal';
    }
  }

  // Preparar detalhes de crédito
  const temCredito = valorCredito > 0;
  const isFullCredit = temCredito && valorCartao === 0;
  const detalhesCredito = temCredito ? `Crédito aplicado: R$ ${valorCredito.toFixed(2)}` : null;

  // Data do pagamento
  const dataPagamento = new Date(invoice.created * 1000);

  // Inserir no banco de dados
  const query = `
    INSERT INTO pagamentos (
      user_id, valor, valor_cartao, valor_credito,
      status, metodo_pagamento, stripe_payment_intent_id,
      stripe_invoice_id, stripe_subscription_id, stripe_customer_id,
      data_pagamento, plano_nome, periodo, fatura_url,
      detalhes_credito, tem_credito, is_full_credit,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19
    )
  `;

  const values = [
    userId,                                    // user_id
    valorTotal,                               // valor
    valorCartao,                              // valor_cartao
    valorCredito,                             // valor_credito
    status,                                   // status
    'Cartão de Crédito',                      // metodo_pagamento
    typeof invoice.payment_intent === 'string' ? invoice.payment_intent : null, // stripe_payment_intent_id
    invoice.id,                               // stripe_invoice_id
    invoice.subscription,                     // stripe_subscription_id
    invoice.customer,                         // stripe_customer_id
    dataPagamento,                            // data_pagamento
    planoNome,                                // plano_nome
    periodo,                                  // periodo
    invoice.hosted_invoice_url || invoice.invoice_pdf, // fatura_url
    detalhesCredito,                          // detalhes_credito
    temCredito,                               // tem_credito
    isFullCredit,                             // is_full_credit
    new Date(),                               // created_at
    new Date()                                // updated_at
  ];

  await connectionManager.executeQuery(query, values);
  
  console.log(`✅ Fatura ${invoice.id} processada: ${status} - R$ ${valorTotal.toFixed(2)}`);
}

/**
 * Executa a sincronização para todos os usuários que têm Stripe Customer ID
 */
export async function syncAllUsersStripePayments(): Promise<void> {
  try {
    console.log('🔄 Iniciando sincronização para todos os usuários...');

    // Buscar todos os usuários com Stripe Customer ID
    const { connectionManager } = await import('./connection-manager');
    const result = await connectionManager.executeQuery(`
      SELECT id, username, stripe_customer_id 
      FROM users 
      WHERE stripe_customer_id IS NOT NULL 
      AND stripe_customer_id != ''
    `);

    const users = (result as any).rows;
    console.log(`👥 Encontrados ${users.length} usuários com Stripe Customer ID`);

    for (const user of users) {
      console.log(`\n🔄 Processando usuário: ${user.username} (ID: ${user.id})`);
      
      const syncResult = await syncStripePaymentsComplete(user.id);
      
      if (syncResult.success) {
        console.log(`✅ Usuário ${user.username}: ${syncResult.syncedCount} pagamentos sincronizados`);
      } else {
        console.error(`❌ Usuário ${user.username}: Erro na sincronização`);
        syncResult.errors.forEach(error => console.error(`   - ${error}`));
      }
    }

    console.log('\n🎉 Sincronização completa finalizada!');

  } catch (error) {
    console.error('❌ Erro na sincronização geral:', error);
  }
}
