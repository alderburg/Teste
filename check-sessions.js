const { pool } = require('./server/db.ts');

async function checkAndCreateSessions() {
  const client = await pool.connect();
  try {
    console.log('Verificando tabela user_sessions...');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'user_sessions'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('Tabela user_sessions não existe. Criando...');
      
      // Create the table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          device_info TEXT,
          browser TEXT,
          ip VARCHAR(45),
          location TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE
        )
      `);
      
      console.log('Tabela user_sessions criada com sucesso!');
      
      // Create an index for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
      `);
      
      console.log('Índices criados com sucesso!');
    } else {
      console.log('Tabela user_sessions já existe.');
    }
    
    // Check current sessions for user 3
    const sessions = await client.query('SELECT * FROM user_sessions WHERE user_id = 3 AND is_active = TRUE');
    console.log('Sessões ativas para usuário 3:', sessions.rows.length);
    
    if (sessions.rows.length === 0) {
      console.log('Criando sessão de teste para o usuário logado...');
      
      // Create a test session for the current user
      const sessionResult = await client.query(`
        INSERT INTO user_sessions 
        (user_id, token, device_info, browser, ip, location, expires_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *
      `, [
        3, // user_id
        '68hcjvlJpOd_9LknWzhoGc0FoFqoTMh6', // current session token
        'Desktop Computer', // device_info
        'Chrome/131 (Windows)', // browser
        '127.0.0.1', // ip
        'Local Development', // location
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // expires in 30 days
      ]);
      
      console.log('Sessão criada:', sessionResult.rows[0]);
    }
    
    // Show all sessions for user 3
    const allSessions = await client.query(`
      SELECT 
        us.id,
        us.user_id,
        us.token,
        us.device_info,
        us.browser,
        us.ip,
        us.location,
        us.created_at,
        us.last_activity,
        us.expires_at,
        us.is_active,
        u.username,
        u.email,
        CASE 
          WHEN us.device_info ILIKE '%mobile%' OR us.device_info ILIKE '%android%' OR us.device_info ILIKE '%iphone%' 
          THEN 'mobile'
          ELSE 'desktop'
        END as device_type,
        CASE 
          WHEN us.created_at = (
            SELECT MAX(created_at) 
            FROM user_sessions 
            WHERE user_id = us.user_id AND is_active = TRUE
          ) THEN true
          ELSE false
        END as current
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.user_id = 3 AND us.is_active = TRUE 
      ORDER BY us.last_activity DESC
    `);
    
    console.log('Sessões formatadas para exibição:');
    allSessions.rows.forEach(session => {
      console.log(`- ID: ${session.id}, Token: ${session.token.substring(0, 10)}..., Device: ${session.device_type}, Current: ${session.current}`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
  }
}

checkAndCreateSessions().catch(console.error);