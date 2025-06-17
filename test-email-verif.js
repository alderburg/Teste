import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar o transporte de email com as credenciais da Locaweb
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'email-ssl.com.br',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true, // true para 465 (SSL), false para outras portas
  auth: {
    user: process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br',
    pass: process.env.EMAIL_PASSWORD || '',
  },
  logger: true, // Ativa o log detalhado
  debug: true, // Ativa debug mode (ainda mais logs)
  tls: {
    rejectUnauthorized: false // Ajuda a evitar problemas com certificados
  }
});

// Função para enviar um email de teste
async function sendTestVerificationEmail() {
  console.log('Tentando enviar email de verificação de teste...');
  console.log('Dados de configuração:');
  console.log('- Host:', process.env.EMAIL_HOST);
  console.log('- Port:', process.env.EMAIL_PORT);
  console.log('- User:', process.env.EMAIL_USER);
  console.log('- Password:', process.env.EMAIL_PASSWORD ? '******' : 'não configurada');

  try {
    // Verificar se a configuração está correta
    await transporter.verify();
    console.log('Configuração de email verificada e pronta para envio');

    // Gerar URL simulada de verificação
    const token = 'testetoken123456789';
    const verificationUrl = `https://meuprecocerto.com/verificar-email?token=${token}`;

    // Conteúdo do email com design aprimorado
    const subject = '✅ Teste - Confirme seu email - Meu Preço Certo';
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmação de Email - Meu Preço Certo</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-spacing: 0; border-collapse: collapse; box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 0;">
              <!-- Cabeçalho -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #6366f1; color: white; border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 30px 20px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Meu Preço Certo</h1>
                  </td>
                </tr>
              </table>
              
              <!-- Conteúdo -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td style="padding: 30px 20px;">
                    <h2 style="margin-top: 0; color: #6366f1; font-size: 20px;">Olá, Teste!</h2>
                    <p>Obrigado por se cadastrar no Meu Preço Certo! Para ativar sua conta e começar a utilizar nossa plataforma, precisamos confirmar seu endereço de email.</p>
                    
                    <div style="background-color: #f5f7fa; border-left: 4px solid #6366f1; margin: 20px 0; padding: 15px;">
                      <p style="margin: 0; color: #555;">
                        <strong>Por que confirmar seu email?</strong><br>
                        • Garantir a segurança da sua conta<br>
                        • Receber notificações importantes<br>
                        • Recuperar sua senha caso necessário
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${verificationUrl}" style="background-color: #6366f1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Confirmar meu email</a>
                    </div>
                    
                    <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
                    <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px; color: #555;">${verificationUrl}</p>
                    
                    <p style="margin-top: 30px; color: #777;">Se você não se cadastrou no Meu Preço Certo, por favor ignore este email ou entre em contato com nosso suporte.</p>
                    
                    <p style="color: #777; font-size: 14px;"><strong>Atenção:</strong> Este link expira em 24 horas.</p>
                  </td>
                </tr>
              </table>
              
              <!-- Rodapé -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px; font-size: 12px; color: #777;">
                    <p>&copy; ${new Date().getFullYear()} Meu Preço Certo. Todos os direitos reservados.</p>
                    <p>Este é um email automático, por favor não responda.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Configurações do email
    const mailOptions = {
      from: `"Meu Preço Certo" <${process.env.EMAIL_USER}>`,
      to: 'ritielepf@gmail.com',
      subject: subject,
      html: html,
      text: 'Por favor, use um cliente de email que suporte HTML para visualizar esta mensagem.',
    };

    // Enviar o email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado com sucesso!');
    console.log('Message ID:', info.messageId);
    console.log('Resposta do servidor:', info.response);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    if (error instanceof Error) {
      console.error(`Tipo de erro: ${error.name}`);
      console.error(`Mensagem: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
    return false;
  }
}

// Executar o teste de envio de email
sendTestVerificationEmail().then((success) => {
  console.log('Resultado do teste:', success ? 'Email enviado com sucesso!' : 'Falha ao enviar email.');
  process.exit(success ? 0 : 1);
});