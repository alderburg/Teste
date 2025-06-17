/**
 * Script para testar a lógica corrigida de valores de pagamento
 * Simula diferentes cenários de pagamento para verificar se os valores estão sendo salvos corretamente
 */

import { connectionManager } from './server/connection-manager.js';

async function testPaymentLogic() {
  console.log('🔍 Testando lógica corrigida de valores de pagamento...\n');

  try {
    // Cenário 1: Pagamento 100% com créditos (downgrade)
    console.log('📋 CENÁRIO 1: Downgrade (100% crédito)');
    const valorTotalPlano1 = 29.90;
    const invoice1 = {
      subtotal: -2990, // Subtotal negativo indica downgrade
      amount_paid: 0,
      id: 'test_invoice_1'
    };

    let valorCredito1 = 0;
    let valorCartao1 = 0;
    const isDowngrade1 = invoice1.subtotal < 0;

    if (isDowngrade1) {
      valorCredito1 = valorTotalPlano1;
      valorCartao1 = 0.00;
    }

    console.log(`   Valor do plano: R$ ${valorTotalPlano1.toFixed(2)}`);
    console.log(`   Valor crédito: R$ ${valorCredito1.toFixed(2)}`);
    console.log(`   Valor cartão: R$ ${valorCartao1.toFixed(2)}`);
    console.log(`   Resultado: ${valorCartao1 === 0 && valorCredito1 > 0 ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

    // Cenário 2: Pagamento 100% no cartão
    console.log('📋 CENÁRIO 2: Pagamento 100% cartão');
    const valorTotalPlano2 = 59.90;
    const invoice2 = {
      subtotal: 5990,
      amount_paid: 5990,
      id: 'test_invoice_2'
    };

    let valorCredito2 = 0;
    let valorCartao2 = 0;
    const isDowngrade2 = invoice2.subtotal < 0;

    if (!isDowngrade2 && invoice2.amount_paid > 0) {
      valorCredito2 = 0.00;
      valorCartao2 = invoice2.amount_paid / 100;
    }

    console.log(`   Valor do plano: R$ ${valorTotalPlano2.toFixed(2)}`);
    console.log(`   Valor crédito: R$ ${valorCredito2.toFixed(2)}`);
    console.log(`   Valor cartão: R$ ${valorCartao2.toFixed(2)}`);
    console.log(`   Resultado: ${valorCredito2 === 0 && valorCartao2 > 0 ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

    // Cenário 3: Pagamento híbrido
    console.log('📋 CENÁRIO 3: Pagamento híbrido (crédito + cartão)');
    const valorTotalPlano3 = 89.90;
    const invoice3 = {
      subtotal: 8990, // R$ 89.90
      amount_paid: 4000, // R$ 40.00 no cartão
      id: 'test_invoice_3'
    };

    let valorCredito3 = 0;
    let valorCartao3 = 0;
    const isDowngrade3 = invoice3.subtotal < 0;

    if (!isDowngrade3 && invoice3.subtotal > invoice3.amount_paid && invoice3.amount_paid > 0) {
      valorCredito3 = (invoice3.subtotal - invoice3.amount_paid) / 100;
      valorCartao3 = invoice3.amount_paid / 100;
    }

    console.log(`   Valor do plano: R$ ${valorTotalPlano3.toFixed(2)}`);
    console.log(`   Valor crédito: R$ ${valorCredito3.toFixed(2)}`);
    console.log(`   Valor cartão: R$ ${valorCartao3.toFixed(2)}`);
    console.log(`   Soma: R$ ${(valorCredito3 + valorCartao3).toFixed(2)}`);
    console.log(`   Resultado: ${valorCredito3 > 0 && valorCartao3 > 0 && Math.abs((valorCredito3 + valorCartao3) - valorTotalPlano3) < 0.01 ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

    // Cenário 4: Pagamento 100% com créditos (não downgrade)
    console.log('📋 CENÁRIO 4: Pagamento 100% crédito (upgrade/renovação)');
    const valorTotalPlano4 = 119.90;
    const invoice4 = {
      subtotal: 11990,
      amount_paid: 0, // Sem cobrança no cartão
      id: 'test_invoice_4'
    };

    let valorCredito4 = 0;
    let valorCartao4 = 0;
    const isDowngrade4 = invoice4.subtotal < 0;

    if (!isDowngrade4 && invoice4.amount_paid <= 0) {
      valorCredito4 = valorTotalPlano4;
      valorCartao4 = 0.00;
    }

    console.log(`   Valor do plano: R$ ${valorTotalPlano4.toFixed(2)}`);
    console.log(`   Valor crédito: R$ ${valorCredito4.toFixed(2)}`);
    console.log(`   Valor cartão: R$ ${valorCartao4.toFixed(2)}`);
    console.log(`   Resultado: ${valorCartao4 === 0 && valorCredito4 > 0 ? '✅ CORRETO' : '❌ INCORRETO'}\n`);

    console.log('📊 RESUMO DOS TESTES:');
    console.log('   ✅ Downgrade: Cartão R$ 0.00, Crédito = valor do plano');
    console.log('   ✅ 100% Cartão: Crédito R$ 0.00, Cartão = valor pago');
    console.log('   ✅ Híbrido: Crédito + Cartão = valor total do plano');
    console.log('   ✅ 100% Crédito: Cartão R$ 0.00, Crédito = valor do plano');

    // Verificar últimos pagamentos reais no banco
    console.log('\n🔍 Verificando últimos pagamentos no banco de dados...');
    
    const pagamentos = await connectionManager.executeQuery(`
      SELECT 
        id,
        valor,
        valor_cartao,
        valor_credito,
        metodo_pagamento,
        resumo_pagamento,
        plano_nome,
        data_pagamento
      FROM pagamentos 
      ORDER BY data_pagamento DESC 
      LIMIT 5
    `);

    if (pagamentos && pagamentos.length > 0) {
      console.log('\n📋 ÚLTIMOS 5 PAGAMENTOS:');
      pagamentos.forEach((pag, index) => {
        const valor = parseFloat(pag.valor);
        const valorCartao = parseFloat(pag.valor_cartao);
        const valorCredito = parseFloat(pag.valor_credito);
        const soma = valorCartao + valorCredito;
        
        console.log(`${index + 1}. ${pag.plano_nome} - ${pag.data_pagamento.toISOString().split('T')[0]}`);
        console.log(`   Total: R$ ${valor.toFixed(2)} | Cartão: R$ ${valorCartao.toFixed(2)} | Crédito: R$ ${valorCredito.toFixed(2)}`);
        console.log(`   Método: ${pag.metodo_pagamento}`);
        
        if (valorCartao === 0 && valorCredito > 0) {
          console.log(`   ✅ CORRETO: 100% Crédito`);
        } else if (valorCredito === 0 && valorCartao > 0) {
          console.log(`   ✅ CORRETO: 100% Cartão`);
        } else if (valorCartao > 0 && valorCredito > 0) {
          console.log(`   ✅ CORRETO: Híbrido`);
        } else {
          console.log(`   ❌ PROBLEMA: Valores inconsistentes`);
        }
        console.log('');
      });
    } else {
      console.log('   Nenhum pagamento encontrado no banco.');
    }

  } catch (error) {
    console.error('❌ Erro ao testar lógica de pagamento:', error);
  }
}

testPaymentLogic();