import { type Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./auth";
import { neon } from '@neondatabase/serverless';

// Initialize database connection
const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function executeQuery(query: string, params: any[] = []) {
  try {
    const result = await sql(query, params);
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // API para buscar histórico de pagamentos
  app.get("/api/historico-pagamentos", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar pagamentos da Locaweb
      const pagamentos = await executeQuery(`
        SELECT * FROM pagamentos 
        WHERE user_id = $1 
        ORDER BY data_pagamento DESC 
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
          planoNome: pagamento.plano_nome || 'Plano não identificado',
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
        data: pagamentosFormatados
      });
    } catch (error) {
      console.error("Erro ao buscar histórico de pagamentos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // API para buscar histórico de assinaturas
  app.get("/api/historico-assinaturas", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar assinaturas da Locaweb
      const assinaturas = await executeQuery(`
        SELECT * FROM assinaturas 
        WHERE user_id = $1 
        ORDER BY data_inicio DESC 
        LIMIT 24
      `, [userId]);

      const assinaturasFormatadas = (Array.isArray(assinaturas) ? assinaturas : []).map((assinatura: any) => ({
        id: assinatura.id,
        stripeSubscriptionId: assinatura.stripe_subscription_id,
        status: assinatura.status,
        planoNome: assinatura.plano_nome || 'Plano não identificado',
        valor: parseFloat(assinatura.valor) || 0,
        periodo: assinatura.periodo || 'Mensal',
        dataInicio: assinatura.data_inicio ? 
          new Date(assinatura.data_inicio).toLocaleDateString('pt-BR') : 'Data não disponível',
        dataFim: assinatura.data_fim ? 
          new Date(assinatura.data_fim).toLocaleDateString('pt-BR') : null,
        proximoPagamento: assinatura.proxima_cobranca ? 
          new Date(assinatura.proxima_cobranca).toLocaleDateString('pt-BR') : null
      }));

      res.json({
        success: true,
        data: assinaturasFormatadas
      });
    } catch (error) {
      console.error("Erro ao buscar histórico de assinaturas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "API working!" });
  });

  const httpServer = createServer(app);
  return httpServer;
}