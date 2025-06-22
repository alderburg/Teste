/**
 * Script para testar o sistema de encerramento de sessões e notificação WebSocket
 */

import { connectionManager } from './server/connection-manager.js';

async function testSessionTermination() {
  try {
    console.log('🧪 Iniciando teste de encerramento de sessão...');
    
    // 1. Verificar usuários disponíveis
    const usersResult = await connectionManager.executeQuery(`
      SELECT id, username, email FROM users ORDER BY id LIMIT 5
    `);
    
    console.log(`📊 Usuários encontrados:`, usersResult.rows.length);
    if (usersResult.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado para teste');
      return;
    }
    
    const testUserId = usersResult.rows[0].id;
    console.log(`👤 Usando usuário de teste: ID ${testUserId} (${usersResult.rows[0].username})`);
    
    // 2. Buscar sessões ativas do usuário
    const sessionsResult = await connectionManager.executeQuery(`
      SELECT id, token, user_id, is_active, created_at
      FROM user_sessions 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 5
    `, [testUserId]);
    
    console.log(`📊 Sessões ativas encontradas para usuário ${testUserId}:`, sessionsResult.rows.length);
    
    if (sessionsResult.rows.length === 0) {
      // 3. Criar uma sessão de teste se não existir
      console.log('🔄 Criando sessão de teste...');
      const testToken = 'test-session-' + Date.now();
      
      await connectionManager.executeQuery(`
        INSERT INTO user_sessions (user_id, token, ip, device_info, browser, is_active, expires_at)
        VALUES ($1, $2, '127.0.0.1', 'Test Device', 'Test Browser', true, NOW() + INTERVAL '1 hour')
      `, [testUserId, testToken]);
      
      // Buscar novamente
      const newSessionsResult = await connectionManager.executeQuery(`
        SELECT id, token, user_id, is_active, created_at
        FROM user_sessions 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 5
      `, [testUserId]);
      
      sessionsResult.rows = newSessionsResult.rows;
      console.log(`✅ Sessão de teste criada. Total: ${sessionsResult.rows.length}`);
    }
    
    // Mostrar sessões encontradas
    sessionsResult.rows.forEach((session, index) => {
      console.log(`   ${index + 1}. ID: ${session.id}, Token: ${session.token.substring(0, 10)}..., Ativa: ${session.is_active}`);
    });
    
    // 2. Testar a função de notificação WebSocket
    console.log('\n🔔 Testando função de notificação WebSocket...');
    
    if (typeof global.notifySessionTerminated === 'function') {
      console.log('✅ Função notifySessionTerminated encontrada');
      
      // Simular notificação para a primeira sessão
      const testSession = sessionsResult.rows[0];
      console.log(`🧪 Simulando encerramento da sessão ${testSession.id} (token: ${testSession.token.substring(0, 10)}...)`);
      
      global.notifySessionTerminated(testSession.user_id, testSession.token);
      console.log('✅ Notificação WebSocket enviada');
    } else {
      console.log('❌ Função notifySessionTerminated não encontrada no global');
    }
    
    // 3. Verificar clientes WebSocket conectados
    console.log('\n🔌 Verificando clientes WebSocket conectados...');
    
    if (global.wsClients) {
      console.log(`📊 Total de clientes WebSocket: ${global.wsClients.size}`);
      
      if (global.clientsInfo) {
        console.log('📋 Informações dos clientes:');
        global.clientsInfo.forEach((info, ws) => {
          console.log(`   Cliente: ${info.id}, Autenticado: ${info.authenticated}, Usuário: ${info.userId || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ Nenhum cliente WebSocket encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    process.exit(0);
  }
}

// Executar teste
testSessionTermination();