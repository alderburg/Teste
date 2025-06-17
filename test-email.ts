import { verifyEmailConfig, sendEmail } from './server/email';
import dotenv from 'dotenv';

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

async function testEmailSystem() {
  console.log('===== TESTE DO SISTEMA DE EMAIL =====');
  
  // Passo 1: Verificar configuração
  console.log('\n1. Verificando configuração de email com Locaweb...');
  const configResult = await verifyEmailConfig();
  
  if (configResult) {
    console.log('✅ Configuração de email verificada com sucesso!');
  } else {
    console.error('❌ Falha na verificação da configuração de email.');
    console.log('   Verifique as seguintes informações:');
    console.log('   - Se o EMAIL_PASSWORD está definido nas variáveis de ambiente');
    console.log('   - Se o host está correto: smtp.locaweb.com.br');
    console.log('   - Se a porta está correta: 465 (SSL) ou 587 (TLS)');
    console.log('   - Se as credenciais de autenticação estão corretas');
    return;
  }
  
  // Passo 2: Tentar enviar um email de teste
  console.log('\n2. Enviando email de teste...');
  
  // Email para teste - pode ser substituído por um email real para teste
  const testEmail = process.env.TEST_EMAIL || 'verificarconta@meuprecocerto.com.br';
  
  const emailResult = await sendEmail({
    to: testEmail,
    subject: 'Teste de Configuração de Email - Meu Preço Certo',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #6366f1;">Teste de Email</h2>
        <p>Este é um email automático para verificar se a configuração SMTP com a Locaweb está funcionando corretamente.</p>
        <p>Se você está vendo esta mensagem, significa que o sistema de envio de emails está funcionando!</p>
        <p>Detalhes da configuração:</p>
        <ul>
          <li>Servidor: ${process.env.EMAIL_HOST || 'smtp.locaweb.com.br'}</li>
          <li>Porta: ${process.env.EMAIL_PORT || '465'}</li>
          <li>Email: ${process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br'}</li>
          <li>Data/Hora: ${new Date().toLocaleString('pt-BR')}</li>
        </ul>
        <p>Atenciosamente,<br>Sistema Meu Preço Certo</p>
      </div>
    `
  });
  
  if (emailResult) {
    console.log(`✅ Email de teste enviado com sucesso para ${testEmail}!`);
    console.log('   Verifique a caixa de entrada para confirmar o recebimento.');
  } else {
    console.error(`❌ Falha ao enviar email de teste para ${testEmail}.`);
    console.log('   Verifique os logs acima para mais detalhes sobre o erro.');
  }
  
  console.log('\n===== TESTE CONCLUÍDO =====');
}

testEmailSystem().catch(error => {
  console.error('Erro durante o teste do sistema de email:', error);
});