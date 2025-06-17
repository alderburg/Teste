// Script de diagnóstico para testar autenticação e sessões
import { pool, executeQuery } from './server/db';

async function diagnosticarAutenticacao() {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE AUTENTICAÇÃO');
  console.log('=' * 50);
  
  try {
    // 1. Verificar usuários cadastrados
    console.log('\n📋 1. VERIFICANDO USUÁRIOS CADASTRADOS:');
    const usuarios = await executeQuery(`
      SELECT id, email, username, created_at, last_login, email_verified
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`Total de usuários encontrados: ${usuarios.rows.length}`);
    usuarios.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} | Email: ${user.email} | Username: ${user.username} | Verificado: ${user.email_verified}`);
    });

    // 2. Verificar tabela de sessões
    console.log('\n🔐 2. VERIFICANDO SESSÕES ATIVAS:');
    const sessoes = await executeQuery(`
      SELECT sess, expire
      FROM session 
      WHERE expire > NOW()
      ORDER BY expire DESC
      LIMIT 5
    `);
    
    console.log(`Sessões ativas encontradas: ${sessoes.rows.length}`);
    sessoes.rows.forEach((session, index) => {
      const sessData = JSON.parse(session.sess);
      console.log(`${index + 1}. User ID: ${sessData.passport?.user || 'N/A'} | Expira: ${session.expire}`);
    });

    // 3. Verificar perfis de usuário
    console.log('\n👤 3. VERIFICANDO PERFIS DE USUÁRIO:');
    const perfis = await executeQuery(`
      SELECT up.user_id, up.plano_id, u.email, p.nome as plano_nome
      FROM user_profiles up
      JOIN users u ON u.id = up.user_id
      LEFT JOIN planos p ON p.id = up.plano_id
      ORDER BY up.user_id DESC
      LIMIT 10
    `);
    
    console.log(`Perfis encontrados: ${perfis.rows.length}`);
    perfis.rows.forEach((perfil, index) => {
      console.log(`${index + 1}. User: ${perfil.email} | Plano: ${perfil.plano_nome || 'N/A'}`);
    });

    // 4. Testar uma consulta de autenticação simulada
    if (usuarios.rows.length > 0) {
      const primeiroUser = usuarios.rows[0];
      console.log(`\n🧪 4. TESTANDO CONSULTA DE AUTENTICAÇÃO para ${primeiroUser.email}:`);
      
      const authTest = await executeQuery(`
        SELECT u.id, u.email, u.username, up.plano_id, p.nome as plano_nome
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN planos p ON p.id = up.plano_id
        WHERE u.id = $1
      `, [primeiroUser.id]);
      
      if (authTest.rows.length > 0) {
        console.log('✅ Consulta de autenticação funcionando corretamente');
        console.log('Dados do usuário:', authTest.rows[0]);
      } else {
        console.log('❌ Problema na consulta de autenticação');
      }
    }

    // 5. Verificar configuração de sessão
    console.log('\n⚙️ 5. VERIFICANDO CONFIGURAÇÃO DO BANCO:');
    const config = await executeQuery('SELECT current_setting($1) as timezone', ['TimeZone']);
    console.log(`Timezone do banco: ${config.rows[0].timezone}`);
    
    const connections = await executeQuery(`
      SELECT count(*) as total_connections,
             count(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    console.log(`Conexões totais: ${connections.rows[0].total_connections} | Ativas: ${connections.rows[0].active_connections}`);

  } catch (error) {
    console.error('❌ ERRO no diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n🏁 DIAGNÓSTICO COMPLETO');
}

// Executar diagnóstico
diagnosticarAutenticacao().catch(console.error);