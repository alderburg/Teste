/**
 * Script para testar se os valores de pagamento estão sendo salvos corretamente
 * após as correções na lógica de valor_credito e valor_cartao
 */

import { neon } from '@neondatabase/serverless';

async function testPaymentValues() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não encontrada');
    return;
  }

  try {
    const sql = neon(databaseUrl);
    
    console.log('🔍 Verificando os últimos 10 pagamentos na tabela...\n');
    
    const pagamentos = await sql(`
      SELECT 
        id,
        valor,
        valor_cartao,
        valor_credito,
        metodo_pagamento,
        resumo_pagamento,
        plano_nome,
        data_pagamento,
        stripe_invoice_id
      FROM pagamentos 
      ORDER BY data_pagamento DESC 
      LIMIT 10
    `);

    if (pagamentos.length === 0) {
      console.log('📝 Nenhum pagamento encontrado na tabela.');
      return;
    }

    console.log('📊 ANÁLISE DOS VALORES DE PAGAMENTO:\n');
    
    let creditoOnly = 0;
    let cardOnly = 0;
    let hybrid = 0;
    let incorrect = 0;

    pagamentos.forEach((pag, index) => {
      const valor = parseFloat(pag.valor);
      const valorCartao = parseFloat(pag.valor_cartao);
      const valorCredito = parseFloat(pag.valor_credito);
      const soma = valorCartao + valorCredito;
      
      console.log(`${index + 1}. ID: ${pag.id}`);
      console.log(`   Plano: ${pag.plano_nome}`);
      console.log(`   Data: ${pag.data_pagamento}`);
      console.log(`   Valor Total: R$ ${valor.toFixed(2)}`);
      console.log(`   Valor Cartão: R$ ${valorCartao.toFixed(2)}`);
      console.log(`   Valor Crédito: R$ ${valorCredito.toFixed(2)}`);
      console.log(`   Soma (C+Cr): R$ ${soma.toFixed(2)}`);
      console.log(`   Método: ${pag.metodo_pagamento}`);
      console.log(`   Resumo: ${pag.resumo_pagamento}`);
      
      // Verificar se os valores estão corretos
      if (valorCartao === 0 && valorCredito > 0) {
        console.log(`   ✅ CORRETO: 100% Crédito`);
        creditoOnly++;
      } else if (valorCredito === 0 && valorCartao > 0) {
        console.log(`   ✅ CORRETO: 100% Cartão`);
        cardOnly++;
      } else if (valorCartao > 0 && valorCredito > 0) {
        console.log(`   ✅ CORRETO: Híbrido`);
        hybrid++;
      } else {
        console.log(`   ❌ INCORRETO: Ambos valores zero ou inconsistente`);
        incorrect++;
      }
      
      // Verificar se a soma bate com o valor total
      if (Math.abs(soma - valor) > 0.01) {
        console.log(`   ⚠️  ATENÇÃO: Soma não confere com valor total!`);
      }
      
      console.log('');
    });

    console.log('📈 RESUMO DA ANÁLISE:');
    console.log(`   • 100% Crédito: ${creditoOnly} pagamentos`);
    console.log(`   • 100% Cartão: ${cardOnly} pagamentos`);
    console.log(`   • Híbrido: ${hybrid} pagamentos`);
    console.log(`   • Incorretos: ${incorrect} pagamentos`);
    
    if (incorrect === 0) {
      console.log('\n✅ SUCESSO: Todos os pagamentos têm valores corretos!');
    } else {
      console.log('\n❌ PROBLEMA: Alguns pagamentos têm valores incorretos.');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar pagamentos:', error);
  }
}

testPaymentValues();