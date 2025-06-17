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
    pass: process.env.EMAIL_PASSWORD || 'Ibanez0101022017@',
  },
  tls: {
    rejectUnauthorized: false // Ajuda a evitar problemas com certificados
  },
  // Cabeçalhos DKIM e SPF já são gerenciados pela Locaweb, mas podemos adicionar cabeçalhos extras
  headers: {
    // Prioridade mais alta para melhorar entrega
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    'Importance': 'High'
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
    const from = process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br';
    const mailOptions = {
      from: `"Meu Preço Certo - Teste" <${from}>`,
      to: 'ritielepf@gmail.com',
      subject: '✅ Teste de Envio de Email - Meu Preço Certo',
      text: 'Este é um email de teste para verificar a configuração de envio de emails do Meu Preço Certo.',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <title>Teste de Envio de Email - Meu Preço Certo</title>
        </head>
        <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border-spacing: 0; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 20px 0px;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-spacing: 0; border-collapse: collapse; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <tr>
                    <td align="center" style="padding: 30px 40px;">
                      <!-- Cabeçalho -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="center" style="padding-bottom: 20px;">
                            <h1 style="color: #6366f1; margin: 0; font-size: 24px;">Meu Preço Certo - Teste</h1>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Conteúdo principal -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <p style="font-size: 16px; line-height: 1.5; color: #333;">Olá,</p>
                            <p style="font-size: 16px; line-height: 1.5; color: #333;">Este é um email de teste para verificar a configuração de envio de emails do sistema Meu Preço Certo.</p>
                            <p style="font-size: 16px; line-height: 1.5; color: #333;">Se você está recebendo este email, significa que a configuração de envio de emails está funcionando corretamente!</p>
                            
                            <div style="background-color: #f5f7fa; border-left: 4px solid #6366f1; margin: 20px 0; padding: 15px;">
                              <p style="margin: 0; color: #555; line-height: 1.6;">
                                <strong>Informações de configuração:</strong><br>
                                • Host: ${process.env.EMAIL_HOST}<br>
                                • Porta: ${process.env.EMAIL_PORT}<br>
                                • Usuário: ${process.env.EMAIL_USER}<br>
                                • Data e hora: ${new Date().toLocaleString()}
                              </p>
                            </div>
                            
                            <p style="font-size: 16px; line-height: 1.5; color: #333;">Este email inclui as melhores práticas para evitar ser classificado como spam:</p>
                            <ul style="color: #333; line-height: 1.6;">
                              <li>Formatação em HTML adequada</li>
                              <li>Cabeçalhos de prioridade</li>
                              <li>Conteúdo bem estruturado</li>
                              <li>Opção de unsubscribe</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
                     
                      <!-- Rodapé -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; margin-top: 30px;">
                        <tr>
                          <td align="center" style="padding: 20px; font-size: 12px; color: #777;">
                            <p>&copy; 2025 Meu Preço Certo. Todos os direitos reservados.</p>
                            <p>Este é um email automático, por favor não responda.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`,
        'X-Entity-Ref-ID': `meuprecocerto-teste-${new Date().getTime()}`
      },
      priority: 'high'
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