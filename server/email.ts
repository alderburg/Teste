import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Garantir que as variáveis de ambiente sejam carregadas
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
  debug: false, // Desativa logs detalhados
  logger: false, // Desativa logs
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

// Templates de email
const templates = {
  verificacaoEmail: (nome: string, token: string) => {
    const verificationUrl = `${process.env.SITE_URL}/verificar-email?token=${token}`;
    return {
      subject: '✅ Confirme seu email - Meu Preço Certo',
      text: `Olá ${nome},\n\nObrigado por se cadastrar no Meu Preço Certo! Para ativar sua conta e começar a utilizar nossa plataforma, precisamos confirmar seu endereço de email.\n\nPor que confirmar seu e-mail?\n• Garantir a segurança da sua conta\n• Receber notificações importantes\n• Recuperar sua senha caso necessário\n\nConfirme seu email clicando no link abaixo:\n\n${verificationUrl}\n\nSe você não se cadastrou no Meu Preço Certo, por favor ignore este email ou entre em contato com nosso suporte.\n\nAtenção: Este link expira em 24 horas.\n\nAtenciosamente,\nEquipe Meu Preço Certo`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirme seu email - Meu Preço Certo</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f9f9f9;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #6366f1;
              padding: 20px 0;
              text-align: center;
              border-radius: 4px 4px 0 0;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 24px;
            }
            .content {
              background-color: #ffffff;
              padding: 20px 30px;
              border-radius: 0 0 4px 4px;
            }
            .greeting {
              color: #6366f1;
              font-size: 18px;
              margin-top: 0;
            }
            .info-box {
              background-color: #f0f4f8;
              border-left: 4px solid #6366f1;
              padding: 15px;
              margin: 20px 0;
            }
            .info-title {
              font-weight: 500;
              margin: 0 0 10px 0;
            }
            .info-list {
              margin: 0;
              padding-left: 20px;
              color: #4b5563;
            }
            .button {
              display: inline-block;
              background-color: #6366f1;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              font-size: 16px;
              text-align: center;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .link-box {
              background-color: #f1f5f9;
              padding: 10px;
              border-radius: 4px;
              font-size: 13px;
              color: #64748b;
              word-break: break-all;
            }
            .note {
              margin-top: 25px;
              color: #666;
              font-size: 14px;
            }
            .attention {
              color: #666;
              font-size: 14px;
              font-weight: normal;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Cabeçalho com Fundo Azul -->
            <div class="header">
              <h1>Meu Preço Certo</h1>
            </div>
            
            <!-- Conteúdo principal -->
            <div class="content">
              <p class="greeting">Olá, ${nome}!</p>
              
              <p>Obrigado por se cadastrar no Meu Preço Certo! Para ativar sua conta e começar a utilizar nossa plataforma, precisamos confirmar seu endereço de email.</p>
              
              <!-- Bloco com bordas e fundo cinza claro para os motivos -->
              <div class="info-box">
                <p class="info-title">Por que confirmar seu e-mail?</p>
                <ul class="info-list">
                  <li>Garantir a segurança da sua conta</li>
                  <li>Receber notificações importantes</li>
                  <li>Recuperar sua senha caso necessário</li>
                </ul>
              </div>
              
              <div class="button-container">
                <a href="${verificationUrl}" class="button" style="color: white; text-decoration: none;">Confirme meu e-mail</a>
              </div>
              
              <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
              
              <p class="link-box">${verificationUrl}</p>
              
              <p class="note">Se você não se cadastrou no Meu Preço Certo, por favor ignore este email ou entre em contato com nosso suporte.</p>
              
              <p class="attention"><strong>Atenção:</strong> Este link expira em 24 horas.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  },
  recuperacaoSenha: (nome: string, token: string) => {
    const resetUrl = `${process.env.SITE_URL}/redefinir-senha?token=${token}`;
    return {
      subject: '🔐 Recuperação de senha - Meu Preço Certo',
      text: `Olá ${nome},\n\nRecebemos uma solicitação para redefinir sua senha no Meu Preço Certo.\n\nPara criar uma nova senha, clique no link abaixo:\n\n${resetUrl}\n\nSe você não solicitou uma redefinição de senha, ignore este email ou entre em contato com nosso suporte.\n\nAtenção: Este link expira em 3 horas.\n\nAtenciosamente,\nEquipe Meu Preço Certo`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperação de Senha - Meu Preço Certo</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f9f9f9;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #6366f1;
              padding: 20px 0;
              text-align: center;
              border-radius: 4px 4px 0 0;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 24px;
            }
            .content {
              background-color: #ffffff;
              padding: 20px 30px;
              border-radius: 0 0 4px 4px;
            }
            .greeting {
              color: #6366f1;
              font-size: 18px;
              margin-top: 0;
            }
            .info-box {
              background-color: #f0f4f8;
              border-left: 4px solid #6366f1;
              padding: 15px;
              margin: 20px 0;
            }
            .info-title {
              font-weight: 500;
              margin: 0 0 10px 0;
            }
            .info-list {
              margin: 0;
              padding-left: 20px;
              color: #4b5563;
            }
            .button {
              display: inline-block;
              background-color: #6366f1;
              color: white !important; /* Forçando a cor branca */
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              font-size: 16px;
              text-align: center;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .link-box {
              background-color: #f1f5f9;
              padding: 10px;
              border-radius: 4px;
              font-size: 13px;
              color: #64748b;
              word-break: break-all;
            }
            .note {
              margin-top: 25px;
              color: #666;
              font-size: 14px;
            }
            .attention {
              color: #666;
              font-size: 14px;
              font-weight: normal;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Cabeçalho com Fundo Azul -->
            <div class="header">
              <h1>Meu Preço Certo</h1>
            </div>
            
            <!-- Conteúdo principal -->
            <div class="content">
              <p class="greeting">Olá, ${nome}!</p>
              
              <p>Recebemos uma solicitação para redefinir sua senha no Meu Preço Certo.</p>
              
              <!-- Bloco com bordas e fundo cinza claro para os motivos -->
              <div class="info-box">
                <p class="info-title">Informações importantes:</p>
                <ul class="info-list">
                  <li>Este link é válido por apenas 3 horas</li>
                  <li>Após redefinir sua senha, você terá acesso imediato à sua conta</li>
                  <li>Por segurança, utilize uma senha forte e única</li>
                </ul>
              </div>
              
              <div class="button-container">
                <a href="${resetUrl}" class="button" style="color: white; text-decoration: none;">Redefinir minha senha</a>
              </div>
              
              <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
              
              <p class="link-box">${resetUrl}</p>
              
              <p class="note">Se você não solicitou uma redefinição de senha, ignore este email ou entre em contato com nosso suporte.</p>
              
              <p class="attention"><strong>Atenção:</strong> Este link expira em 3 horas.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  },
  usuarioAdicionalSenha: (nome: string, token: string, isNewPassword: boolean = false) => {
    const resetUrl = `${process.env.SITE_URL}/definir-senha-usuario-adicional?token=${token}`;
    const actionText = isNewPassword ? 'criar sua senha' : 'redefinir sua senha';
    const titleText = isNewPassword ? 'Criar senha' : 'Redefinir senha';
    
    return {
      subject: `🔐 ${titleText} - Usuário Adicional - Meu Preço Certo`,
      text: `Olá ${nome},\n\nVocê foi adicionado como usuário adicional no Meu Preço Certo.\n\nPara ${actionText} e acessar a plataforma, clique no link abaixo:\n\n${resetUrl}\n\nSe você não esperava receber este email, entre em contato com o administrador da conta.\n\nAtenção: Este link expira em 24 horas.\n\nAtenciosamente,\nEquipe Meu Preço Certo`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${titleText} - Usuário Adicional - Meu Preço Certo</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f9f9f9;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #6366f1;
              padding: 20px 0;
              text-align: center;
              border-radius: 4px 4px 0 0;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 24px;
            }
            .content {
              background-color: #ffffff;
              padding: 20px 30px;
              border-radius: 0 0 4px 4px;
            }
            .greeting {
              color: #6366f1;
              font-size: 18px;
              margin-top: 0;
            }
            .info-box {
              background-color: #f0f4f8;
              border-left: 4px solid #6366f1;
              padding: 15px;
              margin: 20px 0;
            }
            .info-title {
              font-weight: 500;
              margin: 0 0 10px 0;
            }
            .info-list {
              margin: 0;
              padding-left: 20px;
              color: #4b5563;
            }
            .button {
              display: inline-block;
              background-color: #6366f1;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              font-size: 16px;
              text-align: center;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .link-box {
              background-color: #f1f5f9;
              padding: 10px;
              border-radius: 4px;
              font-size: 13px;
              color: #64748b;
              word-break: break-all;
            }
            .note {
              margin-top: 25px;
              color: #666;
              font-size: 14px;
            }
            .attention {
              color: #666;
              font-size: 14px;
              font-weight: normal;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Meu Preço Certo</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Olá, ${nome}!</p>
              
              <p>Você foi adicionado como usuário adicional no Meu Preço Certo.</p>
              
              <div class="info-box">
                <p class="info-title">Para começar a usar a plataforma:</p>
                <ul class="info-list">
                  <li>Clique no botão abaixo para ${actionText}</li>
                  <li>Após definir sua senha, você terá acesso completo à plataforma</li>
                  <li>Use uma senha forte e segura</li>
                </ul>
              </div>
              
              <div class="button-container">
                <a href="${resetUrl}" class="button" style="color: white; text-decoration: none;">${isNewPassword ? 'Criar minha senha' : 'Redefinir minha senha'}</a>
              </div>
              
              <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
              
              <p class="link-box">${resetUrl}</p>
              
              <p class="note">Se você não esperava receber este email, entre em contato com o administrador da conta.</p>
              
              <p class="attention"><strong>Atenção:</strong> Este link expira em 24 horas.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  },
};

/**
 * Envia um email usando o transporte configurado
 * @param params Objeto com os parâmetros do email (to, from, subject, text, html)
 * @returns Promise que resolve para true se o email foi enviado com sucesso
 */
export async function sendEmail(
  params: {
    to: string;
    from?: string;
    subject: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
  }
): Promise<boolean> {
  try {
    // Verificar se as credenciais de email estão configuradas
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      // Sem credenciais de email configuradas
      return false;
    }
    
    // Usar o email remetente configurado ou o padrão
    const from = params.from || process.env.EMAIL_FROM || 'verificarconta@meuprecocerto.com.br';
    
    // Preparar opções do email com formatação adequada
    const mailOptions = {
      from: `"Meu Preço Certo" <${from}>`,
      to: params.to,
      subject: params.subject,
      text: params.text || params.html || '',
      html: params.html || params.text || '',
      // Cabeçalhos adicionais para evitar que o email caia no spam
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`,
        'X-Entity-Ref-ID': `meuprecocerto-${new Date().getTime()}`, // ID único para cada email
        ...(params.headers || {})
      }
    };

    // Verificar a conexão antes de enviar
    await transporter.verify();
    
    // Enviar o email sem gerar logs
    await transporter.sendMail(mailOptions);
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    
    // Mais detalhes sobre o erro
    if (error instanceof Error) {
      console.error(`Tipo de erro: ${error.name}`);
      console.error(`Mensagem: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
    
    return false;
  }
}

/**
 * Versão compatível com a assinatura anterior para backward compatibility
 */
export async function sendEmailLegacy(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> {
  return sendEmail({ to, subject, text, html });
}

/**
 * Envia um email de verificação de conta
 * @param to Endereço de email do destinatário
 * @param nome Nome do usuário
 * @param token Token de verificação
 * @returns Promise que resolve para true se o email foi enviado com sucesso
 */
export async function sendVerificationEmail(
  to: string,
  nome: string,
  token: string
): Promise<boolean> {
  const template = templates.verificacaoEmail(nome, token);
  return sendEmail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
}

// Verifica se a configuração de email está correta
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Configuração de email verificada e pronta para envio');
    return true;
  } catch (error) {
    console.error('Erro na configuração de email:', error);
    return false;
  }
}

/**
 * Envia um email de recuperação de senha
 * @param to Endereço de email do destinatário
 * @param nome Nome do usuário
 * @param token Token de redefinição de senha
 * @returns Promise que resolve para true se o email foi enviado com sucesso
 */
export async function sendPasswordRecoveryEmail(
  to: string,
  nome: string,
  token: string
): Promise<boolean> {
  const template = templates.recuperacaoSenha(nome, token);
  return sendEmail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
}

/**
 * Envia um email para criação/alteração de senha de usuário adicional
 * @param to Endereço de email do destinatário
 * @param nome Nome do usuário adicional
 * @param token Token de definição de senha
 * @param isNewPassword Se é uma nova senha (true) ou redefinição (false)
 * @returns Promise que resolve para true se o email foi enviado com sucesso
 */
export async function sendAdditionalUserPasswordEmail(
  to: string,
  nome: string,
  token: string,
  isNewPassword: boolean = false
): Promise<boolean> {
  const template = templates.usuarioAdicionalSenha(nome, token, isNewPassword);
  return sendEmail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
}

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordRecoveryEmail,
  verifyEmailConfig,
};