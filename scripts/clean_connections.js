const { Pool } = require('pg');
require('dotenv').config();

// Configuração da conexão com o banco de dados
// Usando uma conexão administrativa que tenha permissões para encerrar outras conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupConnections() {
  const client = await pool.connect();
  try {
    console.log('Verificando conexões existentes para o usuário meuprecocerto...');
    
    // Consulta para verificar as conexões existentes
    const connectionsResult = await client.query(`
      SELECT pid, application_name, state, query_start
      FROM pg_stat_activity
      WHERE usename = 'meuprecocerto' AND pid <> pg_backend_pid();
    `);
    
    console.log(`Encontradas ${connectionsResult.rows.length} conexões ativas.`);
    
    // Encerrar cada conexão existente
    for (const row of connectionsResult.rows) {
      console.log(`Encerrando conexão PID ${row.pid} (Estado: ${row.state})`);
      
      try {
        // Forçar o encerramento da conexão
        await client.query(`SELECT pg_terminate_backend(${row.pid});`);
        console.log(`Conexão PID ${row.pid} encerrada com sucesso.`);
      } catch (terminateError) {
        console.error(`Erro ao encerrar conexão PID ${row.pid}:`, terminateError);
      }
    }
    
    console.log('Processo de limpeza de conexões concluído.');
  } catch (error) {
    console.error('Erro ao limpar conexões:', error);
  } finally {
    // Importante: liberar o cliente de volta para o pool
    client.release();
    await pool.end();
  }
}

// Executar a função de limpeza
cleanupConnections();