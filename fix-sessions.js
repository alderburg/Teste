import { executeQuery } from './server/db.ts';

async function createTestSessions() {
  try {
    console.log('Criando sessões de teste...');
    
    // Primeiro, verificar se o usuário existe
    const userCheck = await executeQuery('SELECT id, username, email FROM users WHERE id = 3');
    console.log('Usuário encontrado:', userCheck.rows);
    
    if (userCheck.rows.length === 0) {
      console.log('Usuário com ID 3 não encontrado. Verificando outros usuários...');
      const allUsers = await executeQuery('SELECT id, username, email FROM users LIMIT 5');
      console.log('Usuários disponíveis:', allUsers.rows);
      return;
    }
    
    // Limpar sessões antigas do usuário 3
    await executeQuery('DELETE FROM user_sessions WHERE user_id = 3');
    console.log('Sessões antigas removidas');
    
    // Criar sessões de teste
    const sessionsData = [
      {
        user_id: 3,
        token: 'session_desktop_current_123',
        device_info: 'Desktop Windows 11',
        browser: 'Chrome 131.0',
        ip: '127.0.0.1',
        location: 'São Paulo, SP - Brasil',
        current: true
      },
      {
        user_id: 3,
        token: 'session_mobile_456',
        device_info: 'iPhone 15 Pro',
        browser: 'Safari Mobile 17.1',
        ip: '192.168.1.100',
        location: 'Rio de Janeiro, RJ - Brasil',
        current: false
      },
      {
        user_id: 3,
        token: 'session_tablet_789',
        device_info: 'iPad Air',
        browser: 'Safari iPadOS 17.1',
        ip: '10.0.0.50',
        location: 'Belo Horizonte, MG - Brasil',
        current: false
      }
    ];
    
    // Inserir sessões
    for (const session of sessionsData) {
      const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Últimos 7 dias
      const lastActivity = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // Últimas 24h
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Expira em 30 dias
      
      await executeQuery(`
        INSERT INTO user_sessions 
        (user_id, token, device_info, browser, ip, location, created_at, last_activity, expires_at, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        session.user_id,
        session.token,
        session.device_info,
        session.browser,
        session.ip,
        session.location,
        createdAt,
        lastActivity,
        expiresAt,
        true
      ]);
      
      console.log(`Sessão criada: ${session.device_info} - ${session.browser}`);
    }
    
    // Verificar se as sessões foram criadas
    const createdSessions = await executeQuery(`
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
          WHEN us.device_info ILIKE '%ipad%' OR us.device_info ILIKE '%tablet%'
          THEN 'tablet'
          ELSE 'desktop'
        END as device_type,
        CASE 
          WHEN us.token = 'session_desktop_current_123'
          THEN true
          ELSE false
        END as current
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.user_id = 3 AND us.is_active = TRUE 
      ORDER BY us.last_activity DESC
    `);
    
    console.log('\n=== SESSÕES CRIADAS ===');
    createdSessions.rows.forEach((session, index) => {
      console.log(`${index + 1}. ${session.device_info}`);
      console.log(`   Navegador: ${session.browser}`);
      console.log(`   IP: ${session.ip}`);
      console.log(`   Localização: ${session.location}`);
      console.log(`   Usuário: ${session.username} (${session.email})`);
      console.log(`   Tipo: ${session.device_type}`);
      console.log(`   Sessão atual: ${session.current ? 'SIM' : 'NÃO'}`);
      console.log(`   Token: ${session.token.substring(0, 20)}...`);
      console.log('   ---');
    });
    
    console.log(`Total de sessões criadas: ${createdSessions.rows.length}`);
    
  } catch (error) {
    console.error('Erro ao criar sessões:', error);
  }
}

createTestSessions();