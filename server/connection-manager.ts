/**
 * Sistema avançado de gerenciamento de conexões para banco de dados PostgreSQL
 * 
 * Este módulo implementa boas práticas de gerenciamento de conexões usadas em
 * ambientes de produção de alta escala, incluindo:
 * 
 * 1. Pool de conexões com limites rigorosos
 * 2. Monitoramento ativo de conexões
 * 3. Desconexão automática de consultas longas
 * 4. Retry com backoff exponencial
 * 5. Detecção de vazamento de conexões
 * 6. Reuso inteligente de conexões
 * 7. Contabilidade detalhada
 */

import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Estatísticas e métricas para monitoramento
interface ConnectionStats {
  totalRequests: number;
  activeConnections: number;
  peakConnections: number;
  connectionErrors: number;
  connectionsTimedOut: number;
  queriesExecuted: number;
  totalQueryTime: number;
  longRunningQueries: number;
  lastError?: string;
  lastErrorTime?: Date;
}

class ConnectionManager {
  private pool: Pool;
  private stats: ConnectionStats;
  private activeClients: Map<string, { client: PoolClient, acquiredAt: Date, queryStart?: Date, query?: string }>;
  private connectionTimeout: number;
  private queryTimeout: number;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Configurações otimizadas de conexão
    const config = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },

      // Configurações otimizadas de timeout e pool
      connectionTimeoutMillis: 8000, // Reduzido para conexão mais rápida
      idleTimeoutMillis: 20000, // 20 segundos de timeout para conexões ociosas

      // Configurações de pool ajustadas
      max: 10, // Reduzido para evitar sobrecarga
      min: 1, // Manter conexão mínima
      acquireTimeoutMillis: 10000, // Timeout mais rápido

      // Configurações de comportamento
      allowExitOnIdle: true,
      statement_timeout: 30000 // 30 segundos para timeout de queries
    };

    this.pool = new Pool(config);
    this.connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000');
    this.queryTimeout = 30000; // 30 segundos para timeout de queries
    this.activeClients = new Map();

    // Inicializar estatísticas
    this.stats = {
      totalRequests: 0,
      activeConnections: 0,
      peakConnections: 0,
      connectionErrors: 0,
      connectionsTimedOut: 0,
      queriesExecuted: 0,
      totalQueryTime: 0,
      longRunningQueries: 0
    };

    // Configurar listeners para eventos do pool
    this.setupPoolListeners();

    // Iniciar monitoramento
    this.startMonitoring();

    console.log('⚡ Sistema avançado de gerenciamento de conexões inicializado');
    console.log(`📊 Configurações: max=${config.max}, timeout=${this.connectionTimeout}ms, queryTimeout=${this.queryTimeout}ms`);
  }

  private setupPoolListeners(): void {
    // Monitorar erros de pool
    this.pool.on('error', (err) => {
      // Registrar o erro apenas internamente, sem log
      this.stats.connectionErrors++;
      this.stats.lastError = err.message;
      this.stats.lastErrorTime = new Date();

      if (err.message.includes('too many connections')) {
        this.emergencyCleanup();
      }
    });

    // Monitorar aquisição de conexão (sem logs)
    this.pool.on('connect', (client) => {
      // Sem logs para reduzir ruído
    });

    // Monitorar remoção de conexão (sem logs)
    this.pool.on('remove', (client) => {
      // Sem logs para reduzir ruído
    });
  }

  /**
   * Iniciar monitoramento periódico das conexões
   * Esta é uma prática essencial em sistemas de produção
   */
  private startMonitoring(): void {
    // Monitorar a cada 30 segundos
    this.monitorInterval = setInterval(() => {
      this.monitorConnections();
    }, 30000);
  }

  /**
   * Monitorar estado atual das conexões e executar limpeza se necessário
   */
  private async monitorConnections(): Promise<void> {
    try {
      // Verificar conexões antigas sem logs
      const now = new Date().getTime();
      let longRunningFound = false;

      this.activeClients.forEach((info, id) => {
        const connectionAge = now - info.acquiredAt.getTime();

        // Se a conexão está ativa há mais de 2 minutos
        if (connectionAge > 120000) {
          longRunningFound = true;
        }

        // Se há uma query em execução há mais de 1 minuto
        if (info.queryStart && ((now - info.queryStart.getTime()) > 60000)) {
          this.stats.longRunningQueries++;
        }
      });

      // Se encontramos consultas longas, tentar diagnóstico
      if (longRunningFound || this.pool.waitingCount > 0) {
        await this._diagnosePoolHealth();
      }
    } catch (err) {
      // Sem logs de erro
    }
  }

  /**
   * Diagnosticar saúde das conexões no banco de dados
   */
  private async _diagnosePoolHealth(): Promise<void> {
    try {
      // Obter uma nova conexão fora do pool principal para verificação
      const diagnosticPool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
        max: 1
      });

      const client = await diagnosticPool.connect();

      try {
        // Verificar conexões ativas no banco de dados
        const result = await client.query(`
          SELECT count(*) as count 
          FROM pg_stat_activity 
          WHERE usename = $1
        `, [process.env.DB_USER]);

        const totalDbConnections = parseInt(result.rows[0].count);

        console.log(`\n📊 RELATÓRIO DE CONEXÕES ----------------------------`);
        console.log(`📊 Conexões no banco: ${totalDbConnections} (reportadas pelo PostgreSQL)`);

        // Verificar se estamos próximos do limite
        const limitResult = await client.query(`
          SELECT rolconnlimit 
          FROM pg_roles 
          WHERE rolname = $1
        `, [process.env.DB_USER]);

        if (limitResult.rows.length > 0) {
          const limit = limitResult.rows[0].rolconnlimit;
          const limitDesc = limit < 0 ? 'ilimitado' : limit;

          console.log(`📊 Limite de conexões: ${limitDesc}`);
          console.log(`📊 ---------------------------------------------\n`);
        }
      } finally {
        client.release();
        await diagnosticPool.end();
      }
    } catch (err) {
      // Sem logs de erro
    }
  }

  /**
   * Limpeza de emergência quando ocorre erro de "too many connections"
   */
  private async emergencyCleanup(): Promise<void> {
    try {
      // Terminar o pool atual e criar um novo
      await this.pool.end();

      // Criar novo pool com configurações mais restritivas
      this.pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: this.connectionTimeout,
        idleTimeoutMillis: 10000, // 10 segundos
        max: 2, // Apenas 2 conexões no máximo
        allowExitOnIdle: true,
        statement_timeout: 15000 // 15 segundos
      });

      // Resetar o mapa de clientes ativos
      this.activeClients.clear();

      // Configurar listeners novamente
      this.setupPoolListeners();
    } catch (err) {
      // Sem logs
    }
  }

  /**
   * Executa uma consulta com retries e monitoramento
   * Este é o método principal para ser usado pelos clientes
   */
  public async executeQuery<T>(
    queryText: string, 
    params: any[] = [], 
    options: { 
      maxRetries?: number,
      timeout?: number,
      tag?: string
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 2;
    const timeout = options.timeout ?? this.queryTimeout;
    const tag = options.tag || 'query';
    const clientId = `${tag}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    let retries = 0;
    let lastError: any = null;

    // Incrementar contador de requisições
    this.stats.totalRequests++;

    // Loop de retry
    while (retries <= maxRetries) {
      let client: PoolClient | null = null;
      const startTime = Date.now();

      try {
        // Obter conexão do pool
        client = await Promise.race([
          this.pool.connect(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao adquirir conexão')), this.connectionTimeout);
          })
        ]) as PoolClient;

        // Registrar cliente ativo
        this.activeClients.set(clientId, { 
          client, 
          acquiredAt: new Date(),
          queryStart: new Date(),
          query: typeof queryText === 'string' ? queryText : 'Query não textual'
        });

        // Atualizar estatísticas
        this.stats.activeConnections++;
        if (this.stats.activeConnections > this.stats.peakConnections) {
          this.stats.peakConnections = this.stats.activeConnections;
        }

        // Executar query com timeout
        const result = await Promise.race([
          client.query(queryText, params),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Query timeout após ${timeout}ms`)), timeout);
          })
        ]);

        // Atualizar estatísticas de tempo
        const queryTime = Date.now() - startTime;
        this.stats.queriesExecuted++;
        this.stats.totalQueryTime += queryTime;

        // Remover logs de queries lontas

        // Remover do registro de clientes ativos
        this.activeClients.delete(clientId);

        // Liberar cliente de volta para o pool
        if (client) {
          client.release();
          this.stats.activeConnections--;
        }

        return result as T;

      } catch (error: any) {
        lastError = error;

        // Atualizar estatísticas
        this.stats.connectionErrors++;
        this.stats.lastError = error.message;
        this.stats.lastErrorTime = new Date();

        if (client) {
          try {
            // Liberar cliente com problema
            this.activeClients.delete(clientId);
            client.release(true); // true indica para descartar a conexão em vez de reutilizá-la
            this.stats.activeConnections--;
          } catch (releaseError) {
            console.error('🔴 Erro ao liberar cliente:', releaseError);
          }
        }

        // Verificar se é um erro que justifica retry
        const shouldRetry = error.message.includes('too many connections') || 
                            error.message.includes('timeout') || 
                            error.message.includes('connection terminated') ||
                            error.message.includes('Connection terminated');

        if (shouldRetry && retries < maxRetries) {
          retries++;
          const backoffTime = Math.min(50 * Math.pow(2, retries), 1000); // Max 1 segundo

          console.warn(`⚠️ Retry ${retries}/${maxRetries} após ${backoffTime}ms. Erro: ${error.message}`);

          // Esperar antes de tentar novamente (backoff exponencial)
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        } else {
          // Sem mais retries ou erro que não justifica retry
          throw error;
        }
      }
    }

    // Se chegou aqui, todos os retries falharam
    throw lastError;
  }

  /**
   * Obter estatísticas de uso das conexões
   */
  public getStats(): ConnectionStats {
    return { ...this.stats };
  }

  // Método para diagnóstico público
  public async diagnosePoolHealth(): Promise<{
    totalConnections: number;
    connectionLimit: number | string;
    poolTotalCount: number;
    activeClients: number;
  }> {
    try {
      const diagnosticPool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
        max: 1
      });

      const client = await diagnosticPool.connect();

      try {
        // Verificar conexões ativas no banco de dados
        const result = await client.query(`
          SELECT count(*) as count 
          FROM pg_stat_activity 
          WHERE usename = $1
        `, [process.env.DB_USER]);

        const totalDbConnections = parseInt(result.rows[0].count);

        // Verificar se estamos próximos do limite
        const limitResult = await client.query(`
          SELECT rolconnlimit 
          FROM pg_roles 
          WHERE rolname = $1
        `, [process.env.DB_USER]);

        let connectionLimit: number | string = 'desconhecido';

        if (limitResult.rows.length > 0) {
          const limit = limitResult.rows[0].rolconnlimit;
          connectionLimit = limit < 0 ? 'ilimitado' : limit;
        }

        console.log(`\n📊 RELATÓRIO DE CONEXÕES ---------------- competencia`);
        console.log(`📊 Conexões no banco: ${totalDbConnections} (reportadas pelo PostgreSQL)`);
        console.log(`📊 Limite de conexões: ${connectionLimit}`);
        console.log(`📊 ---------------------------------------------\n`);

        return {
          totalConnections: totalDbConnections,
          connectionLimit,
          poolTotalCount: this.pool.totalCount,
          activeClients: this.activeClients.size
        };
      } finally {
        client.release();
        await diagnosticPool.end();
      }
    } catch (err) {
      console.error('Erro ao executar diagnóstico:', err);
      return {
        totalConnections: -1,
        connectionLimit: 'erro',
        poolTotalCount: this.pool.totalCount,
        activeClients: this.activeClients.size
      };
    }
  }

  /**
   * Liberação de recursos na finalização da aplicação
   */
  public async shutdown(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    console.log('🔄 Finalizando pool de conexões...');
    await this.pool.end();
    console.log('✅ Pool de conexões finalizado com sucesso');
  }
}

// Singleton para uso em toda a aplicação
export const connectionManager = new ConnectionManager();

// Método auxiliar para executar queries com segurança e monitoramento
export async function executeQuery<T>(
  queryText: string, 
  params: any[] = [], 
  options: {
    maxRetries?: number,
    timeout?: number,
    tag?: string
  } = {}
): Promise<T> {
  return connectionManager.executeQuery<T>(queryText, params, options);
}

// Helper para saída limpa da aplicação
process.on('SIGINT', async () => {
  console.log('Recebido sinal SIGINT. Encerrando conexões...');
  await connectionManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Recebido sinal SIGTERM. Encerrando conexões...');
  await connectionManager.shutdown();
  process.exit(0);
});

// Exportar funções e classes úteis
export { ConnectionManager, ConnectionStats };