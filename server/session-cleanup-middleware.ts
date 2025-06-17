
import { Request, Response, NextFunction } from 'express';

// Middleware para limpeza assíncrona de sessões inválidas
export function sessionCleanupMiddleware(req: Request, res: Response, next: NextFunction) {
  // Se a sessão foi marcada como inválida, fazer limpeza assíncrona
  if (req.session?.sessionInvalid) {
    // Fazer limpeza em background sem bloquear a resposta
    setImmediate(() => {
      try {
        req.logout((err) => {
          if (err) console.error('Erro no logout assíncrono:', err);
        });
        
        req.session.destroy((err) => {
          if (err) console.error('Erro ao destruir sessão assíncrona:', err);
        });
      } catch (error) {
        console.error('Erro na limpeza assíncrona de sessão:', error);
      }
    });
  }
  
  next();
}
