import { pgTable, text, serial, integer, boolean, numeric, timestamp, date, pgEnum, json, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),  // Removido .unique() para permitir nomes de usuário repetidos
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").default("admin").notNull(), // 'admin' para usuários principais
  isActive: boolean("is_active").default(true).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(), // Verificação de email
  lastLogin: timestamp("last_login"),
  stripeCustomerId: text("stripe_customer_id"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  lastPasswordChange: timestamp("last_password_change"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de sessões ativas
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  deviceInfo: text("device_info"),
  browser: text("browser"),
  ip: text("ip"),
  location: text("location"),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de sessões para usuários adicionais
export const userSessionsAdditional = pgTable("user_sessions_additional", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Pode ser ID do usuário principal ou adicional
  userType: text("user_type").default("main").notNull(), // 'main', 'additional'
  token: text("token").notNull().unique(),
  deviceInfo: text("device_info"),
  browser: text("browser"),
  ip: text("ip"),
  location: text("location"),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações do usuário
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  enderecos: many(enderecos),
  contatos: many(contatos),
  usuariosAdicionais: many(usuariosAdicionais),
  sessions: many(userSessions),
  sessionsAdditional: many(userSessionsAdditional),
}));

// Relações da sessão
export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

// Relações da sessão adicional
export const userSessionsAdditionalRelations = relations(userSessionsAdditional, ({ one }) => ({
  user: one(users, {
    fields: [userSessionsAdditional.userId],
    references: [users.id],
  }),
}));

// Perfil do usuário com informações detalhadas
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  primeiroNome: text("primeiro_nome"),
  ultimoNome: text("ultimo_nome"),
  razaoSocial: text("razao_social"),
  nomeFantasia: text("nome_fantasia"),
  tipoPessoa: text("tipo_pessoa").default("fisica"), // fisica, juridica
  cpfCnpj: text("cpf_cnpj"),
  inscricaoEstadual: text("inscricao_estadual"),
  inscricaoMunicipal: text("inscricao_municipal"),
  cnae: text("cnae"),
  regimeTributario: text("regime_tributario"),
  atividadePrincipal: text("atividade_principal"),
  responsavelNome: text("responsavel_nome"),
  responsavelEmail: text("responsavel_email"),
  responsavelTelefone: text("responsavel_telefone"),
  responsavelSetor: text("responsavel_setor"),
  contadorNome: text("contador_nome"),
  contadorEmail: text("contador_email"),
  contadorTelefone: text("contador_telefone"),
  logoUrl: text("logo_url"),
  configuracoes: json("configuracoes").$type<{ 
    tema: string, 
    notificacoes: boolean, 
    exibirTutorial: boolean 
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações do perfil do usuário
export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

// Endereços do usuário
export const enderecos = pgTable("enderecos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tipo: text("tipo").default("comercial").notNull(), // comercial, residencial, entrega, etc.
  cep: text("cep").notNull(),
  logradouro: text("logradouro").notNull(),
  numero: text("numero").notNull(),
  complemento: text("complemento"),
  bairro: text("bairro").notNull(),
  cidade: text("cidade").notNull(),
  estado: text("estado").notNull(),
  principal: boolean("principal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações dos endereços
export const enderecosRelations = relations(enderecos, ({ one }) => ({
  user: one(users, {
    fields: [enderecos.userId],
    references: [users.id],
  }),
}));

// Contatos do usuário
export const contatos = pgTable("contatos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("comercial"), // Necessário para o banco de dados da Locaweb
  setor: text("setor").default("comercial").notNull(),
  cargo: text("cargo").notNull(),
  telefone: text("telefone").notNull(),
  celular: text("celular"),
  whatsapp: text("whatsapp"),
  email: text("email").notNull(),
  principal: boolean("principal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações dos contatos
export const contatosRelations = relations(contatos, ({ one }) => ({
  user: one(users, {
    fields: [contatos.userId],
    references: [users.id],
  }),
}));

// Usuários adicionais do sistema (associados ao usuário principal)
export const usuariosAdicionais = pgTable("usuarios_adicionais", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // Usuário principal
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  setor: text("setor").default("comercial").notNull(),
  perfil: text("perfil").notNull(), // admin, gerente, operador, etc.
  status: text("status").default("ativo").notNull(), // ativo, inativo, bloqueado
  password: text("password"), // Senha pode ser null inicialmente
  role: text("role").default("additional_user").notNull(), // Role diferente do usuário principal
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  lastLogin: timestamp("last_login"),
  lastPasswordChange: timestamp("last_password_change"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações dos usuários adicionais
export const usuariosAdicionaisRelations = relations(usuariosAdicionais, ({ one }) => ({
  user: one(users, {
    fields: [usuariosAdicionais.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    email: true,
  })
  .extend({
    password: z.string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número")
      .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial")
  });

export const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Schema para usuários adicionais
export const insertUsuarioAdicionalSchema = z.object({
  userId: z.number().min(1, "ID do usuário é obrigatório"),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  setor: z.string().default("comercial"),
  perfil: z.string().min(1, "Perfil é obrigatório"),
});

// Schema definitions for additional users moved below

// Enums
export const produtoTipoEnum = pgEnum('produto_tipo', ['novo', 'usado']);
export const custoTipoEnum = pgEnum('custo_tipo', ['novo', 'usado', 'aluguel', 'servico', 'marketplace']);
export const despesaTipoEnum = pgEnum('despesa_tipo', ['fixa', 'variavel']);
export const formaPagamentoEnum = pgEnum('forma_pagamento', ['a_vista', 'cartao_credito', 'boleto', 'pix', 'transferencia']);
export const categoriaTipoEnum = pgEnum('categoria_tipo', ['produto', 'servico', 'despesa', 'custo']);

// Produtos
export const produtos = pgTable("produtos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  codigo: text("codigo"),
  tipo: produtoTipoEnum("tipo").notNull(),
  valorCusto: numeric("valor_custo").notNull(),
  frete: numeric("frete"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Serviços
export const servicos = pgTable("servicos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  valorCusto: numeric("valor_custo").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Itens para Aluguel
export const itensAluguel = pgTable("itens_aluguel", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  valorEquipamento: numeric("valor_equipamento").notNull(),
  frete: numeric("frete"),
  retornoInvestimentoMeses: integer("retorno_investimento_meses").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fornecedores
export const fornecedores = pgTable("fornecedores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  telefone: text("telefone"),
  email: text("email"),
  contato: text("contato"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: text("estado"),
  observacoes: text("observacoes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clientes
export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cpfCnpj: text("cpf_cnpj"),
  telefone: text("telefone"),
  celular: text("celular"),
  email: text("email"),
  endereco: text("endereco"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  dataNascimento: date("data_nascimento"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketplaces
export const marketplaces = pgTable("marketplaces", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  taxa: numeric("taxa").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custos
export const custos = pgTable("custos", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor").notNull(),
  tipo: custoTipoEnum("tipo").notNull(),
  observacoes: text("observacoes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Despesas
export const despesas = pgTable("despesas", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor").notNull(),
  tipo: despesaTipoEnum("tipo").notNull(),
  categoria: custoTipoEnum("categoria").notNull(),
  ocorrenciaMeses: integer("ocorrencia_meses"),
  observacoes: text("observacoes"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Taxas
export const taxas = pgTable("taxas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  valor: numeric("valor").notNull(),
  tipo: text("tipo").notNull(), // 'bancaria', 'maquininha', 'operadora'
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tributos
export const tributos = pgTable("tributos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  sigla: text("sigla"),
  porcentagem: numeric("porcentagem").notNull(),
  descricao: text("descricao"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categorias
export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  tipo: categoriaTipoEnum("tipo").notNull(),
  ordem: integer("ordem"),
  ativa: boolean("ativa").default(true),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Precificações
export const precificacoes = pgTable("precificacoes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: custoTipoEnum("tipo").notNull(),
  referenceId: integer("reference_id"), // Id do produto, serviço, item para aluguel
  valorCusto: numeric("valor_custo").notNull(),
  frete: numeric("frete"),
  lucro: numeric("lucro").notNull(),
  formaPagamento: formaPagamentoEnum("forma_pagamento").notNull(),
  parcelas: integer("parcelas"),
  deslocamento: numeric("deslocamento"),
  valorVenda: numeric("valor_venda").notNull(),
  lucroBruto: numeric("lucro_bruto").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de mapeamento entre usuários locais e clientes Stripe
export const stripeCustomers = pgTable("stripe_customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações de clientes Stripe
export const stripeCustomersRelations = relations(stripeCustomers, ({ one }) => ({
  user: one(users, {
    fields: [stripeCustomers.userId],
    references: [users.id],
  }),
}));

// Métodos de pagamento (cartões)
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripeCustomerId: text("stripe_customer_id"), // ID do cliente no Stripe
  stripePaymentMethodId: text("stripe_payment_method_id").notNull(), // ID do método de pagamento no Stripe
  brand: text("brand").notNull(), // ex: visa, mastercard, etc.
  last4: text("last4").notNull(), // últimos 4 dígitos do cartão
  expMonth: integer("exp_month").notNull(), // mês de expiração
  expYear: integer("exp_year").notNull(), // ano de expiração
  isDefault: boolean("is_default").default(false), // cartão padrão
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações dos métodos de pagamento
export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}));

// Tabela para tokens de verificação de email
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
});

// Relações dos tokens de verificação de email
export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id],
  }),
}));

// Tabela para tokens de recuperação de senha
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
});

// Relações dos tokens de recuperação de senha
export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// Tabela para tokens de recuperação de senha dos usuários adicionais
export const additionalUserPasswordResetTokens = pgTable("additional_user_password_reset_tokens", {
  id: serial("id").primaryKey(),
  usuarioAdicionalId: integer("usuario_adicional_id").references(() => usuariosAdicionais.id).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
});

// Relações dos tokens de recuperação de senha dos usuários adicionais
export const additionalUserPasswordResetTokensRelations = relations(additionalUserPasswordResetTokens, ({ one }) => ({
  usuarioAdicional: one(usuariosAdicionais, {
    fields: [additionalUserPasswordResetTokens.usuarioAdicionalId],
    references: [usuariosAdicionais.id],
  }),
}));

// Planos de assinatura disponíveis no sistema
export const planos = pgTable("planos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(), // ESSENCIAL, PROFISSIONAL, EMPRESARIAL, PREMIUM
  descricao: text("descricao"),
  valorMensal: numeric("valor_mensal").notNull(), // Valor do plano com cobrança mensal
  valorAnual: numeric("valor_anual").notNull(), // Valor do plano com cobrança anual (preço por mês)
  economiaAnual: numeric("economia_anual").notNull(), // Valor de economia anual (calculado)
  valorAnualTotal: numeric("valor_anual_total").notNull(), // Valor total anual (cobrança única)
  ordem: integer("ordem").notNull(), // Para ordenação na interface
  ativo: boolean("ativo").default(true).notNull(),

  // Recursos específicos do plano
  dashboard: boolean("dashboard").default(false).notNull(),
  precificacao: boolean("precificacao").default(false).notNull(),
  precificacaoUnitaria: boolean("precificacao_unitaria").default(false).notNull(),
  importacao: text("importacao").default("X").notNull(), // Valores: X, Excel, Excel + XML, Excel + XML + API
  // Colunas para armazenar limites numéricos (50, 250, 500 ou 999999 para "Ilimitado")
  limiteProdutos: integer("limite_produtos"),
  limiteUsuarios: integer("limite_usuarios").default(1).notNull(),
  cadastroClientes: integer("cadastro_clientes").default(0).notNull(), // Valores: 0 (X), 250, 500, 999999 (Ilimitado)
  relatoriosPersonalizados: text("relatorios_personalizados").default("").notNull(), // Valores: Básicos, Intermediários, Avançados, Exportação
  gerenciamentoCustos: text("gerenciamento_custos").default("Parcial").notNull(), // Valores: Parcial, Completo
  gerenciamentoTaxas: boolean("gerenciamento_taxas").default(false).notNull(),
  gerenciamentoTributacao: boolean("gerenciamento_tributacao").default(false).notNull(),
  integracaoMarketplaces: boolean("integracao_marketplaces").default(false).notNull(),
  centralTreinamento: text("central_treinamento").default("").notNull(), // essencial, profissional, empresarial, premium
  suporte: text("suporte").default("").notNull(), // email, chat, prioritario, whatsapp

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assinaturas dos usuários
export const assinaturas = pgTable("assinaturas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planoId: integer("plano_id").references(() => planos.id).notNull(),
  plano: text("plano"), // Nome do plano para facilitar consultas
  stripeSubscriptionId: text("stripe_subscription_id"), // ID da assinatura no Stripe
  dataInicio: timestamp("data_inicio").notNull().defaultNow(),
  dataFim: timestamp("data_fim"), // Null para assinaturas ativas
  status: text("status").notNull().default("ativa"), // ativa, cancelada, expirada, pendente
  tipoCobranca: text("tipo_cobranca").notNull(), // mensal, anual
  valorPago: numeric("valor_pago").notNull(), // Valor efetivamente pago
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relações para planos e assinaturas
export const planosRelations = relations(planos, ({ many }) => ({
  assinaturas: many(assinaturas),
}));

export const assinaturasRelations = relations(assinaturas, ({ one }) => ({
  plano: one(planos, {
    fields: [assinaturas.planoId],
    references: [planos.id],
  }),
  user: one(users, {
    fields: [assinaturas.userId],
    references: [users.id],
  }),
}));

// Tabela de pagamentos para histórico
export const pagamentos = pgTable("pagamentos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assinaturaId: integer("assinatura_id").references(() => assinaturas.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  valorCartao: numeric("valor_cartao", { precision: 10, scale: 2 }).default("0.00"),
  valorCredito: numeric("valor_credito", { precision: 10, scale: 2 }).default("0.00"),
  valorDiferenca: numeric("valor_diferenca", { precision: 10, scale: 2 }), // Valor da diferença entre planos (upgrade/downgrade)
  creditoGerado: numeric("credito_gerado", { precision: 10, scale: 2 }).default("0.00"), // Créditos gerados separadamente do valor_diferenca
  status: text("status").notNull(), // 'paid', 'failed', 'canceled', 'pending'
  planoNome: text("plano_nome"),
  periodo: text("periodo"), // 'mensal', 'anual'
  metodoPagamento: text("metodo_pagamento"), // 'card', 'boleto', etc.
  faturaUrl: text("fatura_url"), // URL para download da fatura
  dataPagamento: timestamp("data_pagamento").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pagamentosRelations = relations(pagamentos, ({ one }) => ({
  assinatura: one(assinaturas, {
    fields: [pagamentos.assinaturaId],
    references: [assinaturas.id],
  }),
  user: one(users, {
    fields: [pagamentos.userId],
    references: [users.id],
  }),
}));

// Schemas para Stripe
export const insertStripeCustomerSchema = createInsertSchema(stripeCustomers)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStripeCustomer = z.infer<typeof insertStripeCustomerSchema>;
export type StripeCustomer = typeof stripeCustomers.$inferSelect;

// Adicionar relação para usuários terem assinaturas e cliente Stripe
export const usersRelationsWithSubscriptions = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  enderecos: many(enderecos),
  contatos: many(contatos),
  usuariosAdicionais: many(usuariosAdicionais),
  assinaturas: many(assinaturas),
  paymentMethods: many(paymentMethods),
  stripeCustomer: one(stripeCustomers, {
    fields: [users.id],
    references: [stripeCustomers.userId],
  }),
}));

// INSERT schemas
// Logs de atividades do usuário
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  userType: text("user_type").default("main").notNull(), // 'main', 'additional'
  tipoOperacao: text("tipo_operacao").notNull(), // 'criar', 'atualizar', 'excluir', 'login', 'logout'
  entidade: text("entidade").notNull(), // 'produto', 'servico', 'custo', etc
  entidadeId: integer("entidade_id"), // ID da entidade afetada (se aplicável)
  descricao: text("descricao").notNull(),
  detalhes: json("detalhes").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas para inserção
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProdutoSchema = createInsertSchema(produtos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServicoSchema = createInsertSchema(servicos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertItemAluguelSchema = createInsertSchema(itensAluguel).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFornecedorSchema = createInsertSchema(fornecedores).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClienteSchema = createInsertSchema(clientes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMarketplaceSchema = createInsertSchema(marketplaces).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustoSchema = createInsertSchema(custos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDespesaSchema = createInsertSchema(despesas).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaxaSchema = createInsertSchema(taxas).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTributoSchema = createInsertSchema(tributos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategoriaSchema = createInsertSchema(categorias).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPrecificacaoSchema = createInsertSchema(precificacoes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnderecoSchema = createInsertSchema(enderecos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContatoSchema = createInsertSchema(contatos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanoSchema = createInsertSchema(planos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssinaturaSchema = createInsertSchema(assinaturas).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPagamentoSchema = createInsertSchema(pagamentos).omit({ id: true, createdAt: true, updatedAt: true });

// Tipos para inserção
export type InsertPlano = z.infer<typeof insertPlanoSchema>;
export type Plano = typeof planos.$inferSelect;
export type InsertPagamento = z.infer<typeof insertPagamentoSchema>;
export type Pagamento = typeof pagamentos.$inferSelect;

// Definições de interfaces para limites de recursos
export interface LimitesCadastro {
  produtos: number | 'Ilimitado';
  clientes: number | 'Ilimitado';
  usuarios: number | 'Ilimitado';
}

// Extensão do tipo Plano para incluir os limites formatados
export interface PlanoComLimites extends Plano {
  limitesCadastro?: LimitesCadastro;
}

export type InsertAssinatura = z.infer<typeof insertAssinaturaSchema>;
// Schema removido - já definido acima
// Tipos para Stripe customers foram adicionados acima

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

export type InsertEndereco = z.infer<typeof insertEnderecoSchema>;
export type Endereco = typeof enderecos.$inferSelect;

export type InsertContato = z.infer<typeof insertContatoSchema>;
export type Contato = typeof contatos.$inferSelect;

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

export type InsertUsuarioAdicional = z.infer<typeof insertUsuarioAdicionalSchema>;
export type UsuarioAdicional = typeof usuariosAdicionais.$inferSelect;

// Schema para validação de senha de usuário adicional
export const updateUsuarioAdicionalPasswordSchema = z.object({
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")  
    .regex(/[0-9]/, "Senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial")
});

export type InsertProduto = z.infer<typeof insertProdutoSchema>;
export type Produto = typeof produtos.$inferSelect;

export type InsertServico = z.infer<typeof insertServicoSchema>;
export type Servico = typeof servicos.$inferSelect;

export type InsertItemAluguel = z.infer<typeof insertItemAluguelSchema>;
export type ItemAluguel = typeof itensAluguel.$inferSelect;

export type InsertFornecedor = z.infer<typeof insertFornecedorSchema>;
export type Fornecedor = typeof fornecedores.$inferSelect;

export type InsertMarketplace = z.infer<typeof insertMarketplaceSchema>;
export type Marketplace = typeof marketplaces.$inferSelect;

export type InsertCusto = z.infer<typeof insertCustoSchema>;
export type Custo = typeof custos.$inferSelect;

export type InsertDespesa = z.infer<typeof insertDespesaSchema>;
export type Despesa = typeof despesas.$inferSelect;

export type InsertTaxa = z.infer<typeof insertTaxaSchema>;
export type Taxa = typeof taxas.$inferSelect;

export type InsertTributo = z.infer<typeof insertTributoSchema>;
export type Tributo = typeof tributos.$inferSelect;

export type InsertPrecificacao = z.infer<typeof insertPrecificacaoSchema>;
export type Precificacao = typeof precificacoes.$inferSelect;

export type InsertCategoria = z.infer<typeof insertCategoriaSchema>;
export type Categoria = typeof categorias.$inferSelect;

export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientes.$inferSelect;

// Schemas para segurança da conta
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1, { message: "A senha atual é obrigatória" }),
  novaSenha: z.string().min(8, { message: "A nova senha deve ter pelo menos 8 caracteres" })
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula" })
    .regex(/[a-z]/, { message: "A senha deve conter pelo menos uma letra minúscula" })
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número" }),
  confirmarSenha: z.string().min(1, { message: "A confirmação de senha é obrigatória" }),
})
.refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "As senhas não conferem",
  path: ["confirmarSenha"],
})
.refine((data) => data.novaSenha !== data.senhaAtual, {
  message: "A nova senha não pode ser igual à senha atual",
  path: ["novaSenha"],
});

export const enable2FASchema = z.object({
  codigo: z.string().min(1, { message: "Digite o código de verificação" }), // Validação menos restritiva
  secret: z.string(),
});

// Tipos para os schemas de segurança
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type Enable2FAData = z.infer<typeof enable2FASchema>;

// Tipos para sessões adicionais
export type InsertUserSessionAdditional = z.infer<typeof insertUserSessionAdditionalSchema>;
export type UserSessionAdditional = typeof userSessionsAdditional.$inferSelect;

// Schema para inserção de sessões adicionais
export const insertUserSessionAdditionalSchema = createInsertSchema(userSessionsAdditional).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});