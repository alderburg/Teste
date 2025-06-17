const { Pool } = require('pg');
require('dotenv').config();

// Função principal para gerenciar e reparar conexões
async function fixDatabaseConnections() {
  console.log('Iniciando script de reparo de conexões de banco de dados...');
  
  // Tentativa de criar pool com as credenciais atuais
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('Conexão com o pool estabelecida, verificando status do banco de dados...');
    
    // Testar conexão básica
    const client = await pool.connect();
    try {
      // Verificar se a conexão funciona
      const result = await client.query('SELECT current_timestamp');
      console.log('Conexão de teste bem-sucedida:', result.rows[0]);
      
      // Verificar configurações atuais de conexão para o usuário
      console.log('Verificando limites e conexões para o usuário meuprecocerto...');
      
      // Verificar conexões ativas
      const activeConnections = await client.query(`
        SELECT COUNT(*) as total
        FROM pg_stat_activity
        WHERE usename = 'meuprecocerto'
      `);
      
      console.log(`Total de conexões ativas: ${activeConnections.rows[0].total}`);
      
      // Listar conexões detalhadas para análise
      const connectionDetails = await client.query(`
        SELECT pid, application_name, state, query_start, query
        FROM pg_stat_activity
        WHERE usename = 'meuprecocerto'
        ORDER BY query_start DESC
      `);
      
      console.log('Detalhes das conexões:');
      connectionDetails.rows.forEach((conn, index) => {
        console.log(`Conexão ${index + 1}:`);
        console.log(`  PID: ${conn.pid}`);
        console.log(`  App: ${conn.application_name}`);
        console.log(`  Estado: ${conn.state}`);
        console.log(`  Início da consulta: ${conn.query_start}`);
        console.log(`  Consulta: ${(conn.query || '').substring(0, 100)}...`);
        console.log('---');
      });
      
      // Encerrar conexões "idle" (inativas)
      console.log('Encerrando conexões ociosas...');
      const terminateResult = await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE usename = 'meuprecocerto'
        AND state = 'idle'
        AND pid <> pg_backend_pid()
      `);
      
      console.log(`Conexões ociosas encerradas: ${terminateResult.rowCount}`);
      
      // Verificar novamente após a limpeza
      const afterCleanupConnections = await client.query(`
        SELECT COUNT(*) as total
        FROM pg_stat_activity
        WHERE usename = 'meuprecocerto'
      `);
      
      console.log(`Total de conexões após limpeza: ${afterCleanupConnections.rows[0].total}`);
      
      // Verificar configurações atuais do pool de conexões
      const poolConfig = await client.query(`
        SHOW max_connections;
      `);
      
      console.log(`Configuração atual de max_connections: ${poolConfig.rows[0].max_connections}`);
      
      // Em caso extremo, encerrar todas as conexões exceto a atual
      if (afterCleanupConnections.rows[0].total > 10) {
        console.log('Ainda há muitas conexões. Encerrando todas exceto a atual...');
        const forceTerminate = await client.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE usename = 'meuprecocerto'
          AND pid <> pg_backend_pid()
        `);
        
        console.log(`Todas as conexões encerradas à força: ${forceTerminate.rowCount}`);
      }
      
    } catch (queryError) {
      console.error('Erro ao executar consultas:', queryError);
    } finally {
      // Importante: sempre liberar o cliente de volta para o pool
      client.release();
    }
  } catch (connectionError) {
    console.error('Erro ao conectar ao banco de dados:', connectionError);
  } finally {
    if (pool) {
      // Encerrar o pool de conexões ao final
      await pool.end();
      console.log('Pool de conexões encerrado.');
    }
  }
  
  console.log('Script de reparo de conexões concluído.');
}

// Executar a função principal
fixDatabaseConnections().catch(error => {
  console.error('Erro não tratado:', error);
  process.exit(1);
});