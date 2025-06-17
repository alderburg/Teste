
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não está definida');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function debugSessions() {
  console.log('🔍 TESTE DE DEBUG - SESSÕES ATIVAS');
  console.log('=' .repeat(50));
  
  try {
    // 1. Verificar se a tabela user_sessions existe
    console.log('\n📋 1. VERIFICANDO SE A TABELA EXISTS:');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
      )
    `;
    console.log('Tabela user_sessions existe:', tableExists[0]?.exists);

    if (!tableExists[0]?.exists) {
      console.log('❌ Tabela user_sessions não existe!');
      return;
    }

    // 2. Contar total de sessões
    console.log('\n📊 2. CONTANDO SESSÕES:');
    const totalSessions = await sql`SELECT COUNT(*) as total FROM user_sessions`;
    console.log('Total de sessões na tabela:', totalSessions[0]?.total);

    // 3. Contar sessões ativas
    const activeSessions = await sql`
      SELECT COUNT(*) as total 
      FROM user_sessions 
      WHERE is_active = true AND expires_at > NOW()
    `;
    console.log('Sessões ativas:', activeSessions[0]?.total);

    // 4. Verificar usuários cadastrados
    console.log('\n👥 3. VERIFICANDO USUÁRIOS:');
    const users = await sql`
      SELECT id, username, email, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    console.log('Usuários cadastrados:', users.length);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} | Username: ${user.username} | Email: ${user.email}`);
    });

    // 5. Verificar sessões do usuário 3 (admin)
    console.log('\n🔐 4. SESSÕES DO USUÁRIO 3 (ADMIN):');
    const userSessions = await sql`
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
          WHEN us.expires_at > NOW() AND us.is_active = true THEN 'active'
          WHEN us.expires_at <= NOW() THEN 'expired'
          ELSE 'inactive'
        END as status
      FROM user_sessions us
      LEFT JOIN users u ON us.user_id = u.id
      WHERE us.user_id = 3
      ORDER BY us.last_activity DESC
    `;

    console.log(`Sessões encontradas para usuário 3: ${userSessions.length}`);
    
    userSessions.forEach((session, index) => {
      console.log(`\n--- Sessão ${index + 1} ---`);
      console.log(`ID: ${session.id}`);
      console.log(`Token: ${session.token?.substring(0, 10)}...`);
      console.log(`Device: ${session.device_info || 'N/A'}`);
      console.log(`Browser: ${session.browser || 'N/A'}`);
      console.log(`IP: ${session.ip || 'N/A'}`);
      console.log(`Location: ${session.location || 'N/A'}`);
      console.log(`Created: ${session.created_at}`);
      console.log(`Last Activity: ${session.last_activity}`);
      console.log(`Expires: ${session.expires_at}`);
      console.log(`Is Active: ${session.is_active}`);
      console.log(`Status: ${session.status}`);
      console.log(`Username: ${session.username}`);
      console.log(`Email: ${session.email}`);
    });

    // 6. Verificar todas as sessões ativas (qualquer usuário)
    console.log('\n🌐 5. TODAS AS SESSÕES ATIVAS:');
    const allActiveSessions = await sql`
      SELECT 
        us.id,
        us.user_id,
        us.device_info,
        us.browser,
        us.ip,
        us.is_active,
        us.expires_at,
        u.username
      FROM user_sessions us
      LEFT JOIN users u ON us.user_id = u.id
      WHERE us.is_active = true AND us.expires_at > NOW()
      ORDER BY us.last_activity DESC
      LIMIT 10
    `;

    console.log(`Total de sessões ativas encontradas: ${allActiveSessions.length}`);
    allActiveSessions.forEach((session, index) => {
      console.log(`${index + 1}. User: ${session.username} (ID: ${session.user_id}) | Device: ${session.device_info || 'N/A'} | IP: ${session.ip || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Erro durante o debug:', error);
  }
}

debugSessions()
  .then(() => {
    console.log('\n✅ Debug concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
