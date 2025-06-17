import { Request, Response } from "express";
import { executeQuery } from './db';
import { syncStripePayments, syncStripeSubscriptions } from './stripe-sync-payments';

export function setupHistoricoRoutes(app: any) {
  // Rota para buscar histórico de pagamentos com sincronização da Stripe
  app.get("/api/historico-pagamentos", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ success: false, message: "ID do usuário não encontrado" });
      }

      // Sincronizar com a Stripe primeiro
      await syncStripePayments(userId);

      // Buscar pagamentos do banco da Locaweb após sincronização
      const pagamentos = await executeQuery(`
        SELECT p.*, pl.nome_oficial as plano_nome_oficial
        FROM pagamentos p
        LEFT JOIN planos pl ON p.plano_id = pl.id
        WHERE p.user_id = $1
        ORDER BY p.data_pagamento DESC, p.created_at DESC
        LIMIT 24
      `, [userId]);

      const pagamentosFormatados = (Array.isArray(pagamentos) ? pagamentos : []).map((pagamento: any) => {
        // Verificar se o valor precisa ser convertido de centavos
        let valorConvertido = parseFloat(pagamento.valor) || 0;
        let valorCartaoConvertido = parseFloat(pagamento.valor_cartao) || 0;
        let valorCreditoConvertido = parseFloat(pagamento.valor_credito) || 0;
        
        // Se o valor está em centavos (muito alto), dividir por 100
        if (valorConvertido > 1000 && !pagamento.valor_ja_convertido) {
          valorConvertido = valorConvertido / 100;
        }
        if (valorCartaoConvertido > 1000 && !pagamento.valor_ja_convertido) {
          valorCartaoConvertido = valorCartaoConvertido / 100;
        }
        if (valorCreditoConvertido > 1000 && !pagamento.valor_ja_convertido) {
          valorCreditoConvertido = valorCreditoConvertido / 100;
        }

        return {
          id: pagamento.id,
          valor: valorConvertido,
          valorCartao: valorCartaoConvertido,
          valorCredito: valorCreditoConvertido,
          detalhesCredito: pagamento.detalhes_credito,
          temCredito: pagamento.tem_credito || valorCreditoConvertido > 0,
          isFullCredit: pagamento.is_full_credit || valorCreditoConvertido >= valorConvertido,
          status: pagamento.status,
          planoNome: pagamento.plano_nome_oficial || pagamento.plano_nome || 'Assinatura Premium',
          dataPagamento: pagamento.data_pagamento ? 
            new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR') : 'Data não disponível',
          metodoPagamento: pagamento.metodo_pagamento || 'Cartão de Crédito',
          faturaUrl: pagamento.fatura_url,
          stripeInvoiceId: pagamento.stripe_invoice_id,
          resumoPagamento: pagamento.resumo_pagamento
        };
      });

      res.json({
        success: true,
        data: pagamentosFormatados,
        total: pagamentosFormatados.length
      });

    } catch (error) {
      console.error("Erro ao buscar histórico de pagamentos:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno do servidor ao buscar pagamentos" 
      });
    }
  });

  // Rota para buscar histórico de assinaturas com sincronização da Stripe
  app.get("/api/historico-assinaturas", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ success: false, message: "ID do usuário não encontrado" });
      }

      // Sincronizar com a Stripe primeiro
      await syncStripeSubscriptions(userId);

      // Buscar assinaturas do banco da Locaweb após sincronização
      const assinaturas = await executeQuery(`
        SELECT * FROM assinaturas 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 24
      `, [userId]);

      const assinaturasFormatadas = (Array.isArray(assinaturas) ? assinaturas : []).map((assinatura: any) => ({
        id: assinatura.id,
        stripeSubscriptionId: assinatura.stripe_subscription_id,
        status: assinatura.status,
        planoNome: assinatura.plano_nome || 'Assinatura Premium',
        valor: parseFloat(assinatura.valor),
        periodo: assinatura.periodo,
        dataInicio: assinatura.data_inicio ? 
          new Date(assinatura.data_inicio).toLocaleDateString('pt-BR') : 'Data não disponível',
        dataFim: assinatura.data_fim ? 
          new Date(assinatura.data_fim).toLocaleDateString('pt-BR') : null,
        proximoPagamento: assinatura.data_proximo_pagamento ? 
          new Date(assinatura.data_proximo_pagamento).toLocaleDateString('pt-BR') : null
      }));

      res.json({
        success: true,
        data: assinaturasFormatadas,
        total: assinaturasFormatadas.length
      });

    } catch (error) {
      console.error("Erro ao buscar histórico de assinaturas:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro interno do servidor ao buscar assinaturas" 
      });
    }
  });
}