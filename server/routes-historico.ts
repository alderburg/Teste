import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from './auth';
import { connectionManager } from './connection-manager';
import { stripe } from './stripe-helper';
import { timestampToBrazilianDate } from './utils/timezone';

const router = Router();

// Buscar histórico de assinaturas do usuário
router.get('/historico-assinaturas/:userId', isAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID do usuário inválido' 
      });
    }

    // Buscar todas as assinaturas do usuário do banco Locaweb
    const query = `
      SELECT 
        a.id,
        a.stripe_subscription_id,
        a.user_id,
        a.plano_id,
        a.data_inicio,
        a.data_fim,
        a.status,
        a.tipo_cobranca,
        a.valor_pago,
        p.nome as plano_nome,
        a.created_at
      FROM assinaturas a
      LEFT JOIN planos p ON a.plano_id = p.id
      WHERE a.user_id = $1
      ORDER BY a.data_inicio DESC, a.created_at DESC
    `;

    const historicoAssinaturas = await connectionManager.executeQuery(query, [userId]);

    // Formatar os dados para exibição
    const assinaturasFormatadas = historicoAssinaturas.rows.map(assinatura => ({
      id: assinatura.id,
      stripeSubscriptionId: assinatura.stripe_subscription_id,
      status: assinatura.status,
      planoNome: assinatura.plano_nome || 'Plano não especificado',
      valor: parseFloat(assinatura.valor_pago),
      periodo: assinatura.tipo_cobranca === 'anual' ? 'Anual' : 'Mensal',
      dataInicio: new Date(assinatura.data_inicio).toLocaleDateString('pt-BR'),
      dataFim: assinatura.data_fim ? new Date(assinatura.data_fim).toLocaleDateString('pt-BR') : null,
      proximoPagamento: null
    }));
      const dataInicio = new Date(assinatura.data_inicio);
      const dataFim = assinatura.data_fim ? new Date(assinatura.data_fim) : null;
      const agora = new Date();

      let status = 'Expirado';
      if (assinatura.status === 'ativo' && (!dataFim || dataFim > agora)) {
        status = 'Ativo';
      } else if (assinatura.status === 'cancelado') {
        status = 'Cancelado';
      } else if (assinatura.status === 'pausado') {
        status = 'Pausado';
      }

      return {
        id: assinatura.id,
        planoNome: assinatura.plano_nome || 'Plano não especificado',
        valor: assinatura.valor_pago,
        periodo: assinatura.tipo_cobranca === 'anual' ? 'Anual' : 'Mensal',
        status: status,
        dataInicio: dataInicio.toLocaleDateString('pt-BR'),
        dataFim: dataFim ? dataFim.toLocaleDateString('pt-BR') : 'Ativo',
        statusPagamento: assinatura.status,
        dataCriacao: assinatura.data_criacao
      };
    }) || [];

    return res.json({
      success: true,
      data: assinaturasFormatadas
    });

  } catch (error) {
    console.error('Erro ao buscar histórico de assinaturas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Buscar histórico de pagamentos do usuário
router.get('/historico-pagamentos', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID do usuário não encontrado na sessão' 
      });
    }

    console.log('🔍 Buscando histórico de pagamentos para userId:', userId);

    // Primeiro vamos verificar quantos registros existem na tabela para este usuário
    const countResult = await connectionManager.executeQuery(`
      SELECT COUNT(*) as total FROM pagamentos WHERE user_id = $1
    `, [userId]);

    console.log('📊 Total de pagamentos na tabela para este usuário:', countResult.rows[0]?.total || 0);

    // Verificar se há registros com ID > 140 (problema mencionado pelo usuário)
    const countHigherIds = await connectionManager.executeQuery(`
      SELECT COUNT(*) as total, MIN(id) as min_id, MAX(id) as max_id 
      FROM pagamentos 
      WHERE user_id = $1 AND id > 140
    `, [userId]);

    console.log('📊 Registros com ID > 140:', {
      total: countHigherIds.rows[0]?.total || 0,
      min_id: countHigherIds.rows[0]?.min_id,
      max_id: countHigherIds.rows[0]?.max_id
    });

    // Verificar o maior ID na tabela para este usuário
    const maxIdResult = await connectionManager.executeQuery(`
      SELECT MAX(id) as max_id 
      FROM pagamentos 
      WHERE user_id = $1
    `, [userId]);

    console.log('📊 Maior ID encontrado:', maxIdResult.rows[0]?.max_id);

    // Sincronizar com Stripe primeiro se existir configuração
    if (stripe) {
      try {
        const userResult = await connectionManager.executeQuery(`
          SELECT stripe_customer_id FROM users WHERE id = $1
        `, [userId]);

        if (userResult.rows?.[0]?.stripe_customer_id) {
          const stripeCustomerId = userResult.rows[0].stripe_customer_id;
          console.log('💳 Sincronizando dados do Stripe para customer:', stripeCustomerId);

          // Buscar pagamentos do Stripe (charges e invoices)
          const [charges, invoices] = await Promise.all([
            stripe.charges.list({
              customer: stripeCustomerId,
              limit: 100
            }),
            stripe.invoices.list({
              customer: stripeCustomerId,
              limit: 100
            })
          ]);

          // Sincronizar charges
          for (const charge of charges.data) {
            if (charge.status === 'succeeded') {
              try {
                await connectionManager.executeQuery(`
                  INSERT INTO pagamentos (
                    user_id, valor, status, 
                    stripe_payment_intent_id,
                    metodo_pagamento,
                    data_pagamento,
                    plano_nome
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                  ON CONFLICT (stripe_payment_intent_id) 
                  DO UPDATE SET 
                    status = EXCLUDED.status,
                    valor = EXCLUDED.valor
                `, [
                  userId,
                  charge.amount / 100,
                  'Pago',
                  typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id || null,
                  charge.payment_method_details?.type || 'Cartão de Crédito',
                  timestampToBrazilianDate(charge.created),
                  'Assinatura Premium'
                ]);
              } catch (insertError) {
                console.error('Erro ao inserir charge:', insertError);
              }
            }
          }

          // Sincronizar invoices
          for (const invoice of invoices.data) {
            try {
              await connectionManager.executeQuery(`
                INSERT INTO pagamentos (
                  user_id, valor, status,
                  stripe_invoice_id, 
                  metodo_pagamento,
                  data_pagamento,
                  plano_nome,
                  periodo,
                  fatura_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (stripe_invoice_id) 
                DO UPDATE SET
                  status = EXCLUDED.status,
                  valor = EXCLUDED.valor,
                  fatura_url = EXCLUDED.fatura_url
              `, [
                userId,
                (invoice.amount_paid / 100),
                invoice.status === 'paid' ? 'Pago' : 
                  invoice.status === 'open' ? 'Pendente' : 'Falhado',
                invoice.id,
                'Cartão de Crédito',
                timestampToBrazilianDate(invoice.created),
                invoice.lines.data[0]?.description || 'Assinatura Premium',
                invoice.lines.data[0]?.price?.recurring?.interval || 'mensal',
                invoice.hosted_invoice_url
              ]);
            } catch (insertError) {
              console.error('Erro ao inserir invoice:', insertError);
            }
          }
        }
      } catch (stripeError) {
        console.error('Erro ao sincronizar com Stripe:', stripeError);
        // Continua mesmo se houver erro na sincronização
      }
    }

    // Buscar os 24 ÚLTIMOS pagamentos da tabela para o usuário (usando mesma estrutura das assinaturas)
    console.log('🔍 Executando consulta SQL para buscar os 24 últimos pagamentos...');
    const result = await connectionManager.executeQuery(`
      SELECT 
        p.id,
        p.user_id,
        p.valor,
        p.valor_cartao,
        p.valor_credito,
        p.valor_diferenca,
        p.detalhes_credito,
        p.tem_credito,
        p.is_full_credit,
        p.resumo_pagamento,
        p.status,
        p.metodo_pagamento,
        p.stripe_payment_intent_id,
        p.stripe_invoice_id,
        p.data_pagamento,
        p.plano_nome,
        p.periodo,
        p.fatura_url,
        p.created_at,
        p.updated_at
      FROM pagamentos p
      WHERE p.user_id = $1 
      ORDER BY p.id DESC, p.created_at DESC
      LIMIT 24
    `, [userId]);

    console.log('📊 Total de pagamentos encontrados:', result.rows.length);

    // Log detalhado de todos os IDs encontrados
    const allIds = result.rows.map(r => r.id);
    console.log('📊 TODOS os IDs encontrados (ordenados por ID desc):', allIds);
    console.log('📊 Range de IDs:', allIds.length > 0 ? `${Math.max(...allIds)} até ${Math.min(...allIds)}` : 'Nenhum');

    console.log('📊 Primeiros 10 IDs (mais recentes):', result.rows.slice(0, 10).map(r => r.id));
    console.log('📊 Últimos 10 IDs (mais antigos dos 24):', result.rows.slice(-10).map(r => r.id));

    if (result.rows.length > 0) {
      console.log('💰 Primeiro pagamento (maior ID):', {
        id: result.rows[0].id,
        valor: result.rows[0].valor,
        status: result.rows[0].status,
        data: result.rows[0].data_pagamento,
        created_at: result.rows[0].created_at
      });
      console.log('💰 Último pagamento (menor ID dos 24):', {
        id: result.rows[result.rows.length - 1].id,
        valor: result.rows[result.rows.length - 1].valor,
        status: result.rows[result.rows.length - 1].status,
        data: result.rows[result.rows.length - 1].data_pagamento,
        created_at: result.rows[result.rows.length - 1].created_at
      });
    }

    // Formatar dados para exibição
    const pagamentosFormatados = result.rows.map(pagamento => {
      const valor = Number(pagamento.valor || 0);
      const valorCartao = Number(pagamento.valor_cartao || pagamento.valor || 0);
      const valorCredito = Number(pagamento.valor_credito || 0);
      const valorDiferenca = pagamento.valor_diferenca !== null ? Number(pagamento.valor_diferenca) : null;

      console.log(`💰 Processando pagamento ID ${pagamento.id}:`, {
        valor_diferenca_raw: pagamento.valor_diferenca,
        valor_diferenca_converted: valorDiferenca,
        tipo: typeof pagamento.valor_diferenca,
        is_null: pagamento.valor_diferenca === null,
        is_undefined: pagamento.valor_diferenca === undefined,
        will_include_in_response: valorDiferenca !== null
      });

      const formatted = {
        id: pagamento.id,
        valor: valor,
        valorCartao: valorCartao,
        valorCredito: valorCredito,
        valor_diferenca: valorDiferenca,
        detalhesCredito: pagamento.detalhes_credito,
        temCredito: Boolean(pagamento.tem_credito || valorCredito > 0),
        isFullCredit: Boolean(pagamento.is_full_credit || valorCredito >= valor),
        resumoPagamento: pagamento.resumo_pagamento,
        status: pagamento.status || 'Pago',
        planoNome: pagamento.plano_nome || 'Assinatura Premium',
        dataPagamento: pagamento.data_pagamento ? 
          new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR') : 
          new Date(pagamento.created_at).toLocaleDateString('pt-BR'),
        metodoPagamento: pagamento.metodo_pagamento || 'Cartão de Crédito',
        faturaUrl: pagamento.fatura_url,
        stripeInvoiceId: pagamento.stripe_invoice_id
      };

      if (valorDiferenca !== null && valorDiferenca !== 0) {
        console.log(`✅ Pagamento ${pagamento.id} tem valor_diferenca válido:`, valorDiferenca);
      }

      return formatted;
    });

    console.log('✅ Enviando', pagamentosFormatados.length, 'pagamentos formatados para o frontend');

    return res.json({
      success: true,
      data: pagamentosFormatados,
      total: pagamentosFormatados.length
    });

  } catch (error) {
    console.error('❌ Erro ao buscar histórico de pagamentos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar pagamentos'
    });
  }
});

// Buscar detalhes de uma assinatura específica
router.get('/assinatura/:assinaturaId', isAuthenticated, async (req, res) => {
  try {
    const assinaturaId = parseInt(req.params.assinaturaId);
    const userId = req.user?.id;

    if (!assinaturaId || isNaN(assinaturaId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID da assinatura inválido' 
      });
    }

    // Buscar a assinatura específica do usuário
    const assinatura = await db
      .select()
      .from(assinaturas)
      .where(and(
        eq(assinaturas.id, assinaturaId),
        eq(assinaturas.userId, userId)
      ))
      .limit(1);

    if (assinatura.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Buscar pagamentos relacionados a esta assinatura
    const pagamentosRelacionados = await db
      .select()
      .from(pagamentos)
      .where(and(
        eq(pagamentos.userId, userId),
        eq(pagamentos.assinaturaId, assinaturaId)
      ))
      .orderBy(desc(pagamentos.dataPagamento));

    const assinaturaDetalhes = {
      ...assinatura[0],
      pagamentos: pagamentosRelacionados
    };

    return res.json({
      success: true,
      data: assinaturaDetalhes
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes da assinatura:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

export default router;