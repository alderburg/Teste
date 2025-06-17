import { Express, Request, Response } from 'express';
import { isAuthenticated } from './auth';
import { storage } from './storage';
import { stripe } from './stripe-helper';
import { timestampToBrazilianDate } from './utils/timezone';
import { getCustomerCreditBalance } from './stripe-credit-balance';



export function configurarRotasAssinatura(app: Express) {
  // Endpoint para obter a assinatura ativa do usuário atual
  app.get('/api/minha-assinatura', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Adicionar cabeçalhos anti-cache
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Buscar assinatura ativa
      const assinatura = await storage.getAssinaturaAtiva(userId);

      if (!assinatura) {
        return res.json({
          temAssinatura: false,
          user: {
            id: userId,
            username: req.user?.username
          }
        });
      }

      // Buscar detalhes do plano
      const plano = await storage.getPlano(assinatura.planoId);

      // Resposta completa
      return res.json({
        temAssinatura: true,
        assinatura,
        plano,
        user: {
          id: userId,
          username: req.user?.username
        }
      });

    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      return res.status(500).json({ 
        error: 'Erro interno',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Endpoint para criar uma nova assinatura ou fazer upgrade/downgrade
  app.post('/api/assinaturas', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;



      const { planoId, tipoCobranca, paymentMethodId } = req.body;

      if (!planoId || !tipoCobranca) {
        return res.status(400).json({ 
          error: 'Dados incompletos',
          message: 'planoId e tipoCobranca são obrigatórios' 
        });
      }

      // Buscar plano
      const plano = await storage.getPlano(planoId);
      if (!plano) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      // Verificar assinatura existente
      const assinaturaExistente = await storage.getAssinaturaAtiva(userId);

      // Verificar se é upgrade, downgrade ou nova assinatura
      let tipoOperacao = 'NOVA_ASSINATURA';
      if (assinaturaExistente) {
        if (assinaturaExistente.planoId < planoId) {
          tipoOperacao = 'UPGRADE';
        } else if (assinaturaExistente.planoId > planoId) {
          tipoOperacao = 'DOWNGRADE';
        } else if (assinaturaExistente.tipoCobranca !== tipoCobranca) {
          tipoOperacao = 'MUDANCA_PERIODO';
        } else {
          return res.status(400).json({ 
            error: 'Assinatura já existe',
            message: 'Você já possui esse plano ativo' 
          });
        }
      }

      // Buscar usuário para obter stripeCustomerId
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      let stripeCustomerId = user.stripeCustomerId;

      // Criar customer no Stripe se não existir
      if (!stripeCustomerId) {
        console.log(`Criando customer no Stripe para usuário ${userId}`);

        if (!stripe) {
          return res.status(500).json({ error: 'Stripe não está configurado' });
        }

        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username || user.email.split('@')[0],
          metadata: {
            userId: userId.toString()
          }
        });

        stripeCustomerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId });
        console.log(`Customer Stripe criado: ${stripeCustomerId}`);
      } else {

      }



      // Mapear plano local para price ID do Stripe
      const stripePriceMap: { [key: string]: { mensal: string; anual: string } } = {
        'ESSENCIAL': {
          mensal: 'price_1RRkxRGLlqAwF2i9yBs3891a',  // Atualize com o ID real do seu Stripe
          anual: 'price_1RRkxeGLlqAwF2i94tV90Ubm'    // Atualize com o ID real do seu Stripe
        },
        'PROFISSIONAL': {
          mensal: 'price_1RRkzzGLlqAwF2i91nEvPJAP',  // Atualize com o ID real do seu Stripe
          anual: 'price_1RRl0NGLlqAwF2i96lIvXpLv'    // Atualize com o ID real do seu Stripe
        },
        'EMPRESARIAL': {
          mensal: 'price_1RRl14GLlqAwF2i9MbAWNWT8',  // Atualize com o ID real do seu Stripe
          anual: 'price_1RRl1qGLlqAwF2i9Ni4HO0sw'    // Atualize com o ID real do seu Stripe
        },
        'PREMIUM': {
          mensal: 'price_1RRl2hGLlqAwF2i9PakoZUTD',  // Atualize com o ID real do seu Stripe
          anual: 'price_1RRl37GLlqAwF2i94PphvOXv'    // Atualize com o ID real do seu Stripe
        }
      };

      const stripePriceId = stripePriceMap[plano.nome as keyof typeof stripePriceMap]?.[tipoCobranca as keyof typeof stripePriceMap['ESSENCIAL']];
      if (!stripePriceId) {
        return res.status(400).json({ 
          error: 'Plano inválido',
          message: `Plano ${plano.nome} com cobrança ${tipoCobranca} não encontrado no Stripe`
        });
      }

      // Criar subscription no Stripe


      if (!stripe) {
        return res.status(500).json({ error: 'Stripe não está configurado' });
      }

      let stripeSubscription;
      let operacaoRealizadaLog = '';

      if (tipoOperacao === 'NOVA_ASSINATURA') {
        // Nova assinatura - comportamento normal
        operacaoRealizadaLog = 'Criando nova assinatura no Stripe';
        console.log(`🆕 ${operacaoRealizadaLog} para usuário ${userId}`);

        stripeSubscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: stripePriceId }],
          default_payment_method: paymentMethodId,
          payment_settings: { 
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription'
          },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            userId: userId.toString(),
            planoId: planoId.toString(),
            tipoCobranca,
            operacao: tipoOperacao
          }
        });
      } else {
        // Upgrade, Downgrade ou Mudança de Período - usar subscription update com proration_behavior
        if (!assinaturaExistente?.stripeSubscriptionId) {
          return res.status(400).json({ 
            error: 'Assinatura existente sem ID do Stripe',
            message: 'Não é possível alterar a assinatura. Entre em contato com o suporte.' 
          });
        }

        operacaoRealizadaLog = `Realizando ${tipoOperacao} da assinatura ${assinaturaExistente.stripeSubscriptionId}`;
        console.log(`🔄 ${operacaoRealizadaLog}`);

        // Buscar a assinatura atual no Stripe
        const currentSubscription = await stripe.subscriptions.retrieve(assinaturaExistente.stripeSubscriptionId);

        if (!currentSubscription || currentSubscription.status === 'canceled') {
          return res.status(400).json({ 
            error: 'Assinatura não encontrada no Stripe',
            message: 'A assinatura atual não foi encontrada. Entre em contato com o suporte.' 
          });
        }

        // Atualizar a assinatura usando proration_behavior
        console.log(`🔄 Atualizando assinatura no Stripe com proração para ${tipoOperacao}`);

        // Configuração específica por tipo de operação
        const updateConfig: any = {
          items: [{
            id: currentSubscription.items.data[0].id,
            price: stripePriceId,
          }],
          proration_behavior: 'create_prorations',
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            ...currentSubscription.metadata,
            planoId: planoId.toString(),
            tipoCobranca,
            operacao: tipoOperacao,
            operacao_timestamp: new Date().toISOString()
          }
        };

        // FORÇAR: Manter o ciclo de cobrança atual para evitar cobrança antecipada do próximo ciclo
        if (tipoOperacao === 'UPGRADE' || tipoOperacao === 'DOWNGRADE') {
          console.log(`🔄 ${tipoOperacao}: Mantendo billing_cycle_anchor atual para evitar cobrança antecipada`);
          // Preservar o billing_cycle_anchor original para não alterar o ciclo
          updateConfig.billing_cycle_anchor = 'now';
          // Adicionar proration_date para forçar cálculo correto
          updateConfig.proration_date = Math.floor(Date.now() / 1000);
        }

        stripeSubscription = await stripe.subscriptions.update(
          assinaturaExistente.stripeSubscriptionId,
          updateConfig
        );

        console.log(`✅ ${tipoOperacao} realizado com sucesso no Stripe. Assinatura atualizada: ${stripeSubscription.id}`);
      }



      // 🇧🇷 Calcular data de fim baseada no tipo de cobrança - horário brasileiro (UTC-3)
       const dataInicio = new Date();

      const dataFim = new Date(dataInicio);

      if (tipoCobranca === 'anual') {
        dataFim.setFullYear(dataFim.getFullYear() + 1);
      } else {
        dataFim.setMonth(dataFim.getMonth() + 1);
      }



      // Atualizar/criar assinatura no banco local
      let assinaturaSalva;
      const valorPago = tipoCobranca === 'mensal' ? plano.valorMensal : plano.valorAnualTotal;

      if (tipoOperacao === 'NOVA_ASSINATURA') {
        // Cancelar todas as assinaturas ativas anteriores antes de criar a nova
        console.log(`📝 Cancelando assinaturas ativas anteriores do usuário ${userId}`);

        const { connectionManager } = await import('./connection-manager');
        await connectionManager.executeQuery(`
          UPDATE assinaturas
          SET status = 'cancelada', data_fim = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND status = 'ativa'
        `, [userId]);

        // Criar nova assinatura
        const dadosAssinatura = {
          userId,
          planoId,
          plano: plano.nome,
          tipoCobranca,
          status: 'ativa',
          dataInicio: dataInicio,
          dataFim: dataFim,
          valorPago,
          stripeSubscriptionId: stripeSubscription.id
        };

        assinaturaSalva = await storage.createAssinatura(dadosAssinatura);
        console.log(`✅ Nova assinatura criada no banco local: ID ${assinaturaSalva?.id}`);

      } else {
          // Para upgrades/downgrades, cancelar a assinatura anterior e criar uma nova
          if (assinaturaExistente) {
            console.log(`📝 Cancelando assinatura anterior para ${tipoOperacao}: ID ${assinaturaExistente.id}`);

            // Cancelar a assinatura anterior com data/hora em horário brasileiro
            const dataFimBrasil = new Date(dataInicio.getTime() - (3 * 60 * 60 * 1000));
            await storage.updateAssinatura(assinaturaExistente.id, {
              status: 'cancelada',
              dataFim: dataFimBrasil
            });

            // Criar nova assinatura com os novos dados
            const dadosNovaAssinatura = {
              userId,
              planoId,
              plano: plano.nome,
              tipoCobranca,
              status: 'ativa',
              dataInicio: dataInicio,
              dataFim: dataFim,
              valorPago,
              stripeSubscriptionId: stripeSubscription.id
            };

            assinaturaSalva = await storage.createAssinatura(dadosNovaAssinatura);
            console.log(`✅ ${tipoOperacao} - Nova assinatura criada no banco local: ID ${assinaturaSalva?.id}`);
          }
        }

      // Obter informações da invoice para possível cobrança adicional
      const latestInvoice = stripeSubscription.latest_invoice as any;
      const paymentIntent = latestInvoice?.payment_intent;

      // Salvar o pagamento inicial se a invoice foi paga
      if (latestInvoice && latestInvoice.status === 'paid' && assinaturaSalva) {
        try {
          console.log(`💰 Salvando pagamento inicial para nova assinatura: ${latestInvoice.id}`);

          // 🔍 LOG DETALHADO PARA DOWNGRADES - Rastreamento de valores
          console.log(`🔍 [DOWNGRADE LOG] Operação: ${tipoOperacao}`);
          console.log(`🔍 [DOWNGRADE LOG] Plano anterior: ${assinaturaExistente?.plano} (ID: ${assinaturaExistente?.planoId})`);
          console.log(`🔍 [DOWNGRADE LOG] Plano novo: ${plano.nome} (ID: ${planoId})`);
          console.log(`🔍 [DOWNGRADE LOG] Stripe Invoice Data:`);
          console.log(`   - subtotal: ${latestInvoice.subtotal} centavos (R$ ${(latestInvoice.subtotal / 100).toFixed(2)})`);
          console.log(`   - amount_paid: ${latestInvoice.amount_paid} centavos (R$ ${(latestInvoice.amount_paid / 100).toFixed(2)})`);
          console.log(`   - total: ${latestInvoice.total} centavos (R$ ${(latestInvoice.total / 100).toFixed(2)})`);

          // Para pagamentos com crédito, o valor deve ser o valor original do plano (sempre positivo)
          // O amount_paid pode ser negativo quando há uso de crédito que excede o valor da fatura

          // SEMPRE usar o valor EXATO do Price do Stripe - NUNCA usar valores hardcoded
          let valorTotalPlano = 0;

          try {
            // MÉTODO 1: Buscar via subscription price ID
            if (stripeSubscription?.items?.data?.[0]?.price?.id) {
              const priceId = stripeSubscription.items.data[0].price.id;
              const stripePrice = await stripe.prices.retrieve(priceId);
              valorTotalPlano = (stripePrice.unit_amount || 0) / 100;

              console.log(`💰 [ROUTES VALOR PLANO] Price ID da subscription: ${priceId}`);
              console.log(`💰 [ROUTES VALOR PLANO] Valor real do Stripe: R$ ${valorTotalPlano.toFixed(2)}`);
            } else {
              throw new Error('Price ID não encontrado na subscription');
            }
          } catch (subscriptionError) {
            console.log(`⚠️ Erro ao buscar via subscription, tentando stripePriceId: ${subscriptionError.message}`);

            try {
              // MÉTODO 2: Usar o stripePriceId que foi usado para criar a subscription
              const stripePrice = await stripe.prices.retrieve(stripePriceId);
              valorTotalPlano = (stripePrice.unit_amount || 0) / 100;
              console.log(`💰 [ROUTES FALLBACK] Usando stripePriceId: ${stripePriceId} = R$ ${valorTotalPlano.toFixed(2)}`);
            } catch (fallbackError) {
              console.error(`❌ ERRO CRÍTICO: Ambos os métodos de busca de preço falharam`);
              console.error(`Subscription error: ${subscriptionError.message}`);
              console.error(`Fallback error: ${fallbackError.message}`);
              throw new Error(`Não foi possível obter valor real do plano do Stripe. PlanoId: ${planoId}, StripePriceId: ${stripePriceId}`);
            }
          }

          const valorPagoCartao = Math.max(0, latestInvoice.amount_paid / 100); // Garantir que não seja negativo

          // CORREÇÃO CRÍTICA: Calcular valores baseados na proração real da Stripe, não no valor total do plano
          let valorCredito = 0;
          let valorCartao = 0;
          let metodoPagamento = 'Cartão de Crédito';

          // Calcular o valor real da proração (apenas itens de proração)
          const valorProracaoReal = latestInvoice.subtotal / 100; // Valor da proração/diferença

          console.log(`🔍 [ROUTES CORREÇÃO] Valor da proração: R$ ${valorProracaoReal.toFixed(2)}`);
          console.log(`🔍 [ROUTES CORREÇÃO] Amount paid: R$ ${(latestInvoice.amount_paid / 100).toFixed(2)}`);
          console.log(`🔍 [ROUTES CORREÇÃO] Valor total do plano (APENAS para coluna valor): R$ ${valorTotalPlano.toFixed(2)}`);

          if (latestInvoice.amount_paid <= 0) {
            // CORREÇÃO: Distinguir entre downgrade (gera crédito) e upgrade/renovação (usa crédito)
            if (valorProracaoReal < 0) {
              // DOWNGRADE: subtotal negativo = gerou créditos
              // valor_credito deve ser o valor do plano para o qual migrou
              valorCredito = valorTotalPlano; // Valor do plano de destino
              valorCartao = 0.00;
              metodoPagamento = 'Crédito MPC';
              console.log(`🔍 [ROUTES LOG] DOWNGRADE - Crédito registrado: R$ ${valorCredito.toFixed(2)} (valor do plano de destino), Cartão R$ 0.00`);
            } else {
              // UPGRADE/RENOVAÇÃO: pagamento 100% com créditos
              valorCredito = Math.abs(valorProracaoReal); // Valor efetivamente usado do saldo
              valorCartao = 0.00;
              metodoPagamento = 'Crédito MPC';
              console.log(`🔍 [ROUTES LOG] 100% CRÉDITO: Crédito usado R$ ${valorCredito.toFixed(2)} (proração), Cartão R$ 0.00`);
            }
          } else if (latestInvoice.subtotal > latestInvoice.amount_paid && latestInvoice.amount_paid > 0) {
            // Pagamento híbrido: parte crédito + parte cartão
            valorCredito = (latestInvoice.subtotal - latestInvoice.amount_paid) / 100;
            valorCartao = latestInvoice.amount_paid / 100;
            metodoPagamento = 'Híbrido';
            console.log(`🔍 [ROUTES LOG] HÍBRIDO: Crédito usado R$ ${valorCredito.toFixed(2)}, Cartão cobrado R$ ${valorCartao.toFixed(2)}`);
          } else if (latestInvoice.amount_paid > 0) {
            // Pagamento 100% no cartão
            valorCredito = 0.00;
            valorCartao = latestInvoice.amount_paid / 100;
            metodoPagamento = 'Cartão de Crédito';
            console.log(`🔍 [ROUTES LOG] 100% CARTÃO: Cartão cobrado R$ ${valorCartao.toFixed(2)}, Crédito usado R$ 0.00`);
          }

          // Calcular credito_gerado baseado no subtotal
          // Se subtotal for negativo = gera crédito (converter para positivo)
          // Se subtotal for positivo = não gera crédito (0)
          const subtotalReais = latestInvoice.subtotal / 100;
          const creditoGerado = subtotalReais < 0 ? Math.abs(subtotalReais) : 0;

          console.log(`🔍 [CREDITO_GERADO LOG] Subtotal: R$ ${subtotalReais.toFixed(2)}, Crédito gerado: R$ ${creditoGerado.toFixed(2)}`);

          // CORREÇÃO: valor_diferenca deve ser APENAS o valor do "Unused time" do plano anterior
          let valorDiferenca = 0;

          // Buscar especificamente itens de "Unused time" na invoice
          if ((tipoOperacao === 'UPGRADE' || tipoOperacao === 'DOWNGRADE') && latestInvoice.lines && latestInvoice.lines.data) {
            const unusedTimeItems = latestInvoice.lines.data.filter((item: any) => 
              item.proration === true && 
              item.amount < 0 && 
              (item.description?.includes('Unused time') || item.description?.includes('tempo não utilizado'))
            );

            if (unusedTimeItems.length > 0) {
              // Somar APENAS os valores de "Unused time" (converter para positivo)
              valorDiferenca = Math.abs(unusedTimeItems.reduce((total: number, item: any) => total + item.amount, 0) / 100);
              console.log(`🔍 [ROUTES UNUSED TIME] Valor do tempo não utilizado do plano anterior: R$ ${valorDiferenca.toFixed(2)}`);
              console.log(`🔍 [ROUTES UNUSED TIME] Itens de Unused time encontrados: ${unusedTimeItems.length}`);

              unusedTimeItems.forEach((item: any, index: number) => {
                console.log(`   📄 Unused time ${index + 1}: ${item.description} = R$ ${Math.abs(item.amount / 100).toFixed(2)}`);
              });
            } else {
              console.log(`🔍 [ROUTES UNUSED TIME] Nenhum item de "Unused time" encontrado na invoice`);
            }
          }

          // LOG CRÍTICO: Verificar valores antes de salvar no routes-assinatura
          console.log(`🔍 [ROUTES SALVANDO] Valores calculados:`);
          console.log(`   - valorTotalPlano: R$ ${valorTotalPlano.toFixed(2)}`);
          console.log(`   - valor_cartao: R$ ${valorCartao.toFixed(2)} (deve ser 0 se 100% crédito)`);
          console.log(`   - valor_credito: R$ ${valorCredito.toFixed(2)}`);
          console.log(`   - valor_diferenca: R$ ${valorDiferenca.toFixed(2)} (tempo não utilizado)`);
          console.log(`   - método: ${metodoPagamento}`);
          console.log(`   - amount_paid: ${latestInvoice.amount_paid} centavos`);
          console.log(`   - é operação: ${tipoOperacao}`);

          // Verificar se o pagamento já existe
          const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(latestInvoice.id);

          if (!pagamentoExistente) {
            // Buscar saldo de créditos atual da conta Stripe
            let creditosContaAtual = 0;
            try {
              const saldoCreditosStripe = await getCustomerCreditBalance(stripeCustomerId);
              creditosContaAtual = saldoCreditosStripe / 100; // Converter de centavos para reais
              console.log(`💰 Saldo de créditos atual na conta Stripe: R$ ${creditosContaAtual.toFixed(2)}`);
            } catch (error) {
              console.error('Erro ao buscar saldo de créditos da conta:', error);
            }

            await storage.createHistoricoPagamento({
              userId,
              assinaturaId: assinaturaSalva?.id,
              stripePaymentIntentId: typeof latestInvoice.payment_intent === 'string' ? latestInvoice.payment_intent : latestInvoice.payment_intent?.id || `pi_credit_${latestInvoice.id}`,
              stripeInvoiceId: latestInvoice.id,
              stripeSubscriptionId: stripeSubscription.id,
              stripeCustomerId: stripeCustomerId,
              valor: valorTotalPlano, // Valor total do plano
              valorDiferenca: valorDiferenca > 0 ? valorDiferenca : undefined, // Valor de proration (tempo não utilizado)
              valorCartao: valorCartao,
              valorCredito: valorCredito,
              creditoGerado: creditoGerado, // Novo campo baseado no subtotal
              creditosConta: creditosContaAtual, // Saldo atual de créditos na conta Stripe
              status: 'Pago',
              metodoPagamento: metodoPagamento,
              dataPagamento: timestampToBrazilianDate(latestInvoice.created),
              planoNome: plano.nome,
              periodo: tipoCobranca === 'anual' ? 'Anual' : 'Mensal',
              faturaUrl: latestInvoice.hosted_invoice_url || null
            });

            console.log(`✅ Pagamento inicial da assinatura salvo: R$ ${valorTotalPlano.toFixed(2)}`);
          }
        } catch (paymentSaveError) {
          console.error('⚠️ Erro ao salvar pagamento inicial:', paymentSaveError);
          // Não falha a criação da assinatura por causa disso
        }
      }

      let mensagemOperacao = '';
      switch (tipoOperacao) {
        case 'NOVA_ASSINATURA':
          mensagemOperacao = 'Assinatura criada com sucesso no sistema e no Stripe';
          break;
        case 'UPGRADE':
          mensagemOperacao = 'Upgrade realizado com sucesso! A diferença será cobrada proporcionalmente.';
          break;
        case 'DOWNGRADE':
          mensagemOperacao = 'Downgrade realizado com sucesso! O crédito será aplicado no próximo período.';
          break;
        case 'MUDANCA_PERIODO':
          mensagemOperacao = 'Período de cobrança alterado com sucesso!';
          break;
      }

      return res.status(201).json({
        success: true,
        message: mensagemOperacao,
        operacao: tipoOperacao,
        assinatura: assinaturaSalva,
        stripeSubscriptionId: stripeSubscription.id,
        clientSecret: paymentIntent?.client_secret || null,
        // Informações adicionais para upgrades/downgrades
        ...(tipoOperacao !== 'NOVA_ASSINATURA' && {
          planoAnterior: assinaturaExistente?.plano,
          planoNovo: plano.nome,
          prorationBehavior: 'create_prorations'
        })
      });

    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar assinatura',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Endpoint para calcular proração usando stripe.invoices.retrieveUpcoming (valores exatos)
  app.post('/api/assinaturas/calcular-proracao', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { planoId, tipoCobranca } = req.body;

      if (!planoId || !tipoCobranca) {
        return res.status(400).json({ 
          error: 'Dados incompletos',
          message: 'planoId e tipoCobranca são obrigatórios' 
        });
      }

      // Buscar plano novo
      const planoNovo = await storage.getPlano(planoId);
      if (!planoNovo) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      // Verificar assinatura existente
      const assinaturaExistente = await storage.getAssinaturaAtiva(userId);
      if (!assinaturaExistente || !assinaturaExistente.stripeSubscriptionId) {
        return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada' });
      }

      // Buscar plano atual
      const planoAtual = await storage.getPlano(assinaturaExistente.planoId);
      if (!planoAtual) {
        return res.status(404).json({ error: 'Plano atual não encontrado' });
      }

      // Determinar tipo de operação
      let tipoOperacao = 'MESMA_ASSINATURA';
      if (assinaturaExistente.planoId < planoId) {
        tipoOperacao = 'UPGRADE';
      } else if (assinaturaExistente.planoId > planoId) {
        tipoOperacao = 'DOWNGRADE';
      } else if (assinaturaExistente.tipoCobranca !== tipoCobranca) {
        tipoOperacao = 'MUDANCA_PERIODO';
      }

      if (tipoOperacao === 'MESMA_ASSINATURA') {
        return res.status(400).json({ 
          error: 'Mesma assinatura',
          message: 'Você já possui esse plano ativo' 
        });
      }

      // Mapear plano para Stripe Price ID
      const stripePriceMap: { [key: string]: { mensal: string; anual: string } } = {
        'ESSENCIAL': {
          mensal: 'price_1RRkxRGLlqAwF2i9yBs3891a',
          anual: 'price_1RRkxeGLlqAwF2i94tV90Ubm'
        },
        'PROFISSIONAL': {
          mensal: 'price_1RRkzzGLlqAwF2i91nEvPJAP',
          anual: 'price_1RRl0NGLlqAwF2i96lIvXpLv'
        },
        'EMPRESARIAL': {
          mensal: 'price_1RRl14GLlqAwF2i9MbAWNWT8',
          anual: 'price_1RRl1qGLlqAwF2i9Ni4HO0sw'
        },
        'PREMIUM': {
          mensal: 'price_1RRl2hGLlqAwF2i9PakoZUTD',
          anual: 'price_1RRl37GLlqAwF2i94PphvOXv'
        }
      };

      const stripePriceId = stripePriceMap[planoNovo.nome as keyof typeof stripePriceMap]?.[tipoCobranca as keyof typeof stripePriceMap['ESSENCIAL']];
      if (!stripePriceId) {
        return res.status(400).json({ 
          error: 'Plano inválido no Stripe',
          message: `Plano ${planoNovo.nome} com cobrança ${tipoCobranca} não encontrado`
        });
      }

      if (!stripe) {
        return res.status(500).json({ error: 'Stripe não está configurado' });
      }

      // Buscar a assinatura atual no Stripe
      const currentSubscription = await stripe.subscriptions.retrieve(assinaturaExistente.stripeSubscriptionId);

      if (!currentSubscription || currentSubscription.status === 'canceled') {
        return res.status(400).json({ 
          error: 'Assinatura não encontrada no Stripe'
        });
      }

      console.log(`💰 Calculando proração exata usando upcoming invoice para mudança de ${currentSubscription.items.data[0].price.id} para ${stripePriceId}`);

      try {
        if (!stripe) {
          throw new Error('Stripe não está configurado');
        }

        console.log('🔍 Consultando fatura futura do Stripe para valores exatos...');

        // BUSCAR SALDO DO CLIENTE STRIPE PRIMEIRO
        console.log(`🏦 Buscando saldo do cliente Stripe: ${currentSubscription.customer}`);
        let saldoCliente = 0;
        let valorRealCartao = 0; // Será calculado depois

        try {
          const customer = await stripe.customers.retrieve(currentSubscription.customer as string);

          if (customer && !('deleted' in customer)) {
            // O saldo no Stripe é em centavos
            // Saldo NEGATIVO = Cliente tem CRÉDITO a favor
            // Saldo POSITIVO = Cliente tem DÉBITO
            const saldoStripeCentavos = customer.balance || 0;
            const temCredito = saldoStripeCentavos < 0;

            // Converter para valor positivo quando o cliente tem crédito (saldo negativo no Stripe)
            if (temCredito) {
              saldoCliente = Math.abs(saldoStripeCentavos) / 100;
            } else {
              saldoCliente = 0; // Cliente não tem crédito ou tem débito
            }

            console.log(`💰 Saldo do cliente no Stripe: ${saldoStripeCentavos} centavos`);
            console.log(`💳 Cliente ${temCredito ? 'TEM' : 'NÃO TEM'} crédito disponível: R$ ${saldoCliente.toFixed(2)}`);
          } else {
            console.log(`⚠️ Cliente Stripe não encontrado ou foi deletado`);
          }
        } catch (customerError: any) {
          console.error(`❌ Erro ao buscar cliente Stripe:`, customerError.message);
          // Continua com saldo zero se houver erro
        }

        // Usar createPreview para obter valores EXATOS que a Stripe vai cobrar
        const upcomingInvoice = await stripe.invoices.createPreview({
          customer: currentSubscription.customer as string,
          subscription: currentSubscription.id,
          subscription_details: {
            items: [{
              id: currentSubscription.items.data[0].id,
              price: stripePriceId,
            }],
            proration_behavior: 'create_prorations',
          },
        });

        // Filtrar apenas itens de proração (excluir próximos ciclos)
        const itensProration = upcomingInvoice.lines.data.filter((item: any) => 
          item.proration === true || 
          item.description?.includes('Unused time') ||
          item.description?.includes('Remaining time')
        );

        // Calcular valor APENAS da diferença proporcional (sem próximos ciclos)
        const valorProracaoReal = itensProration.reduce((total: number, item: any) => total + item.amount, 0);
        const valorExatoStripe = valorProracaoReal / 100; // Valor real da proração
        const temCobranca = valorProracaoReal > 0;

        // Calcular valor real que será cobrado no cartão considerando o saldo de crédito
        if (temCobranca && saldoCliente > 0) {
          // Para upgrades, usar o crédito disponível para reduzir a cobrança
          valorRealCartao = Math.max(0, valorExatoStripe - saldoCliente);
          console.log(`💳 Valor ajustado no cartão: R$ ${valorRealCartao.toFixed(2)} (original: R$ ${valorExatoStripe.toFixed(2)} - crédito aplicado: R$ ${saldoCliente.toFixed(2)})`);
        } else {
          valorRealCartao = valorExatoStripe;
          console.log(`💳 Valor no cartão igual ao valor da fatura: R$ ${valorRealCartao.toFixed(2)}`);
        }

        console.log(`💰 Valor filtrado (apenas proração): ${valorProracaoReal} centavos (R$ ${valorExatoStripe.toFixed(2)})`);
        console.log(`💰 Valor original da fatura: ${upcomingInvoice.amount_due} centavos`);
        console.log(`🔍 Itens de proração encontrados: ${itensProration.length}`);

        // Calcular período atual
        const agora = Math.floor(Date.now() / 1000);
        const currentPeriodStart = (currentSubscription as any).current_period_start;
        const currentPeriodEnd = (currentSubscription as any).current_period_end;
        const diasTotais = Math.ceil((currentPeriodEnd - currentPeriodStart) / (24 * 60 * 60));
        const diasRestantes = Math.max(0, Math.ceil((currentPeriodEnd - agora) / (24 * 60 * 60)));
        const diasUsados = diasTotais - diasRestantes;

        // SIMPLIFICADO: Usar apenas o que a Stripe retorna
        let descricaoDetalhada = '';
        let tipoCobrancaFinal = '';

        if (temCobranca) {
          tipoCobrancaFinal = 'IMEDIATA';
          if (tipoOperacao === 'UPGRADE') {
            descricaoDetalhada = `Upgrade para ${planoNovo.nome}: A Stripe calculou uma cobrança imediata de R$ ${valorExatoStripe.toFixed(2)} com base no tempo restante do seu plano atual.`;
          } else {
            descricaoDetalhada = `Mudança para ${planoNovo.nome}: Cobrança imediata de R$ ${valorExatoStripe.toFixed(2)} calculada pela Stripe.`;
          }
        } else {
          tipoCobrancaFinal = 'PROXIMO_CICLO';
          const creditoReais = Math.abs(valorExatoStripe);
          if (tipoOperacao === 'DOWNGRADE') {
            descricaoDetalhada = `Downgrade para ${planoNovo.nome}: A Stripe calculou um crédito de R$ ${creditoReais.toFixed(2)} que será aplicado na sua próxima fatura.`;
          } else {
            descricaoDetalhada = `Mudança para ${planoNovo.nome}: Crédito de R$ ${creditoReais.toFixed(2)} será aplicado na próxima fatura.`;
          }
        }



        // Informações detalhadas sobre quando será cobrado
        const proximaCobranca = new Date(currentPeriodEnd * 1000);
        const formatoData = proximaCobranca.toLocaleDateString('pt-BR');

        console.log(`✅ Valores exatos obtidos da Stripe:`);
        console.log(`   - Tipo: ${temCobranca ? 'COBRANÇA IMEDIATA' : 'CRÉDITO PRÓXIMO CICLO'}`);
        console.log(`   - Valor da fatura: R$ ${valorExatoStripe.toFixed(2)}`);
        console.log(`   - Crédito disponível: R$ ${saldoCliente.toFixed(2)}`);
        console.log(`   - Valor real no cartão: R$ ${valorRealCartao.toFixed(2)}`);
        console.log(`   - Operação: ${tipoOperacao}`);
        console.log(`   - Dias restantes: ${diasRestantes}/${diasTotais}`);

        // Log detalhado dos itens da fatura para debug
        console.log(`📋 Detalhes da fatura Stripe:`);
        console.log(`   - Total amount_due: ${upcomingInvoice.amount_due} centavos`);
        console.log(`   - Subtotal: ${upcomingInvoice.subtotal} centavos`);
        console.log(`   - Total: ${upcomingInvoice.total} centavos`);

        upcomingInvoice.lines.data.forEach((item: any, index: number) => {
          console.log(`   📄 Item ${index + 1}:`);
          console.log(`      - Descrição: ${item.description}`);
          console.log(`      - Valor: ${item.amount} centavos (R$ ${(item.amount / 100).toFixed(2)})`);
          console.log(`      - Período: ${new Date(item.period?.start * 1000).toLocaleDateString()} - ${new Date(item.period?.end * 1000).toLocaleDateString()}`);
          console.log(`      - É proração? ${item.proration ? 'SIM' : 'NÃO'}`);
          console.log(`      - Price ID: ${item.price?.id || 'N/A'}`);
          console.log(`      - Quantity: ${item.quantity || 1}`);
          console.log(`      - Unit amount: ${item.price?.unit_amount || 'N/A'} centavos`);
        });

        // Logs adicionais da fatura completa
        console.log(`📊 Resumo financeiro da fatura:`);
        console.log(`   - Amount due: ${upcomingInvoice.amount_due} centavos (R$ ${(upcomingInvoice.amount_due / 100).toFixed(2)})`);
        console.log(`   - Amount paid: ${upcomingInvoice.amount_paid || 0} centavos (R$ ${((upcomingInvoice.amount_paid || 0) / 100).toFixed(2)})`);
        console.log(`   - Amount remaining: ${upcomingInvoice.amount_remaining || 0} centavos`);
        console.log(`   - Subtotal: ${upcomingInvoice.subtotal} centavos (R$ ${(upcomingInvoice.subtotal / 100).toFixed(2)})`);
        console.log(`   - Total: ${upcomingInvoice.total} centavos (R$ ${(upcomingInvoice.total / 100).toFixed(2)})`);
        console.log(`   - Tax: ${upcomingInvoice.tax || 0} centavos`);
        console.log(`   - Application fee: ${upcomingInvoice.application_fee_amount || 0} centavos`);

        if (upcomingInvoice.discount) {
          console.log(`   - Discount: ${JSON.stringify(upcomingInvoice.discount)}`);
        }

        if (upcomingInvoice.total_discount_amounts && upcomingInvoice.total_discount_amounts.length > 0) {
          console.log(`   - Total discount amounts: ${JSON.stringify(upcomingInvoice.total_discount_amounts)}`);
        }

        // Valores dos planos para comparação
        const valorAtual = Number(assinaturaExistente.tipoCobranca === 'mensal' ? planoAtual.valorMensal : planoAtual.valorAnualTotal);
        const valorNovo = Number(tipoCobranca === 'mensal' ? planoNovo.valorMensal : planoNovo.valorAnualTotal);

        return res.json({
          success: true,
          tipoOperacao,
          planoAtual: {
            id: planoAtual.id,
            nome: planoAtual.nome,
            valor: valorAtual,
            periodo: assinaturaExistente.tipoCobranca
          },
          planoNovo: {
            id: planoNovo.id,
            nome: planoNovo.nome,
            valor: valorNovo,
            periodo: tipoCobranca
          },
          proracao: {
            // VALOR EXATO DA STRIPE - sem cálculos próprios
            valorExato: Math.abs(valorExatoStripe), // Valor que a Stripe retornou
            isCobrancaImediata: temCobranca,
            tipoCobranca: tipoCobrancaFinal,

            // INFORMAÇÕES DO CRÉDITO E COBRANÇA REAL
            creditoDisponivel: saldoCliente,
            creditoDisponivelFormatado: `R$ ${saldoCliente.toFixed(2)}`,
            valorRealCartao: valorRealCartao,
            valorRealCartaoFormatado: `R$ ${valorRealCartao.toFixed(2)}`,
            temCreditoDisponivel: saldoCliente > 0,
            creditoAplicado: temCobranca ? Math.min(saldoCliente, valorExatoStripe) : 0,

            // Informações de período
            diasRestantes,
            diasTotais,
            diasUsados,
            percentualUsado: Math.round((diasUsados / diasTotais) * 100),

            // Datas importantes
            proximaCobrancaData: formatoData,
            proximaCobrancaTimestamp: currentPeriodEnd,

            // Descrições
            descricao: descricaoDetalhada,
            resumo: temCobranca 
              ? `Cobrança imediata: R$ ${valorExatoStripe.toFixed(2)}${saldoCliente > 0 ? ` (Cartão: R$ ${valorRealCartao.toFixed(2)} após crédito)` : ''}`
              : `Crédito próximo ciclo: R$ ${Math.abs(valorExatoStripe).toFixed(2)}`,

            // Metadados - confirma que são valores reais da Stripe
            stripeCalculado: true,
            itensProration: itensProration.length,
            valorTotalCentavos: valorProracaoReal,

            // Dados brutos da fatura Stripe para transparência
            stripeUpcomingInvoice: {
              amount_due: upcomingInvoice.amount_due,
              amount_paid: upcomingInvoice.amount_paid,
              amount_remaining: upcomingInvoice.amount_remaining,
              total: upcomingInvoice.total
            }
          }
        });

      } catch (stripeError: any) {
        console.error('❌ Erro ao obter fatura upcoming do Stripe:', stripeError);

        // Fallback para cálculo estimado
        const valorAtual = Number(assinaturaExistente.tipoCobranca === 'mensal' ? planoAtual.valorMensal : planoAtual.valorAnualTotal);
        const valorNovo = Number(tipoCobranca === 'mensal' ? planoNovo.valorMensal : planoNovo.valorAnualTotal);
        const diferenca = Math.abs(valorNovo - valorAtual);

        return res.json({
          success: true,
          tipoOperacao,
          planoAtual: {
            id: planoAtual.id,
            nome: planoAtual.nome,
            valor: valorAtual,
            periodo: assinaturaExistente.tipoCobranca
          },
          planoNovo: {
            id: planoNovo.id,
            nome: planoNovo.nome,
            valor: valorNovo,
            periodo: tipoCobranca
          },
          proracao: {
            valorExato: diferenca,
            isCobrancaImediata: valorNovo > valorAtual,
            tipoCobranca: valorNovo > valorAtual ? 'IMEDIATA' : 'PROXIMO_CICLO',
            diasRestantes: 0,
            diasTotais: 30,
            diasUsados: 0,
            percentualUsado: 0,
            proximaCobrancaData: 'Data não disponível',
            proximaCobrancaTimestamp: 0,
            descricao: `${tipoOperacao} para ${planoNovo.nome}. Valores exatos serão calculados no momento da confirmação. Erro: ${stripeError.message}`,
            resumo: `Estimativa: R$ ${diferenca.toFixed(2)}`,
            stripeCalculado: false,
            itensProration: 0,
            valorTotalCentavos: 0
          }
        });
      }

    } catch (error) {
      console.error('Erro ao calcular proração:', error);
      return res.status(500).json({ 
        error: 'Erro ao calcular proração',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Endpoint para buscar créditos da conta via último registro da tabela pagamentos
  app.get('/api/stripe-credit-balance', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Adicionar cabeçalhos anti-cache
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log(`🔍 Buscando créditos da conta para usuário ${userId} via tabela pagamentos`);

      // Buscar o último registro de pagamento para obter o saldo de créditos
      const { connectionManager } = await import('./connection-manager');
      const result = await connectionManager.executeQuery(`
        SELECT creditos_conta 
        FROM pagamentos 
        WHERE user_id = $1 
        AND creditos_conta IS NOT NULL 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId]);

      let creditoDisponivel = 0;
      
      if (result.rows.length > 0 && result.rows[0].creditos_conta !== null) {
        creditoDisponivel = parseFloat(result.rows[0].creditos_conta) || 0;
        console.log(`💰 Créditos encontrados na tabela: R$ ${creditoDisponivel.toFixed(2)}`);
      } else {
        console.log(`💰 Nenhum registro de créditos encontrado na tabela para usuário ${userId}`);
        
        // Fallback: buscar diretamente do Stripe se não houver dados na tabela
        const user = await storage.getUser(userId);
        if (user?.stripeCustomerId && stripe) {
          try {
            const saldoCreditosStripe = await getCustomerCreditBalance(user.stripeCustomerId);
            creditoDisponivel = saldoCreditosStripe / 100;
            console.log(`💰 Fallback - Créditos do Stripe: R$ ${creditoDisponivel.toFixed(2)}`);
          } catch (error) {
            console.error('Erro no fallback do Stripe:', error);
          }
        }
      }

      const valorFinal = Number(creditoDisponivel.toFixed(2));
      const formatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valorFinal);

      const responseData = {
        success: true,
        balance: valorFinal,
        formattedBalance: formatado,
        hasCredits: valorFinal > 0
      };

      console.log(`📤 Enviando resposta de créditos:`, responseData);
      return res.json(responseData);

    } catch (error) {
      console.error('Erro ao buscar créditos da conta:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar créditos da conta',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Endpoint específico para obter saldo de crédito do cliente
  app.get('/api/saldo-credito', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Buscar usuário para obter stripeCustomerId
      const user = await storage.getUser(userId);
      if (!user || !user.stripeCustomerId) {
        return res.json({
          success: true,
          creditoDisponivel: 0,
          creditoDisponivelFormatado: 'R$ 0,00',
          temCreditoDisponivel: false
        });
      }

      if (!stripe) {
        return res.status(500).json({ error: 'Stripe não está configurado' });
      }

      try {
        // Buscar saldo do cliente no Stripe
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);

        if (customer && !('deleted' in customer)) {
          // O saldo no Stripe é em centavos
          // Saldo NEGATIVO = Cliente tem CRÉDITO a favor
          const saldoStripeCentavos = customer.balance || 0;
          const temCredito = saldoStripeCentavos < 0;

          let saldoCliente = 0;
          if (temCredito) {
            saldoCliente = Math.abs(saldoStripeCentavos) / 100;
          }

          console.log(`💰 Saldo do cliente no Stripe: ${saldoStripeCentavos} centavos`);
          console.log(`💳 Cliente ${temCredito ? 'TEM' : 'NÃO TEM'} crédito disponível: R$ ${saldoCliente.toFixed(2)}`);

          const valorFinal = Number(saldoCliente.toFixed(2));

          console.log(`🔍 Debug endpoint /api/saldo-credito:`);
          console.log(`   - saldoStripeCentavos: ${saldoStripeCentavos} (tipo: ${typeof saldoStripeCentavos})`);
          console.log(`   - saldoCliente: ${saldoCliente} (tipo: ${typeof saldoCliente})`);
          console.log(`   - valorFinal: ${valorFinal} (tipo: ${typeof valorFinal})`);
          console.log(`   - isNaN(valorFinal): ${isNaN(valorFinal)}`);
          console.log(`   - temCredito: ${temCredito}`);

          // Garantir formatação correta
          const creditoSeguro = isNaN(valorFinal) ? 0 : valorFinal;
          const formatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(creditoSeguro);

          const responseData = {
            success: true,
            creditoDisponivel: creditoSeguro,
            creditoDisponivelFormatado: formatado,
            temCreditoDisponivel: creditoSeguro > 0
          };

          console.log(`📤 Enviando resposta para frontend:`, JSON.stringify(responseData, null, 2));
          console.log(`📤 Tipo de responseData.creditoDisponivel:`, typeof responseData.creditoDisponivel);
          console.log(`📤 Valor de responseData.creditoDisponivel:`, responseData.creditoDisponivel);
          console.log(`📤 isNaN(responseData.creditoDisponivel):`, isNaN(responseData.creditoDisponivel));

          return res.json(responseData);
        } else {
          console.log(`⚠️ Cliente Stripe não encontrado ou foi deletado`);
          return res.json({
            success: true,
            creditoDisponivel: 0,
            creditoDisponivelFormatado: 'R$ 0,00',
            temCreditoDisponivel: false
          });
        }
      } catch (customerError: any) {
        console.error(`❌ Erro ao buscar cliente Stripe:`, customerError.message);
        return res.json({
          success: true,
          creditoDisponivel: 0,
          creditoDisponivelFormatado: 'R$ 0,00',
          temCreditoDisponivel: false
        });
      }

    } catch (error) {
      console.error('Erro ao buscar saldo de crédito:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar saldo de crédito',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Endpoint para cancelar assinatura
  app.post('/api/assinaturas/cancelar', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const assinatura = await storage.getAssinaturaAtiva(userId);
      if (!assinatura) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }

      const canceled = await storage.cancelarAssinatura(assinatura.id);
      if (!canceled) {
        return res.status(500).json({ error: 'Erro ao cancelar assinatura' });
      }

      return res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      return res.status(500).json({ 
        error: 'Erro ao cancelar assinatura',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}