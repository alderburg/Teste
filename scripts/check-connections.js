/**
 * Script para verificar o estado atual das conexões de banco de dados
 * 
 * Permite verificar a quantidade de conexões em uso e o limite disponível
 * sem precisar acessar diretamente o banco de dados.
 */
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function checkDatabaseConnections() {
  console.log('\n📊 VERIFICAÇÃO DE CONEXÕES DE BANCO DE DADOS');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // Criar um pool temporário com apenas uma conexão
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
      max: 1
    });
    
    console.log('Conectando ao banco de dados...');
    const client = await pool.connect();
    
    try {
      // Verificar conexões ativas
      const activeConnectionsResult = await client.query(`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE usename = $1
      `, [process.env.DB_USER]);
      
      const totalDbConnections = parseInt(activeConnectionsResult.rows[0].count);
      console.log(`📊 Conexões no banco: ${totalDbConnections} (reportadas pelo PostgreSQL)`);
      
      // Verificar limites de conexão
      const limitResult = await client.query(`
        SELECT rolconnlimit 
        FROM pg_roles 
        WHERE rolname = $1
      `, [process.env.DB_USER]);
      
      let connectionLimit = 'desconhecido';
      if (limitResult.rows.length > 0) {
        const limit = limitResult.rows[0].rolconnlimit;
        connectionLimit = limit < 0 ? 'ilimitado' : limit;
        console.log(`📊 Limite de conexões: ${connectionLimit}`);
      }
      
      // Verificar atividade do banco de dados
      const activeQueriesResult = await client.query(`
        SELECT query, state, extract(epoch from (now() - query_start)) as duration
        FROM pg_stat_activity 
        WHERE usename = $1 AND state = 'active' AND pid <> pg_backend_pid()
        ORDER BY duration DESC
      `, [process.env.DB_USER]);
      
      if (activeQueriesResult.rows.length > 0) {
        console.log(`\n🔍 Queries ativas (${activeQueriesResult.rows.length}):`);
        activeQueriesResult.rows.forEach((row, index) => {
          const queryPreview = row.query.substring(0, 75).replace(/\s+/g, ' ').trim();
          console.log(`   ${index + 1}. Duração: ${Math.round(row.duration)}s - ${queryPreview}...`);
        });
      } else {
        console.log('\n✅ Sem queries ativas no momento.');
      }
      
      console.log('\n📊 Resumo:');
      console.log(`   - Conexões em uso: ${totalDbConnections} de ${connectionLimit}`);
      const percentUsed = connectionLimit !== 'ilimitado' && connectionLimit !== 'desconhecido' 
        ? Math.round((totalDbConnections / connectionLimit) * 100) 
        : 'N/A';
      
      if (percentUsed !== 'N/A') {
        console.log(`   - Percentual usado: ${percentUsed}%`);
        
        if (percentUsed > 80) {
          console.log('\n⚠️ ALERTA: Uso elevado de conexões!');
        } else if (percentUsed > 60) {
          console.log('\n⚠️ Atenção: Uso moderado de conexões.');
        } else {
          console.log('\n✅ Uso saudável de conexões.');
        }
      }
      
    } finally {
      client.release();
      await pool.end();
      console.log('\n═══════════════════════════════════════════════');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar conexões:', error.message);
  }
}

// Executar a verificação
checkDatabaseConnections().catch(console.error);

// Exportação para ESM
export { checkDatabaseConnections };