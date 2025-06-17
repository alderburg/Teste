import dotenv from 'dotenv';
import { verifyEmailConfig, sendEmail } from './server/email';
import { sendAccountVerificationEmail } from './server/email-verification';

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

/**
 * Teste completo do sistema de email, incluindo:
 * 1. Verificação da configuração SMTP
 * 2. Envio de email de teste simples
 * 3. Envio de email de verificação para simular o processo de registro
 */
async function testeCompletoEmail() {
  console.log('===============================================');
  console.log('   TESTE COMPLETO DO SISTEMA DE EMAIL         ');
  console.log('===============================================');
  
  const emailTeste = 'ritielepf@gmail.com'; // Email específico para teste
  const localTeste = process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento';
  
  console.log(`\nAmbiente: ${localTeste}`);
  console.log(`Email para teste: ${emailTeste}`);
  console.log(`Servidor SMTP: ${process.env.EMAIL_HOST || 'smtp.locaweb.com.br'}`);
  console.log(`Porta: ${process.env.EMAIL_PORT || '465'}`);
  console.log(`Conta de envio: ${process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br'}`);
  console.log(`\n-----------------------------------------------`);
  
  // PASSO 1: Testar conexão SMTP
  console.log('\n[ETAPA 1/3] Verificando configuração SMTP...');
  
  const resultadoConfig = await verifyEmailConfig();
  if (resultadoConfig) {
    console.log('✅ Conexão SMTP estabelecida com sucesso!');
  } else {
    console.error('❌ Falha na conexão SMTP!');
    console.log('   Verifique:');
    console.log('   - Se a senha EMAIL_PASSWORD está corretamente configurada');
    console.log('   - Se as informações do servidor SMTP estão corretas');
    console.log('   - Se a porta está correta (465 para SSL, 587 para TLS)');
    console.log('   - Se a conta de email existe e está ativa');
    console.log('\nInterrompendo testes adicionais devido à falha na conexão.');
    return;
  }
  
  // PASSO 2: Testar envio de email simples
  console.log('\n[ETAPA 2/3] Enviando email de teste simples...');
  
  const resultadoEmail = await sendEmail({
    to: emailTeste,
    subject: 'Teste de Email - Sistema Meu Preço Certo',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #6366f1;">Teste de Envio de Email</h2>
        <p>Este é um email de teste para verificar o funcionamento do sistema de envio de emails do <strong>Meu Preço Certo</strong>.</p>
        <p>Se você está vendo esta mensagem, o sistema está funcionando corretamente para emails simples.</p>
        <ul>
          <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
          <li><strong>Ambiente:</strong> ${localTeste}</li>
          <li><strong>Servidor SMTP:</strong> ${process.env.EMAIL_HOST || 'smtp.locaweb.com.br'}</li>
        </ul>
        <p>Atenciosamente,<br>Sistema Meu Preço Certo</p>
      </div>
    `
  });
  
  if (resultadoEmail) {
    console.log(`✅ Email simples enviado com sucesso para ${emailTeste}!`);
  } else {
    console.error(`❌ Falha ao enviar email simples para ${emailTeste}!`);
    console.log('\nInterrompendo testes adicionais devido à falha no envio de email simples.');
    return;
  }
  
  // PASSO 3: Testar envio de email de verificação
  console.log('\n[ETAPA 3/3] Simulando envio de email de verificação de conta...');
  
  // Valores fictícios para teste - em produção seria um usuário real do banco de dados
  const usuarioIdTeste = 9999;
  const nomeUsuarioTeste = 'Usuário Teste';
  
  const resultadoVerificacao = await sendAccountVerificationEmail(
    usuarioIdTeste,
    emailTeste,
    nomeUsuarioTeste
  );
  
  if (resultadoVerificacao) {
    console.log(`✅ Email de verificação enviado com sucesso para ${emailTeste}!`);
  } else {
    console.error(`❌ Falha ao enviar email de verificação para ${emailTeste}!`);
    console.log('   Verifique o módulo de verificação de email e os logs para mais detalhes.');
  }
  
  console.log('\n===============================================');
  console.log(' RESULTADO FINAL DO TESTE:');
  console.log(' ✅ Conexão SMTP: ' + (resultadoConfig ? 'OK' : 'FALHA'));
  console.log(' ✅ Email simples: ' + (resultadoEmail ? 'OK' : 'FALHA'));
  console.log(' ✅ Email verificação: ' + (resultadoVerificacao ? 'OK' : 'FALHA'));
  console.log('===============================================');
  
  if (resultadoConfig && resultadoEmail && resultadoVerificacao) {
    console.log('\n✅ TESTE COMPLETO: SUCESSO!');
    console.log('O sistema de email está funcionando corretamente.');
  } else {
    console.log('\n❌ TESTE COMPLETO: FALHA!');
    console.log('Verifique os erros acima e corrija as configurações.');
  }
}

// Executar o teste
testeCompletoEmail().catch(erro => {
  console.error('\n❌ ERRO DURANTE A EXECUÇÃO DO TESTE:');
  console.error(erro);
});