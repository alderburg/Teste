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
  tls: {
    rejectUnauthorized: false // Ajuda a evitar problemas com certificados
  }
});

// Função para enviar um email de teste
async function sendTestEmail() {
  console.log('Tentando enviar email de teste...');
  console.log('Dados de configuração:');
  console.log('- Host:', process.env.EMAIL_HOST);
  console.log('- Port:', process.env.EMAIL_PORT);
  console.log('- User:', process.env.EMAIL_USER);
  console.log('- Password:', process.env.EMAIL_PASSWORD ? '******' : 'não configurada');

  try {
    // Verificar se a configuração está correta
    await transporter.verify();
    console.log('Configuração de email verificada e pronta para envio');

    // Configurações do email
    const mailOptions = {
      from: `"Meu Preço Certo - Teste" <${process.env.EMAIL_USER}>`,
      to: 'ritielepf@gmail.com',
      subject: 'Teste de Envio de Email - Meu Preço Certo',
      text: 'Este é um email de teste para verificar a configuração de envio de emails do Meu Preço Certo.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #6366f1;">Meu Preço Certo - Teste</h2>
          </div>
          <p>Olá,</p>
          <p>Este é um email de teste para verificar a configuração de envio de emails do sistema Meu Preço Certo.</p>
          <p>Se você está recebendo este email, significa que a configuração de envio de emails está funcionando corretamente!</p>
          <div style="background-color: #f5f7fa; border-left: 4px solid #6366f1; margin: 20px 0; padding: 15px;">
            <p style="margin: 0; color: #555;">
              <strong>Informações de configuração:</strong><br>
              • Host: ${process.env.EMAIL_HOST}<br>
              • Porta: ${process.env.EMAIL_PORT}<br>
              • Usuário: ${process.env.EMAIL_USER}<br>
              • Data e hora: ${new Date().toLocaleString()}
            </p>
          </div>
          <p>Atenciosamente,<br>Equipe Meu Preço Certo</p>
        </div>
      `,
    };

    // Enviar o email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado com sucesso!');
    console.log('Message ID:', info.messageId);
    console.log('Resposta do servidor:', info.response);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

// Executar o teste de envio de email
sendTestEmail().then((success) => {
  console.log('Resultado do teste:', success ? 'Email enviado com sucesso!' : 'Falha ao enviar email.');
  process.exit(success ? 0 : 1);
});