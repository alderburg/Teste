import { Request, Response, Express } from 'express';
import Stripe from 'stripe';

// Criar uma instância do Stripe usando a chave secreta
let stripe: Stripe | null = null;

try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('⚠️ Chave do Stripe não configurada (STRIPE_SECRET_KEY)');
  } else {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil',
    });
    console.log('Status inicial do Stripe: Inicializado - Validando conexão...');
    
    // Testar a conexão com o Stripe ao iniciar o servidor
    stripe.customers.list({ limit: 1 })
      .then(() => {
        console.log('✅ Chave do Stripe validada com sucesso - Conexão estabelecida com a API do Stripe');
      })
      .catch(err => {
        console.error('❌ Erro ao validar chave do Stripe:', err.message);
      });
  }
} catch (error: any) {
  console.error('❌ Erro ao inicializar Stripe:', error.message);
}

/**
 * Configura rota para criar um PaymentIntent do Stripe
 * Esta é a abordagem recomendada pelo Stripe para processar pagamentos
 */
export function setupPaymentIntentRoute(app: Express) {
  app.post('/api/create-payment-intent', async (req: Request, res: Response) => {
    try {
      if (!stripe) {
        throw new Error('Stripe não está configurado corretamente');
      }
      
      // VERIFICAÇÃO ROBUSTA DO USUÁRIO PARA PAGAMENTOS
      const userId = req.user?.id || req.session?.passport?.user;
      const userEmail = req.user?.email;
      const userName = req.user?.username;
      
      if (!userId) {
        console.log('❌ Tentativa de pagamento sem usuário autenticado:', {
          hasUser: !!req.user,
          hasSession: !!req.session,
          hasPassport: !!req.session?.passport
        });
        return res.status(401).json({
          error: true,
          message: 'Usuário não autenticado para realizar pagamento'
        });
      }
      
      const { amount, planoId, tipoCobranca } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          error: true,
          message: 'Valor inválido'
        });
      }
      
      console.log(`✅ Criando PaymentIntent para usuário ${userName} (ID: ${userId}) com valor: R$ ${amount}`);
      
      // Criar um PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Converter para centavos
        currency: 'brl',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          planoId: planoId?.toString() || '',
          tipoCobranca: tipoCobranca || 'mensal',
          userId: userId.toString(),
          userEmail: userEmail || '',
          userName: userName || ''
        }
      });
      
      console.log(`✅ PaymentIntent criado com sucesso: ${paymentIntent.id} para usuário ${userName}`);
      
      // Retorna apenas o client_secret, que é necessário para o frontend
      res.json({
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        userId: userId // Confirmar que o usuário foi identificado
      });
    } catch (error: any) {
      console.error('❌ Erro ao criar PaymentIntent:', error);
      
      res.status(500).json({
        error: true,
        message: error.message || 'Erro ao processar pagamento'
      });
    }
  });
}