/**
 * Script para criar as tabelas de histórico financeiro
 * Este script cria as tabelas necessárias para armazenar pagamentos e assinaturas
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createHistoricoTables() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Criando tabelas de histórico financeiro...');
    
    // Criar tabela de pagamentos
    await client.query(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        metodo_pagamento VARCHAR(100),
        stripe_invoice_id VARCHAR(255) UNIQUE,
        data_pagamento TIMESTAMP,
        plano_nome VARCHAR(255),
        periodo VARCHAR(50),
        fatura_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabela pagamentos criada com sucesso');
    
    // Criar tabela de assinaturas
    await client.query(`
      CREATE TABLE IF NOT EXISTS assinaturas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        stripe_subscription_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL,
        plano_nome VARCHAR(255),
        valor DECIMAL(10,2),
        periodo VARCHAR(50),
        data_inicio TIMESTAMP,
        data_fim TIMESTAMP,
        proxima_cobranca TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabela assinaturas criada com sucesso');
    
    // Criar índices para melhor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON pagamentos(user_id);
      CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON pagamentos(data_pagamento);
      CREATE INDEX IF NOT EXISTS idx_assinaturas_user_id ON assinaturas(user_id);
      CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
    `);
    
    console.log('✅ Índices criados com sucesso');
    
    // Inserir alguns dados de exemplo para o usuário admin (ID 3)
    await client.query(`
      INSERT INTO pagamentos (user_id, valor, status, metodo_pagamento, data_pagamento, plano_nome, periodo)
      VALUES 
        (3, 29.90, 'paid', 'Cartão de Crédito', CURRENT_TIMESTAMP - INTERVAL '30 days', 'Plano Essencial', 'Mensal'),
        (3, 59.90, 'paid', 'Cartão de Crédito', CURRENT_TIMESTAMP - INTERVAL '60 days', 'Plano Profissional', 'Mensal')
      ON CONFLICT DO NOTHING;
    `);
    
    await client.query(`
      INSERT INTO assinaturas (user_id, status, plano_nome, valor, periodo, data_inicio)
      VALUES 
        (3, 'active', 'Plano Essencial', 29.90, 'Mensal', CURRENT_TIMESTAMP - INTERVAL '30 days')
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Dados de exemplo inseridos');
    console.log('🎉 Tabelas de histórico criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createHistoricoTables();