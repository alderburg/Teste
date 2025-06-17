import { 
  users, userProfiles, activityLogs, produtos, servicos, itensAluguel, fornecedores, clientes, marketplaces, custos, despesas, taxas, tributos, precificacoes, categorias,
  enderecos, contatos, usuariosAdicionais, paymentMethods, planos, assinaturas, stripeCustomers, emailVerificationTokens,
  type User, type InsertUser, 
  type UserProfile, type InsertUserProfile,
  type ActivityLog, type InsertActivityLog,
  type Endereco, type InsertEndereco,
  type Contato, type InsertContato,
  type UsuarioAdicional, type InsertUsuarioAdicional,
  type Produto, type InsertProduto,
  type Servico, type InsertServico,
  type ItemAluguel, type InsertItemAluguel,
  type Fornecedor, type InsertFornecedor,
  type Cliente, type InsertCliente,
  type Marketplace, type InsertMarketplace,
  type Custo, type InsertCusto,
  type Despesa, type InsertDespesa,
  type Taxa, type InsertTaxa,
  type Tributo, type InsertTributo,
  type Precificacao, type InsertPrecificacao,
  type Categoria, type InsertCategoria,
  type PaymentMethod, type InsertPaymentMethod,
  type StripeCustomer, type InsertStripeCustomer,
  insertPlanoSchema, type InsertPlano,
  insertAssinaturaSchema, type InsertAssinatura
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, isNull, or, not, ne, desc } from "drizzle-orm";
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { sql } from "drizzle-orm";
import { timestampToBrazilianDate } from "./utils/timezone";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Usuários
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByRole(role: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updatePassword(id: number, password: string): Promise<boolean>;
  updateLastLogin(id: number): Promise<boolean>;
  updateUserStripeId(id: number, stripeCustomerId: string): Promise<boolean>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;

  // Métodos para verificação de email
  createEmailVerificationToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  getEmailVerificationToken(token: string): Promise<{ userId: number, token: string, expiresAt: Date } | undefined>;
  markEmailAsVerified(userId: number): Promise<boolean>;

  // Métodos para planos e assinaturas
  getPlanoById(id: number): Promise<any>;
  createAssinatura(assinatura: InsertAssinatura): Promise<any>;
  updateAssinaturaByStripeId(stripeSubscriptionId: string, data: Partial<any>): Promise<boolean>;
  getAssinaturaByStripeId(stripeSubscriptionId: string): Promise<any | undefined>;
  cancelarAssinaturaPorStripeId(stripeSubscriptionId: string, dataCancelamento: Date): Promise<boolean>;
  cancelarTodasAssinaturasComStripeId(stripeSubscriptionId: string, dataCancelamento: Date): Promise<boolean>;
  useEmailVerificationToken(token: string): Promise<boolean>;
  getUserSessions(userId: number): Promise<any[]>;
  getUserSessionsAdditional(userId: number): Promise<any[]>;
  createUserSession(sessionData: any): Promise<any>;
  terminateSession(sessionId: number): Promise<boolean>;
  terminateAllSessions(userId: number): Promise<boolean>;
  deleteSession(sessionId: number): Promise<boolean>;
  deleteSessionByToken(sessionToken: string): Promise<boolean>;
  invalidateUserSession(sessionToken: string): Promise<boolean>;

  // Métodos para mapeamento de clientes Stripe
  getStripeCustomerByUserId(userId: number): Promise<StripeCustomer | undefined>;
  getStripeCustomerByStripeId(stripeCustomerId: string): Promise<StripeCustomer | undefined>;
  createStripeCustomer(data: InsertStripeCustomer): Promise<StripeCustomer>;

  // Planos e assinaturas
  getPlanos(): Promise<any[]>;
  getPlano(id: number): Promise<any | undefined>;
  getPlanoByNome(nome: string): Promise<any | undefined>;
  createPlano(plano: InsertPlano): Promise<any>;
  updatePlano(id: number, plano: Partial<InsertPlano>): Promise<any | undefined>;
  deletePlano(id: number): Promise<boolean>;

  // Contagem de recursos para limites dos planos
  contarProdutos(userId: number): Promise<number>;

  getAssinaturas(userId?: number): Promise<any[]>;
  getAssinatura(id: number): Promise<any | undefined>;
  getAssinaturaAtiva(userId: number): Promise<any | undefined>;
  createAssinatura(assinatura: InsertAssinatura): Promise<any>;
  updateAssinatura(id: number, assinatura: Partial<InsertAssinatura>): Promise<any | undefined>;
  cancelarAssinatura(id: number): Promise<boolean>;
  vincularStripeSubscription(id: number, stripeSubscriptionId: string): Promise<boolean>;

  // Perfis de Usuário
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, profile: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // Endereços
  getEndereco(id: number): Promise<Endereco | undefined>;
  getEnderecos(userId: number): Promise<Endereco[]>;
  createEndereco(endereco: InsertEndereco): Promise<Endereco>;
  updateEndereco(id: number, endereco: Partial<Endereco>): Promise<Endereco | undefined>;
  deleteEndereco(id: number): Promise<boolean>;
  setPrincipalEndereco(userId: number, enderecoId: number): Promise<boolean>;

  // Contatos
  getContato(id: number): Promise<Contato | undefined>;
  getContatos(userId: number): Promise<Contato[]>;
  createContato(contato: InsertContato): Promise<Contato>;
  updateContato(id: number, contato: Partial<Contato>): Promise<Contato | undefined>;
  deleteContato(id: number): Promise<boolean>;
  setPrincipalContato(userId: number, contatoId: number): Promise<boolean>;

  // Usuários Adicionais
  getUsuarioAdicional(id: number): Promise<UsuarioAdicional | undefined>;
  getUsuariosAdicionais(userId: number): Promise<UsuarioAdicional[]>;
  createUsuarioAdicional(usuario: InsertUsuarioAdicional): Promise<UsuarioAdicional>;
  updateUsuarioAdicional(id: number, usuario: Partial<UsuarioAdicional>): Promise<UsuarioAdicional | undefined>;
  deleteUsuarioAdicional(id: number): Promise<boolean>;

  // Logs de Atividade
  createActivityLog(log: InsertActivityLog & { userType?: string }): Promise<ActivityLog>;
  getActivityLogs(userId: number, limit?: number): Promise<ActivityLog[]>;

  // Métodos de Pagamento (Cartões)
  getPaymentMethods(userId: number): Promise<PaymentMethod[]>;
  getPaymentMethod(id: number): Promise<PaymentMethod | undefined>;
  getDefaultPaymentMethod(userId: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethodStripeId(id: number, stripePaymentMethodId: string): Promise<boolean>;
  setDefaultPaymentMethod(id: number, userId: number): Promise<boolean>;
  deletePaymentMethod(id: number): Promise<boolean>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined>;
  unsetAllDefaultPaymentMethods(userId: number): Promise<void>;

  // Produtos
  getProduto(id: number): Promise<Produto | undefined>;
  getProdutos(userId: number, tipo?: string): Promise<Produto[]>;
  createProduto(produto: InsertProduto): Promise<Produto>;
  updateProduto(id: number, produto: Partial<Produto>): Promise<Produto | undefined>;
  deleteProduto(id: number): Promise<boolean>;

  // Serviços
  getServico(id: number): Promise<Servico | undefined>;
  getServicos(userId: number): Promise<Servico[]>;
  createServico(servico: InsertServico): Promise<Servico>;
  updateServico(id: number, servico: Partial<Servico>): Promise<Servico | undefined>;
  deleteServico(id: number): Promise<boolean>;

  // Itens para Aluguel
  getItemAluguel(id: number): Promise<ItemAluguel | undefined>;
  getItensAluguel(userId: number): Promise<ItemAluguel[]>;
  createItemAluguel(item: InsertItemAluguel): Promise<ItemAluguel>;
  updateItemAluguel(id: number, item: Partial<ItemAluguel>): Promise<ItemAluguel | undefined>;
  deleteItemAluguel(id: number): Promise<boolean>;

  // Fornecedores
  getFornecedor(id: number): Promise<Fornecedor | undefined>;
  getFornecedores(userId: number): Promise<Fornecedor[]>;
  createFornecedor(fornecedor: InsertFornecedor): Promise<Fornecedor>;
  updateFornecedor(id: number, fornecedor: Partial<Fornecedor>): Promise<Fornecedor | undefined>;
  deleteFornecedor(id: number): Promise<boolean>;

  // Clientes
  getCliente(id: number): Promise<Cliente | undefined>;
  getClientes(userId: number): Promise<Cliente[]>;
  createCliente(cliente: InsertCliente): Promise<Cliente>;
  updateCliente(id: number, cliente: Partial<Cliente>): Promise<Cliente | undefined>;
  deleteCliente(id: number): Promise<boolean>;

  // Marketplaces
  getMarketplace(id: number): Promise<Marketplace | undefined>;
  getMarketplaces(userId: number): Promise<Marketplace[]>;
  createMarketplace(marketplace: InsertMarketplace): Promise<Marketplace>;
  updateMarketplace(id: number, marketplace: Partial<Marketplace>): Promise<Marketplace | undefined>;
  deleteMarketplace(id: number): Promise<boolean>;

  // Categorias
  getCategoria(id: number): Promise<Categoria | undefined>;
  getCategorias(userId: number, tipo?: string): Promise<Categoria[]>;
  createCategoria(categoria: InsertCategoria): Promise<Categoria>;
  updateCategoria(id: number, categoria: Partial<Categoria>): Promise<Categoria | undefined>;
  deleteCategoria(id: number): Promise<boolean>;

  // Custos
  getCusto(id: number): Promise<Custo | undefined>;
  getCustos(userId: number, tipo?: string): Promise<Custo[]>;
  createCusto(custo: InsertCusto): Promise<Custo>;
  updateCusto(id: number, custo: Partial<Custo>): Promise<Custo | undefined>;
  deleteCusto(id: number): Promise<boolean>;

  // Despesas
  getDespesa(id: number): Promise<Despesa | undefined>;
  getDespesas(userId: number, tipo?: string, categoria?: string): Promise<Despesa[]>;
  createDespesa(despesa: InsertDespesa): Promise<Despesa>;
  updateDespesa(id: number, despesa: Partial<Despesa>): Promise<Despesa | undefined>;
  deleteDespesa(id: number): Promise<boolean>;

  // Taxas
  getTaxa(id: number): Promise<Taxa | undefined>;
  getTaxas(userId: number, tipo?: string): Promise<Taxa[]>;
  createTaxa(taxa: InsertTaxa): Promise<Taxa>;
  updateTaxa(id: number, taxa: Partial<Taxa>): Promise<Taxa | undefined>;
  deleteTaxa(id: number): Promise<boolean>;

  // Tributos
  getTributo(id: number): Promise<Tributo | undefined>;
  getTributos(userId: number): Promise<Tributo[]>;
  createTributo(tributo: InsertTributo): Promise<Tributo>;
  updateTributo(id: number, tributo: Partial<Tributo>): Promise<Tributo | undefined>;
  deleteTributo(id: number): Promise<boolean>;

  // Precificações
  getPrecificacao(id: number): Promise<Precificacao | undefined>;
  getPrecificacoes(userId: number, tipo?: string): Promise<Precificacao[]>;
  createPrecificacao(precificacao: InsertPrecificacao): Promise<Precificacao>;
  updatePrecificacao(id: number, precificacao: Partial<Precificacao>): Promise<Precificacao | undefined>;
  deletePrecificacao(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Não é necessário inicializar nada, pois usaremos o banco de dados PostgreSQL
  }

  // Conta o número total de produtos cadastrados por um usuário
  async contarProdutos(userId: number): Promise<number> {
    try {
      // Versão mais simples usando o client direto do pool
      const client = await pool.connect();
      try {
        const query = 'SELECT COUNT(*) as count FROM produtos WHERE user_id = $1';
        const result = await client.query(query, [userId]);
        return parseInt(result.rows[0]?.count || '0', 10);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Erro ao contar produtos do usuário ${userId}:`, error);
      return 0; // Em caso de erro, retorna zero como valor padrão
    }
  }

  // === STRIPE CUSTOMERS ===
  async getStripeCustomerByUserId(userId: number): Promise<StripeCustomer | undefined> {
    try {
      const result = await db.select().from(stripeCustomers).where(eq(stripeCustomers.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Erro ao buscar stripe customer por user id:", error);
      return undefined;
    }
  }

  async getStripeCustomerByStripeId(stripeCustomerId: string): Promise<StripeCustomer | undefined> {
    try {
      const result = await db.select().from(stripeCustomers).where(eq(stripeCustomers.stripeCustomerId, stripeCustomerId)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Erro ao buscar stripe customer por stripe id:", error);
      return undefined;
    }
  }

  async createStripeCustomer(data: InsertStripeCustomer): Promise<StripeCustomer> {
    try {
      const result = await db.insert(stripeCustomers).values(data).returning();
      return result[0];
    } catch (error) {
      console.error("Erro ao criar stripe customer:", error);
      throw error;
    }
  }

  // === PLANOS ===
  async getPlanos() {
    try {
      const result = await db.select().from(planos).orderBy(planos.ordem);
      return result;
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
      return [];
    }
  }



  async getPlano(id: number) {
    try {
      const result = await db.select().from(planos).where(eq(planos.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar plano ID ${id}:`, error);
      return undefined;
    }
  }

  async getPlanoByNome(nome: string) {
    try {
      const result = await db.select().from(planos).where(eq(planos.nome, nome)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar plano ${nome}:`, error);
      return undefined;
    }
  }

  async createPlano(plano: InsertPlano) {
    try {
      // Calcula o valor anual total (valorAnual * 12)
      const valorAnualTotal = parseFloat(plano.valorAnual) * 12;

      // Adiciona o campo valorAnualTotal ao objeto plano
      const planoCompleto = {
        ...plano,
        valorAnualTotal: valorAnualTotal.toString()
      };

      const result = await db.insert(planos).values(planoCompleto).returning();
      return result[0];
    } catch (error) {
      console.error("Erro ao criar plano:", error);
      throw error;
    }
  }

  async updatePlano(id: number, plano: Partial<InsertPlano>) {
    try {
      // Se o valor anual foi atualizado, recalcular o valor anual total
      let planoAtualizado = { ...plano };

      if (plano.valorAnual) {
        const valorAnualTotal = parseFloat(plano.valorAnual) * 12;
        planoAtualizado.valorAnualTotal = valorAnualTotal.toString();
      }

      const result = await db.update(planos)
        .set(planoAtualizado)
        .where(eq(planos.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error(`Erro ao atualizar plano ID ${id}:`, error);
      return undefined;
    }
  }

  async deletePlano(id: number) {
    try {
      // Verificar se existem assinaturas usando este plano
      const assinaturasComPlano = await db.select()
        .from(assinaturas)
        .where(eq(assinaturas.planoId, id))
        .limit(1);

      if (assinaturasComPlano.length > 0) {
        console.error(`Não é possível excluir plano ID ${id} pois existem assinaturas vinculadas`);
        return false;
      }

      // Excluir o plano
      const result = await db.delete(planos).where(eq(planos.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error(`Erro ao excluir plano ID ${id}:`, error);
      return false;
    }
  }

  // === ASSINATURAS ===
  async getAssinaturas(userId?: number) {
    try {
      if (userId) {
        const result = await db.select()
          .from(assinaturas)
          .where(eq(assinaturas.userId, userId))
          .orderBy(assinaturas.dataInicio);
        return result;
      } else {
        const result = await db.select().from(assinaturas).orderBy(assinaturas.dataInicio);
        return result;
      }
    } catch (error) {
      console.error("Erro ao buscar assinaturas:", error);
      return [];
    }
  }

  async getAssinatura(id: number) {
    try {
      const result = await db.select().from(assinaturas).where(eq(assinaturas.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar assinatura ID ${id}:`, error);
      return undefined;
    }
  }

  async getAssinaturaAtiva(userId: number) {
    try {
      const result = await db.select()
        .from(assinaturas)
        .where(and(
          eq(assinaturas.userId, userId),
          eq(assinaturas.status, 'ativa')
        ))
        .orderBy(assinaturas.dataInicio, 'desc')
        .limit(1);

      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar assinatura ativa para usuário ${userId}:`, error);
      return undefined;
    }
  }



  async updateAssinatura(id: number, assinatura: Partial<InsertAssinatura>) {
    try {
      // Se dataFim está sendo definida, converter para horário brasileiro
      const assinaturaAtualizada = { ...assinatura };
      if (assinaturaAtualizada.dataFim) {
        // 🇧🇷 Converter data para horário brasileiro (UTC-3)
        assinaturaAtualizada.dataFim = new Date(assinaturaAtualizada.dataFim.getTime());
      }

      const result = await db.update(assinaturas).set(assinaturaAtualizada).where(eq(assinaturas.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error(`Erro ao atualizar assinatura ID ${id}:`, error);
      return undefined;
    }
  }

  async cancelarAssinatura(id: number) {
    try {
      // 🇧🇷 Para cancelamento: colocar a data do cancelamento no campo data_fim em horário brasileiro (UTC-3)
      const agora = new Date();
      const dataFimBrasil = new Date(agora.getTime() - (3 * 60 * 60 * 1000)); // Horário brasileiro (UTC-3)

      const result = await db.update(assinaturas)
        .set({
          status: 'cancelada',
          dataFim: dataFimBrasil // Data do cancelamento em horário brasileiro
        })
        .where(eq(assinaturas.id, id))
        .returning();

      console.log(`📝 Assinatura ID ${id} cancelada - status: cancelada, dataFim: ${dataFimBrasil.toISOString()}`);
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao cancelar assinatura ID ${id}:`, error);
      return false;
    }
  }

  async vincularStripeSubscription(id: number, stripeSubscriptionId: string) {
    try {
      const result = await db.update(assinaturas)
        .set({ stripeSubscriptionId })
        .where(eq(assinaturas.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao vincular assinatura ${id} com Stripe ID ${stripeSubscriptionId}:`, error);
      return false;
    }
  }

  // Métodos para Usuários
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByRole(role: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.role, role));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();

      if (!user) {
        throw new Error("Falha ao criar usuário - nenhum registro retornado");
      }

      return user;
    } catch (error) {
      console.error("Erro no createUser:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async updatePassword(id: number, password: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({
        password: password,
        lastPasswordChange: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateLastLogin(id: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Métodos de segurança
  async enable2FA(userId: number, secret: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Erro ao ativar 2FA:", error);
      return false;
    }
  }

  async disable2FA(userId: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Erro ao desativar 2FA:", error);
      return false;
    }
  }

  async verify2FAToken(userId: number, token: string): Promise<boolean> {
    try {
      // Buscar o usuário para obter o secret
      const user = await this.getUser(userId);
      if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
        return false;
      }

      // Verificar o token
      return authenticator.verify({
        token,
        secret: user.twoFactorSecret
      });
    } catch (error) {
      console.error("Erro ao verificar token 2FA:", error);
      return false;
    }
  }

  async terminateSession(sessionId: number): Promise<boolean> {
    try {
      const { executeQuery } = await import('./db');
      await executeQuery(
        'UPDATE user_sessions SET is_active = FALSE WHERE id = $1',
        [sessionId]
      );
      return true;
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
      return false;
    }
  }

  async terminateAllSessions(userId: number): Promise<boolean> {
    try {
      const { executeQuery } = await import('./db');
      await executeQuery(
        'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1',
        [userId]
      );
      return true;
    } catch (error) {
      console.error("Erro ao encerrar todas as sessões:", error);
      return false;
    }
  }

  // Métodos para excluir sessões completamente da tabela
  async deleteSession(sessionId: number): Promise<boolean> {
    try {
      const { executeQuery } = await import('./db');
      const result = await executeQuery(
        'DELETE FROM user_sessions WHERE id = $1',
        [sessionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error("Erro ao excluir sessão:", error);
      return false;
    }
  }

  async deleteSessionByToken(sessionToken: string): Promise<boolean> {
    try {
      const { executeQuery } = await import('./db');
      const result = await executeQuery(
        'DELETE FROM user_sessions WHERE token = $1',
        [sessionToken]
      );
      console.log(`🗑️ Sessão com token ${sessionToken.substring(0, 8)}... excluída da tabela`);
      return result.rowCount > 0;
    } catch (error) {
      console.error("Erro ao excluir sessão por token:", error);
      return false;
    }
  }

  async invalidateUserSession(sessionToken: string): Promise<boolean> {
    try {
      // Para logout, EXCLUIR COMPLETAMENTE a sessão da tabela user_sessions
      const { executeQuery } = await import('./db');

      // 1. Excluir a sessão da tabela user_sessions_additional
      const deleteResult = await executeQuery(
        `DELETE FROM user_sessions_additional WHERE token = $1`,
        [sessionToken]
      );

      console.log(`🗑️ Sessão removida da tabela user_sessions_additional: ${deleteResult.rowCount || 0} registros`);

      // 2. Excluir a sessão da tabela principal (connect-pg-simple)
      await this.deleteSessionByToken(sessionToken);

      console.log(`✅ Sessão ${sessionToken.substring(0, 8)}... completamente excluída de ambas as tabelas`);
      return true;
    } catch (error) {
      console.error("Erro ao invalidar sessão:", error);
      return false;
    }
  }

  async updateUserStripeId(id: number, stripeCustomerId: string): Promise<boolean> {
    try {
      console.log(`Atualizando Stripe Customer ID do usuário ${id} para ${stripeCustomerId}`);
      const result = await db
        .update(users)
        .set({
          stripeCustomerId: stripeCustomerId,
          updatedAt: new Date()
        })
        .where(eq(users.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error("Erro ao atualizar Stripe Customer ID:", error);
      return false;
    }
  }

  // Métodos para Perfis de Usuário
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [newProfile] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateUserProfile(userId: number, profileData: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const [updatedProfile] = await db
      .update(userProfiles)
      .set({
        ...profileData,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updatedProfile || undefined;
  }

  // Métodos para Endereços
  async getEndereco(id: number): Promise<Endereco | undefined> {
    const [endereco] = await db.select().from(enderecos).where(eq(enderecos.id, id));
    return endereco || undefined;
  }

  async getEnderecos(userId: number): Promise<Endereco[]> {
    return await db
      .select()
      .from(enderecos)
      .where(eq(enderecos.userId, userId))
      .orderBy(enderecos.principal, "desc"); // Endereços principais primeiro
  }

  async createEndereco(endereco: InsertEndereco): Promise<Endereco> {
    // Se o endereço estiver marcado como principal, remove o status de principal de outros endereços do usuário
    if (endereco.principal) {
      await db
        .update(enderecos)
        .set({ principal: false })
        .where(eq(enderecos.userId, endereco.userId));
    }

    const [novoEndereco] = await db
      .insert(enderecos)
      .values(endereco)
      .returning();

    return novoEndereco;
  }

  async updateEndereco(id: number, endereco: Partial<Endereco>): Promise<Endereco | undefined> {
    // Se o endereço estiver sendo atualizado para principal, remove o status de principal de outros endereços
    if (endereco.principal) {
      const [enderecoAtual] = await db
        .select()
        .from(enderecos)
        .where(eq(enderecos.id, id));

      if (enderecoAtual) {
        await db
          .update(enderecos)
          .set({ principal: false })
          .where(and(
            eq(enderecos.userId, enderecoAtual.userId),
            eq(enderecos.principal, true),
            ne(enderecos.id, id)
          ));
      }
    }

    const [updatedEndereco] = await db
      .update(enderecos)
      .set({
        ...endereco,
        updatedAt: new Date()
      })
      .where(eq(enderecos.id, id))
      .returning();

    return updatedEndereco || undefined;
  }

  async deleteEndereco(id: number): Promise<boolean> {
    const result = await db
      .delete(enderecos)
      .where(eq(enderecos.id, id));

    return result.rowCount > 0;
  }

  async setPrincipalEndereco(userId: number, enderecoId: number): Promise<boolean> {
    // Remove o status principal de todos os endereços do usuário
    await db
      .update(enderecos)
      .set({ principal: false })
      .where(eq(enderecos.userId, userId));

    // Define o endereço específico como principal
    const result = await db
      .update(enderecos)
      .set({ principal: true })
      .where(and(
        eq(enderecos.id, enderecoId),
        eq(enderecos.userId, userId)
      ));

    return result.rowCount > 0;
  }

  async getContatos(userId: number): Promise<Contato[]> {
    const result = await db
      .select()      .from(contatos)
      .where(eq(contatos.userId, userId))
      .orderBy(desc(contatos.principal), contatos.id);

    return result;
  }

  async getContato(id: number): Promise<Contato | undefined> {
    const [contato] = await db
      .select()
      .from(contatos)
      .where(eq(contatos.id, id));

    return contato || undefined;
  }

  async createContato(contato: InsertContato): Promise<Contato> {
    // Se o contato estiver marcado como principal, remove o status de principal de outros contatos do usuário
    if (contato.principal) {
      await db
        .update(contatos)
        .set({ principal: false })
        .where(eq(contatos.userId, contato.userId));
    }

    const [novoContato] = await db
      .insert(contatos)
      .values(contato)
      .returning();

    return novoContato;
  }

  async updateContato(id: number, contato: Partial<Contato>): Promise<Contato | undefined> {
    // Se o contato estiver sendo atualizado para principal, remove o status de principal de outros contatos
    if (contato.principal) {
      const [contatoAtual] = await db
        .select()
        .from(contatos)
        .where(eq(contatos.id, id));

      if (contatoAtual) {
        await db
          .update(contatos)
          .set({ principal: false })
          .where(and(
            eq(contatos.userId, contatoAtual.userId),
            eq(contatos.principal, true),
            ne(contatos.id, id)
          ));
      }
    }

    const [updatedContato] = await db
      .update(contatos)
      .set({
        ...contato,
        updatedAt: new Date()
      })
      .where(eq(contatos.id, id))
      .returning();

    return updatedContato || undefined;
  }

  async deleteContato(id: number): Promise<boolean> {
    const result = await db
      .delete(contatos)
      .where(eq(contatos.id, id));

    return result.rowCount > 0;
  }

  async setPrincipalContato(userId: number, contatoId: number): Promise<boolean> {
    // Remove o status principal de todos os contatos do usuário
    await db
      .update(contatos)
      .set({ principal: false })
      .where(eq(contatos.userId, userId));

    // Define o contato específico como principal
    const result = await db
      .update(contatos)
      .set({ principal: true })
      .where(and(
        eq(contatos.id, contatoId),
        eq(contatos.userId, userId)
      ));

    return result.rowCount > 0;
  }

  // Métodos para Usuários Adicionais
  async getUsuarioAdicional(id: number): Promise<UsuarioAdicional | undefined> {
    const [usuario] = await db.select().from(usuariosAdicionais).where(eq(usuariosAdicionais.id, id));
    return usuario || undefined;
  }

  async getUsuariosAdicionais(userId: number): Promise<UsuarioAdicional[]> {
    return await db
      .select()
      .from(usuariosAdicionais)
      .where(eq(usuariosAdicionais.userId, userId))
      .orderBy(usuariosAdicionais.nome);
  }

  async createUsuarioAdicional(usuario: InsertUsuarioAdicional): Promise<UsuarioAdicional> {
    console.log("Storage: createUsuarioAdicional chamado com:", usuario);

    // Verificar se userId está presente
    if (!usuario.userId) {
      console.error("Storage: userId está undefined/null:", usuario);
      throw new Error("userId é obrigatório para criar usuário adicional");
    }

    console.log("Storage: Inserindo usuário adicional com userId:", usuario.userId);

    const [novoUsuario] = await db
      .insert(usuariosAdicionais)
      .values(usuario)
      .returning();

    console.log("Storage: Usuário adicional criado:", novoUsuario);
    return novoUsuario;
  }

  async updateUsuarioAdicional(id: number, usuario: Partial<UsuarioAdicional>): Promise<UsuarioAdicional | undefined> {

    const [updatedUsuario] = await db
      .update(usuariosAdicionais)
      .set({
        ...usuario,
        updatedAt: new Date()
      })
      .where(eq(usuariosAdicionais.id, id))
      .returning();

    return updatedUsuario || undefined;
  }

  async deleteUsuarioAdicional(id: number): Promise<boolean> {
    const result = await db
      .delete(usuariosAdicionais)
      .where(eq(usuariosAdicionais.id, id));

    return result.rowCount > 0;
  }

  // Métodos para Logs de Atividade
  async createActivityLog(log: InsertActivityLog & { userType?: string }): Promise<ActivityLog> {
    // Determinar automaticamente o tipo de usuário se não for fornecido
    let userType = log.userType || 'main';

    if (!log.userType) {
      try {
        // Verificar se é um usuário adicional
        const isAdditionalUser = await db
          .select({ id: usuariosAdicionais.id })
          .from(usuariosAdicionais)
          .where(eq(usuariosAdicionais.id, log.userId))
          .limit(1);

        userType = isAdditionalUser.length > 0 ? 'additional' : 'main';
      } catch (error) {
        console.error('Erro ao determinar tipo de usuário para log:', error);
        userType = 'main'; // Fallback para main
      }
    }

    const logData = {
      ...log,
      userType
    };

    const [newLog] = await db
      .insert(activityLogs)
      .values(logData)
      .returning();
    return newLog;
  }

  async getActivityLogs(userId: number, limit: number = 24): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(activityLogs.createdAt)
      .limit(limit);
  }

  // Métodos para Produtos
  async getProduto(id: number): Promise<Produto | undefined> {
    const [produto] = await db.select().from(produtos).where(eq(produtos.id, id));
    return produto || undefined;
  }

  async getProdutos(userId: number, tipo?: string): Promise<Produto[]> {
    let query = db.select().from(produtos);

    if (userId) {
      query = query.where(eq(produtos.userId, userId));
    }

    if (tipo) {
      query = query.where(eq(produtos.tipo, tipo as any));
    }

    return await query;
  }

  async createProduto(produto: InsertProduto): Promise<Produto> {
    const [novoProduto] = await db
      .insert(produtos)
      .values(produto)
      .returning();
    return novoProduto;
  }

  async updateProduto(id: number, produto: Partial<Produto>): Promise<Produto | undefined> {
    const [updatedProduto] = await db
      .update(produtos)
      .set({
        ...produto,
        updatedAt: new Date()
      })
      .where(eq(produtos.id, id))
      .returning();
    return updatedProduto || undefined;
  }

  async deleteProduto(id: number): Promise<boolean> {
    const result = await db
      .delete(produtos)
      .where(eq(produtos.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Serviços
  async getServico(id: number): Promise<Servico | undefined> {
    const [servico] = await db.select().from(servicos).where(eq(servicos.id, id));
    return servico || undefined;
  }

  async getServicos(userId: number): Promise<Servico[]> {
    let query = db.select().from(servicos);

    if (userId) {
      query = query.where(eq(servicos.userId, userId));
    }

    return await query;
  }

  async createServico(servico: InsertServico): Promise<Servico> {
    const [novoServico] = await db
      .insert(servicos)
      .values(servico)
      .returning();
    return novoServico;
  }

  async updateServico(id: number, servico: Partial<Servico>): Promise<Servico | undefined> {
    const [updatedServico] = await db
      .update(servicos)
      .set({
        ...servico,
        updatedAt: new Date()
      })
      .where(eq(servicos.id, id))
      .returning();
    return updatedServico || undefined;
  }

  async deleteServico(id: number): Promise<boolean> {
    const result = await db
      .delete(servicos)
      .where(eq(servicos.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Itens de Aluguel
  async getItemAluguel(id: number): Promise<ItemAluguel | undefined> {
    const [item] = await db.select().from(itensAluguel).where(eq(itensAluguel.id, id));
    return item || undefined;
  }

  async getItensAluguel(userId: number): Promise<ItemAluguel[]> {
    let query = db.select().from(itensAluguel);

    if (userId) {
      query = query.where(eq(itensAluguel.userId, userId));
    }

    return await query;
  }

  async createItemAluguel(item: InsertItemAluguel): Promise<ItemAluguel> {
    const [novoItem] = await db
      .insert(itensAluguel)
      .values(item)
      .returning();
    return novoItem;
  }

  async updateItemAluguel(id: number, item: Partial<ItemAluguel>): Promise<ItemAluguel | undefined> {
    const [updatedItem] = await db
      .update(itensAluguel)
      .set({
        ...item,
        updatedAt: new Date()
      })
      .where(eq(itensAluguel.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async deleteItemAluguel(id: number): Promise<boolean> {
    const result = await db
      .delete(itensAluguel)
      .where(eq(itensAluguel.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Fornecedores
  async getFornecedor(id: number): Promise<Fornecedor | undefined> {
    const [fornecedor] = await db.select().from(fornecedores).where(eq(fornecedores.id, id));
    return fornecedor || undefined;
  }

  async getFornecedores(userId: number): Promise<Fornecedor[]> {
    let query = db.select().from(fornecedores);

    if (userId) {
      query = query.where(eq(fornecedores.userId, userId));
    }

    return await query;
  }

  async createFornecedor(fornecedor: InsertFornecedor): Promise<Fornecedor> {
    const [novoFornecedor] = await db
      .insert(fornecedores)
      .values(fornecedor)
      .returning();
    return novoFornecedor;
  }

  async updateFornecedor(id: number, fornecedor: Partial<Fornecedor>): Promise<Fornecedor | undefined> {
    const [updatedFornecedor] = await db
      .update(fornecedores)
      .set({
        ...fornecedor,
        updatedAt: new Date()
      })
      .where(eq(fornecedores.id, id))
      .returning();
    return updatedFornecedor || undefined;
  }

  async deleteFornecedor(id: number): Promise<boolean> {
    const result = await db
      .delete(fornecedores)
      .where(eq(fornecedores.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Clientes
  async getCliente(id: number): Promise<Cliente | undefined> {
    const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id));
    return cliente || undefined;
  }

  async getClientes(userId: number): Promise<Cliente[]> {
    let query = db.select().from(clientes);

    if (userId) {
      query = query.where(eq(clientes.userId, userId));
    }

    return await query;
  }

  async createCliente(cliente: InsertCliente): Promise<Cliente> {
    const [novoCliente] = await db
      .insert(clientes)
      .values(cliente)
      .returning();
    return novoCliente;
  }

  async updateCliente(id: number, cliente: Partial<Cliente>): Promise<Cliente | undefined> {
    const [updatedCliente] = await db
      .update(clientes)
      .set({
        ...cliente,
        updatedAt: new Date()
      })
      .where(eq(clientes.id, id))
      .returning();
    return updatedCliente || undefined;
  }

  async deleteCliente(id: number): Promise<boolean> {
    const result = await db
      .delete(clientes)
      .where(eq(clientes.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Marketplaces
  async getMarketplace(id: number): Promise<Marketplace | undefined> {
    const [marketplace] = await db.select().from(marketplaces).where(eq(marketplaces.id, id));
    return marketplace || undefined;
  }

  async getMarketplaces(userId: number): Promise<Marketplace[]> {
    let query = db.select().from(marketplaces);

    if (userId) {
      query = query.where(eq(marketplaces.userId, userId));
    }

    return await query;
  }

  async createMarketplace(marketplace: InsertMarketplace): Promise<Marketplace> {
    const [novoMarketplace] = await db
      .insert(marketplaces)
      .values(marketplace)
      .returning();
    return novoMarketplace;
  }

  async updateMarketplace(id: number, marketplace: Partial<Marketplace>): Promise<Marketplace | undefined> {
    const [updatedMarketplace] = await db
      .update(marketplaces)
      .set({
        ...marketplace,
        updatedAt: new Date()
      })
      .where(eq(marketplaces.id, id))
      .returning();
    return updatedMarketplace || undefined;
  }

  async deleteMarketplace(id: number): Promise<boolean> {
    const result = await db
      .delete(marketplaces)
      .where(eq(marketplaces.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Categorias
  async getCategoria(id: number): Promise<Categoria | undefined> {
    const [categoria] = await db.select().from(categorias).where(eq(categorias.id, id));
    return categoria || undefined;
  }

  async getCategorias(userId: number, tipo?: string): Promise<Categoria[]> {
    let query = db.select().from(categorias);

    if (userId) {
      query = query.where(eq(categorias.userId, userId));
    }

    if (tipo) {
      query = query.where(eq(categorias.tipo, tipo as any));
    }

    return await query;
  }

  async createCategoria(categoria: InsertCategoria): Promise<Categoria> {
    const [novaCategoria] = await db
      .insert(categorias)
      .values(categoria)
      .returning();
    return novaCategoria;
  }

  async updateCategoria(id: number, categoria: Partial<Categoria>): Promise<Categoria | undefined> {
    const [updatedCategoria] = await db
      .update(categorias)
      .set({
        ...categoria,
        updatedAt: new Date()
      })
      .where(eq(categorias.id, id))
      .returning();
    return updatedCategoria || undefined;
  }

  async deleteCategoria(id: number): Promise<boolean> {
    const result = await db
      .delete(categorias)
      .where(eq(categorias.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Custos
  async getCusto(id: number): Promise<Custo | undefined> {
    const [custo] = await db.select().from(custos).where(eq(custos.id, id));
    return custo || undefined;
  }

  async getCustos(userId: number, tipo?: string): Promise<Custo[]> {
    let query = db.select().from(custos);

    if (userId) {
      query = query.where(eq(custos.userId, userId));
    }

    if (tipo) {
      query = query.where(eq(custos.tipo, tipo as any));
    }

    return await query;
  }

  async createCusto(custo: InsertCusto): Promise<Custo> {
    const [novoCusto] = await db
      .insert(custos)
      .values(custo)
      .returning();
    return novoCusto;
  }

  async updateCusto(id: number, custo: Partial<Custo>): Promise<Custo | undefined> {
    const [updatedCusto] = await db
      .update(custos)
      .set({
        ...custo,
        updatedAt: new Date()
      })
      .where(eq(custos.id, id))
      .returning();
    return updatedCusto || undefined;
  }

  async deleteCusto(id: number): Promise<boolean> {
    const result = await db
      .delete(custos)
      .where(eq(custos.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Despesas
  async getDespesa(id: number): Promise<Despesa | undefined> {
    const [despesa] = await db.select().from(despesas).where(eq(despesas.id, id));
    return despesa || undefined;
  }

  async getDespesas(userId: number, tipo?: string, categoria?: string): Promise<Despesa[]> {
    let query = db.select().from(despesas);

    if (userId) {
      query = query.where(eq(despesas.userId, userId));
    }

    if (tipo) {
      query = query.where(eq(despesas.tipo, tipo as any));
    }

    if (categoria) {
      query = query.where(eq(despesas.categoria, categoria));
    }

    return await query;
  }

  async createDespesa(despesa: InsertDespesa): Promise<Despesa> {
    const [novaDespesa] = await db
      .insert(despesas)
      .values(despesa)
      .returning();
    return novaDespesa;
  }

  async updateDespesa(id: number, despesa: Partial<Despesa>): Promise<Despesa | undefined> {
    const [updatedDespesa] = await db
      .update(despesas)
      .set({
        ...despesa,
        updatedAt: new Date()
      })
      .where(eq(despesas.id, id))
      .returning();
    return updatedDespesa || undefined;
  }

  async deleteDespesa(id: number): Promise<boolean> {
    const result = await db
      .delete(despesas)
      .where(eq(despesas.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Taxas
  async getTaxa(id: number): Promise<Taxa | undefined> {
    const [taxa] = await db.select().from(taxas).where(eq(taxas.id, id));
    return taxa || undefined;
  }

  async getTaxas(userId: number, tipo?: string): Promise<Taxa[]> {
    let query = db.select().from(taxas);

    if (userId) {
      query = query.where(eq(taxas.userId, userId));
    }

    if (tipo) {
      query = query.where(eq(taxas.tipo, tipo));
    }

    return await query;
  }

  async createTaxa(taxa: InsertTaxa): Promise<Taxa> {
    const [novaTaxa] = await db
      .insert(taxas)
      .values(taxa)
      .returning();
    return novaTaxa;
  }

  async updateTaxa(id: number, taxa: Partial<Taxa>): Promise<Taxa | undefined> {
    const [updatedTaxa] = await db
      .update(taxas)
      .set({
        ...taxa,
        updatedAt: new Date()
      })
      .where(eq(taxas.id, id))
      .returning();
    return updatedTaxa || undefined;
  }

  async deleteTaxa(id: number): Promise<boolean> {
    const result = await db
      .delete(taxas)
      .where(eq(taxas.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Tributos
  async getTributo(id: number): Promise<Tributo | undefined> {
    const [tributo] = await db.select().from(tributos).where(eq(tributos.id, id));
    return tributo || undefined;
  }

  async getTributos(userId: number): Promise<Tributo[]> {
    const query = db
      .select()
      .from(tributos)
      .where(
        or(
          eq(tributos.userId, userId),
          isNull(tributos.userId)
        )
      );
    return await query;
  }

  async createTributo(tributo: InsertTributo): Promise<Tributo> {
    const [novoTributo] = await db
      .insert(tributos)
      .values(tributo)
      .returning();
    return novoTributo;
  }

  async updateTributo(id: number, tributo: Partial<Tributo>): Promise<Tributo | undefined> {
    const [updatedTributo] = await db
      .update(tributos)
      .set({
        ...tributo,
        updatedAt: new Date()
      })
      .where(eq(tributos.id, id))
      .returning();
    return updatedTributo || undefined;
  }

  async deleteTributo(id: number): Promise<boolean> {
    const result = await db
      .delete(tributos)
      .where(eq(tributos.id, id));
    return result.rowCount > 0;
  }

  // Métodos para Precificações
  async getPrecificacao(id: number): Promise<Precificacao | undefined> {
    const [precificacao] = await db.select().from(precificacoes).where(eq(precificacoes.id, id));
    return precificacao || undefined;
  }

  async getPrecificacoes(userId: number, tipo?: string): Promise<Precificacao[]> {
    let query = db.select().from(precificacoes);

    if (userId) {
      query = query.where(eq(precificacoes.userId, userId));
    }

    if (tipo) {
      query = query.where(eq(precificacoes.tipo, tipo as any));
    }

    return await query;
  }

  async createPrecificacao(precificacao: InsertPrecificacao): Promise<Precificacao> {
    const [novaPrecificacao] = await db
      .insert(precificacoes)
      .values(precificacao)
      .returning();
    return novaPrecificacao;
  }

  async updatePrecificacao(id: number, precificacao: Partial<Precificacao>): Promise<Precificacao | undefined> {
    const [updatedPrecificacao] = await db
      .update(precificacoes)
      .set({
        ...precificacao,
        updatedAt: new Date()
      })
      .where(eq(precificacoes.id, id))
      .returning();
    return updatedPrecificacao || undefined;
  }

  async deletePrecificacao(id: number): Promise<boolean> {
    const result = await db
      .delete(precificacoes)
      .where(eq(precificacoes.id, id));
    return result.rowCount > 0;
  }

  // Implementação dos métodos de pagamento
  async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    try {
      // Verificar primeiro se a tabela existe
      const checkTableResult = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_methods'
        )
      `);

      const tableExists = checkTableResult.rows[0]?.exists;
      if (!tableExists) {
        return [];
      }

      // Usar SQL direto para evitar problemas com o Drizzle
      const result = await db.execute(sql`
        SELECT * FROM payment_methods WHERE user_id = ${userId}
      `);

      // Mapear os resultados para o formato correto
      const methods = result.rows.map(row => ({
        id: Number(row.id),
        userId: Number(row.user_id),
        stripeCustomerId: row.stripe_customer_id as string | null,
        stripePaymentMethodId: String(row.stripe_payment_method_id),
        brand: String(row.brand),
        last4: String(row.last4),
        expMonth: Number(row.exp_month),
        expYear: Number(row.exp_year),
        isDefault: Boolean(row.is_default),
        createdAt: row.created_at as Date | null,
        updatedAt: row.updated_at as Date | null
      }));

      return methods;
    } catch (error) {
      return []; // Retorna uma lista vazia em caso de erro para evitar quebrar a aplicação
    }
  }

  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    try {
      // Buscando método de pagamento por ID

      // Verificar se a tabela existe
      const checkTableResult = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_methods'
        )
      `);

      const tableExists = checkTableResult.rows[0]?.exists;

      if (!tableExists) {
        return undefined;
      }

      // Usar consulta SQL direta
      const result = await db.execute(sql`
        SELECT * FROM payment_methods WHERE id = ${id}
      `);

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];

      // Mapear para o formato correto
      return {
        id: Number(row.id),
        userId: Number(row.user_id),
        stripeCustomerId: row.stripe_customer_id as string | null,
        stripePaymentMethodId: String(row.stripe_payment_method_id),
        brand: String(row.brand),
        last4: String(row.last4),
        expMonth: Number(row.exp_month),
        expYear: Number(row.exp_year),
        isDefault: Boolean(row.is_default),
        createdAt: row.created_at as Date | null,
        updatedAt: row.updated_at as Date | null
      };
    } catch (error) {
      console.error("Erro ao buscar método de pagamento:", error);
      return undefined;
    }
  }

  async getDefaultPaymentMethod(userId: number): Promise<PaymentMethod | undefined> {
    try {
      // Buscando método de pagamento padrão para o usuário

      // Verificar se a tabela existe
      const checkTableResult = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_methods'
        )
      `);

      const tableExists = checkTableResult.rows[0]?.exists;

      if (!tableExists) {
        return undefined;
      }

      // Usar consulta SQL direta
      const result = await db.execute(sql`
        SELECT * FROM payment_methods WHERE user_id = ${userId} AND is_default = true
      `);

      if (result.rows.length === 0) {
        console.log("Nenhum método de pagamento padrão encontrado para o usuário", userId);
        return undefined;
      }

      const row = result.rows[0];

      // Mapear para o formato correto
      return {
        id: Number(row.id),
        userId: Number(row.user_id),
        stripeCustomerId: row.stripe_customer_id as string | null,
        stripePaymentMethodId: String(row.stripe_payment_method_id),
        brand: String(row.brand),
        last4: String(row.last4),
        expMonth: Number(row.exp_month),
        expYear: Number(row.exp_year),
        isDefault: Boolean(row.is_default),
        createdAt: row.created_at as Date | null,
        updatedAt: row.updated_at as Date | null
      };
    } catch (error) {
      console.error("Erro ao buscar método de pagamento padrão:", error);
      return undefined;
    }
  }

  async createPaymentMethod(data: any) {
    try {
      // SEMPRE remover flag padrão de outros cartões antes de inserir o novo
      // (mesmo que isDefault seja false, para garantir consistência)
      if (data.isDefault) {
        console.log(`🔄 Removendo flag padrão de outros cartões do usuário ${data.userId}...`);
        await this.unsetAllDefaultPaymentMethods(data.userId);
        console.log(`✅ Flag padrão removida de outros cartões do usuário ${data.userId}`);
      }

      console.log(`💾 Salvando novo cartão no banco de dados:`, {
        userId: data.userId,
        brand: data.brand,
        last4: data.last4,
        isDefault: data.isDefault
      });

      const [result] = await db.insert(paymentMethods).values(data).returning();

      console.log(`✅ Cartão salvo no banco com ID: ${result.id}`);

      // Se o cartão deve ser padrão e temos os dados do Stripe, definir como padrão no Stripe também
      if (data.isDefault && data.stripeCustomerId && data.stripePaymentMethodId) {
        try {
          const { stripe } = await import('./stripe-helper');
          if (stripe) {
            console.log(`🔄 Definindo cartão como padrão no Stripe: ${data.stripePaymentMethodId}`);
            await stripe.customers.update(data.stripeCustomerId, {
              invoice_settings: {
                default_payment_method: data.stripePaymentMethodId
              }
            });
            console.log(`✅ Cartão ${data.stripePaymentMethodId} definido como padrão no Stripe`);
          }
        } catch (stripeError) {
          console.error(`❌ Erro ao definir cartão como padrão no Stripe:`, stripeError);
          // Não falhar a operação se o Stripe der erro, apenas logar
        }
      }

      return result;
    } catch (error) {
      console.error("❌ Erro ao criar método de pagamento:", error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(paymentMethodId: number, userId: number): Promise<boolean> {
    try {
      console.log(`🔄 Definindo cartão ${paymentMethodId} como padrão para usuário ${userId}...`);

      // Primeiro, remover flag de padrão de todos os métodos do usuário
      await this.unsetAllDefaultPaymentMethods(userId);
      console.log(`✅ Removida flag padrão de todos os cartões do usuário ${userId}`);

      // Depois, definir o método específico como padrão
      const result = await db.update(paymentMethods)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.userId, userId)));

      console.log(`✅ Cartão ${paymentMethodId} definido como padrão no banco de dados`);
      return true;
    } catch (error) {
      console.error("❌ Erro ao definir método de pagamento como padrão:", error);
      return false;
    }
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    // Simplificando para seguir o mesmo padrão do deleteContato
    const result = await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id));

    return result.rowCount > 0;
  }

  async updatePaymentMethodStripeId(id: number, stripePaymentMethodId: string | null): Promise<boolean> {
    try {
      // Atualizar o ID do Stripe para o método de pagamento
      const result = await db
        .update(paymentMethods)
        .set({
          stripePaymentMethodId: stripePaymentMethodId,
          updatedAt: new Date()
        })
        .where(eq(paymentMethods.id, id));

      return result.rowCount > 0;
    } catch (error) {
      console.error("Erro ao atualizar Stripe Payment Method ID:", error);
      return false;
    }
  }

  // Verificar se existe um método de pagamento com o mesmo Stripe ID em qualquer conta
async checkPaymentMethodExistsByStripeId(stripePaymentMethodId: string): Promise<boolean> {
    try {
      const [result] = await db
        .select({ count: sql`count(*)` })
        .from(paymentMethods)
        .where(eq(paymentMethods.stripePaymentMethodId, stripePaymentMethodId));

      return parseInt(result.count.toString()) > 0;
    } catch (error) {
      console.error("Erro ao verificar existência de método de pagamento:", error);
      return false;
    }
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined> {
    try {
      // Use o nome da coluna do banco de dados
      const [updatedUser] = await db
        .update(users)
        .set({ 
          stripeCustomerId: customerId, // O Drizzle mapeia isso para stripe_customer_id no banco
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser || undefined;
    } catch (error) {
      console.error("Erro ao atualizar Stripe Customer ID:", error);
      return undefined;
    }
  }

  // === MÉTODOS PARA VERIFICAÇÃO DE EMAIL ===

  /**
   * Cria um token de verificação de email
   * @param userId ID do usuário
   * @param token Token de verificação
   * @param expiresAt Data de expiração
   */
  async createEmailVerificationToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    try {
      // Verificar se já existe um token para este usuário e remover
      await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, userId));

      // Inserir o novo token
      await db
        .insert(emailVerificationTokens)
        .values({
          userId,
          token,
          expiresAt,
          used: false
        });

      // Token criado com sucesso
    } catch (error) {
      console.error("Erro ao criar token de verificação de email:", error);
      throw error;
    }
  }

  /**
   * Busca um token de verificação de email
   * @param token Token a ser buscado
   * @returns Objeto com dados do token ou undefined se não for encontrado
   */
  async getEmailVerificationToken(token: string): Promise<{ userId: number, token: string, expiresAt: Date } | undefined> {
    try {
      const result = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.token, token))
        .limit(1);

      return result[0];
    } catch (error) {
      console.error("Erro ao buscar token de verificação de email:", error);
      return undefined;
    }
  }

  /**
   * Marca o email de um usuário como verificado
   * @param userId ID do usuário
   * @returns Boolean indicando se a operação foi bem-sucedida
   */
  async markEmailAsVerified(userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ 
          emailVerified: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`Email verificado para usuário ${userId}`);
      return true;
        } catch (error) {
      console.error("Erro ao marcar email como verificado:", error);
      return false;
    }
  }

  /**
   * Marca um token de verificação de email como utilizado
   * @param token Token a ser marcado como utilizado
   * @returns Boolean indicando se a operação foi bem-sucedida
   */
  async useEmailVerificationToken(token: string): Promise<boolean> {
    try {
      const result = await db
        .update(emailVerificationTokens)
        .set({ 
          used: true 
        })
        .where(eq(emailVerificationTokens.token, token));

      console.log(`Token de verificação ${token.substring(0, 8)}... marcado como utilizado`);
      return true;
    } catch (error) {
      console.error("Erro ao marcar token como utilizado:", error);
      return false;
    }
  }

  async unsetAllDefaultPaymentMethods(userId: number): Promise<void> {
    try {
      console.log(`🔄 Removendo flag padrão de todos os cartões do usuário ${userId}...`);

      const result = await db.update(paymentMethods)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(paymentMethods.userId, userId));

      console.log(`✅ Flag padrão removida de todos os cartões do usuário ${userId}`);
    } catch (error) {
      console.error(`❌ Erro ao remover flags de padrão do usuário ${userId}:`, error);
      throw error;
    }
  }

  // PLANOS E ASSINATURAS
  async getPlanoById(id: number): Promise<any> {
    try {
      const result = await db.select().from(planos).where(eq(planos.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar plano por ID ${id}:`, error);
      return undefined;
    }
  }

  async createAssinatura(assinatura: InsertAssinatura): Promise<any> {
    try {
      // 🇧🇷 FORÇAR todas as datas para horário brasileiro (UTC-3)
      const agora = new Date();

      // Se dataInicio foi fornecida, converter para horário brasileiro
      let dataInicioBrasil: Date;
      if (assinatura.dataInicio) {
        dataInicioBrasil = new Date(assinatura.dataInicio.getTime() - (3 * 60 * 60 * 1000));
      } else {
        dataInicioBrasil = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
      }

      // Se dataFim foi fornecida, converter para horário brasileiro
      let dataFimBrasil: Date | undefined;
      if (assinatura.dataFim) {
        dataFimBrasil = new Date(assinatura.dataFim.getTime() - (3 * 60 * 60 * 1000));
      }

      const dadosParaInserir = {
        userId: assinatura.userId,
        planoId: assinatura.planoId,
        plano: assinatura.plano,
        stripeSubscriptionId: assinatura.stripeSubscriptionId,
        dataInicio: dataInicioBrasil,
        dataFim: dataFimBrasil,
        status: assinatura.status || 'pendente',
        tipoCobranca: assinatura.tipoCobranca,
        valorPago: assinatura.valorPago,
      };

      const resultado = await db.insert(assinaturas).values(dadosParaInserir).returning();
      return resultado[0];
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      throw error;
    }
  }

  async getAssinaturaByStripeId(stripeSubscriptionId: string): Promise<any | undefined> {
    try {
      const result = await db.select().from(assinaturas)
        .where(eq(assinaturas.stripeSubscriptionId, stripeSubscriptionId))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar assinatura por Stripe ID ${stripeSubscriptionId}:`, error);
      return undefined;
    }
  }

  async updateAssinaturaByStripeId(stripeSubscriptionId: string, data: Partial<any>): Promise<boolean> {
    try {
      await db.update(assinaturas)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(assinaturas.stripeSubscriptionId, stripeSubscriptionId));
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar assinatura por Stripe ID ${stripeSubscriptionId}:`, error);
      return false;
    }
  }

  async cancelarAssinaturaPorStripeId(stripeSubscriptionId: string, dataCancelamento?: Date): Promise<boolean> {
    try {
      // Usar data atual se não for fornecida uma data específica
      const dataParaCancelamento = dataCancelamento || new Date();

      // 🇧🇷 Converter data para horário brasileiro (UTC-3)
      const dataFimBrasil = new Date(dataParaCancelamento.getTime() - (3 * 60 * 60 * 1000));

      const result = await db.update(assinaturas)
        .set({
          status: 'cancelada',
          dataFim: dataFimBrasil,
          updatedAt: new Date()
        })
        .where(eq(assinaturas.stripeSubscriptionId, stripeSubscriptionId))
        .returning();

      console.log(`📝 Assinatura Stripe ID ${stripeSubscriptionId} cancelada - status: cancelada, dataFim: ${dataFimBrasil.toISOString()}`);
      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao cancelar assinatura por Stripe ID ${stripeSubscriptionId}:`, error);
      return false;
    }
  }

  async cancelarTodasAssinaturasComStripeId(stripeSubscriptionId: string, dataCancelamento: Date): Promise<boolean> {
    try {
      // 🇧🇷 Converter data para horário brasileiro (UTC-3)
      const dataFimBrasil = new Date(dataCancelamento.getTime() - (3 * 60 * 60 * 1000));

      // Cancelar TODAS as assinaturas (ativas ou não) com o mesmo stripe_subscription_id
      const result = await db.update(assinaturas)
        .set({
          status: 'cancelada',
          dataFim: dataFimBrasil,
          updatedAt: new Date()
        })
        .where(eq(assinaturas.stripeSubscriptionId, stripeSubscriptionId))
        .returning();

      console.log(`📝 ${result.length} assinatura(s) com Stripe ID ${stripeSubscriptionId} cancelada(s) - dataFim: ${dataFimBrasil.toISOString()}`);

      return result.length > 0;
    } catch (error) {
      console.error(`Erro ao cancelar todas as assinaturas com Stripe ID ${stripeSubscriptionId}:`, error);
      return false;
    }
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users)
        .where(eq(users.stripeCustomerId, stripeCustomerId))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error(`Erro ao buscar usuário por Stripe Customer ID ${stripeCustomerId}:`, error);
      return undefined;
    }
  }

  async getHistoricoPagamentoByStripeInvoiceId(stripeInvoiceId: string): Promise<any> {
    try {
      const { connectionManager } = await import('./connection-manager');

      const result = await connectionManager.executeQuery(`
        SELECT * FROM pagamentos 
        WHERE stripe_invoice_id = $1 
        LIMIT 1
      `, [stripeInvoiceId]);

      return result.rows?.[0];
    } catch (error) {
      console.error(`Erro ao buscar pagamento por Stripe Invoice ID ${stripeInvoiceId}:`, error);
      return undefined;
    }
  }
  // =========== MÉTODOS PARA HISTÓRICO DE PAGAMENTOS ===========

  async createHistoricoPagamento(pagamento: {
    userId: number;
    assinaturaId?: number;
    stripePaymentIntentId: string;
    stripeInvoiceId: string;
    stripeSubscriptionId: string;
    stripeCustomerId?: string;
    valor: number;
    valorDiferenca?: number;
    valorCartao?: number;
    valorCredito?: number;
    creditoGerado?: number;
    status: string;
    metodoPagamento: string;
    dataPagamento: Date;
    planoNome: string;
    periodo: string;
    faturaUrl?: string;
  }): Promise<any> {
    try {
      const { connectionManager } = await import('./connection-manager');

      const result = await connectionManager.executeQuery(`
        INSERT INTO pagamentos (
          user_id, 
          assinatura_id,
          stripe_payment_intent_id,
          stripe_invoice_id,
          stripe_subscription_id,
          stripe_customer_id,
          valor,
          valor_diferenca,
          valor_cartao,
          valor_credito,
          credito_gerado,
          status, 
          metodo_pagamento, 
          data_pagamento, 
          plano_nome, 
          periodo, 
          fatura_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (stripe_invoice_id) DO UPDATE SET
          assinatura_id = EXCLUDED.assinatura_id,
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          status = EXCLUDED.status,
          valor = EXCLUDED.valor,
          valor_diferenca = EXCLUDED.valor_diferenca,
          valor_cartao = EXCLUDED.valor_cartao,
          valor_credito = EXCLUDED.valor_credito,
          credito_gerado = EXCLUDED.credito_gerado,
          plano_nome = EXCLUDED.plano_nome,
          periodo = EXCLUDED.periodo,
          fatura_url = EXCLUDED.fatura_url,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        pagamento.userId,
        pagamento.assinaturaId || null,
        pagamento.stripePaymentIntentId,
        pagamento.stripeInvoiceId,
        pagamento.stripeSubscriptionId,
        pagamento.stripeCustomerId || null,
        pagamento.valor,
        pagamento.valorDiferenca ?? null,
        pagamento.valorCartao ?? 0,
        pagamento.valorCredito ?? 0,
        pagamento.creditoGerado ?? 0,
        pagamento.status,
        pagamento.metodoPagamento,
        pagamento.dataPagamento,
        pagamento.planoNome,
        pagamento.periodo,
        pagamento.faturaUrl || null
      ]);

      return result.rows?.[0];
    } catch (error) {
      console.error('Erro ao criar histórico de pagamento:', error);
      throw error;
    }
  }

  async getHistoricoPagamentoByStripeInvoiceId(stripeInvoiceId: string): Promise<any> {
    try {
      const { connectionManager } = await import('./connection-manager');

      const result = await connectionManager.executeQuery(`
        SELECT * FROM pagamentos 
        WHERE stripe_invoice_id = $1 
        LIMIT 1
      `, [stripeInvoiceId]);

      return result.rows?.[0];
    } catch (error) {
      console.error('Erro ao buscar pagamento por Stripe Invoice ID:', error);
      return null;
    }
  }

  // Gerenciamento de sessões de usuário
  async createUserSession(sessionData: any): Promise<any> {
    try {
      console.log('🔄 Criando sessão de usuário:', {
        userId: sessionData.userId,
        token: sessionData.token?.substring(0, 8) + '...',
        deviceInfo: sessionData.deviceInfo,
        browser: sessionData.browser
      });

      const { connectionManager } = await import('./connection-manager');

      // Primeiro, verificar se a tabela existe e tem a estrutura correta
      const tableExists = await connectionManager.executeQuery(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_sessions_additional'
        )
      `);

      if (!tableExists.rows[0]?.exists) {
        console.log('📋 Criando tabela user_sessions_additional...');
        await connectionManager.executeQuery(`
          CREATE TABLE IF NOT EXISTS user_sessions_additional (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_type VARCHAR(20) DEFAULT 'main' NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            device_info TEXT,
            browser VARCHAR(255),
            ip VARCHAR(45),
            location VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_user_type CHECK (user_type IN ('main', 'additional'))
          );
        `);

        // Criar índices para performance
        await connectionManager.executeQuery(`
          CREATE INDEX IF NOT EXISTS idx_user_sessions_additional_user_id ON user_sessions_additional(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_sessions_additional_token ON user_sessions_additional(token);
          CREATE INDEX IF NOT EXISTS idx_user_sessions_additional_active ON user_sessions_additional(is_active);
          CREATE INDEX IF NOT EXISTS idx_user_sessions_additional_type ON user_sessions_additional(user_type);
        `);

        console.log('✅ Tabela user_sessions_additional criada com sucesso');
      }

      // Determinar se é usuário principal ou adicional
      const isAdditionalUser = await connectionManager.executeQuery(
        `SELECT id FROM usuarios_adicionais WHERE id = $1 LIMIT 1`,
        [sessionData.userId]
      );

      const userType = isAdditionalUser.rows.length > 0 ? 'additional' : 'main';

      const result = await connectionManager.executeQuery(
        `INSERT INTO user_sessions_additional (
          user_id, user_type, token, device_info, browser, ip, location, 
          last_activity, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          sessionData.userId,
          userType,
          sessionData.token,
          sessionData.deviceInfo || 'Dispositivo desconhecido',
          sessionData.browser || 'Navegador desconhecido',
          sessionData.ip || 'IP desconhecido',
          sessionData.location || 'Localização não disponível',
          sessionData.lastActivity || new Date(),
          sessionData.expiresAt,
          sessionData.isActive !== undefined ? sessionData.isActive : true
        ]
      );

      console.log('✅ Sessão criada com sucesso:', {
        id: result.rows[0]?.id,
        userId: result.rows[0]?.user_id,
        token: result.rows[0]?.token?.substring(0, 8) + '...'
      });

      return result.rows[0];
    } catch (error) {
      console.error('❌ Erro ao criar sessão de usuário:', error);
      throw error;
    }
  }

  
async getUserSessions(userId: number): Promise<any[]> {
    console.log('🔍 Buscando sessões para usuário pai e seus usuários filhos:', userId);

    try {
      // Import connectionManager dynamically
      const { connectionManager } = await import('./connection-manager');

      // Verificar se a tabela existe
      const tableExists = await connectionManager.executeQuery(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_sessions_additional'
        )
      `);

      if (!tableExists.rows[0]?.exists) {
        console.log('⚠️ Tabela user_sessions_additional não existe');
        return [];
      }

      console.log('📋 Tabela user_sessions_additional existe:', tableExists.rows[0].exists);

      // Buscar todos os usuários adicionais do usuário pai
      const usuariosAdicionais = await connectionManager.executeQuery(
        `SELECT id FROM usuarios_adicionais WHERE user_id = $1`,
        [userId]
      );

      const idsUsuariosAdicionais = usuariosAdicionais.rows.map(u => u.id);
      console.log('📋 Encontrados', idsUsuariosAdicionais.length, 'usuários adicionais para o usuário', userId + ':', idsUsuariosAdicionais);

      // Construir a query dinamicamente - buscar todas as sessões (ativas e inativas para análise)
      const placeholders = idsUsuariosAdicionais.map((_, index) => `$${index + 2}`).join(', ');

      let query = `
        SELECT 
          s.id,
          s.user_id,
          s.user_type,
          s.token,
          s.device_info,
          s.browser,
          s.ip,
          s.location,
          s.created_at,
          s.last_activity,
          s.expires_at,
          s.is_active,
          CASE 
            WHEN s.expires_at > NOW() THEN 'active'
            ELSE 'expired'
          END as calculated_status,
          CASE 
            WHEN s.user_type = 'main' THEN 'Principal'
            ELSE COALESCE(ua.nome, 'Usuário Adicional')
          END as nome_usuario
        FROM user_sessions_additional s
        LEFT JOIN usuarios_adicionais ua ON s.user_id = ua.id AND s.user_type = 'additional'
        WHERE s.is_active = true AND (
          (s.user_id = $1 AND s.user_type = 'main')`;

      const params = [userId];

      if (idsUsuariosAdicionais.length > 0) {
        query += ` OR (s.user_id IN (${placeholders}) AND s.user_type = 'additional')`;
        params.push(...idsUsuariosAdicionais);
      }

      query += `) ORDER BY 
          CASE WHEN s.expires_at > NOW() THEN 0 ELSE 1 END,
          s.last_activity DESC`;

      console.log('🔍 DEBUG - Query que será executada:', query);
      console.log('🔍 DEBUG - Parâmetros:', params);

      const result = await connectionManager.executeQuery(query, params);

      console.log('📊 Encontradas', result.rows.length, 'sessões para usuário pai', userId, 'e seus usuários filhos');
      console.log('🔍 DEBUG - Resultado completo:', result.rows);

      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar sessões do usuário:', error);
      throw error;
    }
  }

  async getUserSessionsAdditional(userId: number): Promise<any[]> {
    try {
      console.log('🔍 Buscando sessões para usuário adicional:', userId);

      const { connectionManager } = await import('./connection-manager');

      // Verificar se a tabela existe
      const tableExists = await connectionManager.executeQuery(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_sessions_additional'
        )
      `);

      if (!tableExists.rows[0]?.exists) {
        console.log('⚠️ Tabela user_sessions_additional não existe, retornando array vazio');
        return [];
      }

      // Buscar sessões APENAS para o usuário adicional específico (não incluir sessões do pai ou outros filhos)
      const query = `
        SELECT 
          s.id,
          s.user_id,
          s.user_type,
          s.token,
          s.device_info,
          s.browser,
          s.ip,
          s.location,
          s.created_at,
          s.last_activity,
          s.expires_at,
          s.is_active,
          CASE 
            WHEN s.expires_at > NOW() THEN 'active'
            ELSE 'expired'
          END as calculated_status,
          CASE 
            WHEN s.user_type = 'main' THEN 'Principal'
            ELSE COALESCE(ua.nome, 'Usuário Adicional')
          END as nome_usuario
        FROM user_sessions_additional s
        LEFT JOIN usuarios_adicionais ua ON s.user_id = ua.id AND s.user_type = 'additional'
        WHERE s.user_id = $1 AND s.user_type = 'additional' AND s.is_active = true
        ORDER BY 
          CASE WHEN s.expires_at > NOW() THEN 0 ELSE 1 END,
          s.last_activity DESC`;

      console.log('🔍 DEBUG - Query para usuário adicional:', query);
      console.log('🔍 DEBUG - Parâmetros:', [userId]);

      const result = await connectionManager.executeQuery(query, [userId]);

      console.log(`📊 Encontradas ${result.rows.length} sessões ativas APENAS para usuário adicional ${userId}`);
      console.log('🔍 DEBUG - Resultado completo:', result.rows);

      return result.rows || [];
    } catch (error) {
      console.error('❌ Erro ao buscar sessões do usuário adicional:', error);
      return [];
    }
  }

  async updateSessionActivity(sessionToken: string): Promise<void> {
    try {
      const { connectionManager } = await import('./connection-manager');

      const result = await connectionManager.executeQuery(
        `UPDATE user_sessions_additional 
         SET last_activity = NOW(), updated_at = NOW()
         WHERE token = $1 AND is_active = true`,
        [sessionToken]
      );

      // Log apenas se houver mudança
      if (result.rowCount && result.rowCount > 0) {
        console.log(`🔄 Atividade da sessão atualizada: ${sessionToken.substring(0, 8)}...`);
      }
    } catch (error) {
      // Log silencioso para não poluir o console
      console.debug('Erro ao atualizar atividade da sessão:', error);
    }
  }

  // Método removido - usando implementação unificada na linha 661

  async invalidateUserSessionById(sessionId: number, userId: number): Promise<boolean> {
    try {
      const { executeQuery } = await import('./db');
      const result = await executeQuery(
        `UPDATE user_sessions_additional 
         SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [sessionId, userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erro ao invalidar sessão por ID:', error);
      throw error;
    }
  }

  async cleanExpiredSessions(): Promise<void> {
    try {
      const { executeQuery } = await import('./db');
      await executeQuery(
        `UPDATE user_sessions 
         SET is_active = false, updated_at = NOW()
         WHERE expires_at < NOW() AND is_active = true`
      );
    } catch (error) {
      console.error('Erro ao limpar sessões expiradas:', error);
      throw error;
    }
  }

  // Histórico de pagamentos
  async getHistoricoPagamentos(userId: number): Promise<any[]> {
    try {
      const { connectionManager } = await import('./connection-manager');

      const result = await connectionManager.executeQuery(`
        SELECT 
          *,
          COALESCE(credito_gerado, 0.00) as credito_gerado
        FROM pagamentos 
        WHERE user_id = $1 
        ORDER BY data_pagamento DESC, created_at DESC
        LIMIT 24
      `, [userId]);

      return result.rows || [];
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos:', error);
      return [];
    }
  }



  /**
   * Método especializado para criar pagamento a partir de dados do Stripe Invoice
   * Replica a lógica dos webhooks existentes que já funcionavam corretamente
   */
  async createPaymentFromStripeInvoice(data: any): Promise<any> {
    try {
      const { connectionManager } = await import('./connection-manager');
      const { stripe } = await import('./stripe-helper');

      const { user, stripeInvoice, stripeSubscription, plano, assinaturaLocal, creditoGerado } = data;

      console.log('🎯 Processando pagamento via webhook do Stripe:', {
        invoiceId: stripeInvoice.id,
        userId: user.id,
        subscriptionId: stripeSubscription?.id,
        planoNome: plano?.nome
      });

      // Verificar se já existe para evitar duplicatas
      const existingPayment = await connectionManager.executeQuery(`
        SELECT id FROM pagamentos WHERE stripe_invoice_id = $1
      `, [stripeInvoice.id]);

      if (existingPayment.rows.length > 0) {
        console.log('⚠️ Pagamento já existe para invoice:', stripeInvoice.id);
        return existingPayment.rows[0];
      }

      // Descobrir estrutura da tabela
      const columnsResult = await connectionManager.executeQuery(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pagamentos' 
        ORDER BY ordinal_position;
      `);

      const availableColumns = columnsResult.rows.map(row => row.column_name);
      console.log('📋 Colunas disponíveis na tabela pagamentos:', availableColumns);

      // Processar dados do Stripe Invoice (mesma lógica dos webhooks)
      const valorTotal = stripeInvoice.amount_paid / 100; // Converter centavos para reais

      // Analisar uso de créditos na invoice
      let valorCartao = valorTotal;
      let valorCredito = 0;
      let resumoPagamento = '';

      // Verificar se houve uso de créditos (saldo do cliente)
      if (stripeInvoice.starting_balance && stripeInvoice.starting_balance < 0) {
        // Cliente tinha crédito disponível (saldo negativo = crédito)
        const creditoDisponivel = Math.abs(stripeInvoice.starting_balance) / 100;
        const creditoUtilizado = Math.min(creditoDisponivel, valorTotal);

        if (creditoUtilizado > 0) {
          valorCredito = creditoUtilizado;
          valorCartao = Math.max(0, valorTotal - creditoUtilizado);

          if (valorCartao === 0) {
            resumoPagamento = `Pagamento totalmente coberto por créditos (R$ ${valorCredito.toFixed(2)})`;
          } else {
            resumoPagamento = `Pagamento misto: R$ ${valorCartao.toFixed(2)} no cartão + R$ ${valorCredito.toFixed(2)} em créditos`;
          }
        }
      }

      if (valorCredito === 0) {
        resumoPagamento = `Pagamento integral no cartão: R$ ${valorCartao.toFixed(2)}`;
      }

      // Preparar dados baseados nas colunas disponíveis
      const insertData: any = {};
      const insertValues: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      // Campos obrigatórios
      if (availableColumns.includes('user_id')) {
        insertData.user_id = user.id;
        placeholders.push(`$${paramIndex++}`);
        insertValues.push(user.id);
      }

      if (availableColumns.includes('valor')) {
        insertData.valor = valorTotal.toString();
        placeholders.push(`$${paramIndex++}`);
        insertValues.push(valorTotal.toString());
      }

      if (availableColumns.includes('status')) {
        insertData.status = 'Pago';
        placeholders.push(`$${paramIndex++}`);
        insertValues.push('Pago');
      }

      // Campos opcionais mapeados dos dados do Stripe
      const stripeFields = [
        { column: 'assinatura_id', value: assinaturaLocal?.id },
        { column: 'stripe_payment_intent_id', value: typeof stripeInvoice.payment_intent === 'string' ? stripeInvoice.payment_intent : stripeInvoice.payment_intent?.id || null },
        { column: 'stripe_invoice_id', value: stripeInvoice.id },
        { column: 'stripe_subscription_id', value: stripeSubscription?.id },
        { column: 'stripe_customer_id', value: stripeInvoice.customer },
        { column: 'plano_nome', value: plano?.nome },
        { column: 'metodo_pagamento', value: valorCredito > 0 ? (valorCartao === 0 ? 'Apenas Créditos' : 'Cartão + Créditos') : 'Cartão de Crédito' },
        { column: 'fatura_url', value: stripeInvoice.hosted_invoice_url || stripeInvoice.invoice_pdf },
        { column: 'data_pagamento', value: timestampToBrazilianDate(stripeInvoice.created) },
        { column: 'valor_cartao', value: valorCartao },
        { column: 'valor_credito', value: valorCredito },
        { column: 'credito_gerado', value: creditoGerado || 0 },
        { column: 'periodo', value: assinaturaLocal?.tipoCobranca === 'anual' ? 'Anual' : 'Mensal' }
      ];

      stripeFields.forEach(field => {
        if (availableColumns.includes(field.column) && field.value !== undefined && field.value !== null) {
          insertData[field.column] = field.value;
          placeholders.push(`$${paramIndex++}`);
          insertValues.push(field.value);
        }
      });

      const columnNames = Object.keys(insertData);

      if (columnNames.length === 0) {
        throw new Error('Nenhum campo válido para inserir na tabela pagamentos');
      }

      const query = `
        INSERT INTO pagamentos (${columnNames.join(', ')}) 
        VALUES (${placeholders.join(', ')}) 
        RETURNING *
      `;

      console.log('📝 Query de inserção via Stripe webhook:', query);
      console.log('📊 Valores:', insertValues);

      const result = await connectionManager.executeQuery(query, insertValues);

      console.log(`✅ Pagamento criado via webhook do Stripe: R$ ${valorTotal.toFixed(2)} (Cartão: R$ ${valorCartao.toFixed(2)}, Crédito: R$ ${valorCredito.toFixed(2)})`);
      return result.rows?.[0];

    } catch (error) {
      console.error('❌ Erro ao criar pagamento via webhook do Stripe:', error);
      throw error;
    }
  }

  // Obter usuário por email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Erro ao buscar usuário por email:", error);
      return null;
    }
  }

  // Obter usuário adicional por email
  async getUsuarioAdicionalByEmail(email: string): Promise<any | null> {
    try {
      const { executeQuery } = await import('./db');
      const result = await executeQuery(`
        SELECT ua.*, u.username as main_username 
        FROM usuarios_adicionais ua
        INNER JOIN users u ON ua.user_id = u.id
        WHERE ua.email = $1 AND ua.status = 'ativo'
        LIMIT 1
      `, [email]);

      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro ao buscar usuário adicional por email:", error);
      return null;
    }
  }

  // Verificar se usuário adicional existe por email
  async checkUsuarioAdicionalByEmail(email: string): Promise<{exists: boolean, userId?: number, isAdditional?: boolean}> {
    try {
      const { executeQuery } = await import('./db');
      const result = await executeQuery(`
        SELECT ua.id, ua.user_id
        FROM usuarios_adicionais ua
        WHERE ua.email = $1 AND ua.status = 'ativo'
        LIMIT 1
      `, [email]);

      if (result.rows.length > 0) {
        return { 
          exists: true, 
          userId: result.rows[0].user_id,
          isAdditional: true 
        };
      }

      return { exists: false };
    } catch (error) {
      console.error("Erro ao verificar usuário adicional por email:", error);
      return { exists: false };
    }
  }
}

// Usar sempre banco de dados real
export const storage = new DatabaseStorage();