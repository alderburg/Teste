import { randomBytes } from 'crypto';
import { storage } from './storage';
import { sendEmail, sendVerificationEmail } from './email';

// Tempo de expiração do token em horas
const TOKEN_EXPIRATION_HOURS = 24;

/**
 * Gera um token aleatório para verificação de email
 * @returns String contendo o token gerado
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Cria um token de verificação de email para um usuário
 * @param userId ID do usuário
 * @returns Token gerado
 */
export async function createEmailVerificationToken(userId: number): Promise<string> {
  // Gerar token aleatório
  const token = generateToken();
  
  // Definir data de expiração (24 horas a partir de agora)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS);
  
  // Salvar token no banco de dados
  await storage.createEmailVerificationToken(userId, token, expiresAt);
  
  return token;
}

/**
 * Envia um email de verificação para o usuário
 * @param userId ID do usuário
 * @param email Email do usuário
 * @param nome Nome do usuário
 * @returns Boolean indicando se o email foi enviado com sucesso
 */
export async function sendAccountVerificationEmail(
  userId: number,
  email: string,
  nome: string
): Promise<boolean> {
  try {
    // Gerar token de verificação
    const token = await createEmailVerificationToken(userId);
    
    // Construir URL de verificação adequada ao ambiente atual com porta 3000 para Replit
    let baseUrl = process.env.SITE_URL || 'https://meuprecocerto.com';
    
    // Se estiver em ambiente Replit, adicionar a porta 3000
    if (process.env.REPLIT_DOMAINS) {
      baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}:3000`;
    }
    
    const verificationUrl = `${baseUrl}/verificar-email?token=${token}`;
    
    // Enviar email usando o template de verificação da biblioteca email.ts
    return await sendVerificationEmail(email, nome, token);
  } catch (error) {
    console.error("Erro ao enviar email de verificação");
    return false;
  }
}

/**
 * Verifica um token de verificação de email
 * @param token Token a ser verificado
 * @returns Boolean indicando se o token é válido e foi processado
 */
export async function verifyEmailToken(token: string): Promise<boolean> {
  try {
    // Buscar informações do token no banco de dados
    const verificacaoInfo = await storage.getEmailVerificationToken(token);
    
    // Se token não existir ou já foi utilizado
    if (!verificacaoInfo) {
      return false;
    }
    
    // Verificar se o token expirou
    const agora = new Date();
    if (agora > verificacaoInfo.expiresAt) {
      return false;
    }
    
    // Marcar usuário como verificado
    await storage.markEmailAsVerified(verificacaoInfo.userId);
    
    // Marcar token como utilizado
    await storage.useEmailVerificationToken(token);
    
    return true;
  } catch (error) {
    console.error("Erro ao verificar token de email");
    return false;
  }
}

/**
 * Reenviar email de verificação
 * @param email Email do usuário
 * @returns Boolean indicando se o email foi reenviado com sucesso
 */
export async function resendVerificationEmail(email: string): Promise<boolean> {
  try {
    // Buscar usuário pelo email
    const user = await storage.getUserByEmail(email);
    
    // Se usuário não existir
    if (!user) {
      return false;
    }
    
    // Se o email já estiver verificado
    if (user.emailVerified) {
      return true;
    }
    
    // Reenviar email de verificação
    return await sendAccountVerificationEmail(user.id, user.email, user.username);
  } catch (error) {
    console.error("Erro ao reenviar email de verificação");
    return false;
  }
}