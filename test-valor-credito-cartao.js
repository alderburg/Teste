/**
 * Script para testar se os valores de valor_credito e valor_cartao estão sendo salvos corretamente
 * após as correções implementadas
 */

import pg from 'pg';
const { Pool } = pg;

async function testValorCreditoCartao() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔍 Testando valores de crédito e cartão após correções...\n');

    // Buscar pagamentos recentes para verificar os valores
    const query = `
      SELECT 
        id, 
        user_id,
        valor,
        valor_cartao,
        valor_credito,
        valor_diferenca,
        metodo_pagamento,
        resumo_pagamento,
        plano_nome,
        periodo,
        data_pagamento,
        stripe_invoice_id
      FROM pagamentos 
      WHERE data_pagamento >= NOW() - INTERVAL '30 days'
      ORDER BY data_pagamento DESC
      LIMIT 10
    `;

    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum pagamento encontrado nos últimos 30 dias');
      return;
    }

    console.log(`✅ Encontrados ${result.rows.length} pagamentos para análise:\n`);

    result.rows.forEach((pagamento, index) => {
      console.log(`📋 Pagamento ${index + 1}:`);
      console.log(`   ID: ${pagamento.id}`);
      console.log(`   Usuário: ${pagamento.user_id}`);
      console.log(`   Plano: ${pagamento.plano_nome} (${pagamento.periodo})`);
      console.log(`   Método: ${pagamento.metodo_pagamento}`);
      console.log(`   Data: ${new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR')}`);
      console.log(`   Invoice ID: ${pagamento.stripe_invoice_id}`);
      console.log(`   ✅ Valores:`);
      console.log(`      - Valor total: R$ ${parseFloat(pagamento.valor).toFixed(2)}`);
      console.log(`      - Valor cartão: R$ ${parseFloat(pagamento.valor_cartao || 0).toFixed(2)}`);
      console.log(`      - Valor crédito: R$ ${parseFloat(pagamento.valor_credito || 0).toFixed(2)}`);
      
      if (pagamento.valor_diferenca) {
        const diferenca = parseFloat(pagamento.valor_diferenca);
        if (diferenca > 0) {
          console.log(`      - Saldo entre planos: R$ ${diferenca.toFixed(2)}`);
        } else if (diferenca < 0) {
          console.log(`      - Créditos gerados: R$ ${Math.abs(diferenca).toFixed(2)}`);
        }
      }
      
      console.log(`   💬 Resumo: ${pagamento.resumo_pagamento}`);
      
      // Validações
      const valorTotal = parseFloat(pagamento.valor);
      const valorCartao = parseFloat(pagamento.valor_cartao || 0);
      const valorCredito = parseFloat(pagamento.valor_credito || 0);
      
      console.log(`   🔍 Validações:`);
      
      // Verificar se os valores fazem sentido
      if (pagamento.metodo_pagamento === 'Cartão de Crédito' && valorCredito > 0) {
        console.log(`      ❌ ERRO: Método "Cartão de Crédito" mas tem valor_credito > 0`);
      } else if (pagamento.metodo_pagamento === 'Crédito MPC' && valorCartao > 0) {
        console.log(`      ❌ ERRO: Método "Crédito MPC" mas tem valor_cartao > 0`);
      } else if (pagamento.metodo_pagamento === 'Híbrido' && (valorCartao === 0 || valorCredito === 0)) {
        console.log(`      ❌ ERRO: Método "Híbrido" mas um dos valores é zero`);
      } else {
        console.log(`      ✅ Valores consistentes com o método de pagamento`);
      }
      
      // Verificar se valor_credito + valor_cartao não excede muito o valor total
      // (pode haver pequenas diferenças devido a diferenças entre planos)
      const soma = valorCartao + valorCredito;
      if (Math.abs(soma - valorTotal) > 0.01 && !pagamento.valor_diferenca) {
        console.log(`      ⚠️ ATENÇÃO: Soma cartão+crédito (R$ ${soma.toFixed(2)}) difere do valor total (R$ ${valorTotal.toFixed(2)})`);
      } else {
        console.log(`      ✅ Soma dos valores está coerente`);
      }
      
      console.log('\n' + '─'.repeat(80) + '\n');
    });

    // Estatísticas gerais
    const stats = {
      totalPagamentos: result.rows.length,
      pagamentosCartao: result.rows.filter(p => p.metodo_pagamento === 'Cartão de Crédito').length,
      pagamentosCredito: result.rows.filter(p => p.metodo_pagamento === 'Crédito MPC').length,
      pagamentosHibrido: result.rows.filter(p => p.metodo_pagamento === 'Híbrido').length,
      comDiferenca: result.rows.filter(p => p.valor_diferenca).length
    };

    console.log('📊 ESTATÍSTICAS DOS PAGAMENTOS:');
    console.log(`   Total de pagamentos: ${stats.totalPagamentos}`);
    console.log(`   Cartão de crédito: ${stats.pagamentosCartao}`);
    console.log(`   Crédito MPC: ${stats.pagamentosCredito}`);
    console.log(`   Híbrido: ${stats.pagamentosHibrido}`);
    console.log(`   Com valor_diferenca: ${stats.comDiferenca}`);

  } catch (error) {
    console.error('❌ Erro ao testar valores:', error);
  } finally {
    await pool.end();
  }
}

// Executar o teste
testValorCreditoCartao().catch(console.error);