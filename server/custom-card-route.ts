import { Express, Request, Response } from 'express';
import { storage } from './storage';
import { stripe } from './stripe-helper';

/**
 * Configura a rota para processar pagamentos com cartão usando SetupIntent
 * Esta rota confirma um SetupIntent com o PaymentMethod já tokenizado pelo frontend
 */
export function setupCustomCardRoute(app: Express) {
  app.post('/api/confirm-card-setup', async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado
      let userId = req.user?.id;

      // Para desenvolvimento - temporário
      if (!userId) {
        console.log('⚠️ Usuário não autenticado, mas continuando para teste');
        userId = 3; // ID de usuário de teste
      }

      // Extrair dados do SetupIntent da requisição
      const { 
        setupIntentId,
        paymentMethodId
      } = req.body;

      // Validações básicas
      if (!setupIntentId) {
        return res.status(400).json({
          error: 'Dados incompletos',
          message: 'SetupIntent ID é obrigatório'
        });
      }

      // Buscar o usuário no banco de dados
      const user = await storage.getUser(userId);

      // Se não encontrar o usuário, retornar erro
      if (!user) {
        console.log(`❌ Usuário ${userId} não encontrado no banco de dados`);
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'Não foi possível encontrar seu perfil. Por favor, entre em contato com o suporte.'
        });
      }

      // Verificar se o usuário já tem um customer ID do Stripe
      let stripeCustomerId = user.stripeCustomerId;

      // Se não tiver, criar um novo customer no Stripe
      if (!stripeCustomerId) {
        console.log(`ℹ️ Usuário ${userId} não possui ID de cliente Stripe, criando...`);

        try {
          if (!user.email) {
            return res.status(400).json({
              error: 'Dados incompletos',
              message: 'Seu perfil não possui um e-mail válido. Por favor, atualize seu perfil.'
            });
          }

          if (!stripe) {
            console.error('Cliente Stripe não está inicializado');
            return res.status(500).json({
              error: 'Serviço indisponível',
              message: 'O serviço de pagamento está temporariamente indisponível'
            });
          }

          const customer = await stripe.customers.create({
            email: user.email,
            name: user.username || user.email.split('@')[0],
            metadata: {
              userId: userId.toString()
            }
          });

          stripeCustomerId = customer.id;

          // Atualizar o ID do cliente no banco de dados
          await storage.updateUser(userId, { stripeCustomerId });

          console.log(`✅ Cliente Stripe criado para usuário ${userId}: ${stripeCustomerId}`);
        } catch (stripeError) {
          console.error('❌ Erro ao criar cliente no Stripe:', stripeError);
          return res.status(500).json({
            error: 'Falha ao criar cliente',
            message: 'Não foi possível criar seu perfil de pagamento'
          });
        }
      }

      if (!stripe) {
        console.error('Cliente Stripe não está inicializado');
        return res.status(500).json({
          error: 'Serviço indisponível',
          message: 'O serviço de pagamento está temporariamente indisponível'
        });
      }

      try {
        // Recuperar o SetupIntent do Stripe para confirmar o status
        const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

        if (setupIntent.status === 'succeeded' && setupIntent.payment_method) {
          const paymentMethodId = typeof setupIntent.payment_method === 'string' 
            ? setupIntent.payment_method 
            : setupIntent.payment_method.id;

          // Anexar o payment method ao customer se ainda não estiver anexado
          try {
            await stripe.paymentMethods.attach(paymentMethodId, { 
              customer: stripeCustomerId 
            });
          } catch (attachError: any) {
            // Se já estiver anexado, ignorar o erro
            if (!attachError.message?.includes('already been attached')) {
              throw attachError;
            }
            console.log(`ℹ️ Payment method ${paymentMethodId} já estava anexado ao cliente`);
          }

          // Recuperar detalhes do payment method para salvar no banco
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

          // Definir como método de pagamento padrão no Stripe
          try {
            await stripe.customers.update(stripeCustomerId, {
              invoice_settings: {
                default_payment_method: paymentMethodId
              }
            });
          } catch (defaultError) {
            console.log('⚠️ Erro ao definir cartão como padrão no Stripe:', defaultError);
            // Continuar mesmo com erro, pois o cartão foi salvo
          }

          // Salvar informações do cartão no banco de dados local
          const cardData = {
            userId,
            stripePaymentMethodId: paymentMethodId,
            brand: paymentMethod.card?.brand || 'unknown',
            last4: paymentMethod.card?.last4 || '0000',
            expMonth: paymentMethod.card?.exp_month || 1,
            expYear: paymentMethod.card?.exp_year || 2025,
            isDefault: true
          };

          await storage.createPaymentMethod(cardData);

          return res.json({
            success: true,
            paymentMethodId,
            setupIntentId,
            message: 'Cartão configurado com sucesso!'
          });
        } else {
          // SetupIntent não foi confirmado ainda
          return res.status(400).json({
            error: 'SetupIntent não confirmado',
            message: 'O cartão ainda não foi validado. Tente novamente.',
            setupIntentStatus: setupIntent.status
          });
        }

      } catch (stripeError: any) {
        console.error('❌ Erro ao processar cartão:', stripeError);

        // Formatar mensagem de erro amigável
        let errorMessage = 'Ocorreu um erro ao processar seu cartão';

        if (stripeError.code) {
          switch (stripeError.code) {
            case 'setup_intent_authentication_failure':
              errorMessage = 'Falha na autenticação do cartão. Verifique os dados e tente novamente.';
              break;
            case 'setup_intent_unexpected_state':
              errorMessage = 'Estado inesperado do setup. Tente novamente.';
              break;
            default:
              errorMessage = stripeError.message || 'Erro ao processar o cartão.';
          }
        }

        return res.status(400).json({
          error: 'Erro de pagamento',
          message: errorMessage,
          code: stripeError.code || 'unknown_error'
        });
      }
    } catch (error) {
      console.error('❌ Erro interno ao processar cartão:', error);
      return res.status(500).json({
        error: 'Erro interno',
        message: 'Ocorreu um erro ao processar sua solicitação'
      });
    }
  });
}