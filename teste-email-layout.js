// Teste direto do layout de email
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function testarLayoutEmail() {
  try {
    console.log("Iniciando teste de envio de email com layout profissional...");
    
    // Email de teste - ajuste conforme necessário
    const email = "ritielepf@gmail.com";
    const nome = "teste_948237_949";
    const token = "token-teste-layout";
    const verificationUrl = `https://0cdfc897-1c4d-4689-924d-451765cbdcbe-00-oipxe5vffeca.picard.replit.dev:3000/verificar-email?token=${token}`;
    
    console.log(`Enviando email para ${email}...`);
    
    // Configurar transporte SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'email-ssl.com.br',
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br',
        pass: process.env.EMAIL_PASSWORD || 'Ibanez0101022017@',
      },
      tls: {
        rejectUnauthorized: false
      },
    });
    
    // HTML do email exatamente como solicitado na imagem
    const html = `
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
    
    // Enviar email
    const resultado = await transporter.sendMail({
      from: '"Meu Preço Certo" <verificarconta@meuprecocerto.com.br>',
      to: email,
      subject: '✅ Confirme seu email - Meu Preço Certo',
      text: `Olá ${nome},\n\nObrigado por se cadastrar no Meu Preço Certo! Para ativar sua conta e começar a utilizar nossa plataforma, precisamos confirmar seu endereço de email.\n\nPor que confirmar seu e-mail?\n• Garantir a segurança da sua conta\n• Receber notificações importantes\n• Recuperar sua senha caso necessário\n\nConfirme seu email clicando no link abaixo:\n\n${verificationUrl}\n\nSe você não se cadastrou no Meu Preço Certo, por favor ignore este email ou entre em contato com nosso suporte.\n\nAtenção: Este link expira em 24 horas.\n\nAtenciosamente,\nEquipe Meu Preço Certo`,
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'List-Unsubscribe': '<mailto:verificarconta@meuprecocerto.com.br?subject=unsubscribe>',
        'X-Entity-Ref-ID': `meuprecocerto-${new Date().getTime()}`
      },
      priority: 'high'
    });
    
    console.log("✅ Email enviado com sucesso!");
    console.log("Verifique sua caixa de entrada para confirmar o layout.");
    console.log("Detalhes:", resultado);
  } catch (error) {
    console.error("❌ Falha ao enviar email:", error);
  }
}

testarLayoutEmail();