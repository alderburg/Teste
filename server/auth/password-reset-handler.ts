import { Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { storage } from "../storage";
import { eq } from "drizzle-orm";
import { sendPasswordRecoveryEmail } from "../email";
import { passwordResetTokens, users } from "@shared/schema";

/**
 * Função para verificar se um email existe no banco de dados
 * @param email Email para verificar
 * @returns Boolean indicando se o email existe e o ID do usuário se encontrado
 */
async function checkEmailExists(email: string): Promise<{exists: boolean, userId?: number}> {
  try {
    // Usar diretamente o DB drizzle para verificar se o email existe
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (result.length > 0) {
      console.log(`Email ${email} encontrado no banco`);
      return { exists: true, userId: result[0].id };
    }
    
    console.log(`Email ${email} não encontrado no sistema`);
    return { exists: false };
  } catch (error) {
    console.error("Erro ao verificar existência de email:", error);
    // Em caso de erro de consulta, retornar false de forma segura
    return { exists: false };
  }
}

/**
 * Função para gerar um token de recuperação de senha
 * @param email Email do usuário
 * @returns Token gerado ou null em caso de erro
 */
async function generatePasswordResetToken(email: string): Promise<string | null> {
  try {
    // Verificar se o usuário existe
    const emailCheck = await checkEmailExists(email);
    if (!emailCheck.exists || !emailCheck.userId) {
      console.log(`generatePasswordResetToken: Usuário não encontrado para o email ${email}`);
      return null;
    }

    const userId = emailCheck.userId;
    
    // Gerar um token aleatório
    const token = crypto.randomBytes(32).toString("hex");
    
    // Definir data de expiração (3 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3);
    
    try {
      // Excluir tokens anteriores para este usuário
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId));
      
      // Salvar o novo token
      await db
        .insert(passwordResetTokens)
        .values({
          userId: userId,
          token,
          expiresAt,
          used: false
        });
      
      console.log(`Token de recuperação gerado com sucesso para ${email}`);
      return token;
    } catch (dbError) {
      console.error(`Erro de banco de dados ao gerar token para ${email}:`, dbError);
      return null;
    }
  } catch (error) {
    console.error(`Erro ao gerar token de recuperação para ${email}:`, error);
    return null;
  }
}

/**
 * Handler para processar solicitações de recuperação de senha
 * @param req Requisição Express
 * @param res Resposta Express
 */
export async function handlePasswordResetRequest(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    // Validar que o email foi fornecido
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email é obrigatório"
      });
    }
    
    // Mensagem genérica de segurança para todos os casos
    const genericSuccessMessage = {
      success: true,
      message: "Se o email existir no sistema, um link de recuperação será enviado."
    };
    
    try {
      // Verificar se o email existe no sistema
      const emailCheck = await checkEmailExists(email);
      
      // Se o email não existir, retornar mensagem genérica de sucesso por segurança
      if (!emailCheck.exists) {
        return res.status(200).json(genericSuccessMessage);
      }
      
      // Já temos o userId direto da verificação do email
      if (!emailCheck.userId) {
        return res.status(200).json(genericSuccessMessage);
      }
      
      // Buscar dados do usuário para personalizar o email
      let user = await storage.getUser(emailCheck.userId);
      
      // Se não encontrar pelo storage, buscar diretamente pelo banco
      if (!user) {
        // Buscar nome de usuário diretamente do banco
        const userResult = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email
          })
          .from(users)
          .where(eq(users.id, emailCheck.userId))
          .limit(1);
          
        if (userResult.length === 0) {
          return res.status(200).json(genericSuccessMessage);
        }
        
        user = userResult[0];
      }
      
      // Gerar token de recuperação diretamente usando o userId
      // Gerar um token aleatório
      const token = crypto.randomBytes(32).toString("hex");
      
      // Definir data de expiração (3 horas)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 3);
      
      try {
        // Excluir tokens anteriores para este usuário
        await db
          .delete(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, emailCheck.userId));
        
        // Salvar o novo token
        await db
          .insert(passwordResetTokens)
          .values({
            userId: emailCheck.userId,
            token,
            expiresAt,
            used: false
          });
        
        // Token gerado com sucesso
      } catch (dbError) {
        console.error(`Erro de banco de dados:`, dbError);
        return res.status(200).json(genericSuccessMessage);
      }
      
      // Enviar email de recuperação
      const emailSent = await sendPasswordRecoveryEmail(
        email,
        user.username,
        token
      );
      
      if (!emailSent) {
        console.error(`Erro ao enviar email de recuperação`);
        // Retornar uma mensagem de erro neutra que não confirma a existência do email
        return res.status(500).json({
          success: false,
          message: "Não foi possível processar sua solicitação neste momento. Por favor, tente novamente mais tarde."
        });
      }
      
      // Retornar sucesso, mas ainda usando uma mensagem genérica para não confirmar
      // explicitamente que o email existe no sistema
      return res.status(200).json(genericSuccessMessage);
      
    } catch (error) {
      console.error(`Erro durante processamento de recuperação:`, error);
      // Em caso de erro, ainda retornamos status 200 com mensagem neutra
      return res.status(200).json(genericSuccessMessage);
    }
  } catch (error) {
    console.error("Erro ao processar solicitação de recuperação de senha:", error);
    // Erro geral do servidor
    return res.status(500).json({
      success: false,
      message: "Não foi possível processar sua solicitação neste momento. Por favor, tente novamente mais tarde."
    });
  }
}

/**
 * Verificar se um token de recuperação de senha é válido
 * @param token Token a ser verificado
 * @returns Informações do token se for válido ou null
 */
export async function verifyPasswordResetToken(token: string): Promise<{ userId: number, token: string } | null> {
  try {
    // Buscar o token
    const result = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    
    // Token não encontrado
    if (result.length === 0) {
      return null;
    }
    
    const tokenInfo = result[0];
    
    // Verificar se o token já foi utilizado
    if (tokenInfo.used) {
      return null;
    }
    
    // Verificar se o token expirou
    const now = new Date();
    if (now > tokenInfo.expiresAt) {
      return null;
    }
    
    return {
      userId: tokenInfo.userId,
      token: tokenInfo.token
    };
  } catch (error) {
    console.error("Erro ao verificar token de recuperação de senha:", error);
    return null;
  }
}

/**
 * Marcar um token de recuperação de senha como utilizado
 * @param token Token a ser marcado
 * @returns Boolean indicando sucesso da operação
 */
export async function markPasswordResetTokenAsUsed(token: string): Promise<boolean> {
  try {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
    
    return true;
  } catch (error) {
    console.error("Erro ao marcar token como utilizado:", error);
    return false;
  }
}

// Exportar funções para uso externo
export {
  checkEmailExists,
  generatePasswordResetToken
};