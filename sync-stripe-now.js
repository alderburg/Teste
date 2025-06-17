// Script para sincronizar dados da Stripe imediatamente
import fetch from 'node-fetch';

async function syncStripeData() {
  try {
    console.log('🔄 Iniciando sincronização da Stripe...');
    
    const response = await fetch('http://localhost:5001/api/sync-stripe-payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AazWbwvN5pslSCceZ2sDPzoCb0aHsddlO.HhQrTCWrlY8VPJoY%2Fqp%2FLQe8QNvRLVkYqN6d7GRJmJg'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    console.log('✅ Resultado da sincronização:', result);
    
    // Verificar dados sincronizados
    const historyResponse = await fetch('http://localhost:5001/api/historico-financeiro', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AazWbwvN5pslSCceZ2sDPzoCb0aHsddlO.HhQrTCWrlY8VPJoY%2Fqp%2FLQe8QNvRLVkYqN6d7GRJmJg'
      }
    });

    const historyData = await historyResponse.json();
    console.log('📊 Dados do histórico financeiro:', JSON.stringify(historyData, null, 2));
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

syncStripeData();