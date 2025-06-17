import fetch from 'node-fetch';

/**
 * Script para testar o fluxo de pagamento completo
 * Este script simula o fluxo do frontend para verificar o comportamento correto do sistema
 */
async function testPaymentFlow() {
  try {
    console.log('Iniciando teste de fluxo de pagamento...');
    
    // Passo 1: Criar um setup intent para preparar o formulário de cartão
    console.log('\n--------- PASSO 1: Criar Setup Intent ---------');
    const setupResponse = await fetch('http://localhost:3000/api/setup-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 3 }) // Usando o ID do admin para teste
    });
    
    const setupData = await setupResponse.json();
    console.log('Status da resposta SetupIntent:', setupResponse.status);
    console.log('Resposta SetupIntent:', setupData);
    
    if (!setupData.clientSecret) {
      throw new Error('Não foi possível obter o client secret do setup intent');
    }
    
    // Passo 2: Simular o processamento do cartão (fictício)
    console.log('\n--------- PASSO 2: Simular confirmação do cartão ---------');
    console.log('Na aplicação real, o Stripe.js confirmaria o setupIntent e retornaria o paymentMethodId');
    
    // Usando um ID de método de pagamento fictício
    const paymentMethodId = 'pm_test_valid_payment_method_' + Date.now();
    console.log('PaymentMethodId simulado:', paymentMethodId);
    
    // Passo 3: Criar a assinatura usando o método de pagamento
    console.log('\n--------- PASSO 3: Criar Assinatura ---------');
    const subscriptionResponse = await fetch('http://localhost:3000/api/assinaturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planoId: 1, // Plano Essencial
        tipoCobranca: 'anual',
        paymentMethodId
      })
    });
    
    const subscriptionData = await subscriptionResponse.json();
    console.log('Status da resposta Assinatura:', subscriptionResponse.status);
    console.log('Resposta Assinatura:', subscriptionData);
    
    // Passo 4: Verificar o status da assinatura
    console.log('\n--------- PASSO 4: Verificar Status da Assinatura ---------');
    const statusResponse = await fetch('http://localhost:3000/api/minha-assinatura');
    const statusData = await statusResponse.json();
    
    console.log('Status da resposta Status Assinatura:', statusResponse.status);
    console.log('Resposta Status Assinatura:', statusData);
    
    console.log('\n--------- TESTE CONCLUÍDO ---------');
    
    if (subscriptionResponse.status === 200 || subscriptionResponse.status === 201) {
      console.log('✅ Teste concluído com sucesso!');
    } else {
      console.log('❌ Teste falhou com erros acima');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testPaymentFlow();

// Adicionar tipo de módulo
export {};