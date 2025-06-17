// Teste direto da funcionalidade de email
// Script independente para testar o envio de email com layout bonito

import 'dotenv/config'; // Carrega variáveis de ambiente
import nodemailer from 'nodemailer';

// Função para enviar email de teste com o layout profissional
async function enviarEmailTeste() {
  try {
    // Configurações do email
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
    const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.kinghost.net';
    const EMAIL_PORT = process.env.EMAIL_PORT || 587;
    
    // Verifique as credenciais
    console.log('Verificando credenciais...');
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.error('❌ Credenciais de email não configuradas!');
      return false;
    }
    
    // Destinatário de teste
    const destinatario = 'ritielepf@gmail.com';
    const nome = 'Ritiele';
    const token = 'TOKEN-DE-TESTE-12345';
    
    // URL de verificação (ajuste conforme seu ambiente)
    const verificationUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}:3000/verificar-email?token=${token}`;

    // Configurar o transporter do Nodemailer
    console.log(`Configurando transporter com: ${EMAIL_HOST}:${EMAIL_PORT}`);
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: false,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Template HTML do email bonito
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu email - Meu Preço Certo</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Cabeçalho com Fundo Azul -->
    <div style="background-color: #6366f1; padding: 20px 0; text-align: center; border-radius: 4px 4px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Meu Preço Certo</h1>
    </div>
    
    <!-- Conteúdo principal -->
    <div style="background-color: #ffffff; padding: 20px 30px;">
      <p style="color: #6366f1; font-size: 18px;">Olá, ${nome}!</p>
      
      <p style="color: #333; font-size: 16px;">Obrigado por se cadastrar no Meu Preço Certo! Para ativar sua conta e começar a utilizar nossa plataforma, precisamos confirmar seu endereço de email.</p>
      
      <!-- Bloco com bordas e fundo cinza claro para os motivos -->
      <div style="border-left: 4px solid #6366f1; background-color: #f0f4f8; padding: 15px; margin: 20px 0;">
        <p style="font-weight: 500; margin: 0 0 10px 0; color: #333;">Por que confirmar seu e-mail?</p>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
          <li>Garantir a segurança da sua conta</li>
          <li>Receber notificações importantes</li>
          <li>Recuperar sua senha caso necessário</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">Confirme meu e-mail</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
      
      <p style="word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 4px; font-size: 13px; color: #64748b;">${verificationUrl}</p>
      
      <p style="margin-top: 25px; color: #666; font-size: 14px;">Se você não se cadastrou no Meu Preço Certo, por favor ignore este email ou entre em contato com nosso suporte.</p>
      
      <p style="color: #666; font-size: 14px;"><strong>Atenção:</strong> Este link expira em 24 horas.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // Opções do email
    const mailOptions = {
      from: '"Meu Preço Certo" <verificarconta@meuprecocerto.com.br>',
      to: destinatario,
      subject: '✅ Confirme seu email - Meu Preço Certo',
      html: htmlTemplate,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': `<mailto:cancelar@meuprecocerto.com.br?subject=Cancelar>`,
        'X-Entity-Ref-ID': `verification-${Date.now()}`
      },
      priority: 'high'
    };
    
    // Enviar o email
    console.log('📧 Enviando email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado com sucesso!');
    console.log(`ID da mensagem: ${info.messageId}`);
    console.log(`Resposta do servidor: ${JSON.stringify(info.response)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return false;
  }
}

// Executar a função de envio
console.log('🚀 Iniciando teste de envio de email...');
enviarEmailTeste().then(resultado => {
  if (resultado) {
    console.log('✅ Teste concluído com sucesso!');
  } else {
    console.error('❌ Falha no teste de envio.');
  }
}).catch(error => {
  console.error('❌ Erro na execução do teste:', error);
});

// Exportar função para uso externo
export default enviarEmailTeste;