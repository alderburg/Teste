// Criar um setup intent para adicionar um novo método de pagamento
app.post('/api/financeiro/setup-intent', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário já tem um customer ID do Stripe
    let stripeCustomerId = user.stripeCustomerId;
    
    // Se não tiver, criar um novo customer no Stripe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          userId: userId.toString()
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Salvar o customer ID no banco de dados
      await storage.updateUser(userId, { 
        stripeCustomerId 
      });
    }
    
    // Criar um setup intent para adicionar um novo método de pagamento
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',
    });
    
    return res.status(200).json({ 
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId
    });
  } catch (error) {
    console.error('Erro ao criar setup intent:', error);
    return res.status(500).json({ message: 'Erro ao criar setup intent' });
  }
});
