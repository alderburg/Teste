import { connectionManager } from './connection-manager';

/**
 * Sistema de limpeza otimizado de sessões
 * Focado em performance e baixo impacto no sistema
 */

export class OptimizedSessionCleanup {
  private isRunning = false;
  private lastCleanup: Date | null = null;
  private batchSize = 1000; // Processar em lotes pequenos

  /**
   * Limpeza otimizada em lotes pequenos
   */
  async optimizedCleanup(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🧹 Iniciando limpeza otimizada...');

    try {
      let totalRemoved = 0;
      let batchCount = 0;

      // Usar índices para busca eficiente
      while (true) {
        // Limpar em lotes pequenos para não bloquear o banco
        const result = await connectionManager.executeQuery(`
          DELETE FROM user_sessions 
          WHERE id IN (
            SELECT id FROM user_sessions 
            WHERE (expires_at < NOW() - INTERVAL '30 days' 
                   OR (is_active = false AND last_activity < NOW() - INTERVAL '90 days'))
            ORDER BY expires_at ASC
            LIMIT $1
          )
          RETURNING id
        `, [this.batchSize]) as { rowCount: number };

        const removed = result.rowCount || 0;
        totalRemoved += removed;
        batchCount++;

        if (removed === 0) break; // Não há mais registros para remover

        // Pausa pequena entre lotes para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));

        // Limite máximo de lotes por execução (segurança)
        if (batchCount >= 10) break;
      }

      // Marcar sessões inativas de forma eficiente
      const inactiveResult = await connectionManager.executeQuery(`
        UPDATE user_sessions 
        SET is_active = false
        WHERE is_active = true 
        AND last_activity < NOW() - INTERVAL '24 hours'
        AND expires_at > NOW()
      `) as { rowCount: number };

      const markedInactive = inactiveResult.rowCount || 0;

      console.log(`✅ Limpeza otimizada concluída:`, {
        sessõesRemovidas: totalRemoved,
        lotes: batchCount,
        marcadasInativas: markedInactive
      });

      this.lastCleanup = new Date();

    } catch (error) {
      console.error('❌ Erro na limpeza otimizada:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Verifica rapidamente se há muitas sessões para limpar
   */
  async needsCleanup(): Promise<boolean> {
    try {
      // Consulta rápida usando índices
      const result = await connectionManager.executeQuery(`
        SELECT EXISTS(
          SELECT 1 FROM user_sessions 
          WHERE expires_at < NOW() - INTERVAL '30 days'
          LIMIT 1
        ) as has_expired
      `) as { rows: { has_expired: boolean }[] };

      return result.rows[0]?.has_expired || false;
    } catch (error) {
      console.error('Erro ao verificar necessidade de limpeza:', error);
      return false;
    }
  }

  /**
   * Estatísticas rápidas sem impacto na performance
   */
  async getQuickStats(): Promise<any> {
    try {
      const result = await connectionManager.executeQuery(`
        SELECT 
          COUNT(CASE WHEN is_active = true AND expires_at > NOW() THEN 1 END) as active,
          COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
        FROM user_sessions 
        WHERE created_at > NOW() - INTERVAL '7 days'
      `) as { rows: any[] };

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return { active: 0, expired: 0, inactive: 0 };
    }
  }
}

export const optimizedSessionCleanup = new OptimizedSessionCleanup();