import { sendEmail } from './server/email';
import dotenv from 'dotenv';

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

/**
 * Teste de envio de email para um administrador
 */
async function testeEnvioEmailAdmin() {
  console.log('===============================================');
  console.log('   TESTE DE ENVIO DE EMAIL PARA ADMIN         ');
  console.log('===============================================');
  
  // Email do administrador para teste
  const emailAdmin = 'admi@meuprecocerto.com.br';
  
  console.log(`\nEnviando email administrativo para: ${emailAdmin}`);
  console.log(`Usando conta: ${process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br'}`);
  console.log(`\n-----------------------------------------------`);
  
  try {
    // Enviar email de teste para admin
    const resultado = await sendEmail({
      to: emailAdmin,
      subject: '[ADMIN] Notificação de Sistema - Meu Preço Certo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4F46E5;">Notificação Administrativa</h2>
          <p><strong>Sistema de Email - Teste</strong></p>
          
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #4F46E5; margin-top: 0;">Status do Sistema</h3>
            <p><strong>Componente:</strong> Sistema de Emails</p>
            <p><strong>Status:</strong> <span style="color: #22C55E;">✓ Operacional</span></p>
            <p><strong>Detalhes:</strong> Este é um teste automático do sistema de envio de emails administrativos.</p>
          </div>
          
          <p>O sistema de email está configurado corretamente e pronto para enviar notificações administrativas.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p><strong>Informações Técnicas:</strong></p>
            <ul>
              <li>Servidor SMTP: ${process.env.EMAIL_HOST || 'smtp.locaweb.com.br'}</li>
              <li>Email de Origem: ${process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br'}</li>
              <li>Timestamp: ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
            <p>Este é um email automático de sistema, por favor não responda.</p>
            <p>© ${new Date().getFullYear()} Meu Preço Certo - Todos os direitos reservados</p>
          </div>
        </div>
      `
    });
    
    if (resultado) {
      console.log(`✅ Email administrativo enviado com sucesso para ${emailAdmin}!`);
      console.log('   Por favor, verifique a caixa de entrada para confirmar o recebimento.');
    } else {
      console.error(`❌ Falha ao enviar email administrativo para ${emailAdmin}.`);
    }
    
  } catch (erro) {
    console.error('❌ Erro durante o envio do email:', erro);
  }
  
  console.log('\n===============================================');
}

// Executar o teste
testeEnvioEmailAdmin().catch(console.error);