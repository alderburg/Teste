import { sendEmail } from './server/email';
import dotenv from 'dotenv';

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

/**
 * Teste simples de envio de email para um destinatário específico
 */
async function testeEnvioEmail() {
  console.log('===============================================');
  console.log('   TESTE DE ENVIO DE EMAIL PARA GMAIL         ');
  console.log('===============================================');
  
  const emailDestino = 'ritielepf@gmail.com';
  
  console.log(`\nEnviando email de teste para: ${emailDestino}`);
  console.log(`Usando conta: ${process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br'}`);
  console.log(`\n-----------------------------------------------`);
  
  try {
    // Enviar email de teste
    const resultado = await sendEmail({
      to: emailDestino,
      subject: 'Teste de Email - Meu Preço Certo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #6366f1;">Teste de Envio de Email</h2>
          <p>Olá!</p>
          <p>Este é um email de teste enviado pelo sistema <strong>Meu Preço Certo</strong>.</p>
          <p>O sistema usa o serviço SMTP da Locaweb para enviar emails de:</p>
          <ul>
            <li>Verificação de conta</li>
            <li>Recuperação de senha</li>
            <li>Notificações importantes</li>
          </ul>
          <p>Se você está recebendo este email, significa que a configuração está funcionando corretamente!</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
            <p>Este é um email automático, por favor não responda.</p>
            <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      `
    });
    
    if (resultado) {
      console.log(`✅ Email enviado com sucesso para ${emailDestino}!`);
      console.log('   Por favor, verifique a caixa de entrada para confirmar o recebimento.');
    } else {
      console.error(`❌ Falha ao enviar email para ${emailDestino}.`);
    }
    
  } catch (erro) {
    console.error('❌ Erro durante o envio do email:', erro);
  }
  
  console.log('\n===============================================');
}

// Executar o teste
testeEnvioEmail().catch(console.error);