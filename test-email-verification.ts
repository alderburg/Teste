import { sendAccountVerificationEmail } from './server/email-verification';
import dotenv from 'dotenv';

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

async function testVerificationEmail() {
  try {
    console.log('Iniciando teste de envio de email de verificação...');
    
    // Parâmetros de teste
    const userId = 1; // ID de teste
    const email = 'ritielepf@gmail.com'; // Email de teste fixo conforme solicitado
    const nome = 'Ritiele Paixão';
    
    console.log(`Enviando email de verificação para: ${email}`);
    
    // Enviar o email
    const resultado = await sendAccountVerificationEmail(userId, email, nome);
    
    // Verificar o resultado
    if (resultado) {
      console.log('✅ Email de verificação enviado com sucesso!');
    } else {
      console.error('❌ Falha ao enviar o email de verificação');
    }
  } catch (error) {
    console.error('Erro durante o teste de email:', error);
  }
}

// Executar o teste
testVerificationEmail();