import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "./db";
import { storage } from "./storage";
import { emailService } from "./email";
import { authenticateToken } from "./auth";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
}) : null;

export async function registerRoutes(app: Express): Promise<Server> {
  
  // 🔄 ROTA PRINCIPAL: Sincronizar pagamentos da Stripe com base local
  app.post('/api/sync-stripe-payments', authenticateToken, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
      console.log('🔄 Iniciando sincronização de pagamentos da Stripe...');
      
      const user = req.user;
      
      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: 'Usuário não possui Stripe Customer ID' });
      }

      if (!stripe) {
        return res.status(500).json({ error: 'Stripe não configurado' });
      }

      // Buscar todas as assinaturas do usuário
      const assinaturas = await storage.getAssinaturasByUserId(user.id);
      
      let syncCount = 0;
      let errorCount = 0;

      for (const assinatura of assinaturas) {
        if (!assinatura.stripeSubscriptionId) continue;

        try {
          // Buscar faturas da assinatura no Stripe
          const invoices = await stripe.invoices.list({
            subscription: assinatura.stripeSubscriptionId,
            limit: 24,
            status: 'paid'
          });

          for (const invoice of invoices.data) {
            // Verificar se o pagamento já foi sincronizado
            const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
            
            if (!pagamentoExistente) {
              const plano = await storage.getPlano(assinatura.planoId);
              
              if (!plano) {
                console.warn(`Plano não encontrado para assinatura ${assinatura.id}`);
                continue;
              }

              // Calcular valores de cartão e crédito
              const valorTotal = invoice.amount_paid / 100;
              const valorCartao = valorTotal; // Por padrão, assume pagamento total no cartão
              const valorCredito = 0; // Será atualizado se houver créditos aplicados

              // Converter data para horário brasileiro (UTC-3)
              const dataOriginal = new Date(invoice.created * 1000);
              const dataPagamentoBrasil = new Date(dataOriginal.getTime() - (3 * 60 * 60 * 1000));

              // Criar registro do histórico de pagamento
              await storage.createHistoricoPagamento({
                userId: user.id,
                stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || '',
                stripeInvoiceId: invoice.id,
                stripeSubscriptionId: assinatura.stripeSubscriptionId,
                valor: valorTotal,
                valorCartao: valorCartao,
                valorCredito: valorCredito,
                detalhesCredito: null,
                temCredito: valorCredito > 0,
                isFullCredit: valorCredito === valorTotal,
                resumoPagamento: `Pagamento de ${plano.nome} - ${assinatura.tipoCobranca === 'anual' ? 'Anual' : 'Mensal'}`,
                status: 'Pago',
                metodoPagamento: 'Cartão de Crédito',
                dataPagamento: dataPagamentoBrasil,
                planoNome: plano.nome,
                periodo: assinatura.tipoCobranca === 'anual' ? 'Anual' : 'Mensal',
                faturaUrl: invoice.hosted_invoice_url || invoice.invoice_pdf || '',
                metadata: JSON.stringify({
                  stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || null,
                  stripe_invoice_id: invoice.id,
                  stripe_subscription_id: assinatura.stripeSubscriptionId,
                  sync_type: 'manual_sync'
                })
              });

              syncCount++;
              console.log(`✅ Pagamento sincronizado: ${invoice.id} - R$ ${valorTotal.toFixed(2)}`);
            }
          }

          // Também buscar faturas falhadas para histórico completo
          const failedInvoices = await stripe.invoices.list({
            subscription: assinatura.stripeSubscriptionId,
            limit: 24,
            status: 'open'
          });

          for (const invoice of failedInvoices.data) {
            const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
            
            if (!pagamentoExistente && invoice.attempt_count > 0) {
              const plano = await storage.getPlano(assinatura.planoId);
              
              if (!plano) continue;

              const valorTentativa = invoice.amount_due / 100;
              const dataTentativa = new Date(invoice.created * 1000);
              const dataBrasil = new Date(dataTentativa.getTime() - (3 * 60 * 60 * 1000));

              await storage.createHistoricoPagamento({
                userId: user.id,
                stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || '',
                stripeInvoiceId: invoice.id,
                stripeSubscriptionId: assinatura.stripeSubscriptionId,
                valor: valorTentativa,
                valorCartao: valorTentativa,
                valorCredito: 0,
                detalhesCredito: null,
                temCredito: false,
                isFullCredit: false,
                resumoPagamento: `Tentativa de pagamento falhada: ${plano.nome}`,
                status: 'Falhou',
                metodoPagamento: 'Cartão de Crédito',
                dataPagamento: dataBrasil,
                planoNome: plano.nome,
                periodo: assinatura.tipoCobranca === 'anual' ? 'Anual' : 'Mensal',
                faturaUrl: invoice.hosted_invoice_url || '',
                metadata: JSON.stringify({
                  stripe_invoice_id: invoice.id,
                  stripe_subscription_id: assinatura.stripeSubscriptionId,
                  failure_reason: 'Pagamento não processado',
                  sync_type: 'manual_sync'
                })
              });

              console.log(`⚠️ Tentativa de pagamento falhada sincronizada: ${invoice.id}`);
            }
          }

        } catch (error) {
          console.error(`Erro ao sincronizar assinatura ${assinatura.stripeSubscriptionId}:`, error);
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: `Sincronização concluída: ${syncCount} pagamentos sincronizados`,
        syncCount,
        errorCount
      });

    } catch (error) {
      console.error('Erro na sincronização de pagamentos:', error);
      res.status(500).json({ 
        error: 'Erro interno na sincronização de pagamentos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // 📊 ROTA: Buscar histórico financeiro do usuário
  app.get('/api/historico-financeiro', authenticateToken, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    try {
      const historico = await storage.getHistoricoPagamentosByUserId(req.user.id);
      
      // Organizar dados para o frontend
      const historicoFormatado = historico.map(pagamento => ({
        id: pagamento.id,
        data: pagamento.dataPagamento,
        valor: pagamento.valor,
        valorCartao: pagamento.valorCartao || pagamento.valor,
        valorCredito: pagamento.valorCredito || 0,
        status: pagamento.status,
        plano: pagamento.planoNome,
        periodo: pagamento.periodo,
        metodoPagamento: pagamento.metodoPagamento,
        resumo: pagamento.resumoPagamento,
        faturaUrl: pagamento.faturaUrl,
        temCredito: pagamento.temCredito || false,
        isFullCredit: pagamento.isFullCredit || false,
        detalhesCredito: pagamento.detalhesCredito
      }));

      // Calcular estatísticas
      const totalPago = historico
        .filter(p => p.status === 'Pago')
        .reduce((sum, p) => sum + (p.valor || 0), 0);

      const totalCreditos = historico
        .filter(p => p.status === 'Pago')
        .reduce((sum, p) => sum + (p.valorCredito || 0), 0);

      const totalCartao = historico
        .filter(p => p.status === 'Pago')
        .reduce((sum, p) => sum + (p.valorCartao || p.valor || 0), 0);

      res.json({
        historico: historicoFormatado,
        estatisticas: {
          totalPago,
          totalCreditos,
          totalCartao,
          totalTransacoes: historico.length,
          transacoesPagas: historico.filter(p => p.status === 'Pago').length,
          transacoesFalhadas: historico.filter(p => p.status === 'Falhou').length
        }
      });

    } catch (error) {
      console.error('Erro ao buscar histórico financeiro:', error);
      res.status(500).json({ 
        error: 'Erro ao carregar histórico financeiro',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // 🔔 WEBHOOK: Stripe - Sincronização automática
  app.post('/api/stripe-webhook', async (req, res) => {
    let event;

    try {
      const signature = req.headers['stripe-signature'];
      
      if (!process.env.STRIPE_WEBHOOK_SECRET || !signature || !stripe) {
        return res.status(400).send('Webhook não configurado corretamente');
      }

      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Erro na verificação do webhook:', err);
      return res.status(400).send('Erro na verificação do webhook');
    }

    console.log(`🔔 Webhook recebido: ${event.type}`);

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Evento não tratado: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      res.status(500).send('Erro interno no webhook');
    }
  });

  // Função auxiliar para pagamento bem-sucedido
  async function handleInvoicePaymentSucceeded(invoice: any) {
    console.log(`✅ Webhook: Pagamento bem-sucedido - Invoice ${invoice.id}`);
    
    try {
      if (!stripe) return;
      
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const subscriptionId = subscription.id;
      const customerId = subscription.customer as string;
      
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.error(`Usuário não encontrado para Customer ID: ${customerId}`);
        return;
      }

      // Atualizar status da assinatura
      await storage.updateAssinaturaByStripeId(subscriptionId, {
        status: 'ativa',
      });

      // Sincronizar pagamento
      const assinaturaLocal = await storage.getAssinaturaByStripeId(subscriptionId);
      if (assinaturaLocal) {
        const plano = await storage.getPlano(assinaturaLocal.planoId);
        const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
        
        if (!pagamentoExistente && plano) {
          const valorPago = invoice.amount_paid / 100;
          const dataPagamento = new Date(invoice.created * 1000);
          const dataBrasil = new Date(dataPagamento.getTime() - (3 * 60 * 60 * 1000));
          
          await storage.createHistoricoPagamento({
            userId: user.id,
            stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || '',
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            valor: valorPago,
            valorCartao: valorPago,
            valorCredito: 0,
            detalhesCredito: null,
            temCredito: false,
            isFullCredit: false,
            resumoPagamento: `Pagamento ${plano.nome} - ${assinaturaLocal.tipoCobranca}`,
            status: 'Pago',
            metodoPagamento: 'Cartão de Crédito',
            dataPagamento: dataBrasil,
            planoNome: plano.nome,
            periodo: assinaturaLocal.tipoCobranca,
            faturaUrl: invoice.hosted_invoice_url || invoice.invoice_pdf || '',
            metadata: JSON.stringify({
              stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || null,
              stripe_invoice_id: invoice.id,
              stripe_subscription_id: subscriptionId,
              webhook_event: 'invoice.payment_succeeded'
            })
          });
          
          console.log(`✅ Pagamento sincronizado via webhook: ${invoice.id}`);
        }
      }
    } catch (error) {
      console.error('Erro ao processar pagamento bem-sucedido:', error);
    }
  }

  // Função auxiliar para pagamento falhado
  async function handleInvoicePaymentFailed(invoice: any) {
    console.log(`❌ Webhook: Pagamento falhou - Invoice ${invoice.id}`);
    
    try {
      if (!stripe) return;
      
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const subscriptionId = subscription.id;
      const customerId = subscription.customer as string;
      
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.error(`Usuário não encontrado para Customer ID: ${customerId}`);
        return;
      }

      // Atualizar status da assinatura
      await storage.updateAssinaturaByStripeId(subscriptionId, {
        status: 'inadimplente',
      });

      // Sincronizar tentativa de pagamento falhada
      const assinaturaLocal = await storage.getAssinaturaByStripeId(subscriptionId);
      if (assinaturaLocal) {
        const plano = await storage.getPlano(assinaturaLocal.planoId);
        const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
        
        if (!pagamentoExistente && plano) {
          const valorTentativa = invoice.amount_due / 100;
          const dataTentativa = new Date(invoice.created * 1000);
          const dataBrasil = new Date(dataTentativa.getTime() - (3 * 60 * 60 * 1000));
          
          await storage.createHistoricoPagamento({
            userId: user.id,
            stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || '',
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            valor: valorTentativa,
            valorCartao: valorTentativa,
            valorCredito: 0,
            detalhesCredito: null,
            temCredito: false,
            isFullCredit: false,
            resumoPagamento: `Tentativa de pagamento falhada: ${plano.nome}`,
            status: 'Falhou',
            metodoPagamento: 'Cartão de Crédito',
            dataPagamento: dataBrasil,
            planoNome: plano.nome,
            periodo: assinaturaLocal.tipoCobranca,
            faturaUrl: invoice.hosted_invoice_url || '',
            metadata: JSON.stringify({
              stripe_invoice_id: invoice.id,
              stripe_subscription_id: subscriptionId,
              webhook_event: 'invoice.payment_failed',
              failure_reason: invoice.last_payment_error?.message || 'Pagamento recusado'
            })
          });
          
          console.log(`⚠️ Pagamento falhado sincronizado via webhook: ${invoice.id}`);
        }
      }
    } catch (error) {
      console.error('Erro ao processar falha de pagamento:', error);
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}