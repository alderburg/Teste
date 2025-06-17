/**
 * Script simples para testar o envio de email diretamente
 * Não depende de módulos complexos, apenas o nodemailer
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function enviarEmailTeste() {
  console.log("🚀 Iniciando teste simples de envio de email...");
  console.log("📧 Usando as seguintes configurações:");
  console.log(`   - Host: ${process.env.EMAIL_HOST || 'email-ssl.com.br'}`);
  console.log(`   - Porta: ${process.env.EMAIL_PORT || '465'}`);
  console.log(`   - Usuário: ${process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br'}`);
  console.log(`   - Senha: ${process.env.EMAIL_PASSWORD ? '******' : 'Não definida!'}`);
  
  // Configurar transporte
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'email-ssl.com.br',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || 'verificarconta@meuprecocerto.com.br',
      pass: process.env.EMAIL_PASSWORD || 'Ibanez0101022017@',
    },
    debug: true, // Habilitar logs detalhados
    logger: true, // Mostrar logs
    tls: {
      rejectUnauthorized: false, // Para testar com certificados auto-assinados
    }
  });
  
  try {
    // Verificar conexão
    console.log("🔄 Verificando conexão com o servidor SMTP...");
    await transporter.verify();
    console.log("✅ Conexão com o servidor SMTP estabelecida com sucesso!");
    
    // Enviar email
    console.log("📤 Enviando email de teste para ritielepf@gmail.com...");
    
    const info = await transporter.sendMail({
      from: `"Meu Preço Certo - Teste" <${process.env.EMAIL_USER}>`,
      to: "ritielepf@gmail.com",
      subject: "✅ TESTE - Email de Verificação",
      text: "Este é um email de teste do sistema de verificação.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #6366f1;">Teste de Email</h2>
          <p>Este é um email de teste do sistema de verificação.</p>
          <p>Data e hora do envio: ${new Date().toLocaleString('pt-BR')}</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Este é um email automatizado, por favor não responda.</p>
        </div>
      `,
    });
    
    console.log("✅ Email enviado com sucesso!");
    console.log("📋 Detalhes:");
    console.log(`   - ID da mensagem: ${info.messageId}`);
    console.log(`   - Resposta do servidor: ${info.response}`);
    
  } catch (error) {
    console.error("❌ ERRO ao enviar email:", error);
    if (error.code === 'EAUTH') {
      console.error("🔑 Problema de autenticação. Verifique suas credenciais.");
    } else if (error.code === 'ESOCKET') {
      console.error("🔌 Problema de conexão com o servidor. Verifique host e porta.");
    }
  }
}

// Executar o teste
enviarEmailTeste().catch(console.error);