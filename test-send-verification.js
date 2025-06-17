// Script para testar envio de email de verificação usando ES modules
import pg from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar transporte de email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'email-ssl.com.br',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br',
    pass: process.env.EMAIL_PASSWORD || '',
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Função para gerar token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Função principal
async function enviarEmailVerificacao() {
  console.log("Iniciando teste de envio de email de verificação...");
  
  // Criar conexão com o banco
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Verificar configuração do email
    console.log("Verificando configuração de email...");
    console.log(`Usando o servidor SMTP: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`);
    console.log(`Usando email: ${process.env.EMAIL_USER}`);
    
    await transporter.verify();
    console.log("Configuração de email verificada com sucesso!");
    
    // Enviar email direto para email de teste sem depender de usuário do banco
    const token = generateToken();
    console.log(`Token gerado: ${token.substring(0, 8)}...`);
    
    // Definindo informações de teste diretamente
    const testUser = {
      id: 999, // ID fictício para teste
      username: "Usuário Teste",
      email: "ritielepf@gmail.com" // Email de teste fornecido
    };
    
    // Construir URL de verificação
    const baseUrl = process.env.SITE_URL || 'https://meuprecocerto.com';
    console.log(`Base URL para verificação: ${baseUrl}`);
    const verificationUrl = `${baseUrl}/verificar-email?token=${token}`;
    
    // Conteúdo do email
    const mailOptions = {
      from: `"Meu Preço Certo" <${process.env.EMAIL_USER}>`,
      to: testUser.email, // Email de teste
      subject: '✅ [TESTE] Confirmação de Email - Meu Preço Certo',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmação de Email - Meu Preço Certo</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9;">
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
                      <h2 style="margin-top: 0; color: #6366f1; font-size: 20px;">Olá, ${testUser.username}!</h2>
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
      `
    };
    
    // Enviar email
    console.log(`Enviando email para ${mailOptions.to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email enviado com sucesso! Message ID: ${info.messageId}`);
    console.log(`Resposta do servidor: ${info.response}`);
    console.log("TESTE CONCLUÍDO COM SUCESSO!");
    
  } catch (error) {
    console.error("ERRO ao executar teste de verificação:", error);
  } finally {
    // Encerrar conexão
    await pool.end();
  }
}

// Executar função principal
enviarEmailVerificacao()
  .then(() => {
    console.log("Script de verificação concluído com sucesso!");
  })
  .catch(error => {
    console.error("Erro no script de verificação:", error);
  })
  .finally(() => {
    // Usando código de retorno diferente de zero em caso de erro
    process.on('unhandledRejection', (reason) => {
      console.error('Erro não tratado:', reason);
      process.exit(1);
    });
  });