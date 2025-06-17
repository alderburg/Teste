// Este script limpa conexões excessivas ao banco PostgreSQL da Locaweb
import pg from 'pg';
import dotenv from 'dotenv';

// Inicializar variáveis de ambiente
dotenv.config();

const { Pool } = pg;

async function limparConexoesLocaweb() {
  console.log('🔄 Iniciando limpeza de conexões ao PostgreSQL da Locaweb...');
  
  // Configurações do banco de dados externo da Locaweb
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    // Limitar conexões para evitar exceder o limite durante a limpeza
    max: 1
  };
  
  console.log(`📡 Conectando ao servidor: ${config.host}`);
  console.log(`👤 Usuário: ${config.user}`);
  console.log(`🗄️ Banco de dados: ${config.database}`);
  
  // Criar pool com configuração mínima
  const pool = new Pool(config);
  
  try {
    // Obter cliente do pool
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso');
    
    try {
      // 1. Verificar número total de conexões para o usuário
      const countResult = await client.query(`
        SELECT COUNT(*) as total 
        FROM pg_stat_activity 
        WHERE usename = $1
      `, [config.user]);
      
      const totalConexoes = parseInt(countResult.rows[0].total);
      console.log(`📊 Total de conexões atuais: ${totalConexoes}`);
      
      // 2. Listar conexões ativas para análise
      console.log('\n📋 Detalhes das conexões ativas:');
      const conexoesResult = await client.query(`
        SELECT pid, datname, state, application_name, 
               backend_start::text, query_start::text, 
               CASE WHEN length(query) > 50 
                    THEN substring(query, 1, 50) || '...' 
                    ELSE query 
               END as query_preview
        FROM pg_stat_activity 
        WHERE usename = $1 AND pid <> pg_backend_pid()
        ORDER BY backend_start DESC
      `, [config.user]);
      
      if (conexoesResult.rows.length === 0) {
        console.log('  Nenhuma conexão adicional encontrada além desta');
      } else {
        conexoesResult.rows.forEach((row, i) => {
          console.log(`\n  Conexão #${i+1}:`);
          console.log(`  • PID: ${row.pid}`);
          console.log(`  • Estado: ${row.state || 'N/A'}`);
          console.log(`  • Aplicação: ${row.application_name || 'Não especificada'}`);
          console.log(`  • Iniciada em: ${row.backend_start || 'N/A'}`);
          console.log(`  • Última query: ${row.query_preview || 'N/A'}`);
        });
      }
      
      // 3. Encerrar conexões inativas primeiro
      console.log('\n🔄 Encerrando conexões inativas...');
      const idleResult = await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE usename = $1 
        AND state = 'idle' 
        AND pid <> pg_backend_pid()
      `, [config.user]);
      
      console.log(`✅ ${idleResult.rowCount} conexões inativas encerradas`);
      
      // 4. Encerrar todas as outras conexões (incluindo ativas)
      console.log('\n⚠️ Encerrando todas as conexões restantes...');
      const allResult = await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE usename = $1 
        AND pid <> pg_backend_pid()
      `, [config.user]);
      
      console.log(`✅ ${allResult.rowCount} conexões restantes encerradas`);
      
      // 5. Verificação final
      const finalCountResult = await client.query(`
        SELECT COUNT(*) as total 
        FROM pg_stat_activity 
        WHERE usename = $1
      `, [config.user]);
      
      const conexoesRestantes = parseInt(finalCountResult.rows[0].total);
      console.log(`\n📊 Total de conexões após limpeza: ${conexoesRestantes}`);
      console.log('   (Inclui a conexão atual usada para limpeza)');
      
      // 6. Mostrar limites de conexão se disponível
      try {
        const limitResult = await client.query(`
          SELECT rolconnlimit 
          FROM pg_roles 
          WHERE rolname = $1
        `, [config.user]);
        
        if (limitResult.rows.length > 0) {
          const limite = limitResult.rows[0].rolconnlimit;
          console.log(`\n📈 Limite de conexões para usuário ${config.user}: ${limite === -1 ? 'Ilimitado' : limite}`);
        }
      } catch (limitErr) {
        console.log('\n⚠️ Não foi possível verificar o limite de conexões');
      }
      
      console.log('\n✅ Processo de limpeza concluído com sucesso');
      
    } finally {
      // Liberar o cliente de volta para o pool
      client.release();
      console.log('\n📋 Cliente liberado do pool');
    }
  } catch (error) {
    console.error('\n❌ Erro durante a limpeza:', error.message);
    if (error.code === '53300') {
      console.error('   Este erro indica que ainda existem muitas conexões.');
      console.error('   Verifique se outras aplicações estão usando o mesmo banco.');
    }
  } finally {
    // Encerrar pool
    await pool.end();
    console.log('🔄 Pool de conexões encerrado');
  }
}

// Executar a função
limparConexoesLocaweb().catch(err => {
  console.error('❌ Erro fatal:', err);
});