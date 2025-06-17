import { Client } from 'pg';

async function testLogoutDeletion() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔗 Conectado ao banco de dados');

    // Verificar sessões existentes antes do teste
    const beforeResult = await client.query(
      'SELECT id, token, is_active FROM user_sessions ORDER BY created_at DESC LIMIT 5'
    );
    
    console.log('\n📋 Sessões antes do teste:');
    beforeResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Token: ${row.token.substring(0, 8)}..., Ativa: ${row.is_active}`);
    });

    console.log('\n🧪 Para testar o logout:');
    console.log('1. Acesse o sistema e faça login');
    console.log('2. Vá para Minha Conta > Segurança');
    console.log('3. Execute o logout');
    console.log('4. Execute este script novamente para verificar se a sessão foi excluída');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

testLogoutDeletion();