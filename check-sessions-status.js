const { Pool } = require('pg');

// Configuração do banco usando as mesmas variáveis do servidor
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSessionsStatus() {
  try {
    console.log('🔍 Verificando status da tabela user_sessions...');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
      )
    `);
    
    console.log('📋 Tabela user_sessions existe:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Contar total de sessões
      const countResult = await pool.query('SELECT COUNT(*) as total FROM user_sessions');
      console.log('📊 Total de sessões:', countResult.rows[0].total);
      
      // Contar sessões ativas
      const activeResult = await pool.query('SELECT COUNT(*) as active FROM user_sessions WHERE is_active = true');
      console.log('✅ Sessões ativas:', activeResult.rows[0].active);
      
      // Mostrar estrutura da tabela
      const structureResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'user_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('🏗️ Estrutura da tabela:');
      structureResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Mostrar algumas sessões (se existirem)
      if (parseInt(countResult.rows[0].total) > 0) {
        const sessionsResult = await pool.query(`
          SELECT id, user_id, device_info, browser, ip, is_active, created_at, last_activity
          FROM user_sessions 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        
        console.log('📱 Últimas 5 sessões:');
        sessionsResult.rows.forEach(session => {
          console.log(`  ID: ${session.id} | User: ${session.user_id} | Device: ${session.device_info || 'N/A'} | Active: ${session.is_active} | Created: ${session.created_at}`);
        });
      } else {
        console.log('⚠️ Nenhuma sessão encontrada na tabela');
      }
    } else {
      console.log('❌ Tabela user_sessions não existe - criando...');
      
      // Criar a tabela se não existir
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          device_info TEXT,
          browser VARCHAR(100),
          ip VARCHAR(45),
          location TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          last_activity TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ Tabela user_sessions criada com sucesso');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar sessões:', error.message);
  } finally {
    await pool.end();
  }
}

checkSessionsStatus();