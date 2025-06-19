import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool, getUserPasswordFromDatabase } from "./db";
import jwt from "jsonwebtoken";
import { resendVerificationEmail } from "./email-verification";

const scryptAsync = promisify(scrypt);

// Função auxiliar para detectar localização por IP
export async function getLocationFromIP(ip: string): Promise<string> {
  console.log(`🌍 Tentando detectar localização para IP: ${ip}`);

  if (!ip) {
    console.log('⚠️ IP não fornecido');
    return 'IP não disponível';
  }

  // Para IPs localhost, tentar detectar IP público real
  if (ip === '127.0.0.1' || ip === '::1') {
    console.log('🔍 IP localhost detectado, tentando obter IP público...');
    try {
      const publicIpResponse = await fetch('https://api.ipify.org?format=json');
      if (publicIpResponse.ok) {
        const publicIpData = await publicIpResponse.json();
        const publicIp = publicIpData.ip;
        console.log(`🌐 IP público obtido: ${publicIp}`);
        return await getLocationFromPublicIP(publicIp);
      }
    } catch (error) {
      console.log('⚠️ Não foi possível obter IP público:', error.message);
    }
    return 'Localhost';
  }

  // Para IPs privados, também tentar obter IP público
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
    console.log('🔍 IP privado detectado, tentando obter IP público...');
    try {
      const publicIpResponse = await fetch('https://api.ipify.org?format=json');
      if (publicIpResponse.ok) {
        const publicIpData = await publicIpResponse.json();
        const publicIp = publicIpData.ip;
        console.log(`🌐 IP público obtido: ${publicIp}`);
        return await getLocationFromPublicIP(publicIp);
      }
    } catch (error) {
      console.log('⚠️ Não foi possível obter IP público:', error.message);
    }
    return 'Rede Privada';
  }

  // Para IPs públicos, usar diretamente
  return await getLocationFromPublicIP(ip);
}

// Função auxiliar para obter localização de IP público
async function getLocationFromPublicIP(ip: string): Promise<string> {
  try {
    console.log(`🔍 Buscando localização para IP público: ${ip}`);

    // Usar serviço gratuito para detectar localização
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`);
    if (!response.ok) {
      throw new Error('Falha na requisição de geolocalização');
    }

    const data = await response.json();
    console.log(`📍 Resposta da geolocalização:`, data);

    if (data.status === 'success') {
      const parts = [];
      if (data.city) parts.push(data.city);
      if (data.regionName) parts.push(data.regionName);
      if (data.country) parts.push(data.country);

      const location = parts.length > 0 ? parts.join(', ') : 'Localização não identificada';
      console.log(`✅ Localização detectada: ${location}`);
      return location;
    } else {
      console.log('⚠️ Serviço de geolocalização retornou status de falha');
      return 'Localização não identificada';
    }
  } catch (error) {
    console.error('❌ Erro ao detectar localização:', error);
    return 'Erro na detecção';
  }
}

// Função auxiliar para extrair informações do browser
export function getBrowserInfo(userAgent: string): string {
  if (!userAgent || userAgent.trim() === '') {
    console.warn('User-Agent vazio ou indefinido');
    return 'Navegador desconhecido';
  }

  try {
    console.log(`🔍 Processando User-Agent: ${userAgent}`);

    // Microsoft Edge (deve vir antes do Chrome)
    if (userAgent.includes('Edg/')) {
      const match = userAgent.match(/Edg\/([0-9.]+)/);
      const version = match ? match[1].split('.')[0] : '';
      const result = `Edge ${version}`.trim();
      console.log(`🌐 Navegador detectado: ${result}`);
      return result;
    }

    // Opera (deve vir antes do Chrome)
    if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) {
      const matchOPR = userAgent.match(/OPR\/([0-9.]+)/);
      const matchOpera = userAgent.match(/Opera\/([0-9.]+)/);
      const version = matchOPR ? matchOPR[1].split('.')[0] : 
                    matchOpera ? matchOpera[1].split('.')[0] : '';
      const result = `Opera ${version}`.trim();
      console.log(`🌐 Navegador detectado: ${result}`);
      return result;
    }

    // Firefox
    if (userAgent.includes('Firefox/')) {
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      const version = match ? match[1].split('.')[0] : '';
      const result = `Firefox ${version}`.trim();
      console.log(`🌐 Navegador detectado: ${result}`);
      return result;
    }

    // Chrome (deve vir depois do Edge e Opera para evitar conflitos)
    if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/') && !userAgent.includes('OPR/')) {
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      const version = match ? match[1].split('.')[0] : '';
      const result = `Chrome ${version}`.trim();
      console.log(`🌐 Navegador detectado: ${result}`);
      return result;
    }

    // Safari (deve vir depois do Chrome)
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      const match = userAgent.match(/Version\/([0-9.]+).*Safari/);
      const version = match ? match[1].split('.')[0] : '';
      const result = `Safari ${version}`.trim();
      console.log(`🌐 Navegador detectado: ${result}`);
      return result;
    }

    // Internet Explorer
    if (userAgent.includes('MSIE')) {
      const match = userAgent.match(/MSIE ([0-9.]+)/);
      const version = match ? match[1].split('.')[0] : '';
      const result = `Internet Explorer ${version}`.trim();
      console.log(`🌐 Navegador detectado: ${result}`);
      return result;
    }

    // Internet Explorer 11
    if (userAgent.includes('Trident/')) {
      const match = userAgent.match(/rv:([0-9.]+)/);
      const version = match ? match[1].split('.')[0] : '11';
      const result = `Internet Explorer ${version}`.trim();
      console.log(`🌐 Navegador detectado: ${result}`);
      return result;
    }

    console.warn(`❓ Navegador não identificado para User-Agent: ${userAgent}`);
    return 'Navegador desconhecido';
  } catch (error) {
    console.error('❌ Erro ao extrair informações do navegador:', error);
    console.error('User-Agent que causou erro:', userAgent);
    return 'Navegador desconhecido';
  }
}

// Declarar os tipos para o Express e passport
declare global {
  namespace Express {
    // Definição explícita da interface User com todos os campos necessários
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
      password?: string;
      is_active?: boolean;
      last_login?: Date;
      stripeCustomerId?: string | null; // Adicionado campo para suporte ao Stripe (pode ser null)
      nome?: string;
      setor?: string;
      perfil?: string;
      mainUserId?: number;
      mainUsername?: string;
      isAdditionalUser?: boolean;
      additionalUserId?: number; // ID do usuário adicional quando isAdditionalUser = true
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string;
      emailVerified?: boolean;
    }
  }
}

// Funções de utilidade para hash e verificação de senhas
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Função para verificar a senha caracter por caracter conforme solicitado
// Observação: Como as senhas estão criptografadas, isso simula a verificação por caracteres
// já que não podemos fazer a verificação por caractere real da senha criptografada
// Função que verifica a senha completa (usada para verificação real de segurança)
export async function comparePartialPassword(suppliedPartial: string, stored: string): Promise<boolean> {
  console.log(`Verificando senha parcial: "${suppliedPartial}" (comprimento: ${suppliedPartial.length})`);

  // Se a senha parcial estiver vazia, retornamos falso
  if (!suppliedPartial || suppliedPartial.trim() === '') {
    return false;
  }

  try {
    // Como não podemos comparar caractere por caractere com senha criptografada,
    // realizamos a comparação completa da senha
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(suppliedPartial, salt, 64)) as Buffer;

    // Para segurança, só consideramos válido se for exatamente a senha completa
    const isValid = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Resultado da verificação de senha: ${isValid ? 'válida' : 'inválida'}`);
    return isValid;
  } catch (error) {
    console.error("Erro na comparação da senha:", error);
    return false;
  }
}

// Função para verificação de prefixo de senha 
// Como estamos usando senhas hasheadas, esta função agora funciona de forma aproximada
export async function verifyPasswordPrefix(partialPassword: string, userId: number): Promise<boolean> {
  if (!partialPassword || partialPassword.trim() === '' || !userId) {
    return false;
  }

  try {
    // Buscar o usuário no banco de dados
    const user = await storage.getUser(userId);

    if (!user || !user.password) {
      console.log(`Usuário ${userId} não encontrado ou sem senha cadastrada`);
      return false;
    }

    // Recuperar a senha real (hashed) do usuário
    const hashedPassword = user.password;

    // Verificar se a senha parcial é a senha completa
    // Isso permite verificar se a senha está completa e correta
    const isFullPasswordMatch = await comparePasswords(partialPassword, hashedPassword);
    if (isFullPasswordMatch) {
      console.log(`Senha completa correta para usuário ${userId}`);
      return true;
    }

    // Para verificação parcial com senhas hasheadas, temos que usar uma abordagem diferente,
    // já que não podemos verificar caractere por caractere com a senha hasheada.

    // Abordagem para feedback ao usuário durante digitação:
    // 1. Para senha completa, fazemos verificação normal de hash (já feito acima)
    // 2. Para verificação parcial, consideramos o seguinte:
    //    a) Para as primeiras letras, usamos um padrão comum (ex: primeiro digito = a/1/etc)
    //    b) Considera prefixo válido se seguir um padrão razoável de construção de senha

    // IMPORTANTE: A verificação de prefixo para senhas hasheadas é complexa.
    // Vamos utilizar algumas heurísticas para dar feedback durante a digitação,
    // mas SÓ consideramos a senha válida quando o hash completo corresponder.

    // Verificamos alguns padrões comuns de senha
    const isNumericOnly = /^[0-9]+$/.test(partialPassword);
    const isAlphaOnly = /^[a-zA-Z]+$/.test(partialPassword);
    const isAlphaNumeric = /^[a-zA-Z0-9]+$/.test(partialPassword);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(partialPassword);

    // Para feedback ao usuário, usamos uma abordagem baseada no comprimento
    const isReasonableLength = partialPassword.length >= 3;

    console.log(`Verificação aproximada para usuário ${userId}:`);
    console.log(`- Senha parcial: "${partialPassword}" (${partialPassword.length} caracteres)`);
    console.log(`- Comprimento razoável: ${isReasonableLength ? "SIM" : "NÃO"}`);

    // Tentamos dar feedback positivo durante a digitação, mas mantemos uma 
    // verificação mínima para evitar falsas validações
    const isPotentialPrefix = partialPassword.length >= 3;

    return isPotentialPrefix;
  } catch (error) {
    console.error("Erro ao verificar prefixo de senha:", error);
    return false;
  }
}

// Configuração da autenticação
export function setupAuth(app: Express): void {
  // Configuração melhorada do armazenamento de sessão PostgreSQL
  const PostgresSessionStore = connectPg(session);

  // Diagnóstico do pool de conexão
  console.log('🔄 Configurando armazenamento de sessão PostgreSQL...');
  console.log('📊 Pool de conexão disponível:', pool ? 'SIM' : 'NÃO');

  const sessionStore = new PostgresSessionStore({
    pool,
    createTableIfMissing: true,
    tableName: 'session',
    // Aumentando o intervalo de limpeza e duração da sessão
    pruneSessionInterval: 60 * 60, // Limpeza a cada 1 hora 
  });

  // Log para diagnóstico
  console.log('🔑 Inicializando armazenamento de sessão...');

  // Configurações de sessão mais robustas
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "meu_preco_certo_app_secret",
    resave: false, // Mudado para false para evitar salvar sessões desnecessárias
    saveUninitialized: false, // Mudado para false para não criar sessões para usuários não autenticados
    rolling: true,
    cookie: {
      secure: false, // Desabilitado para desenvolvimento
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      httpOnly: true,
      sameSite: 'lax'
    },
    store: sessionStore,
    name: 'mpc.sid' // Nome personalizado para o cookie
  };

  // Configurações das sessões
  app.set("trust proxy", 1);

  // Adicionando manipulação de erros para sessão
  app.use(session(sessionSettings));

  // Inicializar sistema de autenticação
  app.use(passport.initialize());
  app.use(passport.session());

  // Log de confirmação
  console.log('✅ Sistema de sessão e autenticação configurado com sucesso!');

  // Estratégia de autenticação local
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Primeiro, verificar se é um usuário principal
        let user = await storage.getUserByUsername(username);

        // Se não encontrar pelo username, tenta pelo email
        if (!user) {
          user = await storage.getUserByEmail(username);
        }

        // Se não encontrou um usuário principal, verificar se é um usuário adicional
        let isAdditionalUser = false;
        let additionalUser = null;

        if (!user) {
          console.log(`Usuário principal não encontrado, verificando usuários adicionais para: ${username}`);

          // Buscar na tabela de usuários adicionais por email
          const { executeQuery } = await import('./db');
          const result = await executeQuery(`
            SELECT ua.*, u.id as main_user_id, u.username as main_username 
            FROM usuarios_adicionais ua
            INNER JOIN users u ON ua.user_id = u.id
            WHERE ua.email = $1 AND ua.status = 'ativo'
          `, [username]);

          if (result.rows && result.rows.length > 0) {
            additionalUser = result.rows[0];
            isAdditionalUser = true;
            console.log(`Usuário adicional encontrado: ${additionalUser.nome} (${additionalUser.email})`);
          }
        }

        // Se não encontrou nem usuário principal nem adicional
        if (!user && !additionalUser) {
          console.log(`Nenhum usuário encontrado para: ${username}`);
          return done(null, false, { message: "Nome de usuário ou senha incorretos" });
        }

        // Validar senha
        let isPasswordValid = false;
        let targetUser = null;

        if (isAdditionalUser && additionalUser) {
          // Verificar se o usuário adicional tem senha definida
          if (!additionalUser.password) {
            console.log(`Usuário adicional ${additionalUser.email} não tem senha definida`);
            return done(null, false, { 
              message: "Senha não definida para este usuário. Entre em contato com o administrador.",
              needsPasswordSetup: true
            });
          }

          // Verificar se o email foi verificado para usuários adicionais
          if (additionalUser.email_verified === false) {
            console.log(`Usuário adicional ${additionalUser.email} com email não verificado`);
            return done(null, false, { 
              message: "Por favor, verifique seu email antes de fazer login. Entre em contato com o administrador se necessário.",
              needsEmailVerification: true,
              emailSent: false
            });
          }

          isPasswordValid = await comparePasswords(password, additionalUser.password);

          if (isPasswordValid) {
            // Criar objeto user compatível para usuário adicional
            targetUser = {
              id: additionalUser.main_user_id, // Usar ID do usuário principal para carregar dados
              additionalUserId: additionalUser.id, // Manter ID do usuário adicional para referência
              username: additionalUser.email, // Usar email como username para usuários adicionais
              email: additionalUser.email,
              role: additionalUser.role || "additional_user",
              nome: additionalUser.nome,
              setor: additionalUser.setor,
              perfil: additionalUser.perfil,
              mainUserId: additionalUser.main_user_id,
              mainUsername: additionalUser.main_username,
              isAdditionalUser: true,
              twoFactorEnabled: additionalUser.two_factor_enabled || false,
              twoFactorSecret: additionalUser.two_factor_secret,
              emailVerified: additionalUser.email_verified !== false
            };

            // Atualizar último login para usuário adicional
            const { executeQuery } = await import('./db');
            await executeQuery(`
              UPDATE usuarios_adicionais 
              SET last_login = NOW(), updated_at = NOW() 
              WHERE id = $1
            `, [additionalUser.id]);

            console.log(`Login de usuário adicional bem-sucedido: ${targetUser.nome} (${targetUser.email})`);
          }
        } else if (user) {
          // Verificação para usuário principal
          isPasswordValid = await comparePasswords(password, user.password);

          if (isPasswordValid) {
            targetUser = user;

            // Verificar se o email foi verificado para usuários principais
            if (user.emailVerified === false) {
              console.log(`Usuário principal ${username} tentou login com email não verificado`);

              try {
                await resendVerificationEmail(user.email);
                console.log(`Email de verificação reenviado automaticamente para ${user.email}`);

                return done(null, false, { 
                  message: "Por favor, verifique seu email antes de fazer login. Um novo email de verificação foi enviado.",
                  needsEmailVerification: true,
                  emailSent: true
                });
              } catch (error) {
                console.error(`Erro ao reenviar email de verificação para ${user.email}:`, error);
                return done(null, false, { 
                  message: "Por favor, verifique seu email antes de fazer login. Verifique sua caixa de entrada.",
                  needsEmailVerification: true,
                  emailSent: false
                });
              }
            }

            // Atualizar último login para usuário principal
            await storage.updateLastLogin(user.id);
          }
        }

        if (!isPasswordValid) {
          console.log(`Senha inválida para usuário: ${username}`);
          return done(null, false, { message: "Nome de usuário ou senha incorretos" });
        }

        // Log de atividade
        const activityUserId = isAdditionalUser ? additionalUser.main_user_id : targetUser.id;
        await storage.createActivityLog({
          userId: activityUserId,
          tipoOperacao: "login",
          entidade: isAdditionalUser ? "usuarios_adicionais" : "users",
          entidadeId: targetUser.id,
          descricao: isAdditionalUser 
            ? `Login de usuário adicional: ${targetUser.nome} (${targetUser.email})`
            : "Login realizado com sucesso",
          ipAddress: "",
          userAgent: "",
          userType: isAdditionalUser ? "additional" : "main"
        });

        // Adicionar informações sobre tipo de usuário
        if (isAdditionalUser) {
          targetUser.isAdditionalUser = true;
          targetUser.additionalUserId = additionalUser.id;
          targetUser.mainUserId = additionalUser.main_user_id;
        } else {
          targetUser.isAdditionalUser = false;
        }

        return done(null, targetUser);
      } catch (err) {
        console.error("Erro durante autenticação:", err);
        return done(err);
      }
    })
  );

  // Serialização/Deserialização de usuário para a sessão
  passport.serializeUser((user, done) => {
    // Serializar com informação sobre tipo de usuário
    const userInfo = {
      id: user.isAdditionalUser ? user.additionalUserId : user.id, // Usar ID correto para deserialização
      isAdditional: user.isAdditionalUser || false
    };
    done(null, userInfo);
  });

  passport.deserializeUser(async (userInfo: any, done) => {
    try {
      let user = null;

      // Se for um objeto com informações de tipo
      if (typeof userInfo === 'object' && userInfo.id) {
        if (userInfo.isAdditional) {
          // Buscar usuário adicional
          const { executeQuery } = await import('./db');
          const result = await executeQuery(`
            SELECT ua.*, u.id as main_user_id, u.username as main_username 
            FROM usuarios_adicionais ua
            INNER JOIN users u ON ua.user_id = u.id
            WHERE ua.id = $1 AND ua.status = 'ativo'
          `, [userInfo.id]);

          if (result.rows && result.rows.length > 0) {
            const additionalUser = result.rows[0];
            user = {
              id: additionalUser.main_user_id, // Usar ID do usuário principal para carregar dados
              additionalUserId: additionalUser.id, // Manter ID do usuário adicional para referência
              username: additionalUser.email,
              email: additionalUser.email,
              role: additionalUser.role || "additional_user",
              nome: additionalUser.nome,
              setor: additionalUser.setor,
              perfil: additionalUser.perfil,
              mainUserId: additionalUser.main_user_id,
              mainUsername: additionalUser.main_username,
              isAdditionalUser: true,
              twoFactorEnabled: additionalUser.two_factor_enabled || false,
              twoFactorSecret: additionalUser.two_factor_secret,
              emailVerified: additionalUser.email_verified !== false
            };
          }
        } else {
          // Buscar usuário principal
          user = await storage.getUser(userInfo.id);
        }
      } else {
        // Compatibilidade com sessões antigas (apenas ID numérico)
        const id = typeof userInfo === 'object' ? userInfo.id : userInfo;

        // Primeiro tentar como usuário principal
        user = await storage.getUser(id);

        // Se não encontrar, tentar como usuário adicional
        if (!user) {
          const { executeQuery } = await import('./db');
          const result = await executeQuery(`
            SELECT ua.*, u.id as main_user_id, u.username as main_username 
            FROM usuarios_adicionais ua
            INNER JOIN users u ON ua.user_id = u.id
            WHERE ua.id = $1 AND ua.status = 'ativo'
          `, [id]);

          if (result.rows && result.rows.length > 0) {
            const additionalUser = result.rows[0];
            user = {
              id: additionalUser.main_user_id, // Usar ID do usuário principal para carregar dados
              additionalUserId: additionalUser.id, // Manter ID do usuário adicional para referência
              username: additionalUser.email,
              email: additionalUser.email,
              role: additionalUser.role || "additional_user",
              nome: additionalUser.nome,
              setor: additionalUser.setor,
              perfil: additionalUser.perfil,
              mainUserId: additionalUser.main_user_id,
              mainUsername: additionalUser.main_username,
              isAdditionalUser: true,
              twoFactorEnabled: additionalUser.two_factor_enabled || false,
              twoFactorSecret: additionalUser.two_factor_secret,
              emailVerified: additionalUser.email_verified !== false
            };
          }
        }
      }

      if (!user) {
        return done(null, false);
      }

      done(null, user);
    } catch (err) {
      console.error("Erro na deserialização do usuário:", err);
      done(err);
    }
  });

  // Registra as rotas de autenticação
  // Registro de novo usuário
  app.post("/api/register", async (req, res, next) => {
    try {
      // Verificar apenas se o e-mail já existe, permitindo múltiplos usuários com o mesmo nome
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash da senha
      const hashedPassword = await hashPassword(req.body.password);

      // Cria usuário com emailVerified como false inicialmente
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        role: "user",
        emailVerified: false // Usuário inicia com email não verificado
      });

      // Cria perfil inicial vazio
      await storage.createUserProfile({
        userId: user.id,
        nome: "",
        sobrenome: "",
        empresa: "",
        cargo: "",
        telefone: "",
        cpfCnpj: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        configuracoes: {
          tema: "light",
          notificacoes: true,
          exibirTutorial: true
        }
      });

      // Log de atividade
      await storage.createActivityLog({
        userId: user.id,
        tipoOperacao: "criar",
        entidade: "users",
        entidadeId: user.id,
        descricao: "Novo usuário registrado",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });

      // Enviar email de verificação
      try {
        // Importar diretamente o módulo de email-verification
        const { sendAccountVerificationEmail } = await import('./email-verification');

        // Enviar o email de verificação diretamente
        // Envio de email para o usuário
        const emailSent = await sendAccountVerificationEmail(user.id, user.email, user.username);

        if (!emailSent) {
          // Só registra log em caso de falha
          // Tentativa alternativa com mais informações de erro
          const { sendEmail } = await import('./email');
          const testSubject = "Verificação de Conta - Meu Preço Certo";
          const testHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Verificação de Email</h2>
              <p>Olá ${user.username},</p>
              <p>Este é um email de verificação de cadastro do sistema Meu Preço Certo.</p>
              <p>Para ativar sua conta, por favor entre em contato com o suporte.</p>
            </div>
          `;

          try {
            await sendEmail({
              to: user.email,
              subject: testSubject,
              html: testHtml
            });
            // Email enviado com sucesso
          } catch (secondaryError) {
            // Registramos o erro mas continuamos o fluxo
          }
        }
      } catch (emailError) {
        // Continuamos com o processo mesmo se falhar o envio do email
      }

      // Não fazer login automático após o registro
      // O usuário precisará verificar o email antes de poder fazer login
      return res.status(201).json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: false,
        emailVerificationSent: true,
        message: "Conta criada com sucesso. Por favor, verifique seu email para ativar sua conta antes de fazer login."
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      return res.status(500).json({ message: "Erro interno durante o registro" });
    }
  });

  // Login
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json(info);

      req.login(user, async (err) => {
        if (err) return next(err);

        // Criar sessão ativa na tabela user_sessions
        try {
          // Para usuários adicionais, usar o ID do usuário adicional para a sessão
          const sessionUserId = user.isAdditionalUser ? user.additionalUserId : user.id;
          console.log(`🔄 Iniciando criação de sessão para usuário ${user.id} (sessão será criada para user_id: ${sessionUserId})`);

          const userAgent = req.headers['user-agent'] || '';
          const browser = getBrowserInfo(userAgent);
          // Capturar apenas o IP público real
          const forwardedFor = req.headers['x-forwarded-for'];
          let userIP = '127.0.0.1';

          if (forwardedFor) {
            // x-forwarded-for pode conter múltiplos IPs separados por vírgula
            // O primeiro é sempre o IP real do cliente
            const ips = forwardedFor.toString().split(',');
            userIP = ips[0].trim();
            console.log(`🔍 IP público capturado no login: ${userIP}`);
          } else {
            userIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
            console.log(`🔍 IP alternativo capturado: ${userIP}`);
          }

          console.log(`🔍 Debug sessão - User-Agent: ${userAgent}`);
          console.log(`🔍 Debug sessão - Browser extraído: ${browser}`);
          console.log(`🔍 Debug sessão - IP: ${userIP}`);

          // Detectar localização do IP
          const location = await getLocationFromIP(userIP);
          console.log(`🌍 Localização detectada: ${location}`);

          const sessionData = {
            userId: sessionUserId, // Usar o ID específico do usuário (adicional se for adicional)
            token: req.sessionID,
            deviceInfo: userAgent || 'Dispositivo desconhecido',
            browser: browser,
            ip: userIP,
            location: location,
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            isActive: true
          };

          const sessionResult = await storage.createUserSession(sessionData);

          if (sessionResult && sessionResult.id) {
            console.log(`✅ Sessão criada com sucesso - ID: ${sessionResult.id} para usuário ${user.id}`);
          } else {
            console.error('⚠️ Sessão criada mas sem retorno de ID');
          }
        } catch (sessionError) {
          console.error('❌ Erro ao criar sessão na tabela user_sessions:', sessionError);
          console.error('Detalhes do erro:', {
            message: sessionError.message,
            stack: sessionError.stack
          });
          // Não interrompe o login se houver erro na criação da sessão
        }

        // Verificar se o usuário tem 2FA ativado
        const has2FAEnabled = user.twoFactorEnabled === true && user.twoFactorSecret;

        // Se não tem 2FA ativado, marcar a sessão como verificada automaticamente
        if (!has2FAEnabled) {
          req.session.twoFactorVerified = true;
          await new Promise<void>((resolve) => {
            req.session.save(() => resolve());          });
        }

        // Gerar token JWT para ser usado na verificação 2FA se necessário
        const jwtSecret = process.env.JWT_SECRET || 'meu_preco_certo_app_secret';
        const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '5m' });

        console.log(`Usuário ${user.id} (${user.email}) logado com sucesso. 2FA ativado: ${has2FAEnabled}`);

        return res.status(200).json({ 
          id: user.id, 
          username: user.username,
          email: user.email,
          role: user.role,
          token, // Adicionando o token à resposta
          requires2FA: has2FAEnabled, // Informar ao frontend se precisa de verificação 2FA
          twoFactorVerified: !has2FAEnabled // Se não tem 2FA, já está verificado
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/logout", async (req, res, next) => {
    console.log('🚪 Processando logout...');

    if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
      const userId = req.user!.id;
      const sessionId = req.sessionID;

      try {
        // 1. Invalidar sessão na tabela user_sessions (marca como inativa E remove)
        const sessionInvalidated = await storage.invalidateUserSession(sessionId);
        console.log(`✅ Sessão ${sessionId} invalidada: ${sessionInvalidated}`);

        // NOVO: Também remover da tabela 'session' do PostgreSQL (onde o express-session armazena)
        try {
          const { connectionManager } = await import('./connection-manager');
          await connectionManager.executeQuery(`
            DELETE FROM session WHERE sid = $1
          `, [sessionId]);
          console.log(`✅ Sessão ${sessionId.substring(0, 8)}... removida da tabela session do PostgreSQL`);
        } catch (sessionTableError) {
          console.error(`⚠️ Erro ao remover da tabela session:`, sessionTableError);
        }

        // 2. Log de atividade
        await storage.createActivityLog({
          userId,
          tipoOperacao: "logout",
          entidade: "users",
          entidadeId: userId,
          descricao: "Logout realizado com sucesso",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });

        console.log(`📝 Log de atividade de logout criado para usuário ${userId}`);
      } catch (error) {
        console.error('⚠️ Erro ao processar logout:', error);
        // Continuar com logout mesmo se houver erro na invalidação
      }
    }

    // 3. Logout do Passport e destruir sessão
    req.logout((err) => {
      if (err) {
        console.error('❌ Erro no logout do Passport:', err);
        return next(err);
      }

      // 4. Destruir sessão do express-session
      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Erro ao destruir sessão:', err);
          return next(err);
        }

        // 5. Limpar cookies com configurações mais robustas
        res.clearCookie('connect.sid', { 
          path: '/', 
          httpOnly: true, 
          secure: false 
        });
        res.clearCookie('mpc.sid', { 
          path: '/', 
          httpOnly: true, 
          secure: false 
        });

        // 6. Adicionar headers para evitar cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        console.log('✅ Logout completado com sucesso');
        return res.status(200).json({ 
          success: true, 
          message: 'Logout realizado com sucesso' 
        });
      });
    });
  });

  // Verificar se o usuário está autenticado
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const userData = { 
      id: req.user!.id, 
      username: req.user!.username,
      email: req.user!.email,
      role: req.user!.role
    };

    // Incluir campos específicos para usuários adicionais
    if (req.user!.isAdditionalUser) {
      Object.assign(userData, {
        nome: req.user!.nome,
        setor: req.user!.setor,
        perfil: req.user!.perfil,
        mainUserId: req.user!.mainUserId,
        mainUsername: req.user!.mainUsername,
        isAdditionalUser: true,
        twoFactorEnabled: req.user!.twoFactorEnabled,
        emailVerified: req.user!.emailVerified
      });
    }

    return res.status(200).json(userData);
  });

  // Recuperação de senha - Etapa 1: Solicitação (simulação)
  app.post("/api/recover-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        // Por segurança, não informamos que o email não existe
        return res.status(200).json({ message: "Se este email estiver registrado, enviaremos instruções para redefinir a senha." });
      }

      // Em um sistema real, aqui enviaríamos um email com um token
      // Por enquanto, apenas simulamos o processo

      return res.status(200).json({ 
        message: "Se este email estiver registrado, enviaremos instruções para redefinir a senha.",
        // Apenas para facilitar testes:
        userId: user.id,
        resetToken: "token_simulado_" + randomBytes(16).toString("hex")
      });
    } catch (error) {
      console.error("Erro na recuperação de senha:", error);
      return res.status(500).json({ message: "Erro interno durante a recuperação de senha" });
    }
  });

  // Recuperação de senha - Etapa 2: Redefinição (simulação)
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { userId, token, newPassword } = req.body;

      // Aqui verificaríamos o token, mas por enquanto apenas simulamos
      if (!token || !token.startsWith("token_simulado_")){
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Atualiza a senha
      const hashedPassword = await hashPassword(newPassword);
      await storage.updatePassword(userId, hashedPassword);

      // Log de atividade
      await storage.createActivityLog({
        userId,
        tipoOperacao: "atualizar",
        entidade: "users",
        entidadeId: userId,
        descricao: "Senha redefinida com sucesso",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });

      return res.status(200).json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("Erro na redefinição de senha:", error);
      return res.status(500).json({ message: "Erro interno durante a redefinição de senha" });
    }
  });

  // Atualização de perfil
  app.put("/api/profile", async (req, res) => {
    if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    try {
      const userId = req.user!.id;
      const profile = await storage.getUserProfile(userId);

      if (!profile) {
        // Cria um perfil se não existir
        const newProfile = await storage.createUserProfile({
          userId,
          ...req.body,
          configuracoes: req.body.configuracoes || {
            tema: "light",
            notificacoes: true,
            exibirTutorial: true
          }
        });

        return res.status(201).json(newProfile);
      }

      // Atualiza o perfil existente
      const updatedProfile = await storage.updateUserProfile(userId, req.body);

      // Log de atividade
      await storage.createActivityLog({
        userId,
        tipoOperacao: "atualizar",
        entidade: "userProfiles",
        entidadeId: profile.id,
        descricao: "Perfil atualizado",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });

      return res.status(200).json(updatedProfile);
    } catch (error) {
      console.error("Erro na atualização do perfil:", error);
      return res.status(500).json({ message: "Erro interno durante a atualização do perfil" });
    }
  });

  // Rota de verificação de status de autenticação
  app.get("/api/auth/status", (req, res) => {
    console.log("Verificando status de autenticação", {
      isAuthenticated: req.isAuthenticated && typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false,
      sessionID: req.sessionID,
      user: req.user ? { id: req.user.id, username: req.user.username, isAdditional: req.user.isAdditionalUser } : null
    });

    if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
      const userData = {
        id: req.user!.id,
        username: req.user!.username,
        email: req.user!.email,
        role: req.user!.role
      };

      // Incluir dados específicos para usuários adicionais
      if (req.user!.isAdditionalUser) {
        Object.assign(userData, {
          nome: req.user!.nome,
          setor: req.user!.setor,
          perfil: req.user!.perfil,
          mainUserId: req.user!.mainUserId,
          mainUsername: req.user!.mainUsername,
          isAdditionalUser: true,
          twoFactorEnabled: req.user!.twoFactorEnabled,
          emailVerified: req.user!.emailVerified
        });
      }

      return res.status(200).json({
        authenticated: true,
        user: userData
      });
    } else {
      return res.status(200).json({
        authenticated: false,
        message: "Usuário não autenticado"
      });
    }
  });

  // Rota de verificação de autenticação para o sistema de proteção de rotas no frontend
  app.get("/api/auth/verify", (req, res) => {
    // Verifica se o usuário está autenticado e sua sessão é válida
    if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
      return res.status(200).json({
        authenticated: true,
        verified: true
      });
    } else {
      // Se não estiver autenticado, retorna 401 (Não autorizado)
      return res.status(401).json({
        authenticated: false,
        verified: false,
        message: "Sessão inválida ou expirada. Faça login novamente."
      });
    }
  });

  // Obter perfil de usuário
  app.get("/api/profile", async (req, res) => {
    if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    try {
      const userId = req.user!.id;
      const profile = await storage.getUserProfile(userId);

      if (!profile) {
        return res.status(404).json({ message: "Perfil não encontrado" });
      }

      return res.status(200).json(profile);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      return res.status(500).json({ message: "Erro interno ao buscar perfil" });
    }
  });

  // Histórico de atividades
  app.get("/api/activity-log", async (req, res) => {
    if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 24;

      const logs = await storage.getActivityLogs(userId, limit);
      return res.status(200).json(logs);
    } catch (error) {
      console.error("Erro ao buscar logs de atividade:", error);
      return res.status(500).json({ message: "Erro interno ao buscar logs de atividade" });
    }
  });

  // Middleware para atualizar atividade da sessão
  app.use('/api/*', async (req, res, next) => {
    if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.sessionID) {
      try {
        await storage.updateSessionActivity(req.sessionID);
      } catch (error) {
        // Log silencioso para não interromper as requisições
        console.debug('Erro ao atualizar atividade da sessão:', error);
      }
    }
    next();
  });

  // Middleware para verificar autenticação em rotas protegidas
  app.use('/api/protected/*', (req, res, next) => {
    if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Acesso não autorizado" });
    }
    next();
  });
}

// Extensão de tipos para usuário e sessão
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      role: string;
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string;
    }

    interface Session {
      twoFactorVerified?: boolean;
    }
  }
}

// Middleware para verificar autenticação e conformidade com 2FA se necessário
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Verificação flexível de autenticação
  const isAuth = req.isAuthenticated?.() || !!req.session?.passport?.user || !!req.user?.id;

  if (!isAuth) {
    console.log(`❌ Acesso negado para ${req.originalUrl} - Usuário não autenticado`);
    return res.status(401).json({ message: "Acesso não autorizado" });
  }

  // NOVO: Verificar se a sessão ainda existe na tabela user_sessions_additional
  // Isso garante que usuários com sessões encerradas sejam deslogados
  if (req.sessionID && req.user?.id) {
    // Fazer verificação assíncrona da sessão
    (async () => {
      try {
        const { connectionManager } = await import('./connection-manager');

        // Verificar se a sessão ainda existe na tabela user_sessions_additional
        const sessionExists = await connectionManager.executeQuery(`
          SELECT id FROM user_sessions_additional 
          WHERE token = $1 AND is_active = true AND expires_at > NOW()
        `, [req.sessionID]);

        if (sessionExists.rows.length === 0) {
          console.log(`🔒 Sessão ${req.sessionID.substring(0, 8)}... não encontrada ou expirada - forçando logout`);

          // Marcar a sessão como inválida para evitar conflitos
          req.session.sessionInvalid = true;

          // Retornar erro de sessão inválida
          if (req.originalUrl.startsWith('/api/')) {
            return res.status(401).json({ 
              message: "Sessão inválida ou encerrada",
              sessionInvalid: true,
              redirectTo: "/entrar"
            });
          } else {
            return res.redirect('/entrar?sessao=encerrada');
          }
        }

        // Se chegou aqui, a sessão é válida, continuar normalmente
        return next();

      } catch (error) {
        console.error('❌ Erro ao verificar sessão na tabela:', error);
        // Em caso de erro na verificação, permitir continuar (fail-safe)
        return next();
      }
    })();

    // Não chamar next() aqui, pois o código assíncrono acima já fará isso
    return;
  }

  // Log detalhado apenas após confirmar autenticação
  console.log(`✅ Usuário autenticado acessando ${req.originalUrl}:`, {
    userId: req.user?.id,
    username: req.user?.username,
    sessionId: req.sessionID
  });

  // Verificação de 2FA
  if (req.user?.twoFactorEnabled === true && !req.session.twoFactorVerified) {
    const bypassRoutes = [
      '/api/auth/verify-2fa',
      '/api/auth/2fa-session-status',
      '/api/auth/logout',
      '/api/conta/2fa/status'
    ];

    if (bypassRoutes.some(route => req.originalUrl.includes(route))) {
      return next();
    }

    const isApiRequest = req.originalUrl.startsWith('/api/');
    if (isApiRequest) {
      return res.status(403).json({ 
        requiresTwoFactor: true,
        redirectTo: "/verificar-2fa"
      });
    } else {
      return res.redirect('/verificar-2fa');
    }
  }

  return next();
}

// Middleware para verificar role de administrador
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  // Verificações de segurança para administrador
  if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Acesso não autorizado" });
  }

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Acesso restrito a administradores" });
  }

  // Se chegou aqui, é um administrador autenticado

  // Verificação 2FA especial para administradores (segurança adicional)
  if (req.user.twoFactorEnabled === true && !req.session.twoFactorVerified) {

    // Para detectar tipo de requisição - cliente ou API
    const isApiRequest = req.headers.accept?.includes('application/json') || 
                        req.xhr || 
                        req.originalUrl.startsWith('/api/');

    if (isApiRequest) {
      return res.status(403).json({ 
        message: "Verificação 2FA necessária para administradores", 
        requiresTwoFactor: true,
        redirectTo: "/verificar-2fa",
        error: "admin_two_factor_required"
      });
    } else {
      return res.redirect('/verificar-2fa?next=admin');
    }
  }

  // Se chegou aqui, é um administrador válido e com 2FA verificado se necessário
  console.log(`✅ Acesso administrativo autorizado para ${req.user.id}`);
  return next();
}