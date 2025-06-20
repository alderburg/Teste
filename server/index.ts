import { config } from 'dotenv';
config();

// Filtro de logs para suprimir mensagens técnicas desnecessárias
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  const message = args.join(' ');
  // Filtrar mensagens específicas que não devem aparecer nos logs
  if (
    message.includes('Subscription criada no Stripe:') ||
    message.includes('Criando subscription no Stripe') ||
    message.includes('sub_') && message.includes('criada')
  ) {
    return; // Não exibir essas mensagens
  }
  originalConsoleLog(...args);
};

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { WebSocketServer } from "ws";

// import { setupSetupIntentRoute } from "./setup-intent-route"; // Removido - rotas centralizadas
import { setupPaymentIntentRoute } from "./create-payment-intent";
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Configurar webhook do Stripe ANTES dos middlewares de parsing
app.post("/api/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const { stripe } = await import("./stripe-helper");

  if (!stripe) {
    console.error('Webhook do Stripe chamado, mas o Stripe não está configurado');
    return res.status(500).json({ error: "Stripe não configurado" });
  }

  let event;

  try {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    console.log(`🔔 Webhook do Stripe recebido - Endpoint secreto configurado: ${endpointSecret ? 'Sim' : 'Não'}`);

    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log(`✅ Assinatura do webhook verificada com sucesso para o evento: ${event.type}`);
    } else {
      event = JSON.parse(req.body.toString());
      console.log(`⚠️ Webhook processado sem verificação de assinatura para o evento: ${event.type}`);
    }

    console.log(`🎯 Processando evento do Stripe: ${event.type}, ID: ${event.id}`);

    // Processar eventos com atualização do banco de dados
    await processStripeEvent(event);

    switch (event.type) {
      case 'invoice.payment_succeeded':
        console.log('💰 Pagamento bem-sucedido processado e salvo no banco');
        break;
      case 'invoice.payment_failed':
        console.log('❌ Pagamento falhou e registrado no banco');
        break;
      case 'customer.subscription.created':
        console.log('✨ Nova assinatura criada e salva no banco');
        break;
      case 'customer.subscription.updated':
        console.log('🔄 Assinatura atualizada no banco');
        break;
      case 'customer.subscription.deleted':
        console.log('🗑️ Assinatura cancelada e atualizada no banco');
        break;
      default:
        console.log(`📋 Evento não processado: ${event.type}`);
    }

async function processStripeEvent(event: any) {
  try {
    const { connectionManager } = await import('./connection-manager');

    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;
    }

async function handleInvoicePaymentSucceeded(invoice: any) {
    try {
      console.log(`💳 Processando pagamento bem-sucedido: ${invoice.id}`);

      // Buscar customer do Stripe para encontrar o usuário
      const customerId = invoice.customer;
      const userResult = await connectionManager.executeQuery(
        'SELECT id, username FROM users WHERE stripe_customer_id = $1',
        [customerId]
      );

      if (!userResult || !(userResult as any).rows?.length) {
        console.log('⚠️ Usuário não encontrado para customer:', customerId);
        return;
      }

      const user = (userResult as any).rows[0];

      // Verificar se o pagamento já foi salvo para evitar duplicatas
      const pagamentoExistente = await connectionManager.executeQuery(
        'SELECT id FROM pagamentos WHERE stripe_invoice_id = $1',
        [invoice.id]
      );

      if ((pagamentoExistente as any).rows?.length > 0) {
        console.log(`⚠️ Pagamento já existe para invoice ${invoice.id} - evitando duplicata`);
        return;
      }

      // SEMPRE buscar o valor EXATO do plano via Stripe Price API
      let valorTotalPlano = 0;
      let planoNome = 'Assinatura';
      let periodo = 'mensal';

      if (invoice.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const priceId = subscription.items?.data?.[0]?.price?.id;

          if (priceId) {
            // BUSCAR DIRETAMENTE O PRICE DO STRIPE - VALOR REAL DO PLANO
            const price = await stripe.prices.retrieve(priceId);
            valorTotalPlano = (price.unit_amount || 0) / 100;
            console.log(`💰 [WEBHOOK VALOR PLANO] Price ID: ${priceId}`);
            console.log(`💰 [WEBHOOK VALOR PLANO] Valor real do Stripe: R$ ${valorTotalPlano.toFixed(2)}`);

            // Mapear price ID para nome do plano
            const planMapping: Record<string, {nome: string, periodo: string}> = {
              'price_1RRkxeGLlqAwF2i94tV90Ubm': {nome: 'ESSENCIAL', periodo: 'anual'},
              'price_1RRkxfGLlqAwF2i9tOWqUoXx': {nome: 'ESSENCIAL', periodo: 'mensal'},
              'price_1RRl0XGLlqAwF2i9AyHCAv6A': {nome: 'PROFISSIONAL', periodo: 'anual'},
              'price_1RRl0YGLlqAwF2i9EH3EYjxu': {nome: 'PROFISSIONAL', periodo: 'mensal'},
              'price_1RRl0NGLlqAwF2i96lIvXpLv': {nome: 'PROFISSIONAL', periodo: 'anual'},
              'price_1RRl1qGLlqAwF2i9Ni4HO0sw': {nome: 'EMPRESARIAL', periodo: 'anual'},
              'price_1RRl1rGLlqAwF2i9z8TQjGJh': {nome: 'EMPRESARIAL', periodo: 'mensal'},
              'price_1RRl2BGLlqAwF2i9qNKf3vLw': {nome: 'PREMIUM', periodo: 'anual'},
              'price_1RRl2CGLlqAwF2i9ihMh5Bdy': {nome: 'PREMIUM', periodo: 'mensal'}
            };

            if (planMapping[priceId]) {
              planoNome = planMapping[priceId].nome;
              periodo = planMapping[priceId].periodo;
            }
          } else {
            throw new Error('Price ID não encontrado na subscription');
          }
        } catch (error) {
          console.error('❌ Erro ao buscar valor do plano via Stripe:', error);
          console.log(`🔍 [ERRO CRÍTICO] Não foi possível obter valor real do plano`);
          return; // Não salvar pagamento sem valor correto
        }
      } else {
        console.error('❌ Invoice sem subscription - não é possível obter valor do plano');
        return; // Não salvar pagamento sem subscription
      }

      const valorPagoCartao = Math.max(0, invoice.amount_paid / 100);

      // Calcular valores baseados na proração real da Stripe
      let valorCredito = 0;
      let valorCartao = 0;
      let metodoPagamento = 'Cartão de Crédito';

      // Calcular o valor real da proração
      const valorProracaoReal = invoice.subtotal / 100;

      console.log(`🔍 [WEBHOOK CORREÇÃO] Valor da proração: R$ ${valorProracaoReal.toFixed(2)}`);
      console.log(`🔍 [WEBHOOK CORREÇÃO] Amount paid: R$ ${(invoice.amount_paid / 100).toFixed(2)}`);
      console.log(`🔍 [WEBHOOK CORREÇÃO] Valor total do plano (Stripe Price): R$ ${valorTotalPlano.toFixed(2)}`);

      if (invoice.amount_paid <= 0) {
        // Distinguir entre downgrade (gera crédito) e upgrade/renovação (usa crédito)
        if (valorProracaoReal < 0) {
          // DOWNGRADE: subtotal negativo = gerou créditos
          valorCredito = valorTotalPlano; // Valor do plano de destino
          valorCartao = 0.00;
          metodoPagamento = 'Crédito MPC';
          console.log(`🔍 [WEBHOOK LOG] DOWNGRADE - Crédito: R$ ${valorCredito.toFixed(2)}, Cartão R$ 0.00`);
        } else {
          // UPGRADE/RENOVAÇÃO: pagamento 100% com créditos
          valorCredito = Math.abs(valorProracaoReal);
          valorCartao = 0.00;
          metodoPagamento = 'Crédito MPC';
          console.log(`🔍 [WEBHOOK LOG] 100% CRÉDITO: Crédito R$ ${valorCredito.toFixed(2)}, Cartão R$ 0.00`);
        }
      } else if (invoice.subtotal > invoice.amount_paid && invoice.amount_paid > 0) {
        // Pagamento híbrido: parte crédito + parte cartão
        valorCredito = (invoice.subtotal - invoice.amount_paid) / 100;
        valorCartao = invoice.amount_paid / 100;
        metodoPagamento = 'Híbrido';
        console.log(`🔍 [WEBHOOK LOG] HÍBRIDO: Crédito R$ ${valorCredito.toFixed(2)}, Cartão R$ ${valorCartao.toFixed(2)}`);
      } else if (invoice.amount_paid > 0) {
        // Pagamento 100% no cartão
        valorCredito = 0.00;
        valorCartao = invoice.amount_paid / 100;
        metodoPagamento = 'Cartão de Crédito';
        console.log(`🔍 [WEBHOOK LOG] 100% CARTÃO: Cartão R$ ${valorCartao.toFixed(2)}, Crédito R$ 0.00`);
      }

      // Calcular credito_gerado baseado no subtotal
      const creditoGerado = valorProracaoReal < 0 ? Math.abs(valorProracaoReal) : 0;

      // CORREÇÃO: valor_diferenca deve ser APENAS o valor do "Unused time" do plano anterior
      let valorDiferenca = null;

      // Buscar o valor específico do "Unused time" na invoice
      try {
        const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
          expand: ['lines.data']
        });

        if (fullInvoice.lines && fullInvoice.lines.data) {
          const unusedTimeItems = fullInvoice.lines.data.filter((item: any) => 
            item.proration === true && 
            item.amount < 0 && 
            (item.description?.includes('Unused time') || item.description?.includes('tempo não utilizado'))
          );

          if (unusedTimeItems.length > 0) {
            valorDiferenca = Math.abs(unusedTimeItems.reduce((total: number, item: any) => total + item.amount, 0) / 100);
            console.log(`🔍 [WEBHOOK UNUSED TIME] Valor do tempo não utilizado: R$ ${valorDiferenca.toFixed(2)}`);
          }
        }
      } catch (invoiceError) {
        console.error('❌ Erro ao buscar detalhes da invoice:', invoiceError);
      }

      // Só preencher stripe_payment_intent_id se houve pagamento real no cartão
      let stripePaymentIntentId = null;
      if (valorCartao > 0 && invoice.payment_intent) {
        if (typeof invoice.payment_intent === 'string') {
          stripePaymentIntentId = invoice.payment_intent;
        } else if (typeof invoice.payment_intent === 'object' && invoice.payment_intent.id) {
          stripePaymentIntentId = invoice.payment_intent.id;
        }
      }

      console.log(`🔍 [SALVANDO PAGAMENTO] Valores finais:`);
      console.log(`   - valor: R$ ${valorTotalPlano.toFixed(2)} (valor real do Stripe)`);
      console.log(`   - valor_cartao: R$ ${valorCartao.toFixed(2)}`);
      console.log(`   - valor_credito: R$ ${valorCredito.toFixed(2)}`);
      console.log(`   - valor_diferenca: R$ ${valorDiferenca?.toFixed(2) || '0.00'}`);
      console.log(`   - método: ${metodoPagamento}`);

      try {
        await connectionManager.executeQuery(`
          INSERT INTO pagamentos (
            user_id, valor, status, metodo_pagamento, 
            stripe_payment_intent_id, stripe_invoice_id,
            data_pagamento, plano_nome, periodo, fatura_url,
            valor_cartao, valor_credito, valor_diferenca, credito_gerado
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          user.id,
          valorTotalPlano,
          'Pago',
          metodoPagamento,
          stripePaymentIntentId,
          invoice.id,
          new Date(invoice.created * 1000),
          planoNome,
          periodo,
          invoice.hosted_invoice_url,
          valorCartao,
          valorCredito,
          valorDiferenca,
          creditoGerado
        ]);

        console.log(`✅ Pagamento salvo com valor real do Stripe: R$ ${valorTotalPlano.toFixed(2)}`);
      } catch (dbError) {
        console.error('❌ Erro ao salvar pagamento:', dbError);
        throw dbError;
      }

      console.log(`💰 Pagamento registrado: ${metodoPagamento} - R$ ${valorTotalPlano.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Erro ao processar pagamento bem-sucedido:', error);
    }
  }


    async function handlePaymentFailed(invoice: any) {
      console.log('❌ Processando falha de pagamento:', invoice.id);

      const customerId = invoice.customer;
      const userResult = await connectionManager.executeQuery(
        'SELECT id FROM users WHERE stripe_customer_id = $1',
        [customerId]
      );

      if (!userResult || !(userResult as any).rows?.length) return;

      const user = (userResult as any).rows[0];

      // CORREÇÃO: Para downgrades, usar valor do plano ao invés de amount_due que pode ser crédito
      let valorCorrigido = invoice.amount_due / 100;

      // Detectar se é downgrade (amount_due negativo ou muito baixo)
      if (invoice.amount_due < 0 || invoice.subscription) {
        try {
          // Buscar valor correto do plano da assinatura
          const stripe = (await import('./routes')).stripe;
          if (stripe && invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const priceId = subscription.items?.data?.[0]?.price?.id;

            if (priceId) {
              const price = await stripe.prices.retrieve(priceId);
              valorCorrigido = (price.unit_amount || 0) / 100;
              console.log(`🔍 [PAYMENT FAILED LOG] CORREÇÃO: Usando valor do plano R$ ${valorCorrigido.toFixed(2)} ao invés de amount_due R$ ${(invoice.amount_due / 100).toFixed(2)}`);
            }
          }
        } catch (error) {
          console.error('Erro ao buscar valor correto do plano para pagamento falhado:', error);
        }
      }

      await connectionManager.executeQuery(`
        INSERT INTO pagamentos (
          user_id, valor, status, metodo_pagamento,
          stripe_invoice_id, data_pagamento, fatura_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (stripe_invoice_id) DO UPDATE SET status = $3
      `, [
        user.id,
        valorCorrigido,
        'falhado',
        'Cartão de Crédito',
        invoice.id,
        new Date(invoice.created * 1000),
        invoice.hosted_invoice_url
      ]);
    }

    async function handleSubscriptionChange(subscription: any) {
  console.log('🔄 Processando mudança de assinatura:', subscription.id);

  const customerId = subscription.customer;
  const userResult = await connectionManager.executeQuery(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (!userResult || !(userResult as any).rows?.length) return;

  const user = (userResult as any).rows[0];

  // Mapear price ID para plano local
  const priceId = subscription.items?.data?.[0]?.price?.id;

  const stripePriceMap: { [key: string]: { planoId: number, nome: string } } = {
    'price_1RRkxfGLlqAwF2i9tOWqUoXx': { planoId: 1, nome: 'ESSENCIAL' }, // Essencial mensal
    'price_1RRkxeGLlqAwF2i94tV90Ubm': { planoId: 1, nome: 'ESSENCIAL' }, // Essencial anual
    'price_1RRl0YGLlqAwF2i9EH3EYjxu': { planoId: 2, nome: 'PROFISSIONAL' }, // Profissional mensal
    'price_1RRl0XGLlqAwF2i9AyHCAv6A': {planoId: 2, nome: 'PROFISSIONAL' }, // Profissional anual
    'price_1RRl0NGLlqAwF2i96lIvXpLv': { planoId: 2, nome: 'PROFISSIONAL' }, // Profissional anual (price ID correto)
    'price_1RRl1rGLlqAwF2i9z8TQjGJh': { planoId: 3, nome: 'EMPRESARIAL' }, // Empresarial mensal
    'price_1RRl1qGLlqAwF2i9Ni4HO0sw': { planoId: 3, nome: 'EMPRESARIAL' }, // Empresarial anual
    'price_1RRl2CGLlqAwF2i9ihMh5Bdy': { planoId: 4, nome: 'PREMIUM' }, // Premium mensal
    'price_1RRl2BGLlqAwF2i9qNKf3vLw': { planoId: 4, nome: 'PREMIUM' }, // Premium anual
  };

  const planoInfo = stripePriceMap[priceId];

  if (!planoInfo) {
    console.error(`Price ID ${priceId} não encontrado no mapeamento de planos`);
    return;
  }

  // Determinar tipo de cobrança
  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
  const tipoCobranca = interval === 'month' ? 'mensal' : 'anual';

  // Calcular valor pago
  const amount = subscription.items?.data?.[0]?.price?.unit_amount || 0;
  const valorPago = (amount / 100).toString();

  // 1. CANCELAR TODAS as assinaturas ativas anteriores deste usuário
  console.log(`📝 Cancelando assinaturas ativas anteriores do usuário ${user.id}`);

  const cancelResult = await connectionManager.executeQuery(`
    UPDATE assinaturas
    SET status = 'cancelada', data_fim = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND status = 'ativa' AND stripe_subscription_id != $2
  `, [user.id, subscription.id]);

  console.log(`📝 ${(cancelResult as any).rowCount || 0} assinatura(s) anterior(es) cancelada(s)`);

  // 2. Verificar se já existe uma assinatura com este stripe_subscription_id
  const existingResult = await connectionManager.executeQuery(`
    SELECT id, status FROM assinaturas 
    WHERE stripe_subscription_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [subscription.id]);

  const dataInicio = new Date(subscription.created * 1000);
  const statusFinal = subscription.status === 'active' ? 'ativa' : subscription.status;

  if ((existingResult as any).rows?.length > 0) {
    // Atualizar assinatura existente
    const existingSubscription = (existingResult as any).rows[0];

    await connectionManager.executeQuery(`
      UPDATE assinaturas
      SET plano_id = $1,
          plano = $2,
          status = $3,
          tipo_cobranca = $4,
          valor_pago = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [
      planoInfo.planoId,
      planoInfo.nome,
      statusFinal,
      tipoCobranca,
      valorPago,
      existingSubscription.id
    ]);

    console.log(`🔄 Assinatura existente atualizada: ${planoInfo.nome} (${tipoCobranca}) - R$ ${valorPago}`);
  } else {
    // Inserir nova assinatura
    await connectionManager.executeQuery(`
      INSERT INTO assinaturas (
        user_id,
        plano_id,
        plano,
        stripe_subscription_id,
        data_inicio,
        status,
        tipo_cobranca,
        valor_pago,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      user.id,
      planoInfo.planoId,
      planoInfo.nome,
      subscription.id,
      dataInicio,
      statusFinal,
      tipoCobranca,
      valorPago
    ]);

    console.log(`✅ Nova assinatura criada: ${planoInfo.nome} (${tipoCobranca}) - R$ ${valorPago}`);
  }
}


    async function handleSubscriptionCanceled(subscription: any) {
      console.log('🗑️ Processando cancelamento de assinatura:', subscription.id);

      const customerId = subscription.customer;
      const userResult = await connectionManager.executeQuery(
        'SELECT id FROM users WHERE stripe_customer_id = $1',
        [customerId]
      );

      if (!userResult || !(userResult as any).rows?.length) return;

      const user = (userResult as any).rows[0];

      await connectionManager.executeQuery(`
        UPDATE assinaturas 
        SET status = 'cancelada', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND stripe_subscription_id = $2
      `, [user.id, subscription.id]);
    }
  } catch (error) {
    console.error('❌ Erro ao processar evento do Stripe:', error);
  }
}

    console.log(`✅ Evento ${event.type} processado com sucesso`);
    res.status(200).json({ received: true, eventType: event.type });
  } catch (err: any) {
    console.error('❌ Erro ao processar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

if (process.env.EXTERNAL_API_URL) {
  const apiUrl = process.env.EXTERNAL_API_URL;

  app.use('/ext-api', createProxyMiddleware({
    target: apiUrl,
    changeOrigin: true,
    pathRewrite: {
      '^/ext-api': ''
    },
    onProxyReq: (proxyReq, req, res) => {
      if (process.env.API_KEY) {
        proxyReq.setHeader('Authorization', `Bearer ${process.env.API_KEY}`);
      }
    },
    onError: (err, req, res) => {
      console.error(`Erro de proxy: ${err.message}`);
      res.status(500).json({ message: 'Error connecting to external API' });
    }
  }));
}

(async () => {
  // Registrar rotas de assinatura


  // Configurar rota de setup-intent para pagamentos
  // setupSetupIntentRoute(app); // Removido - rotas centralizadas em routes.ts

  // Configurar rota de payment-intent para pagamentos seguros com Elements
  setupPaymentIntentRoute(app);

  console.log('✅ Rotas de assinatura e pagamento registradas com sucesso');

  const server = await registerRoutes(app);

  // Usar sistema WebSocket existente - apenas configurar funções globais
  if (!global.wsClients) {
    global.wsClients = new Set();
  }

  // Função global para notificar encerramento de sessão via WebSocket existente
  (global as any).notifySessionTerminated = (userId: number, sessionToken: string) => {
    console.log(`🔔 Notificando encerramento da sessão ${sessionToken.substring(0, 8)}... para usuário ${userId}`);

    // Usar o sistema WebSocket existente para enviar notificação
    if (global.wsClients && global.wsClients.size > 0) {
      const message = {
        type: 'session_terminated',
        message: 'Sua sessão foi encerrada por outro usuário',
        sessionToken: sessionToken,
        userId: userId,
        timestamp: new Date().toISOString(),
        targetSessionOnly: true,
        forceModal: true
      };

      let notificationsSent = 0;
      let totalClientsChecked = 0;

      console.log(`🔍 Procurando cliente com sessionToken: ${sessionToken.substring(0, 8)}... entre ${global.wsClients.size} clientes conectados`);

      // Procurar especificamente o cliente com a sessão encerrada
      global.wsClients.forEach((ws: any) => {
        totalClientsChecked++;

        if (ws.readyState === 1) { // WebSocket.OPEN = 1
          const client = global.clientsInfo?.get(ws);
          const wsSessionToken = ws.sessionToken;

          console.log(`🔍 Cliente ${totalClientsChecked}: sessionToken=${wsSessionToken?.substring(0, 8)}..., buscando=${sessionToken.substring(0, 8)}...`);

          // Verificar tanto no client quanto no ws diretamente
          const clientSessionToken = client?.sessionToken;
          const matchesClient = clientSessionToken === sessionToken;
          const matchesWs = wsSessionToken === sessionToken;

          if (matchesClient || matchesWs) {
            try {
              ws.send(JSON.stringify(message));
              notificationsSent++;
              console.log(`📤 ✅ NOTIFICAÇÃO ENVIADA para cliente específico: ${client?.id || 'unknown'} (usuário ${client?.userId || userId})`);
              console.log(`🎯 Sessão encontrada via ${matchesClient ? 'client' : 'ws'}.sessionToken`);
            } catch (error) {
              console.error('❌ Erro ao enviar notificação de sessão:', error);
            }
          } else {
            console.log(`⏭️ Cliente ${totalClientsChecked}: sessionToken não corresponde`);
          }
        } else {
          console.log(`⏭️ Cliente ${totalClientsChecked}: WebSocket não está aberto (readyState: ${ws.readyState})`);
        }
      });

      if (notificationsSent === 0) {
        console.log(`❌ NENHUM cliente WebSocket encontrado para a sessão ${sessionToken.substring(0, 8)}...`);
        console.log(`📊 Total de clientes verificados: ${totalClientsChecked}`);
        console.log(`📊 Clientes com readyState=1: ${Array.from(global.wsClients).filter((ws: any) => ws.readyState === 1).length}`);
      } else {
        console.log(`✅ ${notificationsSent} notificação(ões) enviada(s) para a sessão encerrada`);
      }
    } else {
      console.log('⚠️ Nenhum cliente WebSocket conectado');
    }
  };

  // Sistema de notificação simples via polling otimizado
  let lastSessionUpdate = new Map<number, number>();

  (global as any).notifySessionUpdate = (userId: number) => {
    lastSessionUpdate.set(userId, Date.now());
    console.log(`📡 Sessão atualizada para usuário ${userId}`);
  };

  // Sistema otimizado de limpeza de sessões
  const { optimizedSessionCleanup } = await import('./session-cleanup-optimized');

  // Limpeza inteligente - só executa quando necessário
  setInterval(async () => {
    try {
      // Verificação rápida se há sessões para limpar
      const needsCleanup = await optimizedSessionCleanup.needsCleanup();

      if (needsCleanup) {
        console.log('🧹 Executando limpeza otimizada...');
        await optimizedSessionCleanup.optimizedCleanup();
      } else {
        console.log('✅ Nenhuma limpeza necessária');
      }
    } catch (error) {
      console.error('Erro na limpeza otimizada:', error);
    }
  }, 2 * 60 * 60 * 1000); // A cada 2 horas - mais frequente mas muito mais leve

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (!res.headersSent) {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${err.message}`);
      res.status(status).json({ message });
    }
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 5001;

  if (process.env.WINDOWS_COMPAT === 'true') {
    const serverPort = parseInt(port as string, 10);
    server.listen(serverPort, '127.0.0.1', () => {
      log(`Server running on port ${serverPort} (127.0.0.1 - Windows compatibility mode)`);
    });
  } else {
    server.listen(port, '0.0.0.0', () => {
      log(`Server running on port ${port} (0.0.0.0 - accessible from outside)`);

      if (process.env.REPL_ID || process.env.REPLIT_ENVIRONMENT) {
        const proxyPort = 3000;
        const proxyApp = express();

        proxyApp.use('/', createProxyMiddleware({
          target: `http://localhost:${port}`,
          changeOrigin: true,
          ws: true,
          onError: (err, req, res) => {
            log(`Proxy error: ${err.message}`);
            res.status(500).send('Proxy Error');
          }
        }));

        const proxyServer = createServer(proxyApp); // Criar servidor HTTP para o proxy

        // WebSocket Server Setup - usar servidor HTTP existente
        const wss = new WebSocketServer({ 
          noServer: true
        });

        // Configurar upgrade de WebSocket no servidor proxy
        proxyServer.on('upgrade', (request, socket, head) => {
          const { pathname } = new URL(request.url, 'http://localhost');

          if (pathname === '/ws') {
            wss.handleUpgrade(request, socket, head, (websocket) => {
              wss.emit('connection', websocket, request);
            });
          } else {
            socket.destroy();
          }
        });

        // Map para armazenar informações detalhadas dos clientes
        global.clientsInfo = new Map();

        wss.on('connection', async (ws, req) => {
          const clientId = Date.now() + Math.random();
          const connectionTime = new Date();
          const userAgent = req.headers['user-agent'] || 'Desconhecido';
          const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'IP desconhecido';          const cookies = req.headers.cookie ? req.headers.cookie.split(';').map(c => c.trim()) : [];

          // Importar executeQuery dinamicamente para evitar dependência circular
          const { connectionManager } = await import('./connection-manager');
          const executeQuery = connectionManager.executeQuery;

          // Autenticação WebSocket melhorada - Extrair session ID de forma mais robusta
          let sessionId: string | undefined;
          let sessionToken: string | undefined;

          // 1. Tentar extrair do cookie connect.sid
          const connectSidCookie = cookies?.find(c => c.trim().startsWith('connect.sid='));
          if (connectSidCookie) {
            const cookieValue = connectSidCookie.split('=')[1];
            if (cookieValue) {
              // Decodificar o cookie do connect.sid
              const decodedValue = decodeURIComponent(cookieValue);
              // Extrair o session ID (formato: s:sessionId.signature)
              const match = decodedValue.match(/^s:([^.]+)\./);
              if (match) {
                sessionId = match[1];
              }
            }
          }

          // 2. Tentar extrair sessionToken direto dos cookies
          const sessionTokenCookie = cookies?.find(c => c.trim().startsWith('sessionToken='));
          if (sessionTokenCookie) {
            sessionToken = sessionTokenCookie.split('=')[1];
          }

          let userId: number | undefined;
          let validSession = false;
          let hasUser = false;

          // Verificar autenticação usando session ID primeiro
          if (sessionId) {
            try {
              const sessionQuery = `
                SELECT sess->'user' as user_data, sess->'authenticated' as authenticated
                FROM user_sessions_store 
                WHERE sid = $1
              `;
              const sessionResult = await executeQuery(sessionQuery, [sessionId]);

              if (sessionResult.rows.length > 0) {
                const sessionData = sessionResult.rows[0];
                const userData = sessionData.user_data;
                const isAuthenticated = sessionData.authenticated;

                if (userData && isAuthenticated) {
                  userId = typeof userData === 'object' ? userData.id : userData;
                  validSession = true;
                  hasUser = true;
                }
              }
            } catch (error) {
              console.log('🔍 Erro ao verificar sessão por session ID:', error);
            }
          }

          // Se não encontrou por session ID, tentar por session token
          if (!validSession && sessionToken) {
            try {
              const tokenQuery = `
                SELECT s.user_id, u.id as user_id, u.username, u.email 
                FROM user_sessions s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.token = $1 AND s.active = true
              `;
              const tokenResult = await executeQuery(tokenQuery, [sessionToken]);

              if (tokenResult.rows.length > 0) {
                userId = tokenResult.rows[0].user_id;
                validSession = true;
                hasUser = true;
              }
            } catch (error) {
              console.log('🔍 Erro ao verificar sessão por token:', error);
            }
          }

          console.log('🔍 Debug autenticação WebSocket:', {
            authenticated: validSession,
            validSession,
            finalAuthStatus: validSession && userId,
            hasUser,
            userId,
            sessionId: sessionId?.substring(0, 8) + '...' || 'não encontrado',
            sessionToken: sessionToken?.substring(0, 8) + '...' || 'não encontrado',
            cookies: cookies ? 'presentes' : 'ausentes',
            cookieCount: cookies?.length || 0
          });

          // Informações iniciais do cliente
          const clientInfo = {
            id: clientId,
            connectionTime,
            lastPing: connectionTime,
            userAgent,
            ip,
            isAuthenticated: validSession && !!userId,
            userId: userId || null,
            username: null,
            sessionToken: sessionToken || null,
            sessionId: sessionId || null
          };

          global.clientsInfo.set(ws, clientInfo);
          global.wsClients.add(ws);

          console.log(`✅ WebSocket client conectado - ID: ${clientId}, IP: ${ip}`);

          // Configurar ping/pong automático
          ws.isAlive = true;
          ws.on('pong', () => {
            ws.isAlive = true;
            if (global.clientsInfo.has(ws)) {
              global.clientsInfo.get(ws).lastPing = new Date();
              global.clientsInfo.get(ws).isAlive = true;
            }
          });

          // Tratar mensagens recebidas dos clientes
          ws.on('message', async (message) => {
            try {
              const data = JSON.parse(message.toString());
              console.log(`📨 Mensagem recebida do cliente ${clientId}:`, data.type);

              // Responder a pings do cliente
              if (data.type === 'ping') {
                ws.send(JSON.stringify({
                  type: 'pong',
                  timestamp: new Date().toISOString()
                }));
                return;
              }

              // Processar autenticação
              if (data.type === 'auth' && data.userId && data.sessionToken) {
                const client = global.clientsInfo.get(ws);
                if (client) {
                  client.userId = data.userId;
                  client.sessionToken = data.sessionToken;
                  client.authenticated = true;

                  // Armazenar referência do WebSocket pelo sessionToken para facilitar busca
                  ws.sessionToken = data.sessionToken;

                  console.log(`🔐 Cliente ${clientId} autenticado como usuário ${data.userId} com sessão ${data.sessionToken.substring(0, 8)}...`);
                  console.log(`🔑 SessionToken armazenado no WebSocket: ${data.sessionToken.substring(0, 8)}...`);
                }
                return;
              }

              // Processar informações do cliente
              if (data.type === 'client_info') {
                const client = global.clientsInfo.get(ws);
                if (client) {
                  client.url = data.client_info?.url || '/';
                  console.log(`📍 Cliente ${clientId} reportou URL: ${client.url}`);
                }
                return;
              }

            } catch (error) {
              console.error(`❌ Erro ao processar mensagem do cliente ${clientId}:`, error);
            }
          });

          ws.on('close', () => {
            console.log(`❌ WebSocket client desconectado - ID: ${clientId}`);
            global.clientsInfo?.delete(ws);
            global.wsClients.delete(ws);
          });

          ws.on('error', (error) => {
            console.error(`🚨 Erro WebSocket cliente ${clientId}:`, error.message);
          });
        });

        // Sistema de Heartbeat - verificar clientes a cada 30 segundos
        const heartbeatInterval = setInterval(() => {
          console.log('\n🔄 === HEARTBEAT WEBSOCKET ===');
          console.log(`📊 Total de clientes conectados: ${global.wsClients.size}`);

          const now = new Date();
          const activeClients = [];
          const staleClients = [];

          global.wsClients.forEach(ws => {
            const client = global.clientsInfo?.get(ws);
            if (client) {
              const timeSinceLastPing = now - client.lastPing;
              const connectionDuration = now - client.connectionTime;

              const clientStatus = {
                id: client.id,
                authenticated: client.authenticated,
                userId: client.userId || 'Não autenticado',
                ip: client.ip,
                connectionDuration: Math.floor(connectionDuration / 1000) + 's',
                lastPing: Math.floor(timeSinceLastPing / 1000) + 's atrás',
                isAlive: client.isAlive && timeSinceLastPing < 60000 // 60 segundos
              };

              if (clientStatus.isAlive) {
                activeClients.push(clientStatus);
              } else {
                staleClients.push(clientStatus);
              }
            }
          });

          // Mostrar clientes ativos
          if (activeClients.length > 0) {
            const authenticatedCount = activeClients.filter(c => c.authenticated).length;
            console.log(`✅ Clientes ativos: ${activeClients.length} (${authenticatedCount} autenticados)`);

            activeClients.forEach(client => {
              const authStatus = client.authenticated ? '🔐' : '🔓';
              console.log(`   ${authStatus} ID: ${client.id} | Usuário: ${client.userId} | IP: ${client.ip} | Conectado há: ${client.connectionDuration} | Último ping: ${client.lastPing}`);
            });
          }

          // Mostrar clientes inativos
          if (staleClients.length > 0) {
            console.log('⚠️ Clientes inativos (serão desconectados):');
            staleClients.forEach(client => {
              console.log(`   - ID: ${client.id} | Usuário: ${client.userId} | Último ping: ${client.lastPing}`);
            });
          }

          // Enviar ping para todos os clientes e remover os que não respondem
          global.wsClients.forEach(ws => {
            if (ws.isAlive === false) {
              console.log(`🗑️ Removendo cliente inativo: ${global.clientsInfo?.get(ws)?.id}`);
              global.clientsInfo?.delete(ws);
              global.wsClients.delete(ws);
              return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping();

            // Enviar ping customizado também
            try {
              ws.send(JSON.stringify({
                type: 'server_ping',
                timestamp: now.toISOString(),
                server_info: {
                  uptime: process.uptime(),
                  memory: process.memoryUsage()
                }
              }));
            } catch (error) {
              console.error('Erro ao enviar ping:', error);
            }
          });

          console.log('=== FIM HEARTBEAT ===\n');
        }, 30000); // A cada 30 segundos

        // Limpar interval quando o processo for encerrado
        process.on('SIGINT', () => {
          clearInterval(heartbeatInterval);
          console.log('🛑 Heartbeat WebSocket encerrado');
        });

        console.log('🔗 WebSocket server iniciado no caminho /ws');
        console.log('💓 Sistema de heartbeat ativado (30s)');

        proxyServer.listen(proxyPort, '0.0.0.0', () => {
          log(`Proxy server running on port ${proxyPort}, forwarding to port ${port}`);
          log(`Running on Replit - server available at: https://${process.env.REPLIT_DOMAINS}`);
        });
      }
    });
  }
})();

// The code has been updated to include WebSocket client management and session handling.
import { WebSocket } from 'ws';