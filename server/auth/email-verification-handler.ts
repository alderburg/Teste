import { Request, Response } from 'express';
import { storage } from '../storage';
import { sendAccountVerificationEmail, verifyEmailToken, resendVerificationEmail } from '../email-verification';

/**
 * Verifica se um email já está cadastrado no sistema
 * @param req Requisição Express
 * @param res Resposta Express
 */
export async function checkEmailExists(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        exists: false,
        message: "Email não fornecido"
      });
    }
    
    // Verificar se o email já existe
    const existingUser = await storage.getUserByEmail(email);
    
    return res.status(200).json({
      success: true,
      exists: !!existingUser,
      verified: existingUser ? existingUser.emailVerified : false
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erro ao verificar existência de email"
    });
  }
}

/**
 * Processa a verificação de email com base no token
 * @param req Requisição Express
 * @param res Resposta Express
 */
export async function handleEmailVerification(req: Request, res: Response) {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.redirect('/login?error=token-invalido');
    }
    
    // Verificar o token
    const verificado = await verifyEmailToken(token);
    
    if (verificado) {
      return res.redirect('/login?verified=true');
    } else {
      return res.redirect('/login?error=token-invalido');
    }
  } catch (error) {
    // Erro silencioso em produção
    return res.redirect('/login?error=erro-interno');
  }
}

/**
 * Reenvia o email de verificação
 * @param req Requisição Express
 * @param res Resposta Express
 */
export async function handleResendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email não fornecido"
      });
    }
    
    // Verificar se o email existe no sistema
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email não encontrado no sistema"
      });
    }
    
    // Verificar se o email já foi verificado
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Este email já foi verificado"
      });
    }
    
    // Reenviar o email de verificação
    const enviado = await resendVerificationEmail(email);
    
    if (enviado) {
      return res.status(200).json({
        success: true,
        message: "Email de verificação reenviado com sucesso"
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Falha ao reenviar o email de verificação"
      });
    }
  } catch (error) {
    // Erro silencioso em produção
    return res.status(500).json({
      success: false,
      message: "Erro interno ao reenviar email de verificação"
    });
  }
}

/**
 * Envia email de verificação após cadastro bem-sucedido
 * @param req Requisição Express
 * @param res Resposta Express
 */
export async function sendVerificationAfterSignup(userId: number, email: string, name: string): Promise<boolean> {
  try {
    const enviado = await sendAccountVerificationEmail(userId, email, name);
    return enviado;
  } catch (error) {
    // Erro silencioso em produção
    return false;
  }
}