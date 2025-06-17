import { sendAccountVerificationEmail } from './server/email-verification';
import dotenv from 'dotenv';

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

async function testVerificationEmail() {
  console.log('===== TESTE DE EMAIL DE VERIFICAÇÃO =====');
  
  // Você pode alterar estes dados para testar com informações reais
  const userId = 1;
  const emailDestino = process.env.TEST_EMAIL || 'seu-email@exemplo.com';
  const nomeUsuario = 'Usuário Teste';
  
  console.log(`Enviando email de verificação para: ${emailDestino}`);
  const resultado = await sendAccountVerificationEmail(userId, emailDestino, nomeUsuario);
  
  if (resultado) {
    console.log('✅ Email de verificação enviado com sucesso!');
    console.log(`   Um email foi enviado para ${emailDestino} com as instruções para verificação.`);
  } else {
    console.error('❌ Falha ao enviar email de verificação.');
    console.log('   Verifique os logs acima para mais detalhes sobre o erro.');
  }
}

testVerificationEmail().catch(error => {
  console.error('Erro durante o teste de email de verificação:', error);
});