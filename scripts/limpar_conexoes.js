import pg from 'pg';
import dotenv from 'dotenv';

// Inicializar configurações do ambiente
dotenv.config();

const { Pool } = pg;

// Usar as mesmas configurações do banco de dados que o aplicativo principal
const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
};

async function limparConexoes() {
  console.log('Iniciando limpeza de conexões do PostgreSQL...');
  console.log(`Conectando a ${config.host} como ${config.user}`);
  
  // Criar um pool de conexões para administração (com apenas 1 conexão)
  const pool = new Pool({
    ...config,
    max: 1, // Limitar a apenas uma conexão para administração
  });
  
  try {
    // Obter uma conexão do pool
    const client = await pool.connect();
    try {
      console.log('Conectado com sucesso. Verificando conexões ativas...');
      
      // Listar todas as conexões ativas para o usuário
      const listaConexoes = await client.query(`
        SELECT pid, datname, usename, application_name, 
               client_addr, backend_start, state, 
               state_change, query_start, query
        FROM pg_stat_activity 
        WHERE usename = $1 AND pid <> pg_backend_pid()
        ORDER BY backend_start
      `, [config.user]);
      
      const totalConexoes = listaConexoes.rows.length;
      console.log(`Total de conexões encontradas: ${totalConexoes}`);
      
      // Mostrar detalhes das conexões
      listaConexoes.rows.forEach((conn, i) => {
        console.log(`\nConexão ${i+1}/${totalConexoes}`);
        console.log(`PID: ${conn.pid}`);
        console.log(`Estado: ${conn.state || 'desconhecido'}`);
        console.log(`Início: ${conn.backend_start}`);
        console.log(`Última query: ${conn.query_start}`);
        console.log(`Aplicação: ${conn.application_name || 'N/A'}`);
      });
      
      // Encerrar todas as conexões inativas primeiro
      console.log('\nEncerrando conexões inativas...');
      const terminateIdleResult = await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE usename = $1 
          AND state = 'idle' 
          AND pid <> pg_backend_pid()
      `, [config.user]);
      
      console.log(`Conexões inativas encerradas: ${terminateIdleResult.rowCount}`);
      
      // Encerrar todas as conexões ativas (exceto a atual)
      console.log('\nEncerrando todas as conexões restantes...');
      const terminateAllResult = await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE usename = $1 
          AND pid <> pg_backend_pid()
      `, [config.user]);
      
      console.log(`Conexões restantes encerradas: ${terminateAllResult.rowCount}`);
      
      // Verificar novamente o total de conexões
      const verificacaoFinal = await client.query(`
        SELECT COUNT(*) as total
        FROM pg_stat_activity 
        WHERE usename = $1
      `, [config.user]);
      
      console.log(`\nTotal de conexões após limpeza: ${verificacaoFinal.rows[0].total}`);
      console.log('(Inclui a conexão desta sessão de limpeza)');
      
      console.log('\nLimpeza de conexões concluída com sucesso!');
      
    } finally {
      // Liberar o cliente de volta para o pool
      client.release();
    }
  } catch (err) {
    console.error('Erro durante a limpeza de conexões:', err);
  } finally {
    // Encerrar o pool
    await pool.end();
    console.log('Pool de conexão encerrado.');
  }
}

// Executar a função de limpeza
limparConexoes();