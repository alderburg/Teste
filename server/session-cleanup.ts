import { connectionManager } from './connection-manager';

/**
 * Sistema de limpeza automática de sessões
 * Baseado nas melhores práticas de grandes sistemas (Google, Microsoft, Facebook)
 */

export interface SessionCleanupStats {
  expiredSessionsRemoved: number;
  inactiveSessionsRemoved: number;
  totalSessionsBefore: number;
  totalSessionsAfter: number;
  cleanupTime: Date;
}

export class SessionCleanupManager {
  private isRunning = false;
  private lastCleanup: Date | null = null;
  private stats: SessionCleanupStats[] = [];

  /**
   * Executa limpeza diária - remove sessões expiradas há mais de 30 dias
   */
  async dailyCleanup(): Promise<SessionCleanupStats> {
    if (this.isRunning) {
      throw new Error('Limpeza já está em execução');
    }

    this.isRunning = true;
    console.log('🧹 Iniciando limpeza diária de sessões...');

    try {
      // Contar sessões antes da limpeza
      const beforeCountResult = await connectionManager.executeQuery(`
        SELECT COUNT(*) as total FROM user_sessions
      `) as { rows: { total: string }[] };
      const totalBefore = parseInt(beforeCountResult.rows[0]?.total || '0');

      // Remover sessões expiradas há mais de 30 dias
      const expiredResult = await connectionManager.executeQuery(`
        DELETE FROM user_sessions 
        WHERE expires_at < NOW() - INTERVAL '30 days'
        RETURNING id
      `) as { rowCount: number };

      const expiredRemoved = expiredResult.rowCount || 0;

      // Contar sessões após a limpeza
      const afterCountResult = await connectionManager.executeQuery(`
        SELECT COUNT(*) as total FROM user_sessions
      `) as { rows: { total: string }[] };
      const totalAfter = parseInt(afterCountResult.rows[0]?.total || '0');

      const stats: SessionCleanupStats = {
        expiredSessionsRemoved: expiredRemoved,
        inactiveSessionsRemoved: 0,
        totalSessionsBefore: totalBefore,
        totalSessionsAfter: totalAfter,
        cleanupTime: new Date()
      };

      this.stats.push(stats);
      this.lastCleanup = new Date();

      console.log(`✅ Limpeza diária concluída:`, {
        sessõesExpiradas: expiredRemoved,
        totalAntes: totalBefore,
        totalDepois: totalAfter
      });

      return stats;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Executa limpeza semanal - remove sessões inativas há mais de 90 dias
   */
  async weeklyCleanup(): Promise<SessionCleanupStats> {
    if (this.isRunning) {
      throw new Error('Limpeza já está em execução');
    }

    this.isRunning = true;
    console.log('🧹 Iniciando limpeza semanal de sessões...');

    try {
      // Contar sessões antes da limpeza
      const beforeCountResult = await connectionManager.executeQuery(`
        SELECT COUNT(*) as total FROM user_sessions
      `) as { rows: { total: string }[] };
      const totalBefore = parseInt(beforeCountResult.rows[0]?.total || '0');

      // Remover sessões expiradas há mais de 30 dias
      const expiredResult = await connectionManager.executeQuery(`
        DELETE FROM user_sessions 
        WHERE expires_at < NOW() - INTERVAL '30 days'
        RETURNING id
      `) as { rowCount: number };

      // Remover sessões inativas há mais de 90 dias
      const inactiveResult = await connectionManager.executeQuery(`
        DELETE FROM user_sessions 
        WHERE is_active = false 
        AND last_activity < NOW() - INTERVAL '90 days'
        RETURNING id
      `) as { rowCount: number };

      const expiredRemoved = expiredResult.rowCount || 0;
      const inactiveRemoved = inactiveResult.rowCount || 0;

      // Contar sessões após a limpeza
      const afterCountResult = await connectionManager.executeQuery(`
        SELECT COUNT(*) as total FROM user_sessions
      `) as { rows: { total: string }[] };
      const totalAfter = parseInt(afterCountResult.rows[0]?.total || '0');

      const stats: SessionCleanupStats = {
        expiredSessionsRemoved: expiredRemoved,
        inactiveSessionsRemoved: inactiveRemoved,
        totalSessionsBefore: totalBefore,
        totalSessionsAfter: totalAfter,
        cleanupTime: new Date()
      };

      this.stats.push(stats);
      this.lastCleanup = new Date();

      console.log(`✅ Limpeza semanal concluída:`, {
        sessõesExpiradas: expiredRemoved,
        sessõesInativas: inactiveRemoved,
        totalAntes: totalBefore,
        totalDepois: totalAfter
      });

      return stats;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Marca sessões como inativas baseado na última atividade
   */
  async markInactiveSessions(): Promise<number> {
    console.log('⏱️ Marcando sessões inativas...');

    try {
      // Marcar como inativas sessões sem atividade há mais de 24 horas
      const result = await connectionManager.executeQuery(`
        UPDATE user_sessions 
        SET is_active = false
        WHERE is_active = true 
        AND last_activity < NOW() - INTERVAL '24 hours'
        AND expires_at > NOW()
        RETURNING id
      `) as { rowCount: number };

      const marked = result.rowCount || 0;
      
      if (marked > 0) {
        console.log(`🔄 ${marked} sessões marcadas como inativas`);
      }

      return marked;

    } catch (error) {
      console.error('❌ Erro ao marcar sessões inativas:', error);
      return 0;
    }
  }

  /**
   * Retorna estatísticas das últimas limpezas
   */
  getCleanupStats(): SessionCleanupStats[] {
    return this.stats.slice(-10); // Últimas 10 limpezas
  }

  /**
   * Retorna informações sobre o estado atual das sessões
   */
  async getCurrentSessionStats(): Promise<any> {
    try {
      const result = await connectionManager.executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true AND expires_at > NOW() THEN 1 END) as active,
          COUNT(CASE WHEN is_active = false AND expires_at > NOW() THEN 1 END) as inactive,
          COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired,
          COUNT(CASE WHEN last_activity < NOW() - INTERVAL '1 hour' AND is_active = true THEN 1 END) as idle_1h,
          COUNT(CASE WHEN last_activity < NOW() - INTERVAL '24 hours' AND is_active = true THEN 1 END) as idle_24h,
          COUNT(CASE WHEN created_at < NOW() - INTERVAL '30 days' AND expires_at <= NOW() THEN 1 END) as candidates_for_removal
        FROM user_sessions
      `) as { rows: any[] };

      return result.rows[0];
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas de sessões:', error);
      return null;
    }
  }

  /**
   * Força limpeza imediata (para uso administrativo)
   */
  async forceCleanup(): Promise<SessionCleanupStats> {
    console.log('🚨 Executando limpeza forçada...');
    return await this.weeklyCleanup();
  }

  /**
   * Verifica se está na hora de executar limpeza automática
   */
  shouldRunDailyCleanup(): boolean {
    if (!this.lastCleanup) return true;
    
    const timeSinceLastCleanup = Date.now() - this.lastCleanup.getTime();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    return timeSinceLastCleanup >= oneDayInMs;
  }

  /**
   * Verifica se está na hora de executar limpeza semanal
   */
  shouldRunWeeklyCleanup(): boolean {
    if (!this.lastCleanup) return true;
    
    const timeSinceLastCleanup = Date.now() - this.lastCleanup.getTime();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    
    return timeSinceLastCleanup >= oneWeekInMs;
  }
}

// Instância singleton
export const sessionCleanupManager = new SessionCleanupManager();