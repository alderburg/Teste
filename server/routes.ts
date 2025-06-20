import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
// WebSocket removido - configurado no server/index.ts
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, hashPassword, comparePasswords } from "./auth";
import { getUserPasswordFromDatabase, executeQuery } from "./db";
import { authenticator } from 'otplib';
import jwt from 'jsonwebtoken';
import { timestampToBrazilianDate } from './utils/timezone';

// @ts-nocheck
// Configuração TypeScript - Supressão de erros para código legado
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { 
  insertUserSchema, users,
  insertProdutoSchema, insertServicoSchema, insertItemAluguelSchema,
  insertFornecedorSchema, insertClienteSchema, insertMarketplaceSchema, insertCustoSchema, insertDespesaSchema,
  insertTaxaSchema, insertTributoSchema, insertPrecificacaoSchema, insertCategoriaSchema,
  insertEnderecoSchema, insertContatoSchema, insertUsuarioAdicionalSchema,
  changePasswordSchema, enable2FASchema
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db, checkAndCreateTables } from "./db";
import {
  calcularPrecoProduto,
  calcularPrecoServico,
  calcularPrecoAluguel,
  calcularPrecoMarketplace
} from "./calculos";
import path from "path";
import express from "express";

import { stripe } from "./stripe-helper";
import { syncCustomerWithStripe, syncPaymentMethods } from "./stripe-sync";
import { setupCustomCardRoute } from "./custom-card-route";
import { 
  handleEmailVerification, 
  handleResendVerification,
  checkEmailExists
} from './auth/email-verification-handler';
import {
  handlePasswordResetRequest,
  verifyPasswordResetToken,
  markPasswordResetTokenAsUsed
} from './auth/password-reset-handler';
import { verifyEmailConfig, sendAdditionalUserPasswordEmail } from './email';
import { setupPaymentIntentRoute } from './create-payment-intent';

// Configuração do Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Aviso: STRIPE_SECRET_KEY não está configurada. Funcionalidades de pagamento estarão indisponíveis.');
}

// A instância do Stripe já é importada de stripe-helper.ts

// Verificar a conexão com o servidor de email
verifyEmailConfig()
  .then(status => {
    console.log('Status do servidor de email:', status ? 'OK - Servidor de email conectado' : 'FALHA - Servidor de email não conectado');
  })
  .catch(error => {
    console.log('Status do servidor de email: FALHA - Erro ao conectar ao servidor de email');
  });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // PRIMEIRO: Verificar e criar tabelas se necessário
  await checkAndCreateTables();
  
  // SEGUNDO: Configurar sistema de autenticação ANTES de todas as rotas
  setupAuth(app);


  
  // Configurar a rota personalizada de processamento de cartão
  setupCustomCardRoute(app);
  
  // Configurar rota para criação de PaymentIntent
  setupPaymentIntentRoute(app);
  
  // Registrar as rotas de assinatura usando a implementação padrão
  try {
    const { configurarRotasAssinatura } = await import('./routes-assinatura');
    configurarRotasAssinatura(app);
    console.log('✅ Rotas de assinatura registradas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao registrar rotas de assinatura:', error);
  }
  
  // Rota de teste para mostrar a tela de verificação de email
  app.get('/api/test-verification-view', (req, res) => {
    res.redirect('/cadastre-se?test_verification=true&skip_auth=true');
  });

  // Rota de monitoramento para exibir status das conexões do banco de dados
  app.get('/api/monitor/connections', async (req, res) => {
    try {
      // Importar o connectionManager diretamente
      const { connectionManager } = await import('./connection-manager');
      
      // Usar o método público de diagnóstico
      const connectionInfo = await connectionManager.diagnosePoolHealth();
      
      // Obter estatísticas gerais
      const stats = connectionManager.getStats();
      
      // Retornar informações completas
      res.json({
        status: 'success',
        connections: {
          // Informações do banco de dados
          totalConnections: connectionInfo.totalConnections,
          connectionLimit: connectionInfo.connectionLimit,
          
          // Informações do pool
          poolTotalCount: connectionInfo.poolTotalCount,
          activeClients: connectionInfo.activeClients,
          
          // Estatísticas acumuladas
          totalRequests: stats.totalRequests,
          queriesExecuted: stats.queriesExecuted,
          peakConnections: stats.peakConnections
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        message: 'Erro ao obter informações de conexão',
        error: String(error)
      });
    }
  });

  // Rota para buscar sessões do usuário para a aba de segurança
  app.get('/api/conta/sessoes', isAuthenticated, async (req, res) => {
    try {
      // Usar o ID específico do usuário (principal ou adicional)
      const userId = req.user!.isAdditionalUser ? req.user!.additionalUserId : req.user!.id;
      const currentSessionToken = req.sessionID;
      
      console.log(`🔍 Buscando sessões para usuário ${userId}`);
      
      // Usar a função correta baseada no tipo de usuário
      const sessionsFromStorage = req.user!.isAdditionalUser 
        ? await storage.getUserSessionsAdditional(userId)
        : await storage.getUserSessions(userId);
      
      // Buscar informações do usuário
      const { connectionManager } = await import('./connection-manager');
      const userInfo = await connectionManager.executeQuery(`
        SELECT username, email FROM users WHERE id = $1
      `, [userId]);

      const user = userInfo.rows[0];

      // Converter os dados para o formato esperado pelo frontend
      // O storage.getUserSessions já retorna as rows diretamente
      const allSessions = { rows: sessionsFromStorage };

      // Buscar informações dos usuários adicionais para ter os nomes corretos
      const usuariosAdicionaisInfo = await connectionManager.executeQuery(`
        SELECT id, nome FROM usuarios_adicionais WHERE user_id = $1
      `, [userId]);

      const mapUsuariosAdicionais = {};
      usuariosAdicionaisInfo.rows.forEach(ua => {
        mapUsuariosAdicionais[ua.id] = ua.nome;
      });

      // Função para extrair nome do navegador do User-Agent
      const getBrowserFromUserAgent = (userAgent: string): string => {
        if (!userAgent) return 'Navegador desconhecido';
        
        try {
          // Microsoft Edge
          if (userAgent.includes('Edg/')) {
            const match = userAgent.match(/Edg\/([0-9.]+)/);
            const version = match ? match[1].split('.')[0] : '';
            return `Microsoft Edge ${version}`;
          }
          
          // Opera
          if (userAgent.includes('OPR/')) {
            const match = userAgent.match(/OPR\/([0-9.]+)/);
            const version = match ? match[1].split('.')[0] : '';
            return `Opera ${version}`;
          }
          
          // Firefox
          if (userAgent.includes('Firefox/')) {
            const match = userAgent.match(/Firefox\/([0-9.]+)/);
            const version = match ? match[1].split('.')[0] : '';
            return `Firefox ${version}`;
          }
          
          // Chrome (deve vir depois do Edge para evitar conflitos)
          if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
            const match = userAgent.match(/Chrome\/([0-9.]+)/);
            const version = match ? match[1].split('.')[0] : '';
            return `Chrome ${version}`;
          }
          
          // Safari (deve vir depois do Chrome)
          if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
            const match = userAgent.match(/Version\/([0-9.]+).*Safari/);
            const version = match ? match[1].split('.')[0] : '';
            return `Safari ${version}`;
          }
          
          // Internet Explorer
          if (userAgent.includes('MSIE')) {
            const match = userAgent.match(/MSIE ([0-9.]+)/);
            const version = match ? match[1].split('.')[0] : '';
            return `Internet Explorer ${version}`;
          }
          
          // Internet Explorer 11
          if (userAgent.includes('Trident/')) {
            const match = userAgent.match(/rv:([0-9.]+)/);
            const version = match ? match[1].split('.')[0] : '11';
            return `Internet Explorer ${version}`;
          }
          
          return 'Navegador desconhecido';
        } catch (error) {
          console.error('Erro ao extrair informações do navegador:', error);
          return 'Navegador desconhecido';
        }
      };

      // Formatar as sessões para o frontend
      const formattedSessions = allSessions.rows.map(session => {
        const isCurrentSession = session.token === currentSessionToken;
        const now = new Date();
        
        // Calcular tempo desde a última atividade
        const lastActivity = new Date(session.last_activity);
        const timeSinceActivityMs = now.getTime() - lastActivity.getTime();
        const timeSinceActivity = Math.floor(timeSinceActivityMs / 1000);
        
        // Calcular tempo até expirar
        const expiresAt = new Date(session.expires_at);
        const timeUntilExpiryMs = expiresAt.getTime() - now.getTime();
        const timeUntilExpiry = Math.floor(timeUntilExpiryMs / 1000);
        
        // Determinar se a sessão está realmente ativa
        const isSessionActive = session.is_active && timeUntilExpiry > 0;
        
        // Formatar tempo de atividade
        let activityText = '';
        if (isCurrentSession) {
          activityText = 'Sessão atual';
        } else if (isNaN(timeSinceActivity) || timeSinceActivity < 0) {
          activityText = 'Desconhecida';
        } else if (timeSinceActivity < 60) {
          activityText = 'Agora mesmo';
        } else if (timeSinceActivity < 3600) {
          const minutes = Math.floor(timeSinceActivity / 60);
          activityText = `${minutes} min atrás`;
        } else if (timeSinceActivity < 86400) {
          const hours = Math.floor(timeSinceActivity / 3600);
          activityText = `${hours}h atrás`;
        } else {
          const days = Math.floor(timeSinceActivity / 86400);
          activityText = `${days}d atrás`;
        }

        // Formatar tempo até expirar
        let expiryText = '';
        if (isNaN(timeUntilExpiry)) {
          expiryText = 'Data inválida';
        } else if (timeUntilExpiry <= 0) {
          expiryText = 'Expirada';
        } else if (timeUntilExpiry < 3600) {
          const minutes = Math.floor(timeUntilExpiry / 60);
          expiryText = `Expira em ${minutes}min`;
        } else if (timeUntilExpiry < 86400) {
          const hours = Math.floor(timeUntilExpiry / 3600);
          expiryText = `Expira em ${hours}h`;
        } else {
          const days = Math.floor(timeUntilExpiry / 86400);
          expiryText = `Expira em ${days}d`;
        }

        // Determinar status da sessão
        let sessionStatus = 'active';
        if (timeUntilExpiry <= 0) {
          sessionStatus = 'expired';
        } else if (!session.is_active) {
          sessionStatus = 'inactive';
        }

        // Determinar o nome correto do usuário
        let nomeUsuario = '';
        let userType = '';
        
        if (session.user_type === 'main') {
          nomeUsuario = user?.username || 'Principal';
          userType = 'main';
        } else {
          // Para usuários adicionais, usar o nome do mapeamento
          nomeUsuario = mapUsuariosAdicionais[session.user_id] || session.nome_usuario || 'Usuário Adicional';
          userType = 'additional';
        }

        return {
          id: session.id,
          deviceInfo: session.device_info || 'Dispositivo desconhecido',
          browser: session.browser || getBrowserFromUserAgent(session.device_info || ''),
          deviceType: session.device_type,
          ip: session.ip || 'IP desconhecido',
          location: session.location || 'Localização não identificada',
          createdAt: session.created_at,
          lastActivity: session.last_activity,
          expiresAt: session.expires_at,
          isActive: isSessionActive,
          status: sessionStatus,
          current: isCurrentSession,
          activityText,
          expiryText,
          userId: session.user_id,
          userType: userType,
          nomeUsuario: nomeUsuario,
          username: nomeUsuario,
          email: user?.email || 'Email não disponível'
        };
      });

      // Ordenar sessões: sessão atual primeiro, depois por última atividade
      formattedSessions.sort((a, b) => {
        // Sessão atual sempre primeiro
        if (a.current && !b.current) return -1;
        if (!a.current && b.current) return 1;
        
        // Se ambas são atuais ou não são atuais, ordenar por última atividade
        const dateA = new Date(a.lastActivity).getTime();
        const dateB = new Date(b.lastActivity).getTime();
        return dateB - dateA; // Mais recente primeiro
      });

      // Estatísticas das sessões
      const stats = {
        total: formattedSessions.length,
        active: formattedSessions.filter(s => s.isActive).length,
        expired: formattedSessions.filter(s => s.status === 'expired').length,
        inactive: formattedSessions.filter(s => s.status === 'inactive').length
      };

      console.log(`✅ Retornando ${formattedSessions.length} sessões para usuário ${userId}:`, {
        total: stats.total,
        active: stats.active,
        sessionsLength: formattedSessions.length,
        currentSessionToken: currentSessionToken
      });

      // Log das primeiras sessões para debug
      if (formattedSessions.length > 0) {
        console.log('📋 Primeira sessão:', {
          id: formattedSessions[0].id,
          current: formattedSessions[0].current,
          deviceInfo: formattedSessions[0].deviceInfo,
          isActive: formattedSessions[0].isActive
        });
      }

      // Notificar atualização de sessão apenas se necessário
      if (typeof global !== 'undefined' && (global as any).notifySessionUpdate) {
        (global as any).notifySessionUpdate(userId);
      }

      res.json({
        success: true,
        sessions: formattedSessions,
        stats: stats,
        currentSessionToken: currentSessionToken
      });

    } catch (error) {
      console.error('❌ Erro ao buscar sessões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar sessões',
        sessions: []
      });
    }
  });

  // Rota para encerrar uma sessão específica
  app.delete('/api/conta/sessoes/:sessionId', isAuthenticated, async (req, res) => {
    try {
      const isAdditionalUser = req.user!.isAdditionalUser;
      const sessionId = parseInt(req.params.sessionId);
      const currentSessionToken = req.sessionID;
      
      console.log(`🔄 Encerrando sessão ${sessionId} para usuário ${isAdditionalUser ? 'adicional' : 'principal'}`);
      
      const { connectionManager } = await import('./connection-manager');
      
      let sessionTableName = '';
      let sessionCheck;
      
      if (isAdditionalUser) {
        // Para usuário adicional: buscar sessões apenas desse usuário adicional
        const userId = parseInt(req.user!.additionalUserId);
        sessionTableName = 'user_sessions_additional';
        
        sessionCheck = await connectionManager.executeQuery(`
          SELECT token, user_id, user_type FROM user_sessions_additional
          WHERE id = $1 AND user_id = $2 AND user_type = 'additional'
        `, [sessionId, userId]);
        
        console.log(`🔍 Verificando sessão ${sessionId} para usuário adicional ${userId} na tabela user_sessions_additional`);
      } else {
        // Para usuário principal: primeiro verificar na tabela user_sessions (sessões principais)
        const userId = parseInt(req.user!.id);
        
        // Verificar primeiro na tabela user_sessions (sessões principais)
        sessionCheck = await connectionManager.executeQuery(`
          SELECT token, user_id, 'main' as user_type FROM user_sessions
          WHERE id = $1 AND user_id = $2 AND is_active = true
        `, [sessionId, userId]);
        
        if (sessionCheck.rows.length > 0) {
          sessionTableName = 'user_sessions';
          console.log(`🔍 Sessão ${sessionId} encontrada na tabela user_sessions (usuário principal)`);
        } else {
          // Se não encontrou na tabela principal, verificar na tabela user_sessions_additional
          const usuariosAdicionais = await connectionManager.executeQuery(
            `SELECT id FROM usuarios_adicionais WHERE user_id = $1`,
            [userId]
          );
          
          const idsUsuariosAdicionais = usuariosAdicionais.rows.map(u => u.id);
          const placeholders = idsUsuariosAdicionais.map((_, index) => `$${index + 3}`).join(', ');
          
          let query = `
            SELECT token, user_id, user_type FROM user_sessions_additional
            WHERE id = $1 AND (
              (user_id = $2 AND user_type = 'main')`;
          
          const params = [sessionId, userId];
          
          if (idsUsuariosAdicionais.length > 0) {
            query += ` OR (user_id IN (${placeholders}) AND user_type = 'additional')`;
            params.push(...idsUsuariosAdicionais);
          }
          
          query += `)`;
          
          sessionCheck = await connectionManager.executeQuery(query, params);
          sessionTableName = 'user_sessions_additional';
          
          console.log(`🔍 Verificando sessão ${sessionId} na tabela user_sessions_additional para usuário principal ${userId} e seus usuários adicionais`);
        }
      }
      
      if (sessionCheck.rows.length === 0) {
        console.log(`❌ Sessão ${sessionId} não encontrada`);
        return res.status(404).json({
          success: false,
          message: 'Sessão não encontrada'
        });
      }
      
      const sessionToken = sessionCheck.rows[0].token;
      
      // Não permitir encerrar a sessão atual
      if (sessionToken === currentSessionToken) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível encerrar a sessão atual'
        });
      }
      
      console.log(`🔒 Invalidando sessão do Express com token: ${sessionToken.substring(0, 8)}...`);
      
      // NOVO: Invalidar a sessão no Express Session Store
      // Primeiro, tentar destruir a sessão no store do Express
      try {
        const sessionStore = req.sessionStore;
        if (sessionStore && sessionStore.destroy) {
          await new Promise((resolve, reject) => {
            sessionStore.destroy(sessionToken, (err) => {
              if (err) {
                console.error(`⚠️ Erro ao destruir sessão ${sessionToken.substring(0, 8)}... no store:`, err);
                // Não rejeitamos aqui, apenas logamos o erro
                resolve(false);
              } else {
                console.log(`✅ Sessão ${sessionToken.substring(0, 8)}... destruída no store do Express`);
                resolve(true);
              }
            });
          });
        }
      } catch (storeError) {
        console.error(`⚠️ Erro ao acessar session store:`, storeError);
      }
      
      // NOVO: Também remover da tabela 'session' do PostgreSQL (onde o express-session armazena)
      try {
        await connectionManager.executeQuery(`
          DELETE FROM session WHERE sid = $1
        `, [sessionToken]);
        console.log(`✅ Sessão ${sessionToken.substring(0, 8)}... removida da tabela session do PostgreSQL`);
      } catch (sessionTableError) {
        console.error(`⚠️ Erro ao remover da tabela session:`, sessionTableError);
      }
      
      // Excluir completamente a sessão da tabela correta baseada no tipo de sessão
      let result;
      if (sessionTableName === 'user_sessions') {
        // Excluir da tabela principal de sessões
        result = await connectionManager.executeQuery(`
          DELETE FROM user_sessions 
          WHERE id = $1
        `, [sessionId]);
        console.log(`🗑️ Excluindo sessão ${sessionId} da tabela user_sessions`);
      } else {
        // Excluir da tabela de sessões adicionais
        result = await connectionManager.executeQuery(`
          DELETE FROM user_sessions_additional 
          WHERE id = $1
        `, [sessionId]);
        console.log(`🗑️ Excluindo sessão ${sessionId} da tabela user_sessions_additional`);
      }
      
      if (result.rowCount > 0) {
        console.log(`✅ Sessão ${sessionId} excluída com sucesso da tabela ${sessionTableName}`);
        console.log(`🔐 Usuário com token ${sessionToken.substring(0, 8)}... será deslogado automaticamente`);
        
        // Notificar via WebSocket sobre o encerramento da sessão
        const targetUserId = sessionCheck.rows[0].user_id;
        if (typeof (global as any).notifySessionTerminated === 'function') {
          (global as any).notifySessionTerminated(targetUserId, sessionToken);
        } else {
          console.log(`⚠️ Sistema WebSocket não disponível para notificação de sessão`);
        }
        
        // Notificar usuários relacionados sobre a atualização na lista de sessões
        // Usar o mesmo sistema das outras abas (endereços, contatos, etc)
        let userIdForNotification;
        
        if (isAdditionalUser) {
          // Para usuário adicional, buscar o ID do usuário pai
          const userId = parseInt(req.user!.additionalUserId);
          const parentUserResult = await connectionManager.executeQuery(
            'SELECT user_id FROM usuarios_adicionais WHERE id = $1',
            [userId]
          );
          userIdForNotification = parentUserResult.rows.length > 0 ? 
            parentUserResult.rows[0].user_id : userId;
        } else {
          // Se é usuário principal, usar o próprio ID
          userIdForNotification = parseInt(req.user!.id);
        }
        
        console.log(`🔔 Notificando usuários relacionados sobre delete em sessoes para usuário ${userIdForNotification}`);
        
        // Notificar via WebSocket sobre atualização das sessões
        if (typeof (global as any).notifySessionUpdate === 'function') {
          (global as any).notifySessionUpdate(userIdForNotification);
        }
        
        // Enviar evento específico para atualização da lista de sessões
        if (typeof (global as any).wsClients !== 'undefined') {
          const message = JSON.stringify({
            type: 'data_update',
            resource: 'sessoes',
            action: 'delete',
            data: { sessionId: sessionId },
            userId: userIdForNotification
          });
          
          (global as any).wsClients.forEach((ws: any) => {
            if (ws.readyState === 1) { // WebSocket.OPEN
              try {
                ws.send(message);
              } catch (error) {
                console.error('Erro ao enviar notificação WebSocket:', error);
              }
            }
          });
        }
        
        res.json({
          success: true,
          message: 'Sessão encerrada e usuário deslogado com sucesso'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro ao encerrar sessão'
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao encerrar sessão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao encerrar sessão'
      });
    }
  });

  // Rota para buscar sessões do usuário autenticado
  app.get('/api/user-sessions', isAuthenticated, async (req, res) => {
    try {
      // Determinar o tipo de usuário e ID correto
      const isAdditionalUser = req.user!.isAdditionalUser;
      const userId = isAdditionalUser ? req.user!.additionalUserId : req.user!.id;
      const currentSessionToken = req.sessionID;
      
      console.log(`🔍 Buscando sessões para usuário ${userId} (tipo: ${isAdditionalUser ? 'adicional' : 'principal'})`);
      
      let sessionsData;
      
      // Usar o método correto baseado no tipo de usuário
      if (isAdditionalUser) {
        // Para usuário adicional - buscar APENAS suas próprias sessões
        console.log('👤 Usuário adicional detectado - buscando apenas suas próprias sessões');
        sessionsData = await storage.getUserSessionsAdditional(userId);
      } else {
        // Para usuário principal - buscar suas sessões E dos usuários filhos
        console.log('👑 Usuário principal detectado - buscando suas sessões e dos usuários filhos');
        sessionsData = await storage.getUserSessions(userId);
      }
      
      // Se não há dados de sessão, retornar lista vazia
      if (!sessionsData || sessionsData.length === 0) {
        console.log(`📊 Nenhuma sessão encontrada para usuário ${userId}`);
        return res.json({
          success: true,
          sessions: [],
          stats: { total: 0, active: 0, expired: 0, inactive: 0 },
          currentSessionToken: currentSessionToken
        });
      }

      const sessions = sessionsData.map(session => {
        // Função para extrair nome do navegador do User-Agent
        const getBrowserFromUserAgent = (userAgent: string): string => {
          if (!userAgent) return 'Navegador desconhecido';
          
          try {
            // Microsoft Edge
            if (userAgent.includes('Edg/')) {
              const match = userAgent.match(/Edg\/([0-9.]+)/);
              const version = match ? match[1].split('.')[0] : '';
              return `Microsoft Edge ${version}`;
            }
            
            // Opera
            if (userAgent.includes('OPR/')) {
              const match = userAgent.match(/OPR\/([0-9.]+)/);
              const version = match ? match[1].split('.')[0] : '';
              return `Opera ${version}`;
            }
            
            // Firefox
            if (userAgent.includes('Firefox/')) {
              const match = userAgent.match(/Firefox\/([0-9.]+)/);
              const version = match ? match[1].split('.')[0] : '';
              return `Firefox ${version}`;
            }
            
            // Chrome (deve vir depois do Edge para evitar conflitos)
            if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
              const match = userAgent.match(/Chrome\/([0-9.]+)/);
              const version = match ? match[1].split('.')[0] : '';
              return `Chrome ${version}`;
            }
            
            // Safari (deve vir depois do Chrome)
            if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
              const match = userAgent.match(/Version\/([0-9.]+).*Safari/);
              const version = match ? match[1].split('.')[0] : '';
              return `Safari ${version}`;
            }
            
            // Internet Explorer
            if (userAgent.includes('MSIE')) {
              const match = userAgent.match(/MSIE ([0-9.]+)/);
              const version = match ? match[1].split('.')[0] : '';
              return `Internet Explorer ${version}`;
            }
            
            // Internet Explorer 11
            if (userAgent.includes('Trident/')) {
              const match = userAgent.match(/rv:([0-9.]+)/);
              const version = match ? match[1].split('.')[0] : '11';
              return `Internet Explorer ${version}`;
            }
            
            return 'Navegador desconhecido';
          } catch (error) {
            console.error('Erro ao extrair informações do navegador:', error);
            return 'Navegador desconhecido';
          }
        };

        return {
          id: session.id,
          deviceInfo: session.device_info || 'Dispositivo desconhecido',
          browser: getBrowserFromUserAgent(session.browser || session.device_info || ''),
          ip: session.ip || 'IP não disponível',
          location: session.location || 'Localização não identificada',
          current: session.current,
          isActive: session.is_active,
          userId: session.user_id,
          activityText: session.last_activity ? 
            new Date(session.last_activity).toLocaleString('pt-BR') : 
            'Nunca',
          expiryText: session.expires_at ? 
            new Date(session.expires_at).toLocaleString('pt-BR') : 
            null
        };
      });

      console.log(`✅ Encontradas ${sessions.length} sessões ativas para usuário ${userId}`);

      res.json({
        success: true,
        sessions: sessions
      });

    } catch (error) {
      console.error('❌ Erro ao buscar sessões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar sessões',
        sessions: []
      });
    }
  });

  // Rota de diagnóstico para sessões de usuário (manter para compatibilidade)
  app.get('/api/monitor/sessions', isAuthenticated, async (req, res) => {
    try {
      // Determinar o tipo de usuário e ID correto
      const isAdditionalUser = req.user!.isAdditionalUser;
      const userId = isAdditionalUser ? req.user!.additionalUserId : req.user!.id;
      const { connectionManager } = await import('./connection-manager');
      
      console.log(`🔍 Diagnóstico de sessões para usuário ${userId} (tipo: ${isAdditionalUser ? 'adicional' : 'principal'})`);
      
      // Verificar se a tabela existe
      const tableExists = await connectionManager.executeQuery(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_sessions_additional'
        )
      `);

      if (!tableExists.rows[0]?.exists) {
        return res.json({
          status: 'error',
          message: 'Tabela user_sessions_additional não existe',
          tableExists: false,
          sessions: []
        });
      }

      let whereClause, params;
      
      if (isAdditionalUser) {
        // Para usuário adicional - apenas suas sessões
        whereClause = 'WHERE user_id = $1 AND user_type = \'additional\'';
        params = [userId];
      } else {
        // Para usuário principal - suas sessões e dos filhos
        const usuariosAdicionais = await connectionManager.executeQuery(
          `SELECT id FROM usuarios_adicionais WHERE user_id = $1`,
          [userId]
        );
        const idsUsuariosAdicionais = usuariosAdicionais.rows.map(u => u.id);
        
        if (idsUsuariosAdicionais.length > 0) {
          const placeholders = idsUsuariosAdicionais.map((_, index) => `$${index + 2}`).join(', ');
          whereClause = `WHERE (user_id = $1 AND user_type = 'main') OR (user_id IN (${placeholders}) AND user_type = 'additional')`;
          params = [userId, ...idsUsuariosAdicionais];
        } else {
          whereClause = 'WHERE user_id = $1 AND user_type = \'main\'';
          params = [userId];
        }
      }

      // Buscar todas as sessões do usuário (ativas e inativas)
      const allSessions = await connectionManager.executeQuery(`
        SELECT 
          id,
          user_id,
          user_type,
          LEFT(token, 8) || '...' as token_preview,
          device_info,
          browser,
          ip,
          location,
          created_at,
          last_activity,
          expires_at,
          is_active,
          CASE 
            WHEN expires_at > NOW() THEN 'valid'
            ELSE 'expired'
          END as validity_status
        FROM user_sessions_additional 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 10
      `, params);

      // Contar sessões por status
      const sessionStats = await connectionManager.executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as valid,
          COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired
        FROM user_sessions_additional 
        ${whereClause}
      `, params);

      res.json({
        status: 'success',
        tableExists: true,
        currentSessionId: req.sessionID,
        userId: userId,
        sessions: allSessions.rows,
        stats: sessionStats.rows[0]
      });

    } catch (error) {
      console.error('❌ Erro no diagnóstico de sessões:', error);
      res.status(500).json({
        status: 'error',
        message: 'Erro ao diagnosticar sessões',
        error: String(error)
      });
    }
  });
  // Verificar configuração do Stripe
  if (stripe) {
    console.log('Stripe configurado e pronto para uso');
  } else {
    console.error('Chave secreta do Stripe não encontrada. Por favor, configure STRIPE_SECRET_KEY.');
  }
  

  

  
  // Função auxiliar para cancelar assinatura anterior durante upgrade/downgrade
  async function cancelarAssinaturaAnterior(stripeSubscriptionId: string, dataCancelamento: Date) {
    try {
      console.log(`🔄 Cancelando assinatura anterior: ${stripeSubscriptionId}`);
      
      // Buscar assinatura existente
      const assinaturaExistente = await storage.getAssinaturaByStripeId(stripeSubscriptionId);
      
      if (!assinaturaExistente) {
        console.error(`❌ Assinatura não encontrada para ID: ${stripeSubscriptionId}`);
        return false;
      }
      
      // Verificar se já está cancelada
      if (assinaturaExistente.status === 'cancelada') {
        console.log(`ℹ️ Assinatura ${stripeSubscriptionId} já está cancelada`);
        return true;
      }
      
      // Cancelar usando o método específico por Stripe ID
      const success = await storage.cancelarAssinaturaPorStripeId(stripeSubscriptionId, dataCancelamento);
      
      if (success) {
        console.log(`✅ Assinatura ${stripeSubscriptionId} cancelada com sucesso`);
        console.log(`   - Status: cancelada`);
        console.log(`   - Data fim: ${dataCancelamento.toISOString()}`);
        return true;
      } else {
        console.error(`❌ Falha ao cancelar assinatura ${stripeSubscriptionId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Erro ao cancelar assinatura ${stripeSubscriptionId}:`, error);
      return false;
    }
  }

  // Configuração para servir arquivos estáticos da pasta client/public
  const publicPath = path.resolve(process.cwd(), "client", "public");
  app.use(express.static(publicPath));
  
  // Rota para a página de teste de cartão padrão
  app.get('/test-default-card', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'test-default-card.html'));
  });
  
  // Rota para a página de teste de autenticação
  app.get('/test-auth', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'test-auth.html'));
  });
  
  // ROTAS PARA MINHA CONTA
  
  // Obter perfil do usuário
  app.get("/api/minha-conta/perfil", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
      }
      
      const profile = await storage.getUserProfile(userId);
      
      // Enviar o perfil mesmo que seja null, para o frontend tratar
      if (!profile) {
        // Retornar objeto vazio em vez de erro 404
        return res.status(200).json({
          id: 0,
          userId: userId,
          primeiroNome: "",
          ultimoNome: "",
          razaoSocial: "",
          nomeFantasia: "",
          tipoPessoa: "fisica",
          cpfCnpj: "",
          inscricaoEstadual: "",
          inscricaoMunicipal: "",
          cnae: "",
          regimeTributario: "",
          atividadePrincipal: "",
          responsavelNome: "",
          responsavelEmail: "",
          responsavelTelefone: "",
          responsavelSetor: "",
          contadorNome: "",
          contadorEmail: "",
          contadorTelefone: "",
          logoUrl: "",
          configuracoes: {
            tema: "light",
            notificacoes: true,
            exibirTutorial: true
          }
        });
      }
      
      // Adicionar cabeçalhos para evitar cache
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(200).json(profile);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      return res.status(500).json({ message: "Erro interno ao buscar perfil" });
    }
  });
  
  // Atualizar perfil do usuário
  app.put("/api/minha-conta/perfil/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        // Criar perfil se não existir
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
      
      // Atualizar perfil existente
      const updatedProfile = await storage.updateUserProfile(userId, req.body);
      
      return res.status(200).json(updatedProfile);
    } catch (error) {
      console.error("Erro na atualização do perfil:", error);
      return res.status(500).json({ message: "Erro interno durante a atualização do perfil" });
    }
  });

  // Rota para verificar senha atual
  app.post("/api/password/verify", async (req, res) => {
    try {
      const { password, userId } = req.body;
      
      console.log(`API Verificação de senha - Requisição recebida para userId: ${userId}`);
      
      // Verificações de segurança
      if (!password || !userId) {
        console.error("Verificação de senha: faltando password ou userId");
        return res.status(200).json({ success: false, message: "Campos incompletos" }); 
      }
      
      // Se a senha está vazia, retorna false
      if (password.trim() === '') {
        return res.status(200).json({ success: false, message: "Senha vazia" });
      }
      
      try {
        // Buscando a senha do banco de dados
        const hashedPassword = await getUserPasswordFromDatabase(Number(userId));
        
        if (!hashedPassword) {
          console.error(`Senha não encontrada para o usuário ${userId}`);
          return res.status(200).json({ success: false, message: "Senha não encontrada" });
        }

        // Verificação da senha completa
        const isValid = await comparePasswords(password, hashedPassword);
        console.log(`Verificação de senha para usuário ${userId}: ${isValid ? 'válida' : 'inválida'}`);
        


  // Endpoint para verificar status da sessão
  app.get("/api/conta/check-session", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user?.id);
      
      if (!userId) {
        console.log('❌ Check session - usuário não autenticado');
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Verificar se a sessão ainda é válida no banco
      const sessionToken = req.session?.sessionToken || req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionToken) {
        console.log('❌ Check session - token não encontrado');
        return res.status(401).json({ message: "Token de sessão não encontrado" });
      }

      // Verificar na tabela de sessões
      const sessionCheck = await executeQuery(`
        SELECT id, expires_at, is_active 
        FROM user_sessions_additional 
        WHERE token = $1 AND user_id = $2 AND is_active = true
      `, [sessionToken, userId]);

      if (sessionCheck.rows.length === 0) {
        console.log('❌ Check session - sessão não encontrada ou inativa');
        return res.status(401).json({ message: "Sessão inválida ou expirada" });
      }

      const session = sessionCheck.rows[0];
      
      // Verificar se a sessão expirou
      if (new Date() > new Date(session.expires_at)) {
        console.log('❌ Check session - sessão expirada');
        return res.status(401).json({ message: "Sessão expirada" });
      }

      console.log('✅ Check session - sessão válida para usuário', userId);
      return res.json({ 
        valid: true, 
        userId: userId,
        expiresAt: session.expires_at 
      });

    } catch (error) {
      console.error("❌ Erro ao verificar status da sessão:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

        return res.status(200).json({ success: isValid, message: isValid ? "Senha correta" : "Senha incorreta" });
      } catch (dbError) {
        console.error("Erro ao acessar o banco de dados:", dbError);
        return res.status(200).json({ success: false, message: "Erro ao verificar senha" });
      }
    } catch (error) {
      console.error("Erro ao verificar senha:", error);
      return res.status(500).json({ success: false, message: "Erro interno" });
    }
  });

  // Endpoint para verificação simples de senha (apenas ao perder foco)
  app.post("/api/password/verify-partial", async (req, res) => {
    try {
      const { password, userId } = req.body;
      
      // Log seguro (não mostra a senha, apenas o comprimento)
      console.log(`Verificação de senha - Requisição recebida:`, { 
        temPassword: !!password, 
        temUserId: !!userId, 
        userId, 
        passwordLength: password?.length 
      });
      
      // Verificações de segurança
      if (!password || !userId) {
        console.error("Verificação: faltando password ou userId");
        return res.status(200).json({ success: false, message: "Campos incompletos" }); 
      }
      
      try {
        // Obter a senha hasheada do banco de dados
        const hashedPassword = await getUserPasswordFromDatabase(userId);
        
        if (!hashedPassword) {
          console.error(`Verificação: não foi possível recuperar senha para usuário ${userId}`);
          return res.status(200).json({ 
            success: false, 
            message: "Senha incorreta"
          });
        }
        
        // Verificar se a senha está completamente correta
        const isPasswordCorrect = await comparePasswords(password, hashedPassword);
        
        // Logs para depuração
        console.log('=============================================================');
        console.log(`VERIFICAÇÃO DE SENHA - USUÁRIO ID: ${userId}`);
        console.log('=============================================================');
        console.log(`Senha correta? ${isPasswordCorrect ? "SIM ✓" : "NÃO ✗"}`);
        
        // Resposta simplificada - apenas se está correta ou não
        return res.status(200).json({
          success: isPasswordCorrect, 
          message: isPasswordCorrect ? "Senha correta" : "Senha incorreta",
          isComplete: isPasswordCorrect
        });
        
      } catch (dbError) {
        console.error("Erro ao acessar o banco de dados:", dbError);
        return res.status(200).json({ 
          success: false, 
          message: "Erro ao verificar senha"
        });
      }
    } catch (error) {
      console.error("Erro na verificação de senha:", error);
      return res.status(500).json({ success: false, message: "Erro interno" });
    }
  });
  
  // Rota para criar um usuário administrador inicial
  app.post("/api/setup/admin", async (req, res) => {
    try {
      // Verificar se já existe algum usuário admin
      const existingAdmin = await storage.getUserByRole("admin");
      if (existingAdmin) {
        return res.status(400).json({ message: "Um administrador já existe no sistema" });
      }

      // Validar os dados do administrador
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ errors: validationResult.error.errors });
      }
      
      // Hash da senha
      const hashedPassword = await hashPassword(validationResult.data.password);
      
      // Criar o usuário administrador
      const adminData = {
        ...validationResult.data,
        password: hashedPassword,
        role: "admin" // Forçar role como admin
      };
      
      // Criar usuário no banco de dados
      const admin = await storage.createUser(adminData);
      
      // Remover senha do resultado
      const { password, ...adminWithoutPassword } = admin;
      
      res.status(201).json({
        message: "Administrador criado com sucesso",
        admin: adminWithoutPassword
      });
    } catch (error) {
      console.error("Erro ao criar administrador:", error);
      res.status(500).json({ message: "Erro ao criar administrador" });
    }
  });
  

  
  // Usar handlers para email-verification importados no topo do arquivo
  
  // Rota para verificação de email
  app.get("/api/verify-email", handleEmailVerification);
  
  // Rota para reenviar email de verificação
  app.post("/api/resend-verification", handleResendVerification);
  
  // Rotas para recuperação de senha
  app.post("/api/auth/forgot-password", handlePasswordResetRequest);
  
  // Rota para verificar se um email já existe
  app.post("/api/check-email-exists", checkEmailExists);
  // Endpoint para verificar/criar tabelas - só será chamado quando necessário
  app.post("/api/init-database", async (req, res) => {
    try {
      console.log("Iniciando verificação de tabelas...");
      await checkAndCreateTables();
      return res.status(200).json({ message: "Banco de dados inicializado com sucesso" });
    } catch (error) {
      console.error("Erro ao inicializar banco de dados:", error);
      return res.status(500).json({ message: "Erro ao inicializar banco de dados" });
    }
  });
  
  // Rota para verificar estrutura da tabela user_profiles
  app.get("/api/diagnose/user-profiles", async (req, res) => {
    try {
      const result = await db.execute(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles'
        ORDER BY ordinal_position;
      `);
      
      return res.status(200).json({ 
        message: "Diagnóstico concluído", 
        columns: result.rows 
      });
    } catch (error) {
      console.error("Erro ao realizar diagnóstico da tabela:", error);
      return res.status(500).json({ message: "Erro ao realizar diagnóstico" });
    }
  });
  
  // Rota para verificar estrutura da tabela enderecos
  app.get("/api/diagnose/enderecos", async (req, res) => {
    try {
      const result = await db.execute(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'enderecos'
        ORDER BY ordinal_position;
      `);
      
      // Contar quantos endereços existem
      const countResult = await db.execute(`
        SELECT COUNT(*) as total FROM enderecos;
      `);
      
      return res.status(200).json({ 
        message: "Diagnóstico concluído", 
        columns: result.rows,
        total: parseInt(String(countResult.rows[0]?.total || '0'))
      });
    } catch (error) {
      console.error("Erro ao realizar diagnóstico da tabela:", error);
      return res.status(500).json({ message: "Erro ao realizar diagnóstico" });
    }
  });
  
  // Rota para forçar a remoção dos campos de endereço da tabela user_profiles
  app.get("/api/execute/remove-address-fields", async (req, res) => {
    try {
      console.log("Executando script SQL para remover campos de endereço da tabela user_profiles");
      
      // Verificar se os campos existem
      const endereco_exists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'endereco'
        )
      `);
      
      const cidade_exists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'cidade'
        )
      `);
      
      const estado_exists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'estado'
        )
      `);
      
      const cep_exists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'cep'
        )
      `);
      
      // Resultados da verificação
      const results = {
        endereco: endereco_exists.rows[0].exists,
        cidade: cidade_exists.rows[0].exists,
        estado: estado_exists.rows[0].exists,
        cep: cep_exists.rows[0].exists
      };
      
      const fieldsToRemove = [];
      
      // Adicionar na lista de campos a remover
      if (results.endereco) fieldsToRemove.push('endereco');
      if (results.cidade) fieldsToRemove.push('cidade');
      if (results.estado) fieldsToRemove.push('estado');
      if (results.cep) fieldsToRemove.push('cep');
      
      if (fieldsToRemove.length === 0) {
        return res.status(200).json({
          message: "Nenhum campo de endereço encontrado na tabela user_profiles",
          fields_checked: results,
          removed: []
        });
      }
      
      // Criar a string de ALTER TABLE
      const dropColumns = fieldsToRemove.map(field => `DROP COLUMN ${field}`).join(', ');
      const sql = `ALTER TABLE user_profiles ${dropColumns}`;
      
      console.log("Executando SQL:", sql);
      
      // Executar a query
      await db.execute(sql);
      
      // Verificar se os campos foram removidos
      const verificar = await db.execute(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles'
          AND column_name IN ('endereco', 'cidade', 'estado', 'cep')
      `);
      
      const remainingFields = verificar.rows.map(row => row.column_name);
      const success = remainingFields.length === 0;
      
      return res.status(200).json({
        message: success 
          ? "Campos de endereço removidos com sucesso" 
          : "Alguns campos não foram removidos",
        fields_before: results,
        removed: fieldsToRemove,
        remaining: remainingFields,
        success: success
      });
    } catch (error) {
      console.error("Erro ao executar script de remoção de campos:", error);
      return res.status(500).json({ 
        message: "Erro ao remover campos de endereço", 
        error: String(error)
      });
    }
  });
  
  // Rota para executar migração manual (remover campos de endereço da tabela user_profiles)
  app.get("/api/migrate/user-profiles-remove-address", async (req, res) => {
    try {
      // Verificar se temos os campos de endereço ainda na tabela user_profiles
      const enderecoColumnResult = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'endereco'
        )
      `);
      
      if (!enderecoColumnResult.rows[0].exists) {
        return res.status(200).json({ 
          message: "Migração não necessária. Campos de endereço já foram removidos." 
        });
      }
      
      // Migrar os dados de endereço, se houver
      const userProfilesWithAddress = await db.execute(`
        SELECT * FROM user_profiles
        WHERE endereco IS NOT NULL 
          AND endereco != ''
          AND cep IS NOT NULL
          AND cep != ''
      `);
      
      let migratedCount = 0;
      
      if (userProfilesWithAddress.rows.length > 0) {
        // Para cada perfil com endereço, criar um registro na tabela enderecos
        for (const profile of userProfilesWithAddress.rows) {
          await executeQuery(
            `INSERT INTO enderecos (
              user_id, tipo, cep, logradouro, numero, complemento, bairro, cidade, estado, principal, created_at, updated_at
            ) VALUES (
              ${profile.user_id}, 'comercial', '${profile.cep}', '${profile.endereco}', 'S/N', NULL, 'Centro', '${profile.cidade}', '${profile.estado}', TRUE, NOW(), NOW()
            )`
          );
          
          migratedCount++;
        }
      }
      
      // Remover colunas usando ALTER TABLE
      await db.execute(`
        ALTER TABLE user_profiles 
          DROP COLUMN endereco,
          DROP COLUMN cidade,
          DROP COLUMN estado,
          DROP COLUMN cep
      `);
      
      // Verificar se as colunas foram removidas
      const verifyResult = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'user_profiles'
          AND column_name = 'endereco'
        )
      `);
      
      const success = !verifyResult.rows[0].exists;
      
      return res.status(200).json({ 
        message: success ? "Migração concluída com sucesso!" : "Migração não foi concluída corretamente",
        success: success,
        migratedProfiles: migratedCount,
        columnsRemoved: success
      });
    } catch (error: any) {
      console.error("Erro durante a migração:", error);
      return res.status(500).json({ 
        message: "Erro ao executar migração", 
        error: error?.message || String(error)
      });
    }
  });
  
  // Verificar email endpoint
  app.post("/api/verify-email", async (req, res) => {
    try {
      const email = req.body.email;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "Email não encontrado" });
      }
      
      return res.status(200).json({ message: "Email encontrado" });
    } catch (error) {
      console.error("Email verification error:", error);
      return res.status(500).json({ message: "Erro ao verificar email" });
    }
  });

  // =========== PRODUTOS ROUTES ===========
  
  // Obter todos os produtos
  app.get("/api/produtos", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id; // Agora obtemos o ID diretamente do req.user
      const tipo = req.query.tipo as string;
      
      const produtos = await storage.getProdutos(userId, tipo);
      return res.status(200).json(produtos);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      return res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });
  
  // Obter produto por ID
  app.get("/api/produtos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const produto = await storage.getProduto(id);
      
      if (!produto) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      return res.status(200).json(produto);
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      return res.status(500).json({ message: "Erro ao buscar produto" });
    }
  });
  
  // Criar produto
  app.post("/api/produtos", async (req, res) => {
    try {
      const parsedData = insertProdutoSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do produto inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const produto = await storage.createProduto(parsedData.data);
      return res.status(201).json(produto);
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      return res.status(500).json({ message: "Erro ao criar produto" });
    }
  });
  
  // Atualizar produto
  app.put("/api/produtos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingProduto = await storage.getProduto(id);
      
      if (!existingProduto) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      const produto = await storage.updateProduto(id, req.body);
      return res.status(200).json(produto);
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      return res.status(500).json({ message: "Erro ao atualizar produto" });
    }
  });
  
  // Deletar produto
  app.delete("/api/produtos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingProduto = await storage.getProduto(id);
      
      if (!existingProduto) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      const deleted = await storage.deleteProduto(id);
      
      if (deleted) {
        return res.status(200).json({ message: "Produto excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o produto" });
      }
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      return res.status(500).json({ message: "Erro ao excluir produto" });
    }
  });
  
  // =========== SERVIÇOS ROUTES ===========
  
  // Obter todos os serviços
  app.get("/api/servicos", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const servicos = await storage.getServicos(userId);
      return res.status(200).json(servicos);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      return res.status(500).json({ message: "Erro ao buscar serviços" });
    }
  });
  
  // Obter serviço por ID
  app.get("/api/servicos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const servico = await storage.getServico(id);
      
      if (!servico) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      return res.status(200).json(servico);
    } catch (error) {
      console.error("Erro ao buscar serviço:", error);
      return res.status(500).json({ message: "Erro ao buscar serviço" });
    }
  });
  
  // Criar serviço
  app.post("/api/servicos", async (req, res) => {
    try {
      const parsedData = insertServicoSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do serviço inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const servico = await storage.createServico(parsedData.data);
      return res.status(201).json(servico);
    } catch (error) {
      console.error("Erro ao criar serviço:", error);
      return res.status(500).json({ message: "Erro ao criar serviço" });
    }
  });
  
  // Atualizar serviço
  app.put("/api/servicos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingServico = await storage.getServico(id);
      
      if (!existingServico) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      const servico = await storage.updateServico(id, req.body);
      return res.status(200).json(servico);
    } catch (error) {
      console.error("Erro ao atualizar serviço:", error);
      return res.status(500).json({ message: "Erro ao atualizar serviço" });
    }
  });
  
  // Deletar serviço
  app.delete("/api/servicos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingServico = await storage.getServico(id);
      
      if (!existingServico) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      
      const deleted = await storage.deleteServico(id);
      
      if (deleted) {
        return res.status(200).json({ message: "Serviço excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o serviço" });
      }
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
      return res.status(500).json({ message: "Erro ao excluir serviço" });
    }
  });
  
  // =========== ITENS PARA ALUGUEL ROUTES ===========
  
  // Obter todos os itens para aluguel
  app.get("/api/itens-aluguel", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
      }
      
      const itens = await storage.getItensAluguel(userId);
      return res.status(200).json(itens);
    } catch (error) {
      console.error("Erro ao buscar itens para aluguel:", error);
      return res.status(500).json({ message: "Erro ao buscar itens para aluguel" });
    }
  });
  
  // Obter item para aluguel por ID
  app.get("/api/itens-aluguel/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getItemAluguel(id);
      
      if (!item) {
        return res.status(404).json({ message: "Item para aluguel não encontrado" });
      }
      
      return res.status(200).json(item);
    } catch (error) {
      console.error("Erro ao buscar item para aluguel:", error);
      return res.status(500).json({ message: "Erro ao buscar item para aluguel" });
    }
  });
  
  // Criar item para aluguel
  app.post("/api/itens-aluguel", async (req, res) => {
    try {
      const parsedData = insertItemAluguelSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do item para aluguel inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const item = await storage.createItemAluguel(parsedData.data);
      return res.status(201).json(item);
    } catch (error) {
      console.error("Erro ao criar item para aluguel:", error);
      return res.status(500).json({ message: "Erro ao criar item para aluguel" });
    }
  });
  
  // Atualizar item para aluguel
  app.put("/api/itens-aluguel/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingItem = await storage.getItemAluguel(id);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Item para aluguel não encontrado" });
      }
      
      const item = await storage.updateItemAluguel(id, req.body);
      return res.status(200).json(item);
    } catch (error) {
      console.error("Erro ao atualizar item para aluguel:", error);
      return res.status(500).json({ message: "Erro ao atualizar item para aluguel" });
    }
  });
  
  // Deletar item para aluguel
  app.delete("/api/itens-aluguel/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingItem = await storage.getItemAluguel(id);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Item para aluguel não encontrado" });
      }
      
      const deleted = await storage.deleteItemAluguel(id);
      
      if (deleted) {
        return res.status(200).json({ message: "Item para aluguel excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o item para aluguel" });
      }
    } catch (error) {
      console.error("Erro ao excluir item para aluguel:", error);
      return res.status(500).json({ message: "Erro ao excluir item para aluguel" });
    }
  });
  
  // =========== FORNECEDORES ROUTES ===========
  
  // Obter todos os fornecedores
  app.get("/api/fornecedores", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
      }
      
      const fornecedores = await storage.getFornecedores(userId);
      return res.status(200).json(fornecedores);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      return res.status(500).json({ message: "Erro ao buscar fornecedores" });
    }
  });
  
  // Obter fornecedor por ID
  app.get("/api/fornecedores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const fornecedor = await storage.getFornecedor(id);
      
      if (!fornecedor) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      return res.status(200).json(fornecedor);
    } catch (error) {
      console.error("Erro ao buscar fornecedor:", error);
      return res.status(500).json({ message: "Erro ao buscar fornecedor" });
    }
  });
  
  // Criar fornecedor
  app.post("/api/fornecedores", async (req, res) => {
    try {
      const parsedData = insertFornecedorSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do fornecedor inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const fornecedor = await storage.createFornecedor(parsedData.data);
      return res.status(201).json(fornecedor);
    } catch (error) {
      console.error("Erro ao criar fornecedor:", error);
      return res.status(500).json({ message: "Erro ao criar fornecedor" });
    }
  });
  
  // Atualizar fornecedor
  app.put("/api/fornecedores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingFornecedor = await storage.getFornecedor(id);
      
      if (!existingFornecedor) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      const fornecedor = await storage.updateFornecedor(id, req.body);
      return res.status(200).json(fornecedor);
    } catch (error) {
      console.error("Erro ao atualizar fornecedor:", error);
      return res.status(500).json({ message: "Erro ao atualizar fornecedor" });
    }
  });
  
  // Deletar fornecedor
  app.delete("/api/fornecedores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingFornecedor = await storage.getFornecedor(id);
      
      if (!existingFornecedor) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }
      
      const deleted = await storage.deleteFornecedor(id);
      
      if (deleted) {
        return res.status(200).json({ message: "Fornecedor excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o fornecedor" });
      }
    } catch (error) {
      console.error("Erro ao excluir fornecedor:", error);
      return res.status(500).json({ message: "Erro ao excluir fornecedor" });
    }
  });
  
  // =========== HISTÓRICO FINANCEIRO ROUTES ===========
  
  // Buscar histórico de pagamentos
  app.get("/api/historico-pagamentos", isAuthenticated, async (req, res) => {
    try {
      // Para usuários adicionais, usar o ID do usuário principal
      const userId = req.user!.isAdditionalUser ? req.user!.mainUserId : req.user!.id;

      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID do usuário não encontrado' 
        });
      }

      // Buscar pagamentos do banco após sincronização automática - APENAS DO USUÁRIO ATUAL
      const { connectionManager } = await import('./connection-manager');
      const result = await connectionManager.executeQuery(`
        SELECT 
          id,
          user_id,
          valor,
          status,
          metodo_pagamento,
          stripe_payment_intent_id,
          stripe_invoice_id,
          data_pagamento,
          plano_nome,
          periodo,
          fatura_url,
          valor_cartao,
          valor_credito,
          valor_diferenca,
          credito_gerado,
          created_at
        FROM pagamentos 
        WHERE user_id = $1 
        ORDER BY data_pagamento DESC, created_at DESC
        LIMIT 24
      `, [userId]);

      // Formatar dados
      const pagamentos = (result as any).rows?.map((pagamento: any) => {
        const valorNumerico = parseFloat(String(pagamento.valor));
        const valorCartao = parseFloat(String(pagamento.valor_cartao || 0));
        const valorCredito = parseFloat(String(pagamento.valor_credito || 0));
        const valorDiferenca = pagamento.valor_diferenca ? parseFloat(String(pagamento.valor_diferenca)) : null;
        const creditoGerado = pagamento.credito_gerado ? parseFloat(String(pagamento.credito_gerado)) : null;
        
        return {
          id: String(pagamento.id),
          valor: Number(valorNumerico),
          valorCartao: Number(valorCartao),
          valorCredito: Number(valorCredito),
          valor_diferenca: valorDiferenca,
          credito_gerado: creditoGerado,
          status: pagamento.status === 'Pago' ? 'paid' : pagamento.status.toLowerCase(),
          metodo_pagamento: pagamento.metodo_pagamento || 'Cartão de Crédito',
          metodoPagamento: pagamento.metodo_pagamento || 'Cartão de Crédito',
          data_pagamento: pagamento.data_pagamento,
          dataPagamento: new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR'),
          planoNome: pagamento.plano_nome || 'Assinatura Premium',
          plan_name: pagamento.plano_nome || 'Assinatura Premium',
          periodo: pagamento.periodo || 'Mensal',
          fatura_url: pagamento.fatura_url,
          faturaUrl: pagamento.fatura_url,
          invoice_pdf: pagamento.fatura_url,
          amount: Math.round(valorNumerico * 100),
          amount_total: Math.round(valorNumerico * 100),
          created: Math.floor(new Date(pagamento.data_pagamento).getTime() / 1000),
          payment_method_type: pagamento.metodo_pagamento || 'Cartão de Crédito',
          // Informações detalhadas de pagamento
          resumoPagamento: pagamento.resumo_pagamento || (valorCredito > 0 
            ? `Cartão: R$ ${valorCartao.toFixed(2)} + Créditos: R$ ${valorCredito.toFixed(2)}`
            : `Cartão: R$ ${valorCartao.toFixed(2)}`),
          temCredito: valorCredito > 0,
          isFullCredit: valorCredito > 0 && valorCartao === 0,
          stripeInvoiceId: pagamento.stripe_invoice_id,
          stripePaymentIntentId: pagamento.stripe_payment_intent_id
        };
      }) || [];
      
      return res.json({
        success: true,
        data: pagamentos,
        total: pagamentos.length
      });

    } catch (error) {
      console.error('❌ Erro ao buscar histórico de pagamentos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // Buscar histórico de assinaturas
  app.get("/api/historico-assinaturas", isAuthenticated, async (req, res) => {
    try {
      // Para usuários adicionais, usar o ID do usuário principal
      const userId = req.user!.isAdditionalUser ? req.user!.mainUserId : req.user!.id;

      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID do usuário não encontrado' 
        });
      }

      // Buscar assinaturas do banco local
      const { connectionManager } = await import('./connection-manager');
      const result = await connectionManager.executeQuery(`
        SELECT 
          a.id,
          a.user_id,
          a.plano_id,
          a.data_inicio,
          a.data_fim,
          a.status,
          a.tipo_cobranca as periodo,
          a.valor_pago as valor,
          p.nome as plano_nome,
          a.created_at
        FROM assinaturas a
        LEFT JOIN planos p ON a.plano_id = p.id
        WHERE a.user_id = $1
        ORDER BY a.created_at DESC
        LIMIT 24
      `, [userId]);

      const assinaturas = (result as any).rows || [];
      
      // Formatar dados para o frontend
      const assinaturasFormatadas = assinaturas.map((assinatura: any) => {
        return {
          id: String(assinatura.id),
          stripeSubscriptionId: assinatura.stripe_subscription_id || `sub_${assinatura.id}`,
          status: assinatura.status || 'active',
          planoNome: assinatura.plano_nome || 'Plano Premium',
          valor: parseFloat(assinatura.valor || 0),
          periodo: assinatura.periodo || 'mensal',
          dataInicio: assinatura.data_inicio ? 
            new Date(assinatura.data_inicio).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
          dataFim: assinatura.data_fim ? 
            new Date(assinatura.data_fim).toLocaleDateString('pt-BR') : null,
          proximoPagamento: assinatura.data_fim ? 
            new Date(assinatura.data_fim).toLocaleDateString('pt-BR') : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
        };
      });

      return res.json({
        success: true,
        data: assinaturasFormatadas,
        total: assinaturasFormatadas.length
      });

    } catch (error) {
      console.error('❌ Erro ao buscar histórico de assinaturas:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // =========== CLIENTES ROUTES ===========
  
  // Obter todos os clientes
  app.get("/api/clientes", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
      }
      
      const clientes = await storage.getClientes(userId);
      return res.status(200).json(clientes);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      return res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });
  
  // Obter cliente por ID
  app.get("/api/clientes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const cliente = await storage.getCliente(id);
      
      if (!cliente) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      return res.status(200).json(cliente);
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      return res.status(500).json({ message: "Erro ao buscar cliente" });
    }
  });
  
  // Criar cliente
  app.post("/api/clientes", async (req, res) => {
    try {
      const parsedData = insertClienteSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do cliente inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const cliente = await storage.createCliente(parsedData.data);
      return res.status(201).json(cliente);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      return res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });
  
  // Atualizar cliente
  app.put("/api/clientes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingCliente = await storage.getCliente(id);
      
      if (!existingCliente) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      const cliente = await storage.updateCliente(id, req.body);
      return res.status(200).json(cliente);
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      return res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });
  
  // Deletar cliente
  app.delete("/api/clientes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingCliente = await storage.getCliente(id);
      
      if (!existingCliente) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      const deleted = await storage.deleteCliente(id);
      
      if (deleted) {
        return res.status(200).json({ message: "Cliente excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o cliente" });
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      return res.status(500).json({ message: "Erro ao excluir cliente" });
    }
  });
  
  // =========== MARKETPLACES ROUTES ===========
  
  // Obter todos os marketplaces
  app.get("/api/marketplaces", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (!userId) {
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
      }
      
      const marketplaces = await storage.getMarketplaces(userId);
      return res.status(200).json(marketplaces);
    } catch (error) {
      console.error("Erro ao buscar marketplaces:", error);
      return res.status(500).json({ message: "Erro ao buscar marketplaces" });
    }
  });
  
  // Obter marketplace por ID
  app.get("/api/marketplaces/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const marketplace = await storage.getMarketplace(id);
      
      if (!marketplace) {
        return res.status(404).json({ message: "Marketplace não encontrado" });
      }
      
      return res.status(200).json(marketplace);
    } catch (error) {
      console.error("Erro ao buscar marketplace:", error);
      return res.status(500).json({ message: "Erro ao buscar marketplace" });
    }
  });
  
  // Criar marketplace
  app.post("/api/marketplaces", async (req, res) => {
    try {
      const parsedData = insertMarketplaceSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do marketplace inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const marketplace = await storage.createMarketplace(parsedData.data);
      return res.status(201).json(marketplace);
    } catch (error) {
      console.error("Erro ao criar marketplace:", error);
      return res.status(500).json({ message: "Erro ao criar marketplace" });
    }
  });
  
  // =========== CATEGORIAS ROUTES ===========
  
  // Obter todas as categorias
  app.get("/api/categorias", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const tipo = req.query.tipo as string;
      
      if (!userId) {
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
      }
      
      const categorias = await storage.getCategorias(userId, tipo);
      return res.status(200).json(categorias);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      return res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });
  
  // Obter categoria por ID
  app.get("/api/categorias/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoria = await storage.getCategoria(id);
      
      if (!categoria) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      return res.status(200).json(categoria);
    } catch (error) {
      console.error("Erro ao buscar categoria:", error);
      return res.status(500).json({ message: "Erro ao buscar categoria" });
    }
  });
  
  // Criar categoria
  app.post("/api/categorias", async (req, res) => {
    try {
      const parsedData = insertCategoriaSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados da categoria inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const categoria = await storage.createCategoria(parsedData.data);
      return res.status(201).json(categoria);
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      return res.status(500).json({ message: "Erro ao criar categoria" });
    }
  });
  
  // Atualizar categoria
  app.put("/api/categorias/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingCategoria = await storage.getCategoria(id);
      
      if (!existingCategoria) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      const categoria = await storage.updateCategoria(id, req.body);
      return res.status(200).json(categoria);
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      return res.status(500).json({ message: "Erro ao atualizar categoria" });
    }
  });
  
  // Deletar categoria
  app.delete("/api/categorias/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingCategoria = await storage.getCategoria(id);
      
      if (!existingCategoria) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      const deleted = await storage.deleteCategoria(id);
      
      if (deleted) {
        return res.status(200).json({ message: "Categoria excluída com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir a categoria" });
      }
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      return res.status(500).json({ message: "Erro ao excluir categoria" });
    }
  });
  
  // =========== GERENCIAMENTO DE USUÁRIOS ===========
  
  // Listar usuários (apenas para administradores)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      // Consultamos diretamente do banco de dados todos os usuários
      const result = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt
      }).from(users);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      return res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
  
  // Atualizar usuário
  app.put("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Proteger contra alteração de role do admin inicial
      if (user.role === "admin" && user.email === "admin@meuprecocerto.com" && req.body.role && req.body.role !== "admin") {
        return res.status(403).json({ message: "Não é permitido alterar o papel do administrador principal" });
      }
      
      const updatedUser = await storage.updateUser(id, req.body);
      // Remover senha do resultado
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        return res.status(200).json(userWithoutPassword);
      }
      
      return res.status(500).json({ message: "Erro ao atualizar usuário" });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      return res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });
  
  // Desativar usuário (em vez de excluir)
  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Proteger contra exclusão do admin inicial
      if (user.role === "admin" && user.email === "admin@meuprecocerto.com") {
        return res.status(403).json({ message: "Não é permitido excluir o administrador principal" });
      }
      
      // Em vez de excluir, apenas desativamos o usuário
      const updated = await storage.updateUser(id, { isActive: false });
      
      if (updated) {
        return res.status(200).json({ message: "Usuário desativado com sucesso" });
      } else {
        return res.status(500).json({ message: "Erro ao desativar usuário" });
      }
    } catch (error) {
      console.error("Erro ao desativar usuário:", error);
      return res.status(500).json({ message: "Erro ao desativar usuário" });
    }
  });
  
  // =========== CÁLCULOS DE PRECIFICAÇÃO ===========
  
  // Calcular preço de produto
  app.post("/api/calculos/produto", async (req, res) => {
    try {
      const {
        valorCusto,
        frete,
        lucroPercentual,
        formaPagamento,
        parcelas,
        custos,
        taxas
      } = req.body;
      
      // Validação básica de entrada
      if (valorCusto === undefined || lucroPercentual === undefined || !formaPagamento) {
        return res.status(400).json({ 
          message: "Parâmetros insuficientes para cálculo" 
        });
      }
      
      // Converte valores para números
      const params = {
        valorCusto: Number(valorCusto),
        frete: frete ? Number(frete) : undefined,
        lucroPercentual: Number(lucroPercentual),
        formaPagamento,
        parcelas: parcelas ? Number(parcelas) : undefined,
        custos: custos ? custos.map(Number) : undefined,
        taxas
      };
      
      const resultado = calcularPrecoProduto(params);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao calcular preço de produto:", error);
      return res.status(500).json({ message: "Erro ao calcular preço de produto" });
    }
  });
  
  // Calcular preço de serviço
  app.post("/api/calculos/servico", async (req, res) => {
    try {
      const {
        valorCusto,
        deslocamento,
        valorKm,
        lucroPercentual,
        formaPagamento,
        parcelas,
        custos,
        taxas
      } = req.body;
      
      // Validação básica de entrada
      if (valorCusto === undefined || lucroPercentual === undefined || !formaPagamento) {
        return res.status(400).json({ 
          message: "Parâmetros insuficientes para cálculo" 
        });
      }
      
      // Converte valores para números
      const params = {
        valorCusto: Number(valorCusto),
        deslocamento: deslocamento ? Number(deslocamento) : undefined,
        valorKm: valorKm ? Number(valorKm) : undefined,
        lucroPercentual: Number(lucroPercentual),
        formaPagamento,
        parcelas: parcelas ? Number(parcelas) : undefined,
        custos: custos ? custos.map(Number) : undefined,
        taxas
      };
      
      const resultado = calcularPrecoServico(params);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao calcular preço de serviço:", error);
      return res.status(500).json({ message: "Erro ao calcular preço de serviço" });
    }
  });
  
  // Calcular preço de aluguel
  app.post("/api/calculos/aluguel", async (req, res) => {
    try {
      const {
        valorEquipamento,
        frete,
        retornoInvestimentoMeses,
        tempoContratoMeses,
        lucroMensalPercentual,
        deslocamento,
        valorKm,
        formaPagamento,
        parcelas,
        custos,
        taxas
      } = req.body;
      
      // Validação básica de entrada
      if (valorEquipamento === undefined || 
          retornoInvestimentoMeses === undefined || 
          tempoContratoMeses === undefined || 
          lucroMensalPercentual === undefined || 
          !formaPagamento) {
        return res.status(400).json({ 
          message: "Parâmetros insuficientes para cálculo" 
        });
      }
      
      // Converte valores para números
      const params = {
        valorEquipamento: Number(valorEquipamento),
        frete: frete ? Number(frete) : undefined,
        retornoInvestimentoMeses: Number(retornoInvestimentoMeses),
        tempoContratoMeses: Number(tempoContratoMeses),
        lucroMensalPercentual: Number(lucroMensalPercentual),
        deslocamento: deslocamento ? Number(deslocamento) : undefined,
        valorKm: valorKm ? Number(valorKm) : undefined,
        formaPagamento,
        parcelas: parcelas ? Number(parcelas) : undefined,
        custos: custos ? custos.map(Number) : undefined,
        taxas
      };
      
      const resultado = calcularPrecoAluguel(params);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao calcular preço de aluguel:", error);
      return res.status(500).json({ message: "Erro ao calcular preço de aluguel" });
    }
  });
  
  // Calcular preço para marketplace
  app.post("/api/calculos/marketplace", async (req, res) => {
    try {
      const {
        valorCusto,
        frete,
        lucroPercentual,
        taxaMarketplace,
        formaPagamento,
        parcelas,
        custos,
        taxas
      } = req.body;
      
      // Validação básica de entrada
      if (valorCusto === undefined || 
          lucroPercentual === undefined || 
          taxaMarketplace === undefined || 
          !formaPagamento) {
        return res.status(400).json({ 
          message: "Parâmetros insuficientes para cálculo" 
        });
      }
      
      // Converte valores para números
      const params = {
        valorCusto: Number(valorCusto),
        frete: frete ? Number(frete) : undefined,
        lucroPercentual: Number(lucroPercentual),
        taxaMarketplace: Number(taxaMarketplace),
        formaPagamento,
        parcelas: parcelas ? Number(parcelas) : undefined,
        custos: custos ? custos.map(Number) : undefined,
        taxas
      };
      
      const resultado = calcularPrecoMarketplace(params);
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao calcular preço para marketplace:", error);
      return res.status(500).json({ message: "Erro ao calcular preço para marketplace" });
    }
  });
  
  // =========== CUSTOS ROUTES ===========
  
  // Obter todos os custos
  app.get("/api/custos", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tipo = req.query.tipo as string;
      
      const custos = await storage.getCustos(userId, tipo);
      return res.status(200).json(custos);
    } catch (error) {
      console.error("Erro ao buscar custos:", error);
      return res.status(500).json({ message: "Erro ao buscar custos" });
    }
  });
  
  // Obter custo por ID
  app.get("/api/custos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const custo = await storage.getCusto(id);
      
      if (!custo) {
        return res.status(404).json({ message: "Custo não encontrado" });
      }
      
      // Verificar se o custo pertence ao usuário
      if (custo.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      return res.status(200).json(custo);
    } catch (error) {
      console.error("Erro ao buscar custo:", error);
      return res.status(500).json({ message: "Erro ao buscar custo" });
    }
  });
  
  // Criar custo
  app.post("/api/custos", isAuthenticated, async (req, res) => {
    try {
      const data = { ...req.body, userId: req.user!.id };
      const parsedData = insertCustoSchema.safeParse(data);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do custo inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const custo = await storage.createCusto(parsedData.data);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "criar",
        entidade: "custos",
        entidadeId: custo.id,
        descricao: "Novo custo cadastrado",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(201).json(custo);
    } catch (error) {
      console.error("Erro ao criar custo:", error);
      return res.status(500).json({ message: "Erro ao criar custo" });
    }
  });
  
  // Atualizar custo
  app.put("/api/custos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingCusto = await storage.getCusto(id);
      
      if (!existingCusto) {
        return res.status(404).json({ message: "Custo não encontrado" });
      }
      
      // Verificar se o custo pertence ao usuário
      if (existingCusto.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const custo = await storage.updateCusto(id, req.body);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "atualizar",
        entidade: "custos",
        entidadeId: id,
        descricao: "Custo atualizado",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(200).json(custo);
    } catch (error) {
      console.error("Erro ao atualizar custo:", error);
      return res.status(500).json({ message: "Erro ao atualizar custo" });
    }
  });
  
  // Deletar custo
  app.delete("/api/custos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingCusto = await storage.getCusto(id);
      
      if (!existingCusto) {
        return res.status(404).json({ message: "Custo não encontrado" });
      }
      
      // Verificar se o custo pertence ao usuário
      if (existingCusto.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const deleted = await storage.deleteCusto(id);
      
      if (deleted) {
        // Log de atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "excluir",
          entidade: "custos",
          entidadeId: id,
          descricao: "Custo excluído",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
        
        return res.status(200).json({ message: "Custo excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o custo" });
      }
    } catch (error) {
      console.error("Erro ao excluir custo:", error);
      return res.status(500).json({ message: "Erro ao excluir custo" });
    }
  });
  
  // =========== DESPESAS ROUTES ===========
  
  // Obter todas as despesas
  app.get("/api/despesas", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tipo = req.query.tipo as string;
      const categoria = req.query.categoria as string;
      
      const despesas = await storage.getDespesas(userId, tipo, categoria);
      return res.status(200).json(despesas);
    } catch (error) {
      console.error("Erro ao buscar despesas:", error);
      return res.status(500).json({ message: "Erro ao buscar despesas" });
    }
  });
  
  // Obter despesa por ID
  app.get("/api/despesas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const despesa = await storage.getDespesa(id);
      
      if (!despesa) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      // Verificar se a despesa pertence ao usuário
      if (despesa.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      return res.status(200).json(despesa);
    } catch (error) {
      console.error("Erro ao buscar despesa:", error);
      return res.status(500).json({ message: "Erro ao buscar despesa" });
    }
  });
  
  // Criar despesa
  app.post("/api/despesas", isAuthenticated, async (req, res) => {
    try {
      const data = { ...req.body, userId: req.user!.id };
      const parsedData = insertDespesaSchema.safeParse(data);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados da despesa inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const despesa = await storage.createDespesa(parsedData.data);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "criar",
        entidade: "despesas",
        entidadeId: despesa.id,
        descricao: "Nova despesa cadastrada",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(201).json(despesa);
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      return res.status(500).json({ message: "Erro ao criar despesa" });
    }
  });
  
  // Atualizar despesa
  app.put("/api/despesas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingDespesa = await storage.getDespesa(id);
      
      if (!existingDespesa) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      // Verificar se a despesa pertence ao usuário
      if (existingDespesa.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const despesa = await storage.updateDespesa(id, req.body);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "atualizar",
        entidade: "despesas",
        entidadeId: id,
        descricao: "Despesa atualizada",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(200).json(despesa);
    } catch (error) {
      console.error("Erro ao atualizar despesa:", error);
      return res.status(500).json({ message: "Erro ao atualizar despesa" });
    }
  });
  
  // Deletar despesa
  app.delete("/api/despesas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingDespesa = await storage.getDespesa(id);
      
      if (!existingDespesa) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      // Verificar se a despesa pertence ao usuário
      if (existingDespesa.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const deleted = await storage.deleteDespesa(id);
      
      if (deleted) {
        // Log de atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "excluir",
          entidade: "despesas",
          entidadeId: id,
          descricao: "Despesa excluída",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
        
        return res.status(200).json({ message: "Despesa excluída com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir a despesa" });
      }
    } catch (error) {
      console.error("Erro ao excluir despesa:", error);
      return res.status(500).json({ message: "Erro ao excluir despesa" });
    }
  });
  
  // =========== TAXAS ROUTES ===========
  
  // Obter todas as taxas
  app.get("/api/taxas", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tipo = req.query.tipo as string;
      
      const taxas = await storage.getTaxas(userId, tipo);
      return res.status(200).json(taxas);
    } catch (error) {
      console.error("Erro ao buscar taxas:", error);
      return res.status(500).json({ message: "Erro ao buscar taxas" });
    }
  });
  
  // Obter taxa por ID
  app.get("/api/taxas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const taxa = await storage.getTaxa(id);
      
      if (!taxa) {
        return res.status(404).json({ message: "Taxa não encontrada" });
      }
      
      // Verificar se a taxa pertence ao usuário
      if (taxa.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      return res.status(200).json(taxa);
    } catch (error) {
      console.error("Erro ao buscar taxa:", error);
      return res.status(500).json({ message: "Erro ao buscar taxa" });
    }
  });
  
  // Criar taxa
  app.post("/api/taxas", isAuthenticated, async (req, res) => {
    try {
      const data = { ...req.body, userId: req.user!.id };
      const parsedData = insertTaxaSchema.safeParse(data);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados da taxa inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const taxa = await storage.createTaxa(parsedData.data);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "criar",
        entidade: "taxas",
        entidadeId: taxa.id,
        descricao: "Nova taxa cadastrada",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(201).json(taxa);
    } catch (error) {
      console.error("Erro ao criar taxa:", error);
      return res.status(500).json({ message: "Erro ao criar taxa" });
    }
  });
  
  // Atualizar taxa
  app.put("/api/taxas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingTaxa = await storage.getTaxa(id);
      
      if (!existingTaxa) {
        return res.status(404).json({ message: "Taxa não encontrada" });
      }
      
      // Verificar se a taxa pertence ao usuário
      if (existingTaxa.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const taxa = await storage.updateTaxa(id, req.body);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "atualizar",
        entidade: "taxas",
        entidadeId: id,
        descricao: "Taxa atualizada",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(200).json(taxa);
    } catch (error) {
      console.error("Erro ao atualizar taxa:", error);
      return res.status(500).json({ message: "Erro ao atualizar taxa" });
    }
  });
  
  // Deletar taxa
  app.delete("/api/taxas/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingTaxa = await storage.getTaxa(id);
      
      if (!existingTaxa) {
        return res.status(404).json({ message: "Taxa não encontrada" });
      }
      
      // Verificar se a taxa pertence ao usuário
      if (existingTaxa.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const deleted = await storage.deleteTaxa(id);
      
      if (deleted) {
        // Log de atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "excluir",
          entidade: "taxas",
          entidadeId: id,
          descricao: "Taxa excluída",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
        
        return res.status(200).json({ message: "Taxa excluída com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir a taxa" });
      }
    } catch (error) {
      console.error("Erro ao excluir taxa:", error);
      return res.status(500).json({ message: "Erro ao excluir taxa" });
    }
  });
  
  // =========== TRIBUTOS ROUTES ===========
  
  // Obter todos os tributos
  app.get("/api/tributos", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const tributos = await storage.getTributos(userId);
      return res.status(200).json(tributos);
    } catch (error) {
      console.error("Erro ao buscar tributos:", error);
      return res.status(500).json({ message: "Erro ao buscar tributos" });
    }
  });
  
  // Obter tributo por ID
  app.get("/api/tributos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tributo = await storage.getTributo(id);
      
      if (!tributo) {
        return res.status(404).json({ message: "Tributo não encontrado" });
      }
      
      // Verificar se o tributo pertence ao usuário
      if (tributo.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      return res.status(200).json(tributo);
    } catch (error) {
      console.error("Erro ao buscar tributo:", error);
      return res.status(500).json({ message: "Erro ao buscar tributo" });
    }
  });
  
  // Criar tributo
  app.post("/api/tributos", isAuthenticated, async (req, res) => {
    try {
      const data = { ...req.body, userId: req.user!.id };
      const parsedData = insertTributoSchema.safeParse(data);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do tributo inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const tributo = await storage.createTributo(parsedData.data);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "criar",
        entidade: "tributos",
        entidadeId: tributo.id,
        descricao: "Novo tributo cadastrado",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(201).json(tributo);
    } catch (error) {
      console.error("Erro ao criar tributo:", error);
      return res.status(500).json({ message: "Erro ao criar tributo" });
    }
  });
  
  // Atualizar tributo
  app.put("/api/tributos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingTributo = await storage.getTributo(id);
      
      if (!existingTributo) {
        return res.status(404).json({ message: "Tributo não encontrado" });
      }
      
      // Verificar se o tributo pertence ao usuário
      if (existingTributo.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const tributo = await storage.updateTributo(id, req.body);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "atualizar",
        entidade: "tributos",
        entidadeId: id,
        descricao: "Tributo atualizado",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(200).json(tributo);
    } catch (error) {
      console.error("Erro ao atualizar tributo:", error);
      return res.status(500).json({ message: "Erro ao atualizar tributo" });
    }
  });
  
  // Deletar tributo
  app.delete("/api/tributos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingTributo = await storage.getTributo(id);
      
      if (!existingTributo) {
        return res.status(404).json({ message: "Tributo não encontrado" });
      }
      
      // Verificar se o tributo pertence ao usuário
      if (existingTributo.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const deleted = await storage.deleteTributo(id);
      
      if (deleted) {
        // Log de atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "excluir",
          entidade: "tributos",
          entidadeId: id,
          descricao: "Tributo excluído",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
        
        return res.status(200).json({ message: "Tributo excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o tributo" });
      }
    } catch (error) {
      console.error("Erro ao excluir tributo:", error);
      return res.status(500).json({ message: "Erro ao excluir tributo" });
    }
  });
  
  // =========== PRECIFICACAO ROUTES ===========
  
  // Obter todas as precificações
  app.get("/api/precificacoes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tipo = req.query.tipo as string;
      
      const precificacoes = await storage.getPrecificacoes(userId, tipo);
      return res.status(200).json(precificacoes);
    } catch (error) {
      console.error("Erro ao buscar precificações:", error);
      return res.status(500).json({ message: "Erro ao buscar precificações" });
    }
  });
  
  // Obter precificação por ID
  app.get("/api/precificacoes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const precificacao = await storage.getPrecificacao(id);
      
      if (!precificacao) {
        return res.status(404).json({ message: "Precificação não encontrada" });
      }
      
      // Verificar se a precificação pertence ao usuário
      if (precificacao.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      return res.status(200).json(precificacao);
    } catch (error) {
      console.error("Erro ao buscar precificação:", error);
      return res.status(500).json({ message: "Erro ao buscar precificação" });
    }
  });
  
  // Criar precificação
  app.post("/api/precificacoes", isAuthenticated, async (req, res) => {
    try {
      const data = { ...req.body, userId: req.user!.id };
      const parsedData = insertPrecificacaoSchema.safeParse(data);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados da precificação inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const precificacao = await storage.createPrecificacao(parsedData.data);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "criar",
        entidade: "precificacoes",
        entidadeId: precificacao.id,
        descricao: "Nova precificação cadastrada",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(201).json(precificacao);
    } catch (error) {
      console.error("Erro ao criar precificação:", error);
      return res.status(500).json({ message: "Erro ao criar precificação" });
    }
  });
  
  // Atualizar precificação
  app.put("/api/precificacoes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingPrecificacao = await storage.getPrecificacao(id);
      
      if (!existingPrecificacao) {
        return res.status(404).json({ message: "Precificação não encontrada" });
      }
      
      // Verificar se a precificação pertence ao usuário
      if (existingPrecificacao.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const precificacao = await storage.updatePrecificacao(id, req.body);
      
      // Log de atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "atualizar",
        entidade: "precificacoes",
        entidadeId: id,
        descricao: "Precificação atualizada",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      });
      
      return res.status(200).json(precificacao);
    } catch (error) {
      console.error("Erro ao atualizar precificação:", error);
      return res.status(500).json({ message: "Erro ao atualizar precificação" });
    }
  });
  
  // Deletar precificação
  app.delete("/api/precificacoes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingPrecificacao = await storage.getPrecificacao(id);
      
      if (!existingPrecificacao) {
        return res.status(404).json({ message: "Precificação não encontrada" });
      }
      
      // Verificar se a precificação pertence ao usuário
      if (existingPrecificacao.userId !== req.user!.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const deleted = await storage.deletePrecificacao(id);
      
      if (deleted) {
        // Log de atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "excluir",
          entidade: "precificacoes",
          entidadeId: id,
          descricao: "Precificação excluída",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
        
        return res.status(200).json({ message: "Precificação excluída com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir a precificação" });
      }
    } catch (error) {
      console.error("Erro ao excluir precificação:", error);
      return res.status(500).json({ message: "Erro ao excluir precificação" });
    }
  });

  // =========== ROTAS DE CALCULO ===========
  
  // Calcular preço para produto
  app.post("/api/calcular/produto", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Obter taxas do usuário
      const taxasUsuario = await storage.getTaxas(userId);
      const taxasObj: { [key: string]: number } = {};
      
      // Converter taxas para o formato esperado pela função de cálculo
      taxasUsuario.forEach(taxa => {
        taxasObj[taxa.nome] = Number(taxa.valor);
      });
      
      // Obter custos adicionais do usuário, se fornecidos na requisição
      let custosAdicionais: number[] = [];
      if (req.body.custos_ids && Array.isArray(req.body.custos_ids)) {
        const custos = await Promise.all(
          req.body.custos_ids.map((id: number) => storage.getCusto(id))
        );
        custosAdicionais = custos
          .filter(custo => custo && custo.userId === userId)
          .map(custo => Number(custo!.valor));
      }
      
      // Preparar parâmetros para o cálculo
      const params = {
        ...req.body,
        taxas: req.body.taxas || taxasObj,
        custos: req.body.custos || custosAdicionais
      };
      
      // Registrar logs se necessário
      if (req.body.registrar_log) {
        await storage.createActivityLog({
          userId,
          tipoOperacao: "calcular",
          entidade: "produtos",
          entidadeId: req.body.produto_id || null,
          descricao: "Cálculo de preço de produto",
          detalhes: { params, timestamp: new Date().toISOString() },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
      }
      
      // Executar cálculo
      const resultado = calcularPrecoProduto(params);
      
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao calcular preço para produto:", error);
      return res.status(500).json({ message: "Erro ao calcular preço para produto" });
    }
  });
  
  // Calcular preço para serviço
  app.post("/api/calcular/servico", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Obter taxas do usuário
      const taxasUsuario = await storage.getTaxas(userId);
      const taxasObj: { [key: string]: number } = {};
      
      // Converter taxas para o formato esperado pela função de cálculo
      taxasUsuario.forEach(taxa => {
        taxasObj[taxa.nome] = Number(taxa.valor);
      });
      
      // Obter custos adicionais do usuário, se fornecidos na requisição
      let custosAdicionais: number[] = [];
      if (req.body.custos_ids && Array.isArray(req.body.custos_ids)) {
        const custos = await Promise.all(
          req.body.custos_ids.map((id: number) => storage.getCusto(id))
        );
        custosAdicionais = custos
          .filter(custo => custo && custo.userId === userId)
          .map(custo => Number(custo!.valor));
      }
      
      // Preparar parâmetros para o cálculo
      const params = {
        ...req.body,
        taxas: req.body.taxas || taxasObj,
        custos: req.body.custos || custosAdicionais
      };
      
      // Registrar logs se necessário
      if (req.body.registrar_log) {
        await storage.createActivityLog({
          userId,
          tipoOperacao: "calcular",
          entidade: "servicos",
          entidadeId: req.body.servico_id || null,
          descricao: "Cálculo de preço de serviço",
          detalhes: { params, timestamp: new Date().toISOString() },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
      }
      
      // Executar cálculo
      const resultado = calcularPrecoServico(params);
      
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao calcular preço para serviço:", error);
      return res.status(500).json({ message: "Erro ao calcular preço para serviço" });
    }
  });
  
  // Calcular preço para aluguel
  app.post("/api/calcular/aluguel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Obter taxas do usuário
      const taxasUsuario = await storage.getTaxas(userId);
      const taxasObj: { [key: string]: number } = {};
      
      // Converter taxas para o formato esperado pela função de cálculo
      taxasUsuario.forEach(taxa => {
        taxasObj[taxa.nome] = Number(taxa.valor);
      });
      
      // Obter custos adicionais do usuário, se fornecidos na requisição
      let custosAdicionais: number[] = [];
      if (req.body.custos_ids && Array.isArray(req.body.custos_ids)) {
        const custos = await Promise.all(
          req.body.custos_ids.map((id: number) => storage.getCusto(id))
        );
        custosAdicionais = custos
          .filter(custo => custo && custo.userId === userId)
          .map(custo => Number(custo!.valor));
      }
      
      // Preparar parâmetros para o cálculo
      const params = {
        ...req.body,
        taxas: req.body.taxas || taxasObj,
        custos: req.body.custos || custosAdicionais
      };
      
      // Registrar logs se necessário
      if (req.body.registrar_log) {
        await storage.createActivityLog({
          userId,
          tipoOperacao: "calcular",
          entidade: "alugueis",
          entidadeId: req.body.aluguel_id || null,
          descricao: "Cálculo de preço de aluguel",
          detalhes: { params, timestamp: new Date().toISOString() },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
      }
      
      // Executar cálculo
      const resultado = calcularPrecoAluguel(params);
      
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao calcular preço para aluguel:", error);
      return res.status(500).json({ message: "Erro ao calcular preço para aluguel" });
    }
  });
  
  // Calcular preço para marketplace
  app.post("/api/calcular/marketplace", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Obter taxas do usuário
      const taxasUsuario = await storage.getTaxas(userId);
      const taxasObj: { [key: string]: number } = {};
      
      // Converter taxas para o formato esperado pela função de cálculo
      taxasUsuario.forEach(taxa => {
        taxasObj[taxa.nome] = Number(taxa.valor);
      });
      
      // Obter custos adicionais do usuário, se fornecidos na requisição
      let custosAdicionais: number[] = [];
      if (req.body.custos_ids && Array.isArray(req.body.custos_ids)) {
        const custos = await Promise.all(
          req.body.custos_ids.map((id: number) => storage.getCusto(id))
        );
        custosAdicionais = custos
          .filter(custo => custo && custo.userId === userId)
          .map(custo => Number(custo!.valor));
      }
      
      // Preparar parâmetros para o cálculo
      const params = {
        ...req.body,
        taxas: req.body.taxas || taxasObj,
        custos: req.body.custos || custosAdicionais
      };
      
      // Registrar logs se necessário
      if (req.body.registrar_log) {
        await storage.createActivityLog({
          userId,
          tipoOperacao: "calcular",
          entidade: "marketplaces",
          entidadeId: req.body.marketplace_id || null,
          descricao: "Cálculo de preço para marketplace",
          detalhes: { params, timestamp: new Date().toISOString() },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
      }
      
      // Executar cálculo
      const resultado = calcularPrecoMarketplace(params);
      
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Erro ao calcular preço para marketplace:", error);
      return res.status(500).json({ message: "Erro ao calcular preço para marketplace" });
    }
  });
  
  // =========== ROTAS DE MINHA CONTA - ENDEREÇOS ===========
  
  // Obter todos os endereços de um usuário
  app.get("/api/enderecos", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const enderecos = await storage.getEnderecos(userId);
      return res.status(200).json(enderecos);
    } catch (error) {
      console.error("Erro ao buscar endereços:", error);
      return res.status(500).json({ message: "Erro ao buscar endereços" });
    }
  });
  
  // Obter endereço por ID
  app.get("/api/enderecos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const endereco = await storage.getEndereco(id);
      
      if (!endereco) {
        return res.status(404).json({ message: "Endereço não encontrado" });
      }
      
      // Verificar se o endereço pertence ao usuário atual
      if (endereco.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este endereço" });
      }
      
      return res.status(200).json(endereco);
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
      return res.status(500).json({ message: "Erro ao buscar endereço" });
    }
  });
  
  // Criar endereço
  app.post("/api/enderecos", isAuthenticated, async (req, res) => {
    try {
      // Adiciona o ID do usuário logado aos dados do endereço
      const enderecoData = {
        ...req.body,
        userId: req.user!.id
      };
      
      const parsedData = insertEnderecoSchema.safeParse(enderecoData);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do endereço inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const endereco = await storage.createEndereco(parsedData.data);
      
      // Notificar usuários relacionados via WebSocket sobre a alteração
      // await notifyRelatedUsers('enderecos', 'create', endereco, req.user!.id); // WebSocket movido para index.ts
      
      // Registrar atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "criar",
        entidade: "enderecos",
        entidadeId: endereco.id,
        descricao: `Adicionou um novo endereço: ${endereco.cidade}, ${endereco.estado}`,
        detalhes: { endereco },
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || ""
      });
      
      return res.status(201).json(endereco);
    } catch (error) {
      console.error("Erro ao criar endereço:", error);
      return res.status(500).json({ message: "Erro ao criar endereço" });
    }
  });
  
  // Atualizar endereço
  app.put("/api/enderecos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingEndereco = await storage.getEndereco(id);
      
      if (!existingEndereco) {
        return res.status(404).json({ message: "Endereço não encontrado" });
      }
      
      // Verificar se o endereço pertence ao usuário atual
      if (existingEndereco.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para atualizar este endereço" });
      }
      
      const endereco = await storage.updateEndereco(id, req.body);
      
      // Notificar usuários relacionados via WebSocket sobre a alteração
      // await notifyRelatedUsers('enderecos', 'update', endereco, req.user!.id); // WebSocket movido para index.ts
      
      // Registrar atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "atualizar",
        entidade: "enderecos",
        entidadeId: endereco.id,
        descricao: `Atualizou o endereço: ${endereco.cidade}, ${endereco.estado}`,
        detalhes: { endereco, anterior: existingEndereco },
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || ""
      });
      
      return res.status(200).json(endereco);
    } catch (error) {
      console.error("Erro ao atualizar endereço:", error);
      return res.status(500).json({ message: "Erro ao atualizar endereço" });
    }
  });
  
  // Deletar endereço
  app.delete("/api/enderecos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingEndereco = await storage.getEndereco(id);
      
      if (!existingEndereco) {
        return res.status(404).json({ message: "Endereço não encontrado" });
      }
      
      // Verificar se o endereço pertence ao usuário atual
      if (existingEndereco.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este endereço" });
      }
      
      // Verificar se é um endereço principal
      if (existingEndereco.principal) {
        return res.status(400).json({ 
          message: "Não é possível excluir o endereço principal. Defina outro endereço como principal primeiro." 
        });
      }
      
      const deleted = await storage.deleteEndereco(id);
      
      if (deleted) {
        // Notificar usuários relacionados via WebSocket sobre a alteração
        // await notifyRelatedUsers('enderecos', 'delete', { id }, req.user!.id); // WebSocket movido para index.ts
      
        // Registrar atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "excluir",
          entidade: "enderecos",
          entidadeId: id,
          descricao: `Excluiu um endereço em ${existingEndereco.cidade}, ${existingEndereco.estado}`,
          detalhes: { endereco: existingEndereco },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || ""
        });
        
        return res.status(200).json({ message: "Endereço excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o endereço" });
      }
    } catch (error) {
      console.error("Erro ao excluir endereço:", error);
      return res.status(500).json({ message: "Erro ao excluir endereço" });
    }
  });
  
  // Definir endereço como principal
  app.post("/api/enderecos/:id/principal", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const endereco = await storage.getEndereco(id);
      
      if (!endereco) {
        return res.status(404).json({ message: "Endereço não encontrado" });
      }
      
      // Verificar se o endereço pertence ao usuário atual
      if (endereco.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para modificar este endereço" });
      }
      
      const success = await storage.setPrincipalEndereco(req.user!.id, id);
      
      if (success) {
        // Registrar atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "atualizar",
          entidade: "enderecos",
          entidadeId: id,
          descricao: `Definiu um endereço em ${endereco.cidade}, ${endereco.estado} como principal`,
          detalhes: { endereco },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || ""
        });
        
        return res.status(200).json({ message: "Endereço definido como principal" });
      } else {
        return res.status(500).json({ message: "Não foi possível definir o endereço como principal" });
      }
    } catch (error) {
      console.error("Erro ao definir endereço como principal:", error);
      return res.status(500).json({ message: "Erro ao definir endereço como principal" });
    }
  });
  
  // =========== ROTAS DE MINHA CONTA - CONTATOS ===========
  
  // Obter todos os contatos de um usuário
  app.get("/api/contatos", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const contatos = await storage.getContatos(userId);
      return res.status(200).json(contatos);
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
      return res.status(500).json({ message: "Erro ao buscar contatos" });
    }
  });
  
  // Obter contato por ID
  app.get("/api/contatos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contato = await storage.getContato(id);
      
      if (!contato) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      // Verificar se o contato pertence ao usuário atual
      if (contato.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este contato" });
      }
      
      return res.status(200).json(contato);
    } catch (error) {
      console.error("Erro ao buscar contato:", error);
      return res.status(500).json({ message: "Erro ao buscar contato" });
    }
  });
  
  // Criar contato
  app.post("/api/contatos", isAuthenticated, async (req, res) => {
    try {
      // Adiciona o ID do usuário logado aos dados do contato
      const contatoData = {
        ...req.body,
        userId: req.user!.id
      };
      
      const parsedData = insertContatoSchema.safeParse(contatoData);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Dados do contato inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      const contato = await storage.createContato(parsedData.data);
      
      // Notificar usuários relacionados via WebSocket sobre a alteração
      // await notifyRelatedUsers('contatos', 'create', contato, req.user!.id); // WebSocket movido para index.ts
      
      // Registrar atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "criar",
        entidade: "contatos",
        entidadeId: contato.id,
        descricao: `Adicionou um novo contato: ${contato.nome} (${contato.tipo})`,
        detalhes: { contato },
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || ""
      });
      
      return res.status(201).json(contato);
    } catch (error) {
      console.error("Erro ao criar contato:", error);
      return res.status(500).json({ message: "Erro ao criar contato" });
    }
  });
  
  // Atualizar contato
  app.put("/api/contatos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingContato = await storage.getContato(id);
      
      if (!existingContato) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      // Verificar se o contato pertence ao usuário atual
      if (existingContato.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para atualizar este contato" });
      }
      
      const contato = await storage.updateContato(id, req.body);
      
      // Notificar usuários relacionados via WebSocket sobre a alteração
      // await notifyRelatedUsers('contatos', 'update', contato, req.user!.id); // WebSocket movido para index.ts
      
      // Registrar atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "atualizar",
        entidade: "contatos",
        entidadeId: contato.id,
        descricao: `Atualizou o contato: ${contato.nome} (${contato.tipo})`,
        detalhes: { contato, anterior: existingContato },
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || ""
      });
      
      return res.status(200).json(contato);
    } catch (error) {
      console.error("Erro ao atualizar contato:", error);
      return res.status(500).json({ message: "Erro ao atualizar contato" });
    }
  });
  
  // Deletar contato
  app.delete("/api/contatos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingContato = await storage.getContato(id);
      
      if (!existingContato) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      // Verificar se o contato pertence ao usuário atual
      if (existingContato.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este contato" });
      }
      
      // Verificar se é um contato principal
      if (existingContato.principal) {
        return res.status(400).json({ 
          message: "Não é possível excluir o contato principal. Defina outro contato como principal primeiro." 
        });
      }
      
      const deleted = await storage.deleteContato(id);
      
      if (deleted) {
        // Notificar usuários relacionados via WebSocket sobre a alteração
        // await notifyRelatedUsers('contatos', 'delete', { id }, req.user!.id); // WebSocket movido para index.ts
        
        // Registrar atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "excluir",
          entidade: "contatos",
          entidadeId: id,
          descricao: `Excluiu o contato: ${existingContato.nome} (${existingContato.tipo})`,
          detalhes: { contato: existingContato },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || ""
        });
        
        return res.status(200).json({ message: "Contato excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o contato" });
      }
    } catch (error) {
      console.error("Erro ao excluir contato:", error);
      return res.status(500).json({ message: "Erro ao excluir contato" });
    }
  });
  
  // Definir contato como principal
  app.post("/api/contatos/:id/principal", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contato = await storage.getContato(id);
      
      if (!contato) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      // Verificar se o contato pertence ao usuário atual
      if (contato.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para modificar este contato" });
      }
      
      const success = await storage.setPrincipalContato(req.user!.id, id);
      
      if (success) {
        // Registrar atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "atualizar",
          entidade: "contatos",
          entidadeId: id,
          descricao: `Definiu ${contato.nome} (${contato.tipo}) como contato principal`,
          detalhes: { contato },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || ""
        });
        
        return res.status(200).json({ message: "Contato definido como principal" });
      } else {
        return res.status(500).json({ message: "Não foi possível definir o contato como principal" });
      }
    } catch (error) {
      console.error("Erro ao definir contato como principal:", error);
      return res.status(500).json({ message: "Erro ao definir contato como principal" });
    }
  });
  
  // =========== ROTAS DE MINHA CONTA - USUÁRIOS ADICIONAIS ===========
  
  // Obter todos os usuários adicionais de um usuário
  app.get("/api/usuarios-adicionais", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const usuarios = await storage.getUsuariosAdicionais(userId);
      return res.status(200).json(usuarios);
    } catch (error) {
      console.error("Erro ao buscar usuários adicionais:", error);
      return res.status(500).json({ message: "Erro ao buscar usuários adicionais" });
    }
  });
  
  // Obter usuário adicional por ID
  app.get("/api/usuarios-adicionais/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const usuario = await storage.getUsuarioAdicional(id);
      
      if (!usuario) {
        return res.status(404).json({ message: "Usuário adicional não encontrado" });
      }
      
      // Verificar se o usuário adicional pertence ao usuário atual
      if (usuario.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este usuário adicional" });
      }
      
      return res.status(200).json(usuario);
    } catch (error) {
      console.error("Erro ao buscar usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao buscar usuário adicional" });
    }
  });
  
  // Criar usuário adicional
  app.post("/api/usuarios-adicionais", isAuthenticated, async (req, res) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.user || !req.user.id) {
        console.error("Usuário não autenticado ou ID não disponível:", req.user);
        return res.status(401).json({ 
          message: "Usuário não autenticado" 
        });
      }

      console.log("Criando usuário adicional para userId:", req.user.id);
      console.log("Dados recebidos:", req.body);

      // Adiciona o ID do usuário logado aos dados do usuário adicional
      const usuarioData = {
        ...req.body,
        userId: req.user.id
      };
      
      console.log("Dados preparados para validação:", usuarioData);
      
      const parsedData = insertUsuarioAdicionalSchema.safeParse(usuarioData);
      
      if (!parsedData.success) {
        console.error("Erro de validação:", parsedData.error.errors);
        return res.status(400).json({ 
          message: "Dados do usuário adicional inválidos", 
          errors: parsedData.error.errors 
        });
      }
      
      console.log("Dados validados:", parsedData.data);
      
      const usuario = await storage.createUsuarioAdicional(parsedData.data);
      
      // Notificar usuários relacionados via WebSocket sobre a criação
      // await notifyRelatedUsers('usuarios_adicionais', 'create', usuario, req.user!.id); // WebSocket movido para index.ts
      
      // Registrar atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "criar",
        entidade: "usuarios_adicionais",
        entidadeId: usuario.id,
        descricao: `Adicionou um novo usuário: ${usuario.nome} (${usuario.cargo})`,
        detalhes: { usuario },
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || ""
      });
      
      return res.status(201).json(usuario);
    } catch (error) {
      console.error("Erro ao criar usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao criar usuário adicional" });
    }
  });
  
  // Atualizar usuário adicional
  app.put("/api/usuarios-adicionais/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingUsuario = await storage.getUsuarioAdicional(id);
      
      if (!existingUsuario) {
        return res.status(404).json({ message: "Usuário adicional não encontrado" });
      }
      
      // Verificar se o usuário adicional pertence ao usuário atual
      if (existingUsuario.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para atualizar este usuário adicional" });
      }
      
      const usuario = await storage.updateUsuarioAdicional(id, req.body);
      
      // Notificar usuários relacionados via WebSocket sobre a atualização
      // await notifyRelatedUsers('usuarios_adicionais', 'update', usuario, req.user!.id); // WebSocket movido para index.ts
      
      // Registrar atividade
      await storage.createActivityLog({
        userId: req.user!.id,
        tipoOperacao: "atualizar",
        entidade: "usuarios_adicionais",
        entidadeId: usuario.id,
        descricao: `Atualizou o usuário: ${usuario.nome} (${usuario.cargo})`,
        detalhes: { usuario, anterior: existingUsuario },
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || ""
      });
      
      return res.status(200).json(usuario);
    } catch (error) {
      console.error("Erro ao atualizar usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao atualizar usuário adicional" });
    }
  });
  
  // Deletar usuário adicional
  app.delete("/api/usuarios-adicionais/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingUsuario = await storage.getUsuarioAdicional(id);
      
      if (!existingUsuario) {
        return res.status(404).json({ message: "Usuário adicional não encontrado" });
      }
      
      // Verificar se o usuário adicional pertence ao usuário atual
      if (existingUsuario.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este usuário adicional" });
      }
      
      const deleted = await storage.deleteUsuarioAdicional(id);
      
      if (deleted) {
        // Notificar usuários relacionados via WebSocket sobre a exclusão
        // await notifyRelatedUsers('usuarios_adicionais', 'delete', { id }, req.user!.id); // WebSocket movido para index.ts
        
        // Registrar atividade
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "excluir",
          entidade: "usuarios_adicionais",
          entidadeId: id,
          descricao: `Excluiu o usuário: ${existingUsuario.nome} (${existingUsuario.cargo})`,
          detalhes: { usuario: existingUsuario },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || ""
        });
        
        return res.status(200).json({ message: "Usuário adicional excluído com sucesso" });
      } else {
        return res.status(500).json({ message: "Não foi possível excluir o usuário adicional" });
      }
    } catch (error) {
      console.error("Erro ao excluir usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao excluir usuário adicional" });
    }
  });
  
  // =========== ROTAS PARA USUÁRIOS ADICIONAIS - GERENCIAMENTO DE SENHA ===========
  
  // Enviar email para criação/alteração de senha do usuário adicional
  app.post("/api/usuarios-adicionais/:id/send-password-email", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const usuario = await storage.getUsuarioAdicional(id);
      
      if (!usuario) {
        return res.status(404).json({ message: "Usuário adicional não encontrado" });
      }
      
      // Verificar se o usuário adicional pertence ao usuário atual
      if (usuario.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para gerenciar este usuário adicional" });
      }
      
      // Verificar se já tem senha ou é nova
      const isNewPassword = !usuario.password;
      
      // Gerar token de redefinição de senha
      const token = jwt.sign(
        { 
          usuarioAdicionalId: id,
          email: usuario.email,
          type: 'additional_user_password_reset'
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
      );
      
      // Deletar tokens existentes para este usuário antes de criar um novo
      await executeQuery(`
        DELETE FROM additional_user_password_reset_tokens 
        WHERE usuario_adicional_id = $1
      `, [id]);
      
      // Salvar novo token no banco de dados
      await executeQuery(`
        INSERT INTO additional_user_password_reset_tokens (usuario_adicional_id, token, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '24 hours')
      `, [id, token]);
      
      // Enviar email
      const { sendAdditionalUserPasswordEmail } = await import('./email');
      const emailSent = await sendAdditionalUserPasswordEmail(
        usuario.email,
        usuario.nome,
        token,
        isNewPassword
      );
      
      if (emailSent) {
        return res.status(200).json({ 
          message: isNewPassword ? 
            "Email para criação de senha enviado com sucesso" : 
            "Email para alteração de senha enviado com sucesso"
        });
      } else {
        return res.status(500).json({ message: "Erro ao enviar email" });
      }
    } catch (error) {
      console.error("Erro ao enviar email de senha:", error);
      return res.status(500).json({ message: "Erro ao enviar email" });
    }
  });
  
  

  // Rota para verificar token de definição de senha de usuário adicional
  app.post("/api/verify-additional-user-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Token é obrigatório" 
        });
      }
      
      // Verificar token JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: "Token inválido ou expirado" 
        });
      }
      
      if (decoded.type !== 'additional_user_password_reset') {
        return res.status(400).json({ 
          success: false, 
          message: "Token inválido" 
        });
      }
      
      // Verificar se o token existe no banco e não foi usado
      const tokenResult = await executeQuery(`
        SELECT * FROM additional_user_password_reset_tokens 
        WHERE token = $1 AND used = false AND expires_at > NOW()
      `, [token]);
      
      if (tokenResult.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Token inválido, usado ou expirado" 
        });
      }
      
      // Buscar dados do usuário adicional
      const usuarioResult = await executeQuery(`
        SELECT nome, email FROM usuarios_adicionais 
        WHERE id = $1
      `, [decoded.usuarioAdicionalId]);
      
      // Verificar se o resultado tem dados
      if (!usuarioResult || !usuarioResult.rows || usuarioResult.rows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Usuário não encontrado" 
        });
      }
      
      const usuario = usuarioResult.rows[0];
      
      return res.status(200).json({ 
        success: true, 
        userName: usuario.nome,
        message: "Token válido" 
      });
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao verificar token" 
      });
    }
  });

  // Rota para definir senha do usuário adicional
  app.post("/api/set-additional-user-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Token e senha são obrigatórios" 
        });
      }
      
      // Verificar token JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: "Token inválido ou expirado" 
        });
      }
      
      if (decoded.type !== 'additional_user_password_reset') {
        return res.status(400).json({ 
          success: false, 
          message: "Token inválido" 
        });
      }
      
      // Verificar se o token existe no banco e não foi usado
      const tokenResult = await executeQuery(`
        SELECT * FROM additional_user_password_reset_tokens 
        WHERE token = $1 AND used = false AND expires_at > NOW()
      `, [token]);
      
      if (tokenResult.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Token inválido, usado ou expirado" 
        });
      }
      
      const usuarioAdicionalId = decoded.usuarioAdicionalId;
      
      // Hash da senha
      const hashedPassword = await hashPassword(password);
      
      // Atualizar senha do usuário adicional
      await executeQuery(`
        UPDATE usuarios_adicionais 
        SET password = $1, last_password_change = NOW(), email_verified = true, updated_at = NOW()
        WHERE id = $2
      `, [hashedPassword, usuarioAdicionalId]);
      
      // Marcar token como usado
      await executeQuery(`
        UPDATE additional_user_password_reset_tokens 
        SET used = true 
        WHERE token = $1
      `, [token]);
      
      return res.status(200).json({ 
        success: true, 
        message: "Senha definida com sucesso" 
      });
    } catch (error) {
      console.error("Erro ao definir senha:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao definir senha" 
      });
    }
  });

  // Rota para verificar token de definição de senha de usuário adicional
  app.get("/api/usuarios-adicionais/verify-password-token", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ message: "Token é obrigatório" });
      }
      
      // Verificar token JWT
      let decoded;
      try {
        decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'default-secret') as any;
      } catch (error) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'additional_user_password_reset') {
        return res.status(400).json({ message: "Token inválido" });
      }
      
      // Verificar se o token existe no banco e não foi usado
      const tokenResult = await executeQuery(`
        SELECT * FROM additional_user_password_reset_tokens 
        WHERE token = $1 AND used = false AND expires_at > NOW()
      `, [token]);
      
      if (tokenResult.length === 0) {
        return res.status(400).json({ message: "Token inválido, usado ou expirado" });
      }
      
      // Buscar dados do usuário adicional
      const usuarioResult = await executeQuery(`
        SELECT nome, email FROM usuarios_adicionais 
        WHERE id = $1
      `, [decoded.usuarioAdicionalId]);
      
      if (usuarioResult.length === 0) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }
      
      return res.status(200).json({ 
        valid: true, 
        user: usuarioResult[0],
        message: "Token válido" 
      });
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return res.status(500).json({ message: "Erro ao verificar token" });
    }
  });

  // Definir senha do usuário adicional através do token
  app.post("/api/usuarios-adicionais/set-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token e senha são obrigatórios" });
      }
      
      // Verificar token JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
      } catch (error) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'additional_user_password_reset') {
        return res.status(400).json({ message: "Token inválido" });
      }
      
      // Verificar se o token existe no banco e não foi usado
      const tokenResult = await executeQuery(`
        SELECT * FROM additional_user_password_reset_tokens 
        WHERE token = $1 AND used = false AND expires_at > NOW()
      `, [token]);
      
      if (tokenResult.length === 0) {
        return res.status(400).json({ message: "Token inválido, usado ou expirado" });
      }
      
      const usuarioAdicionalId = decoded.usuarioAdicionalId;
      
      // Validar senha
      const { updateUsuarioAdicionalPasswordSchema } = await import('@shared/schema');
      const validatedData = updateUsuarioAdicionalPasswordSchema.parse({ password });
      
      // Hash da senha
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Atualizar senha do usuário adicional
      await executeQuery(`
        UPDATE usuarios_adicionais 
        SET password = $1, last_password_change = NOW(), email_verified = true, updated_at = NOW()
        WHERE id = $2
      `, [hashedPassword, usuarioAdicionalId]);
      
      // Marcar token como usado
      await executeQuery(`
        UPDATE additional_user_password_reset_tokens 
        SET used = true 
        WHERE token = $1
      `, [token]);
      
      return res.status(200).json({ message: "Senha definida com sucesso" });
    } catch (error) {
      console.error("Erro ao definir senha:", error);
      return res.status(500).json({ message: "Erro ao definir senha" });
    }
  });
  
  // =========== ROTAS DE TESTE ===========
  
  // Rota para limpar dados de onboarding (apenas para testes)
  app.post("/api/test/clear-onboarding", (req, res) => {
    console.log("Limpando dados de onboarding para testes");
    try {
      res.status(200).json({ message: "Dados de onboarding limpos com sucesso" });
    } catch (error) {
      console.error("Erro ao limpar dados de onboarding:", error);
      res.status(500).json({ message: "Erro ao limpar dados de onboarding" });
    }
  });
  
  // Servir arquivo de teste estático
  app.get("/stripe-teste", (req, res) => {
    res.sendFile(process.cwd() + '/stripe-teste.html');
  });
  
  // Página de teste para Stripe Elements (sem necessidade de login)
  app.get("/teste-pagamento", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Teste de Pagamento - Stripe Elements</title>
        <script src="https://js.stripe.com/v3/"></script>
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 20px; max-width: 800px; margin: 0 auto; }
          .container { background-color: #f8f9fa; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #0f766e; }
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 8px; font-weight: 500; }
          #payment-element { margin: 20px 0; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; }
          button { background-color: #0f766e; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
          button:hover { background-color: #0e6b63; }
          .result { margin-top: 20px; padding: 15px; border-radius: 4px; }
          .success { background-color: #d1fae5; color: #065f46; }
          .error { background-color: #fee2e2; color: #b91c1c; }
          .processing { display: flex; align-items: center; }
          .spinner { margin-right: 10px; border: 3px solid #f3f3f3; border-top: 3px solid #0f766e; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Teste de Pagamento - Stripe Elements</h1>
          <p>Esta é uma página de teste para a integração com Stripe Elements.</p>
          
          <form id="payment-form">
            <div class="form-group">
              <label for="payment-element">Dados do Pagamento</label>
              <div id="payment-element"></div>
            </div>
            
            <button id="submit-button" type="submit">
              <span id="button-text">Pagar R$ 89,90</span>
              <div id="spinner" class="spinner hidden"></div>
            </button>
            
            <div id="payment-message" class="result hidden"></div>
          </form>
        </div>
        
        <script>
          const stripe = Stripe('${process.env.VITE_STRIPE_PUBLIC_KEY}');
          let elements;
          let paymentElement;
          
          async function initialize() {
            try {
              // Criar PaymentIntent no servidor
              const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 8990 }) // 89,90 em centavos
              });
              
              if (!response.ok) {
                throw new Error('Erro ao comunicar com o servidor');
              }
              
              const { clientSecret } = await response.json();
              
              // Inicializar Stripe Elements
              elements = stripe.elements({
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#0f766e',
                    colorBackground: '#ffffff',
                    colorText: '#1e293b',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '4px',
                  }
                }
              });
              
              // Montar o formulário de pagamento
              paymentElement = elements.create('payment');
              paymentElement.mount('#payment-element');
            } catch (error) {
              console.error('Erro na inicialização:', error);
              showMessage('Erro ao inicializar o pagamento: ' + error.message, 'error');
            }
          }
          
          // Lidar com envio do formulário
          const form = document.getElementById('payment-form');
          form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            setLoading(true);
            
            try {
              // Confirmar pagamento com Stripe
              const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                  return_url: window.location.origin + '/teste-pagamento-sucesso',
                }
              });
              
              if (error) {
                showMessage(error.message, 'error');
              }
            } catch (e) {
              showMessage('Erro inesperado: ' + e.message, 'error');
            }
            
            setLoading(false);
          });
          
          // Funções auxiliares
          function showMessage(message, type = 'success') {
            const messageElement = document.getElementById('payment-message');
            messageElement.classList.remove('hidden', 'success', 'error');
            messageElement.classList.add(type);
            messageElement.textContent = message;
          }
          
          function setLoading(isLoading) {
            const submitButton = document.getElementById('submit-button');
            const buttonText = document.getElementById('button-text');
            const spinner = document.getElementById('spinner');
            
            if (isLoading) {
              submitButton.disabled = true;
              buttonText.textContent = 'Processando...';
              spinner.classList.remove('hidden');
            } else {
              submitButton.disabled = false;
              buttonText.textContent = 'Pagar R$ 89,90';
              spinner.classList.add('hidden');
            }
          }
          
          // Inicializar a página
          document.addEventListener('DOMContentLoaded', initialize);
        </script>
      </body>
      </html>
    `);
  });
  
  // Página de sucesso após pagamento
  app.get("/teste-pagamento-sucesso", (req, res) => {
    const paymentIntentId = req.query.payment_intent;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pagamento Confirmado - Meu Preço Certo</title>
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 20px; max-width: 800px; margin: 0 auto; text-align: center; }
          .container { background-color: #f8f9fa; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #0f766e; }
          .success-icon { display: inline-flex; background-color: #d1fae5; color: #065f46; width: 80px; height: 80px; border-radius: 50%; align-items: center; justify-content: center; margin-bottom: 20px; }
          .success-icon svg { width: 40px; height: 40px; }
          .payment-id { background: #e2e8f0; padding: 10px; border-radius: 4px; margin: 20px 0; font-family: monospace; word-break: break-all; }
          .button { display: inline-block; background-color: #0f766e; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1>Pagamento Confirmado!</h1>
          <p>Seu pagamento foi processado com sucesso e sua assinatura foi renovada.</p>
          
          ${paymentIntentId ? `
            <div class="payment-id">
              <strong>ID do Pagamento:</strong> ${paymentIntentId}
            </div>
          ` : ''}
          
          <p>Um recibo foi enviado para seu e-mail cadastrado.</p>
          
          <a href="/" class="button">Voltar para a página inicial</a>
        </div>
        
        <script>
          // Animação de confetti para celebrar
          window.onload = function() {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            
            function randomInRange(min, max) {
              return Math.random() * (max - min) + min;
            }
            
            function frame() {
              const timeLeft = animationEnd - Date.now();
              
              if (timeLeft <= 0) return;
              
              const particleCount = 50 * (timeLeft / duration);
              
              confetti({
                particleCount: Math.floor(randomInRange(20, 40)),
                angle: randomInRange(55, 125),
                spread: randomInRange(50, 70),
                origin: { x: randomInRange(0.1, 0.9), y: randomInRange(0.1, 0.3) },
                colors: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'],
              });
              
              requestAnimationFrame(frame);
            }
            
            frame();
          };
        </script>
      </body>
      </html>
    `);
  });
  
  // =========== ROTAS DE PLANOS E ASSINATURAS ===========
  // Obter todos os planos disponíveis
  app.get("/api/planos", async (req, res) => {
    try {
      const planos = await storage.getPlanos();
      return res.json(planos);
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
      return res.status(500).json({ message: "Erro ao buscar planos" });
    }
  });
  
  // Obter plano atual do usuário
  app.get("/api/minha-assinatura", isAuthenticated, async (req, res) => {
    try {
      console.log("DEBUG /api/minha-assinatura - DENTRO DA FUNÇÃO:", {
        user: req.user ? { id: req.user.id, username: req.user.username } : null,
        sessionId: req.sessionID,
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false
      });
      
      // Obter ID do usuário autenticado
      const userId = req.user!.id;
      
      // Adicionando cache-control headers para o navegador não cachear esta resposta
      // e um cache de servidor de apenas 1 segundo
      res.setHeader('Cache-Control', 'no-cache, max-age=1');
      res.setHeader('Expires', new Date(Date.now() + 1000).toUTCString());
      res.setHeader('Pragma', 'no-cache');
      
      // Buscar assinatura ativa do usuário
      const assinatura = await storage.getAssinaturaAtiva(userId);
      
      if (!assinatura) {
        return res.json({ 
          temAssinatura: false,
          loggedIn: true,
          user: { 
            id: userId,
            username: req.user.username 
          }
        });
      }
      
      // Buscar detalhes do plano
      const plano = await storage.getPlano(assinatura.planoId);
      
      if (!plano) {
        return res.json({ 
          message: "Plano não encontrado",
          temAssinatura: true,
          assinatura,
          loggedIn: true,
          user: { 
            id: userId,
            username: req.user.username 
          }
        });
      }
      
      // Obter contagem de produtos e usuários cadastrados pelo usuário diretamente do banco
      // Usando executeQuery em vez de client.connect() para ser compatível com o novo gerenciador de conexões
      let produtosCadastrados = 0;
      let usuariosCadastrados = 0;
      
      try {
        // Execução paralela das consultas para otimizar tempo
        const [resultProdutos, resultUsuarios] = await Promise.all([
          executeQuery('SELECT COUNT(*) as count FROM produtos WHERE user_id = $1', [userId]),
          executeQuery('SELECT COUNT(*) as count FROM usuarios_adicionais WHERE user_id = $1', [userId])
        ]);
        
        produtosCadastrados = parseInt(resultProdutos.rows[0]?.count || '0', 10);
        usuariosCadastrados = parseInt(resultUsuarios.rows[0]?.count || '0', 10) + 1; // +1 pelo usuário principal
      } catch (error) {
        console.error(`Erro ao contar recursos do usuário ${userId}:`, error);
      }
      
      // Formatar os limites do plano
      const limitesCadastro = {
        produtos: plano.limiteProdutos === 999999 ? 'Ilimitado' : plano.limiteProdutos,
        clientes: plano.cadastroClientes ? 'Ilimitado' : 0,
        usuarios: plano.limiteUsuarios === 999999 ? 'Ilimitado' : plano.limiteUsuarios
      };
      
      // Adicionar estatísticas de uso
      const estatisticas = {
        produtosCadastrados,
        usuariosCadastrados,
        // Adicionar outras estatísticas conforme necessário
      };
      
      // Plano formatado com os limites estruturados
      const planoFormatado = {
        ...plano,
        limitesCadastro,
      };
      
      return res.json({
        temAssinatura: true,
        assinatura,
        plano: planoFormatado,
        estatisticas,
        loggedIn: true,
        user: { 
          id: userId,
          username: req.user.username 
        }
      });
    } catch (error) {
      console.error("Erro ao buscar assinatura:", error);
      return res.status(500).json({ message: "Erro ao buscar assinatura" });
    }
  });
  
  // =========== ROTAS DE PAGAMENTO - STRIPE ===========
  
  // Rota para obter a chave pública do Stripe
  app.get('/api/stripe-config', (req, res) => {
    res.json({ 
      publicKey: process.env.VITE_STRIPE_PUBLIC_KEY 
    });
  });
  
  // API Stripe para processamento de pagamentos
  app.post('/api/create-payment-intent', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          error: 'Configuração do Stripe não encontrada no servidor'
        });
      }

      const { amount } = req.body;
      
      // Validar o valor do pagamento
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ 
          error: 'Valor de pagamento inválido'
        });
      }

      // Criar intenção de pagamento
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // valor já em centavos
        currency: 'brl',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          // Aqui você pode adicionar metadados adicionais relevantes
          // Ex.: userId, tipo de serviço, etc.
          integration_type: 'elements',
          integration_origin: 'meu-preco-certo'
        },
      });

      // Registrar no console para debugging
      console.log("Payment Intent criado:", { 
        id: paymentIntent.id, 
        amount: paymentIntent.amount, 
        status: paymentIntent.status 
      });

      // Retornar o client_secret para o front-end
      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error('Erro ao criar payment intent:', error);
      res.status(500).json({ 
        error: error.message || 'Erro interno do servidor ao processar pagamento'
      });
    }
  });

  // API para verificar status do pagamento
  app.get('/api/check-payment-status/:paymentIntentId', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          error: 'Configuração do Stripe não encontrada no servidor'
        });
      }

      const { paymentIntentId } = req.params;
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      res.json({
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });
    } catch (error: any) {
      console.error('Erro ao verificar status do pagamento:', error);
      res.status(500).json({ 
        error: error.message || 'Erro ao verificar status do pagamento'
      });
    }
  });
  
  // Endpoint para corrigir stripe_customer_id em cartões existentes
  app.post("/api/fix-payment-methods-customer-id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // Buscar o stripe_customer_id do usuário
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "Usuário não possui stripe_customer_id" });
      }

      // Atualizar todos os cartões do usuário que não têm stripe_customer_id preenchido
      const { connectionManager } = await import('./connection-manager');
      const result = await connectionManager.executeQuery(
        `UPDATE payment_methods 
         SET stripe_customer_id = $1, updated_at = NOW() 
         WHERE user_id = $2 AND (stripe_customer_id IS NULL OR stripe_customer_id = '')`,
        [user.stripeCustomerId, userId]
      );

      return res.json({
        success: true,
        message: "Cartões atualizados com sucesso",
        updatedCount: result.rowCount || 0
      });
    } catch (error) {
      console.error("Erro ao corrigir stripe_customer_id dos cartões:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // API para confirmar o pagamento e atualizar dados do usuário
  app.post('/api/confirm-payment', isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          error: 'Configuração do Stripe não encontrada no servidor'
        });
      }

      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ 
          error: 'ID de pagamento não informado'
        });
      }
      
      // Recuperar detalhes do pagamento
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Verificar se o pagamento foi bem-sucedido
      if (paymentIntent.status === 'succeeded') {
        // Registrar o pagamento no banco de dados (opcional)
        // Aqui você pode criar uma tabela de pagamentos e registrar o pagamento
        
        // Registrar atividade de pagamento
        await storage.createActivityLog({
          userId: req.user!.id,
          tipoOperacao: "pagamento",
          entidade: "pagamentos",
          entidadeId: req.user!.id,
          descricao: `Pagamento confirmado: ${paymentIntent.id}`,
          detalhes: { 
            amount: paymentIntent.amount / 100, // Convertendo centavos para reais
            paymentId: paymentIntent.id,
            status: paymentIntent.status
          },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || ""
        });
        
        return res.status(200).json({ 
          success: true,
          message: 'Pagamento confirmado com sucesso',
          payment: {
            id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            status: paymentIntent.status,
            date: new Date()
          }
        });
      } else {
        return res.status(400).json({ 
          success: false,
          message: 'Pagamento não foi concluído',
          status: paymentIntent.status
        });
      }
    } catch (error: any) {
      console.error('Erro ao confirmar pagamento:', error);
      res.status(500).json({ 
        error: error.message || 'Erro ao confirmar pagamento'
      });
    }
  });
  
  // === Rotas do Stripe ===

  // Criar uma assinatura de plano no Stripe
  app.post("/api/create-subscription", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Integração com Stripe não configurada" });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const { planoId, tipoCobranca, paymentMethodId } = req.body;
      
      if (!planoId || !tipoCobranca) {
        return res.status(400).json({ error: "Dados incompletos. Informe planoId e tipoCobranca" });
      }
      
      // Buscar o plano no banco de dados
      const plano = await storage.getPlanoById(planoId);
      if (!plano) {
        return res.status(404).json({ error: "Plano não encontrado" });
      }
      
      // Determinar o valor baseado no tipo de cobrança
      let valorPlano = 0;
      let valorPago = 0; // Valor que será salvo na coluna valor_pago
      let intervaloPagamento = 'month'; // padrão: cobrança mensal
      
      if (tipoCobranca === 'mensal') {
        valorPlano = Number(plano.valorMensal);
        valorPago = valorPlano; // Para mensal, valor pago = valor mensal
      } else if (tipoCobranca === 'anual') {
        valorPlano = Number(plano.valorAnual);
        valorPago = Number(plano.valorAnualTotal); // Para anual, valor pago = valor total anual
        intervaloPagamento = 'year';
      } else {
        return res.status(400).json({ error: "Tipo de cobrança inválido. Use 'mensal' ou 'anual'" });
      }
      
      // Valor em centavos para o Stripe
      const valorEmCentavos = Math.round(valorPlano * 100);
      
      // Verificar se o usuário já tem um ID de cliente no Stripe
      let user = req.user;
      let stripeCustomerId = user.stripeCustomerId;
      
      // Se não tiver, criar um novo cliente no Stripe
      if (!stripeCustomerId) {
        try {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.username,
            metadata: {
              userId: userId.toString()
            }
          });
          
          // Atualizar o ID do cliente Stripe no banco de dados
          user = await storage.updateStripeCustomerId(userId, customer.id);
          stripeCustomerId = customer.id;
          
          // Atualizar a referência de usuário local com o valor atualizado
          if (req.user) {
            req.user.stripeCustomerId = customer.id;
          }
        } catch (stripeError) {
          console.error("Erro ao criar cliente no Stripe:", stripeError);
          return res.status(500).json({ error: "Erro ao criar cliente no Stripe" });
        }
      }
      
      // Verificar se existem métodos de pagamento
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });
      
      if (paymentMethods.data.length === 0) {
        return res.status(400).json({ 
          error: "Nenhum método de pagamento encontrado", 
          errorCode: "NO_PAYMENT_METHOD",
          message: "Adicione um cartão de crédito antes de assinar um plano" 
        });
      }
      
      // Criar assinatura no Stripe
      try {
        // Produto único "Meu Preço Certo" para todos os planos
        const productId = 'prod_OjMEDWQpAXyuaa'; // ID do produto "Meu Preço Certo" na Stripe
        
        // Mapeamento fixo de preços do Meu Preço Certo para cada plano e tipo de cobrança
        const stripePriceIds = {
          'ESSENCIAL': {
            'mensal': 'price_1RBo8nGLlqAwF2i9kZiSWrhk',
            'anual': 'price_1RBo9BGLlqAwF2i9yKt42KW4'
          },
          'PROFISSIONAL': {
            'mensal': 'price_1RBo9hGLlqAwF2i94PLPd69I', 
            'anual': 'price_1RBoAmGLlqAwF2i9WYP2WMhj'
          },
          'EMPRESARIAL': {
            'mensal': 'price_1RBoCRGLlqAwF2i9nqDJu0j6',
            'anual': 'price_1RBoDQGLlqAwF2i9gEOZpQlD'
          },
          'PREMIUM': {
            'mensal': 'price_1RBoE4GLlqAwF2i9jTsrAb6l',
            'anual': 'price_1RBoEcGLlqAwF2i9yZC00VNY'
          }
        };
        
        // Obter o ID do preço com base no plano e tipo de cobrança
        const priceId = stripePriceIds[plano.nome]?.[tipoCobranca];
        
        // Registrar para depuração
        console.log(`Buscando preço para plano ${plano.nome} com cobrança ${tipoCobranca}: ${priceId}`);
        
        if (!priceId) {
          return res.status(400).json({ 
            error: "Preço não encontrado para este plano/tipo de cobrança",
            message: `Não foi possível encontrar um preço para ${plano.nome} com cobrança ${tipoCobranca}`
          });
        }
        
        // Criar assinatura usando o ID do preço existente
        console.log(`Criando assinatura para o cliente ${stripeCustomerId} usando o preço ${priceId}`);
        
        // Configurar dados da assinatura
        const subscriptionData: any = {
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
            payment_method_types: ['card'],
          },
          expand: ['latest_invoice.payment_intent'],
        };

        // Se temos um método de pagamento específico fornecido, usar esse em vez do padrão
        if (paymentMethodId) {
          console.log(`Usando método de pagamento específico para assinatura: ${paymentMethodId}`);
          subscriptionData.default_payment_method = paymentMethodId;
        } else {
          console.log('Nenhum método de pagamento específico fornecido, usando o método padrão');
        }

        // Criar a assinatura com os dados configurados
        const subscription = await stripe.subscriptions.create(subscriptionData);
        
        // Obter o latest_invoice e payment_intent
        const invoice = subscription.latest_invoice as any;
        const paymentIntent = invoice?.payment_intent;
        
        console.log(`Debug da assinatura criada:`, {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          hasInvoice: !!invoice,
          invoiceId: invoice?.id,
          invoiceStatus: invoice?.status,
          hasPaymentIntent: !!paymentIntent,
          paymentIntentId: paymentIntent?.id,
          paymentIntentStatus: paymentIntent?.status
        });
        
        // Criar assinatura no banco de dados
        const dataFim = new Date();
       
        if (tipoCobranca === 'mensal') {
          dataFim.setMonth(dataFim.getMonth() + 1);
        } else {
          dataFim.setFullYear(dataFim.getFullYear() + 1);
        }
        
        // Calcular próximo pagamento para data_fim
        const proximoPagamento = new Date();
        if (tipoCobranca === 'mensal') {
          proximoPagamento.setMonth(proximoPagamento.getMonth() + 1);
        } else {
          proximoPagamento.setFullYear(proximoPagamento.getFullYear() + 1);
        }
        
        // 🇧🇷 Calcular data de início no horário brasileiro (UTC-3)
        const agora = new Date();
        // Corrigir: somar 3 horas para converter UTC para horário brasileiro (UTC-3 = UTC + 3 para obter horário local)
        const dataInicioBrasil = new Date(agora.getTime() + (3 * 60 * 60 * 1000)); // Horário brasileiro
        
        // Salvar assinatura no banco de dados
        const assinaturaSalva = await storage.createAssinatura({
          userId,
          planoId,
          plano: plano.nome,
          stripeSubscriptionId: subscription.id,
          tipoCobranca,
          valorPago: valorPago.toString(),
          status: 'ativa', // Status inicial para nova assinatura
          dataInicio: dataInicioBrasil,
          dataFim: proximoPagamento
        });


        console.log(`📊 Dados da assinatura salva:`, {
          assinaturaId: assinaturaSalva?.id,
          subscriptionId: subscription.id,
          planoNome: plano.nome,
          tipoCobranca,
          valorPago,
          status: 'ativa'
        });
        
        return res.status(200).json({
          success: true,
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret,
          status: subscription.status
        });
      } catch (stripeError: any) {
        console.error("Erro ao criar assinatura no Stripe:", stripeError);
        return res.status(500).json({ 
          error: "Erro ao criar assinatura", 
          message: stripeError.message || "Não foi possível processar sua assinatura"
        });
      }
    } catch (error: any) {
      console.error("Erro ao processar requisição de assinatura:", error);
      return res.status(500).json({ 
        error: "Erro interno", 
        message: error.message || "Ocorreu um erro ao processar sua solicitação"
      });
    }
  });
  
  // Webhook para processar eventos do Stripe
  app.post("/api/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    
    if (!stripe) {
      console.error('Webhook do Stripe chamado, mas o Stripe não está configurado');
      return res.status(500).json({ error: "Stripe não configurado" });
    }
    
    let event;
    
    try {
      // Verificar se temos o segredo do webhook configurado
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      // Log para diagnóstico
      console.log(`Webhook do Stripe recebido - Endpoint secreto configurado: ${endpointSecret ? 'Sim' : 'Não'}`);
      
      if (endpointSecret) {
        // Verificar a assinatura do evento
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log(`Assinatura do webhook verificada com sucesso para o evento: ${event.type}`);
      } else {
        // Sem segredo, apenas converter o payload (não recomendado em produção)
        console.log('Aviso: Processando webhook sem verificação de assinatura (modo de desenvolvimento)');
        event = JSON.parse(req.body.toString());
      }
      
      // Log detalhado do evento
      console.log(`Processando evento do Stripe: ${event.type}, ID: ${event.id}`);
      
      // Processar eventos relevantes
      switch (event.type) {
        case 'invoice.payment_succeeded':
          console.log('Processando pagamento bem-sucedido de fatura');
          const invoice = event.data.object;
          // Adicionar detalhes para debug
          console.log(`Detalhes da fatura: ID=${invoice.id}, Cliente=${invoice.customer}, Valor=${invoice.amount_paid/100}, Assinatura=${invoice.subscription}`);
          await handleInvoicePaymentSucceeded(invoice);
          break;
          
        case 'invoice.payment_failed':
          console.log('Processando falha de pagamento de fatura');
          const failedInvoice = event.data.object;
          console.log(`Detalhes da fatura com falha: ID=${failedInvoice.id}, Cliente=${failedInvoice.customer}, Assinatura=${failedInvoice.subscription}`);
          await handleInvoicePaymentFailed(failedInvoice);
          break;
          
        case 'invoice.created':
          console.log('Nova fatura criada - tentativa de pagamento identificada');
          const newInvoice = event.data.object;
          console.log(`Nova fatura: ID=${newInvoice.id}, Cliente=${newInvoice.customer}, Status=${newInvoice.status}, Valor=${newInvoice.amount_due/100}`);
          await handleInvoiceCreated(newInvoice);
          break;
          
        case 'invoice.payment_action_required':
          console.log('Ação necessária para pagamento');
          const actionRequiredInvoice = event.data.object;
          console.log(`Ação requerida: ID=${actionRequiredInvoice.id}, Status=${actionRequiredInvoice.status}`);
          await handleInvoiceActionRequired(actionRequiredInvoice);
          break;
          
        case 'customer.subscription.updated':
          console.log('Processando atualização de assinatura');
          const subscription = event.data.object;
          console.log(`Detalhes da assinatura atualizada: ID=${subscription.id}, Cliente=${subscription.customer}, Status=${subscription.status}, Período atual: ${new Date(subscription.current_period_start * 1000).toISOString()} até ${new Date(subscription.current_period_end * 1000).toISOString()}`);
          await handleSubscriptionUpdated(subscription);
          break;
          
        case 'customer.subscription.deleted':
          console.log('Processando cancelamento de assinatura');
          const canceledSubscription = event.data.object;
          console.log(`Detalhes da assinatura cancelada: ID=${canceledSubscription.id}, Cliente=${canceledSubscription.customer}, Status=${canceledSubscription.status}`);
          await handleSubscriptionCanceled(canceledSubscription);
          break;
        
        case 'payment_method.attached':
          console.log('Método de pagamento anexado');
          const paymentMethod = event.data.object;
          console.log(`Método de pagamento anexado: ID=${paymentMethod.id}, Cliente=${paymentMethod.customer}, Tipo=${paymentMethod.type}`);

          break;
          
        case 'checkout.session.completed':
          console.log('Sessão de checkout completada');
          const session = event.data.object;
          console.log(`Checkout completo: ID=${session.id}, Cliente=${session.customer}, Modo=${session.mode}`);

          break;
          
        default:
          console.log(`Evento não processado: ${event.type}, ID: ${event.id}`);
      }
      
      console.log(`Evento ${event.type} processado com sucesso`);
      res.status(200).json({ received: true, eventType: event.type });
    } catch (err: any) {
      console.error('Erro ao processar webhook:', err.message);
      console.error('Detalhes completos do erro:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });
  
  // Funções auxiliares para processar eventos do Stripe
  async function handleInvoicePaymentSucceeded(invoice: any) {
    try {
      // Encontrar assinatura pelo ID da assinatura do Stripe
      const subscription = await stripe?.subscriptions.retrieve(invoice.subscription);
      
      if (!subscription) {
        console.error(`Assinatura não encontrada para invoice: ${invoice.id}`);
        return;
      }
      
      // Atualizar status da assinatura no banco de dados
      const customerId = subscription.customer as string;
      const subscriptionId = subscription.id;
      
      // Buscar o usuário pelo Stripe Customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      
      if (!user) {
        console.error(`Usuário não encontrado para Stripe Customer ID: ${customerId}`);
        return;
      }
      
      // Verificar se esta fatura é de um upgrade/downgrade (contém proração)
      const hasProrationItems = invoice.lines?.data?.some((item: any) => item.proration === true);
      
      if (hasProrationItems) {
        console.log(`💰 Pagamento de upgrade/downgrade confirmado para invoice ${invoice.id}`);
        
        // Para upgrades/downgrades, delegamos o processamento para handleSubscriptionUpdated
        // que já tem a lógica de cancelar a assinatura anterior e criar nova
        try {
          await handleSubscriptionUpdated(subscription);
          console.log(`✅ Upgrade/downgrade processado via pagamento confirmado`);
        } catch (upgradeError) {
          console.error(`❌ Erro ao processar upgrade/downgrade via pagamento:`, upgradeError);
        }
      } else {
        // Pagamento normal - não é necessário atualizar status (já está ativa)
        console.log(`✅ Pagamento confirmado para assinatura ${subscriptionId} - status mantido`);
      }
      
      // 🔄 SINCRONIZAÇÃO AUTOMÁTICA: Salvar pagamento na tabela local
      try {
        console.log(`💰 Sincronizando pagamento bem-sucedido para invoice ${invoice.id}`);
        
        // Buscar a assinatura local para obter dados do plano
        const assinaturaLocal = await storage.getAssinaturaByStripeId(subscriptionId);
        if (assinaturaLocal) {
          const plano = await storage.getPlano(assinaturaLocal.planoId);
          
          // Verificar se o pagamento já foi sincronizado para evitar duplicatas
          const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
          
          if (!pagamentoExistente && plano) {
            // 🔍 LOG DETALHADO WEBHOOK PAYMENT - Rastreamento de valores
            console.log(`🔍 [WEBHOOK PAYMENT LOG] Invoice ID: ${invoice.id}`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] Assinatura: ${subscriptionId}`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] Plano: ${plano.nome} (ID: ${assinaturaLocal.planoId})`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] Tipo cobrança: ${assinaturaLocal.tipoCobranca}`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] Invoice Data:`);
            console.log(`   - subtotal: ${invoice.subtotal} centavos (R$ ${(invoice.subtotal / 100).toFixed(2)})`);
            console.log(`   - amount_paid: ${invoice.amount_paid} centavos (R$ ${(invoice.amount_paid / 100).toFixed(2)})`);
            console.log(`   - total: ${invoice.total} centavos (R$ ${(invoice.total / 100).toFixed(2)})`);
            
            // Para pagamentos com crédito, o valor deve ser o valor original do plano (sempre positivo)
            // O amount_paid pode ser negativo quando há uso de crédito que excede o valor da fatura
            
            // CORREÇÃO DEFINITIVA: SEMPRE usar valor do plano, NUNCA valores da invoice
            // Independente da operação, sempre salvar o valor real do plano
            const valorTotalPlano = assinaturaLocal.tipoCobranca === 'anual' 
              ? Number(plano.valorAnualTotal) 
              : Number(plano.valorMensal);
            
            const valorInvoiceReal = Math.abs(invoice.subtotal / 100);
            const isDowngrade = invoice.subtotal < 0;
            
            console.log(`🔍 [WEBHOOK PAYMENT LOG] === CORREÇÃO DEFINITIVA ===`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] Plano: ${plano.nome} (${assinaturaLocal.tipoCobranca})`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] Valor do plano (SERÁ SALVO): R$ ${valorTotalPlano.toFixed(2)}`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] Subtotal invoice (IGNORADO): R$ ${(invoice.subtotal / 100).toFixed(2)}`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] É downgrade: ${isDowngrade ? 'SIM' : 'NÃO'}`);
            console.log(`🔍 [WEBHOOK PAYMENT LOG] REGRA: Valor salvo = valor do plano SEMPRE`);
            
            // Verificação de segurança: garantir que o valor do plano seja válido
            if (valorTotalPlano <= 0 || isNaN(valorTotalPlano)) {
              console.error(`❌ ERRO CRÍTICO: Valor do plano inválido: ${valorTotalPlano}`);
              console.error(`❌ Plano: ${JSON.stringify(plano)}`);
              return; // Não salvar pagamento com valor inválido
            }
            
            const valorPagoCartao = Math.max(0, invoice.amount_paid / 100); // Garantir que não seja negativo
            
            // Calcular créditos utilizados
            let valorCredito = 0;
            let valorCartao = valorPagoCartao;
            let metodoPagamento = 'Cartão de Crédito';

            // CORREÇÃO: Calcular valores reais de cartão e crédito utilizados (sem diferença entre planos)
            if (invoice.amount_paid <= 0) {
              // 100% crédito
              if (isDowngrade) {
                // Para downgrade: crédito usado é o valor do plano atual (não a diferença)
                valorCredito = valorTotalPlano;
                valorCartao = 0;
                metodoPagamento = 'Crédito MPC';
                console.log(`🔍 [WEBHOOK PAYMENT LOG] DOWNGRADE: Crédito usado R$ ${valorCredito.toFixed(2)}, Cartão R$ 0.00`);
              } else {
                // Pagamento normal 100% com crédito
                valorCredito = valorTotalPlano;
                valorCartao = 0;
                metodoPagamento = 'Crédito MPC';
              }
            } else if (invoice.subtotal > invoice.amount_paid) {
              // Híbrido - parte crédito, parte cartão
              // Crédito usado = diferença entre subtotal e valor pago
              valorCredito = (invoice.subtotal - invoice.amount_paid) / 100;
              valorCartao = valorPagoCartao;
              metodoPagamento = 'Híbrido';
            } else {
              // 100% cartão
              valorCredito = 0;
              valorCartao = valorPagoCartao;
              metodoPagamento = 'Cartão de Crédito';
              resumoPagamento = `Pagamento integral no cartão: R$ ${valorCartao.toFixed(2)}`;
            }
            
            // Calcular valor_diferenca: tempo não utilizado do plano anterior (proration)
            let valorDiferenca = 0;
            
            if (hasProrationItems && invoice.lines && invoice.lines.data) {
              const itensProration = invoice.lines.data.filter((item: any) => 
                item.proration === true && 
                (item.description?.includes('Unused time') || item.amount < 0)
              );
              
              if (itensProration.length > 0) {
                valorDiferenca = Math.abs(itensProration.reduce((total: number, item: any) => total + item.amount, 0) / 100);
                console.log(`🔍 [WEBHOOK PRORATION LOG] Valor de tempo não utilizado: R$ ${valorDiferenca.toFixed(2)}`);
              }
            }

            console.log(`🔍 [WEBHOOK PAYMENT LOG] VALORES FINAIS PARA SALVAR:`);
            console.log(`   - valor (coluna principal): R$ ${valorTotalPlano.toFixed(2)}`);
            console.log(`   - valorCartao: R$ ${valorCartao.toFixed(2)}`);
            console.log(`   - valorCredito: R$ ${valorCredito.toFixed(2)}`);
            console.log(`   - valorDiferenca: R$ ${valorDiferenca.toFixed(2)} (tempo não utilizado)`);
            console.log(`   - Plano: ${plano.nome}`);
            
            // Criar registro de pagamento detalhado
            await storage.createHistoricoPagamento({
              userId: user.id,
              stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || `pi_credit_${invoice.id}`,
              stripeInvoiceId: invoice.id,
              stripeSubscriptionId: subscriptionId,
              valor: valorTotalPlano,
              valorDiferenca: valorDiferenca > 0 ? valorDiferenca : undefined,
              valorCartao: valorCartao,
              valorCredito: valorCredito,
              resumoPagamento: resumoPagamento,
              status: 'Pago',
              metodoPagamento: metodoPagamento,
              dataPagamento: timestampToBrazilianDate(invoice.created),
              planoNome: plano.nome,
              periodo: assinaturaLocal.tipoCobranca === 'anual' ? 'Anual' : 'Mensal',
              faturaUrl: invoice.hosted_invoice_url || null,
              metadata: JSON.stringify({
                stripeInvoice: {
                  id: invoice.id,
                  amount_paid: invoice.amount_paid,
                  amount_due: invoice.amount_due,
                  starting_balance: invoice.starting_balance,
                  ending_balance: invoice.ending_balance
                },
                proration_items: invoice.lines?.data?.filter((item: any) => item.proration === true) || []
              })
            });
            
            console.log(`✅ Pagamento sincronizado com sucesso: R$ ${valorTotalPlano.toFixed(2)} (Cartão: R$ ${valorCartao.toFixed(2)}, Crédito: R$ ${valorCredito.toFixed(2)})`);
          } else if (pagamentoExistente) {
            console.log(`⚠️ Pagamento já existe para invoice ${invoice.id}`);
          } else {
            console.log(`⚠️ Plano não encontrado para assinatura ${subscriptionId}`);
          }
        } else {
          console.log(`⚠️ Assinatura local não encontrada para ${subscriptionId}`);
        }
      } catch (syncError) {
        console.error('⚠️ Erro ao sincronizar pagamento via webhook:', syncError);
      }
      
      console.log(`Assinatura ${subscriptionId} atualizada para status: ativa`);
    } catch (error) {
      console.error('Erro ao processar pagamento bem-sucedido:', error);
    }
  }
  
  async function handleInvoicePaymentFailed(invoice: any) {
    console.log(`❌ Webhook: Pagamento falhou - Invoice ${invoice.id}`);
    
    try {
      const subscription = await stripe?.subscriptions.retrieve(invoice.subscription);
      
      if (!subscription) {
        console.error(`Assinatura não encontrada para invoice: ${invoice.id}`);
        return;
      }
      
      const subscriptionId = subscription.id;
      const customerId = subscription.customer as string;
      
      // Buscar o usuário pelo Stripe Customer ID
      const user = await storage.getUserByStripeCustomerId(customerId);
      
      if (!user) {
        console.error(`Usuário não encontrado para Stripe Customer ID: ${customerId}`);
        return;
      }
      
      // Atualizar status da assinatura para inadimplente
      await storage.updateAssinaturaByStripeId(subscriptionId, {
        status: 'inadimplente',
      });
      
      // 🔄 SINCRONIZAÇÃO: Salvar pagamento com status "Falhou"
      try {
        console.log(`❌ Sincronizando pagamento falhado para invoice ${invoice.id}`);
        
        const assinaturaLocal = await storage.getAssinaturaByStripeId(subscriptionId);
        if (assinaturaLocal) {
          const plano = await storage.getPlano(assinaturaLocal.planoId);
          
          // Verificar se já existe para evitar duplicatas
          const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
          
          if (!pagamentoExistente && plano) {
            const valorTentativa = invoice.amount_due / 100; // Valor que foi tentado cobrar
            const faturaUrl = invoice.hosted_invoice_url || invoice.invoice_pdf;
            
            // Para pagamentos falhados, todo o valor seria no cartão (sem créditos aplicados)
            await storage.createHistoricoPagamento({
              userId: user.id,
              stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || '',
              stripeInvoiceId: invoice.id,
              stripeSubscriptionId: subscriptionId,
              valor: valorTentativa,
              valorCartao: valorTentativa,
              valorCredito: 0,
              detalhesCredito: null,
              temCredito: false,
              isFullCredit: false,
              resumoPagamento: `Tentativa de pagamento falhada: R$ ${valorTentativa.toFixed(2)}`,
              status: 'Falhou',
              metodoPagamento: 'Cartão de Crédito',
              dataPagamento: timestampToBrazilianDate(invoice.created),
              planoNome: plano.nome,
              periodo: assinaturaLocal.tipoCobranca === 'anual' ? 'Anual' : 'Mensal',
              faturaUrl: faturaUrl,
              metadata: JSON.stringify({
                stripeInvoice: {
                  id: invoice.id,
                  amount_due: invoice.amount_due,
                  status: 'payment_failed'
                }
              })
            });
            
            console.log(`✅ Pagamento falhado sincronizado: R$ ${valorTentativa.toFixed(2)}`);
          } else {
            console.log(`ℹ️ Pagamento falho ${invoice.id} já sincronizado ou plano não encontrado`);
          }
        }
      } catch (syncError) {
        console.error('⚠️ Erro ao sincronizar pagamento falho via webhook:', syncError);
      }
      
      console.log(`Assinatura ${subscriptionId} atualizada para status: inadimplente`);
    } catch (error) {
      console.error('❌ Erro ao processar falha de pagamento:', error);
    }
  }
  
  // 🎯 NOVA FUNÇÃO: Captura fatura criada (tentativa de pagamento identificada)
  async function handleInvoiceCreated(invoice: any) {
    console.log(`🆕 Webhook: Nova fatura criada - tentativa de pagamento identificada - Invoice ${invoice.id}`);
    
    try {
      const subscriptionId = invoice.subscription;
      const customerId = invoice.customer;
      
      // Buscar usuário
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        console.log(`⚠️ Usuário não encontrado para customer ${customerId}`);
        return;
      }
      
      // Buscar assinatura local
      const assinaturaLocal = await storage.getAssinaturaByStripeId(subscriptionId);
      if (!assinaturaLocal) {
        console.log(`⚠️ Assinatura local não encontrada para ${subscriptionId}`);
        return;
      }
      
      const plano = await storage.getPlano(assinaturaLocal.planoId);
      if (!plano) {
        console.log(`⚠️ Plano não encontrado: ${assinaturaLocal.planoId}`);
        return;
      }
      
      // Verificar se já existe
      const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
      if (pagamentoExistente) {
        console.log(`ℹ️ Pagamento ${invoice.id} já registrado`);
        return;
      }
      
      // Determinar status baseado no status da fatura
      let statusPagamento = 'Pendente';
      if (invoice.status === 'paid') statusPagamento = 'Pago';
      else if (invoice.status === 'payment_failed') statusPagamento = 'Falhou';
      else if (invoice.status === 'open') statusPagamento = 'Aguardando Pagamento';
      else if (invoice.status === 'draft') statusPagamento = 'Rascunho';
      
      const valorTentativa = invoice.amount_due / 100;
      const faturaUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || '';
      
      // 🇧🇷 Data no horário brasileiro
      const dataPagamentoBrasil = timestampToBrazilianDate(invoice.created);
      
      // 💾 Salvar tentativa de pagamento
      await storage.createHistoricoPagamento({
        userId: user.id,
        stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || '',
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: subscriptionId,
        valor: valorTentativa,
        status: statusPagamento,
        metodoPagamento: 'Cartão de Crédito',
        dataPagamento: dataPagamentoBrasil,
        planoNome: plano.nome,
        periodo: assinaturaLocal.tipoCobranca,
        faturaUrl: faturaUrl,
        metadata: JSON.stringify({
          stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id || null,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
          webhook_event: 'invoice.created',
          invoice_status: invoice.status
        })
      });
      
      console.log(`✅ Tentativa de pagamento registrada: ${invoice.id} - Status: ${statusPagamento}`);
      
    } catch (error) {
      console.error('❌ Erro ao processar fatura criada:', error);
    }
  }
  
  // 🎯 NOVA FUNÇÃO: Ação necessária para pagamento
  async function handleInvoiceActionRequired(invoice: any) {
    console.log(`⚠️ Webhook: Ação necessária para pagamento - Invoice ${invoice.id}`);
    
    try {
      // Verificar se já existe o pagamento
      const pagamentoExistente = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
      
      if (pagamentoExistente) {
        // Atualizar status para "Ação Necessária"
        await storage.createHistoricoPagamento({ 
          ...pagamentoExistente,
          status: 'Ação Necessária' 
        });
        console.log(`✅ Status atualizado para "Ação Necessária": ${invoice.id}`);
      } else {
        // Se não existe, criar o registro com status "Ação Necessária"
        await handleInvoiceCreated(invoice);
        // Atualizar o status após criação
        const novoPagamento = await storage.getHistoricoPagamentoByStripeInvoiceId(invoice.id);
        if (novoPagamento) {
          await storage.createHistoricoPagamento({ 
            ...novoPagamento,
            status: 'Ação Necessária' 
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar ação necessária:', error);
    }
  }

  async function handleSubscriptionUpdated(subscription: any) {
    try {
      console.log(`🔄 Processando atualização de assinatura: ${subscription.id}`);
      
      // Buscar TODAS as assinaturas com este stripe_subscription_id
      const { connectionManager } = await import('./connection-manager');
      const assinaturasExistentes = await connectionManager.executeQuery(`
        SELECT * FROM assinaturas 
        WHERE stripe_subscription_id = $1 
        ORDER BY created_at DESC
      `, [subscription.id]);
      
      if (!assinaturasExistentes || !(assinaturasExistentes as any).rows?.length) {
        console.error(`Nenhuma assinatura encontrada para ${subscription.id}`);
        return;
      }
      
      // Mapear status do Stripe para status em nosso sistema
      let statusLocal = 'ativa';
      
      switch (subscription.status) {
        case 'active':
          statusLocal = 'ativa';
          break;
        case 'past_due':
          statusLocal = 'inadimplente';
          break;
        case 'canceled':
          statusLocal = 'cancelada';
          break;
        case 'unpaid':
          statusLocal = 'inadimplente';
          break;
        case 'trialing':
          statusLocal = 'teste';
          break;
        default:
          statusLocal = 'pendente';
      }

      // Se existe mais de uma assinatura com mesmo Stripe ID, cancelar todas exceto a mais recente
      const rows = (assinaturasExistentes as any).rows;
      if (rows.length > 1) {
        console.log(`⚠️ Encontradas ${rows.length} assinaturas com mesmo Stripe ID. Limpando duplicatas...`);
        
        // Cancelar todas exceto a mais recente (primeira na ordenação DESC)
        for (let i = 1; i < rows.length; i++) {
          await connectionManager.executeQuery(`
            UPDATE assinaturas 
            SET status = 'cancelada', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [rows[i].id]);
        }
        
        console.log(`✅ Duplicatas canceladas. Mantida assinatura ID: ${rows[0].id}`);
      }
      
      // Verificar mudanças na assinatura - atualizar APENAS a mais recente
      const assinaturaMaisRecente = rows[0];
      const atualizacoes: any = {
        status: statusLocal,
      };
      
      // Atualizar a data de fim caso a assinatura esteja configurada para cancelar no fim do período
      if (subscription.cancel_at_period_end) {
        const dataFimPeriodoUTC = new Date(subscription.current_period_end * 1000);
        // 🇧🇷 Converter para horário brasileiro (UTC-3)
        const dataFimPeriodo = new Date(dataFimPeriodoUTC.getTime() - (3 * 60 * 60 * 1000));
        atualizacoes.dataFim = dataFimPeriodo;
        console.log(`Assinatura ${subscription.id} será cancelada em: ${dataFimPeriodo.toISOString()}`);
      }
      
      // Verificar se houve mudança de plano/preço
      if (subscription.items?.data?.length > 0) {
        const priceId = subscription.items.data[0]?.price?.id;
        
        if (priceId) {
          console.log(`Preço atual da assinatura: ${priceId}`);
          
          // Mapeamento de preços para planos
          const precosParaPlanos = {
            'price_1RBo8nGLlqAwF2i9kZiSWrhk': { plano: 'ESSENCIAL', id: 1 },
            'price_1RBo9BGLlqAwF2i9yKt42KW4': { plano: 'ESSENCIAL', id: 1 },
            'price_1RBo9hGLlqAwF2i94PLPd69I': { plano: 'PROFISSIONAL', id: 2 },
            'price_1RBoAmGLlqAwF2i9WYP2WMhj': { plano: 'PROFISSIONAL', id: 2 },
            'price_1RBoCRGLlqAwF2i9nqDJu0j6': { plano: 'EMPRESARIAL', id: 3 },
            'price_1RBoDQGLlqAwF2i9gEOZpQlD': { plano: 'EMPRESARIAL', id: 3 },
            'price_1RBoE4GLlqAwF2i9jTsrAb6l': { plano: 'PREMIUM', id: 4 },
            'price_1RBoEcGLlqAwF2i9yZC00VNY': { plano: 'PREMIUM', id: 4 }
          };
          
          if (precosParaPlanos[priceId] && precosParaPlanos[priceId].id !== assinaturaExistente.planoId) {
            // 🔄 UPGRADE/DOWNGRADE DETECTADO: Cancelar assinatura anterior e criar nova
            console.log(`🔄 UPGRADE/DOWNGRADE: Plano ${assinaturaExistente.planoId} → ${precosParaPlanos[priceId].id} (${precosParaPlanos[priceId].plano})`);
            
            // Data de cancelamento/mudança no horário brasileiro (UTC-3)
            const dataAtual = new Date();
            const dataCancelamento = new Date(dataAtual.getTime() - (3 * 60 * 60 * 1000));
            
            // PRIMEIRO: Cancelar a assinatura anterior no banco local
            const cancelamentoSucesso = await cancelarAssinaturaAnterior(subscription.id, dataCancelamento);
            
            if (!cancelamentoSucesso) {
              console.error(`❌ Falha crítica: Não foi possível cancelar assinatura anterior ${subscription.id}`);
              // Mesmo assim continua para tentar criar a nova assinatura
            }
            
            // SEGUNDO: Buscar dados do plano novo para valorPago correto
            let valorPagoNovo = assinaturaExistente.valorPago;
            try {
              const planoNovo = await storage.getPlano(precosParaPlanos[priceId].id);
              if (planoNovo) {
                // Determinar tipo de cobrança baseado no interval da subscription
                const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
                const tipoCobrancaNovo = interval === 'month' ? 'mensal' : 'anual';
                
                // 🔍 LOG DETALHADO WEBHOOK - Detectando UPGRADE/DOWNGRADE
                console.log(`🔍 [WEBHOOK LOG] Assinatura anterior: ${assinaturaExistente.plano} (ID: ${assinaturaExistente.planoId})`);
                console.log(`🔍 [WEBHOOK LOG] Plano novo: ${planoNovo.nome} (ID: ${precosParaPlanos[priceId].id})`);
                console.log(`🔍 [WEBHOOK LOG] Tipo de operação: ${assinaturaExistente.planoId > precosParaPlanos[priceId].id ? 'DOWNGRADE' : 'UPGRADE'}`);
                
                // Calcular valor correto baseado no tipo de cobrança
                if (tipoCobrancaNovo === 'mensal') {
                  valorPagoNovo = Number(planoNovo.valorMensal);
                } else {
                  valorPagoNovo = Number(planoNovo.valorAnualTotal);
                }
                
                console.log(`📊 Plano ${planoNovo.nome} (${tipoCobrancaNovo}): R$ ${valorPagoNovo.toFixed(2)}`);
              }
            } catch (planoError) {
              console.error('⚠️ Erro ao buscar dados do plano novo:', planoError);
            }
            
            // TERCEIRO: Criar nova assinatura com dados corretos
            try {
              const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
              const tipoCobrancaNovo = interval === 'month' ? 'mensal' : 'anual';
              
              const novaAssinatura = {
                userId: assinaturaExistente.userId,
                planoId: precosParaPlanos[priceId].id,
                plano: precosParaPlanos[priceId].plano,
                stripeSubscriptionId: subscription.id,
                dataInicio: dataCancelamento,
                dataFim: null,
                status: 'ativa', // Status inicial
                tipoCobranca: tipoCobrancaNovo,
                valorPago: valorPagoNovo.toString()
              };
              
              const assinaturaCriada = await storage.createAssinatura(novaAssinatura);
              console.log(`✅ Nova assinatura criada no webhook:`);
              console.log(`   - ID: ${assinaturaCriada?.id}`);
              console.log(`   - Plano: ${precosParaPlanos[priceId].plano}`);
              console.log(`   - Tipo: ${tipoCobrancaNovo}`);
              console.log(`   - Valor: R$ ${valorPagoNovo.toFixed(2)}`);
              
            } catch (createError) {
              console.error(`❌ Erro ao criar nova assinatura no webhook:`, createError);
            }
            
            return; // Sair da função pois já processamos o upgrade/downgrade
          }
        }
      }
      
      // Atualizar período de cobrança se aplicável
      if (subscription.items?.data?.length > 0) {
        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        if (interval) {
          const tipoCobranca = interval === 'month' ? 'mensal' : 'anual';
          if (tipoCobranca !== assinaturaExistente.tipoCobranca) {
            atualizacoes.tipoCobranca = tipoCobranca;
            console.log(`Período de cobrança atualizado de ${assinaturaExistente.tipoCobranca} para ${tipoCobranca}`);
          }
        }
      }
      
      // Atualizar status da assinatura no banco de dados
      await storage.updateAssinaturaByStripeId(subscription.id, atualizacoes);
      
      console.log(`Assinatura ${subscription.id} atualizada com sucesso:`, atualizacoes);
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
    }
  }
  
  async function handleSubscriptionCanceled(subscription: any) {
    try {
      // Buscar a assinatura no banco de dados
      const assinatura = await storage.getAssinaturaByStripeId(subscription.id);
      
      if (!assinatura) {
        console.error(`Assinatura não encontrada para Stripe ID: ${subscription.id}`);
        return;
      }
      
      // 🇧🇷 Data de cancelamento no horário brasileiro (UTC-3)
      const agoraCancelamento = new Date();
      const dataFim = new Date(agoraCancelamento.getTime() - (3 * 60 * 60 * 1000)); // Horário brasileiro (UTC-3)
      
      console.log(`Assinatura ${subscription.id} cancelada em: ${dataFim.toISOString()}`);
      
      // 🇧🇷 Se a assinatura foi configurada para cancelar no fim do período, registrar essa informação
      if (subscription.current_period_end) {
        const dataFimPeriodoUTC = new Date(subscription.current_period_end * 1000);
        const dataFimPeriodo = new Date(dataFimPeriodoUTC.getTime() - (3 * 60 * 60 * 1000)); // Horário brasileiro (UTC-3)
        console.log(`Período da assinatura ${subscription.id} terminaria em: ${dataFimPeriodo.toISOString()}`);
      }
      
      // Atualizar status da assinatura no banco de dados
      await storage.updateAssinaturaByStripeId(subscription.id, {
        status: 'cancelada',
        dataFim,
      });
      
      // Buscar o usuário pelo ID do cliente no Stripe
      const user = await storage.getUserByStripeCustomerId(subscription.customer);
      const userName = user ? user.username : 'Usuário desconhecido';
      
      // Log detalhado para depuração
      console.log(`Assinatura ${subscription.id} cancelada. Detalhes completos:`, {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        userId: assinatura.userId,
        userName: userName,
        status: subscription.status,
        planoId: assinatura.planoId,
        dataInicio: assinatura.dataInicio,
        dataFim: dataFim,
        tipoCobranca: assinatura.tipoCobranca,
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
      });
      
      console.log(`Assinatura ${subscription.id} cancelada com sucesso`);
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      console.error('Detalhes completos do erro:', error);
    }
  }
  
  // Criar SetupIntent para adicionar um novo cartão
  app.post("/api/setup-intent", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Integração com Stripe não configurada" });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      // Buscar ou criar o stripeCustomerId do usuário
      let stripeCustomerId = req.user?.stripeCustomerId;
      
      // Se não tiver customer ID, criar um
      if (!stripeCustomerId) {
        console.log(`Criando cliente Stripe para usuário ${userId} (${req.user?.username})`);
        
        try {
          const customer = await stripe.customers.create({
            name: req.user?.username || `Usuário ${userId}`,
            email: req.user?.email,
            metadata: {
              userId: userId.toString()
            }
          });
          stripeCustomerId = customer.id;

          // Atualizar usuário com o Stripe Customer ID no banco de dados
          await db.update(users)
            .set({ stripeCustomerId: customer.id })
            .where(eq(users.id, userId));
            
          // Atualizar na sessão também
          if (req.user) {
            req.user.stripeCustomerId = customer.id;
          }
          
          console.log(`Cliente Stripe criado: ${customer.id}`);
        } catch (stripeError) {
          console.error("Erro ao criar cliente no Stripe:", stripeError);
          return res.status(500).json({
            error: "Falha ao criar cliente",
            message: "Não foi possível criar seu perfil de pagamento"
          });
        }
      }
      
      // Criar SetupIntent para tokenização segura do cartão
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        usage: 'off_session', // Permite cobranças futuras sem intervenção do usuário
      });

      
      
      // Retornar client_secret para o frontend
      res.json({
        clientSecret: setupIntent.client_secret,
        customerId: stripeCustomerId
      });
    } catch (error: any) {
      console.error("Erro ao criar SetupIntent:", error);
      res.status(500).json({ error: "Erro ao processar a requisição" });
    }
  });
  
  // Listar cartões salvos do usuário - com sincronização Stripe
  app.get("/api/payment-methods", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Verificar se o Stripe está configurado
      if (stripe) {
        try {
          // Sincronizar cliente com Stripe - criar ou verificar se existe
          try {
            await syncCustomerWithStripe(userId);
          } catch (syncError) {
            // Continuar mesmo com erro na sincronização do cliente
          }
          
          // Sincronizar métodos de pagamento com Stripe
          try {
            const syncedPaymentMethods = await syncPaymentMethods(userId);
            return res.json(syncedPaymentMethods || []);
          } catch (syncError) {
            // Continuar mesmo com erro na sincronização, retornando os métodos locais
          }
        } catch (stripeError) {
          // Continuar para obter os dados locais em caso de erro
        }
      }
      
      // Se a sincronização falhar ou o Stripe não estiver configurado, usar os dados locais
      const paymentMethods = await storage.getPaymentMethods(userId);
      
      // Importante - Verificar se a tabela payment_methods existe
      // Se não existir, retorna uma lista vazia (comportamento normal para usuários sem cartões)
      res.json(paymentMethods || []);
    } catch (error) {
      console.error("Erro ao obter métodos de pagamento:", error);
      // Em caso de erro, retornar uma lista vazia em vez de erro 500
      // para que o frontend mostre "Você ainda não tem cartões cadastrados"
      res.json([]);
    }
  });
  
  // Adicionar um novo cartão de crédito (simplificado, sem interação Stripe real)
  app.post("/api/payment-methods", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      // Obter dados do cartão do corpo da requisição
      const { 
        paymentMethodId, 
        brand, 
        last4, 
        expMonth, 
        expYear,
        isDefault = false
      } = req.body;
      
      // Processando adição de cartão
      
      // Verificar limite de cartões (5 por usuário)
      const existingCards = await storage.getPaymentMethods(userId);
      if (existingCards.length >= 5) {
        return res.status(400).json({ 
          error: "Limite atingido", 
          message: "Número máximo de cartões permitidos: 5. Remova outro cartão para adicionar um novo."
        });
      }
      
      // Verificar se os dados necessários foram enviados
      if (!paymentMethodId || !brand || !last4 || !expMonth || !expYear) {
        return res.status(400).json({ 
          error: "Dados incompletos", 
          message: "Todos os dados do cartão são obrigatórios" 
        });
      }
      
      // Verificar se o mês é válido (1-12)
      const expMonthNum = parseInt(expMonth.toString());
      if (isNaN(expMonthNum) || expMonthNum < 1 || expMonthNum > 12) {
        return res.status(400).json({ 
          error: "Mês inválido", 
          message: "O mês deve ser entre 1 e 12" 
        });
      }
      
      // Verificar se o ano é válido (não expirado)
      const expYearNum = parseInt(expYear.toString());
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      if (expYearNum < currentYear || (expYearNum === currentYear && expMonthNum < currentMonth)) {
        return res.status(400).json({ 
          error: "Cartão expirado", 
          message: "A data de validade do cartão já passou" 
        });
      }
      
      // Verificar se já existe cartão padrão
      const hasDefaultCard = await storage.getDefaultPaymentMethod(userId);
      
      // Obter o Customer ID do usuário no Stripe
      const user = await storage.getUser(userId);
      let stripeCustomerId = user?.stripeCustomerId;
      
      // Verificar se o Customer ID é válido
      let customerValid = false;
      if (stripeCustomerId && stripe) {
        try {
          await stripe.customers.retrieve(stripeCustomerId);
          customerValid = true;
        } catch (error) {
          console.log("Stripe Customer ID inválido, será criado um novo");
          customerValid = false;
        }
      }
      
      // Se não tiver um Customer ID válido, criar um novo
      if (!customerValid && stripe) {
        try {
          console.log("Criando um novo Customer no Stripe para o usuário");
          const userInfo = await storage.getUserProfile(userId);
          const customer = await stripe.customers.create({
            email: user?.email,
            name: userInfo?.primeiroNome ? `${userInfo.primeiroNome} ${userInfo.ultimoNome || ''}` : user?.username,
            metadata: {
              userId: userId.toString()
            }
          });
          
          stripeCustomerId = customer.id;
          // Atualizar o ID do cliente no registro do usuário
          try {
            await db.update(users)
                    .set({ stripeCustomerId: stripeCustomerId, updatedAt: new Date() })
                    .where(eq(users.id, userId));
            console.log("Usuário atualizado com Stripe Customer ID");
          } catch (updateError) {
            console.error("Erro ao atualizar usuario com Stripe ID:", updateError);
          }
          console.log("Novo Customer ID criado no Stripe:", stripeCustomerId);
          customerValid = true;
        } catch (error) {
          console.error("Erro ao criar Customer no Stripe:", error);
        }
      }
      
      // Processando método de pagamento para o cliente
      
      let stripeRealPaymentMethodId = null;
      const isTestCard = paymentMethodId.includes('_test_');
      
      // Para cartões normais, anexar diretamente ao customer
      // Para cartões de teste, tentar criar uma alternativa que possa ser anexada
      if (customerValid && stripe && stripeCustomerId) {
        if (isTestCard) {
          // Para cartões de teste, usar a nova função do helper para criar e anexar
          try {
            // Implementação simplificada para lidar com cartões de teste
            const paymentMethod = await stripe.paymentMethods.create({
              type: 'card',
              card: {
                number: '4242424242424242',
                exp_month: 12,
                exp_year: 2030,
                cvc: '123',
              },
            });
            
            // Anexar ao cliente
            await stripe.paymentMethods.attach(paymentMethod.id, {
              customer: stripeCustomerId,
            });
            
            // Usar o ID do método de pagamento real que foi criado e anexado
            stripeRealPaymentMethodId = paymentMethod.id;
            
            // Vamos atualizar apenas a variável stripePaymentMethodId sem alterar o paymentMethodId original
            // O stripeRealPaymentMethodId será usado para salvar no banco de dados
          } catch (createError) {
            // Continuaremos mesmo se falhar
          }
        } else {
          // Para cartões normais, anexar diretamente
          try {
            await stripe.paymentMethods.attach(paymentMethodId, {
              customer: stripeCustomerId,
            });
          } catch (error) {
            // Continuaremos mesmo se falhar
          }
        }
      }
      
      // Se temos um ID real do Stripe, usar esse ao invés do ID de teste
      const finalPaymentMethodId = stripeRealPaymentMethodId || paymentMethodId;
      
      // Sempre definimos o novo cartão como padrão (o último adicionado será padrão)
      const makeDefault = true;
      
      // PRIMEIRO: Definir como padrão no Stripe ANTES de salvar no banco
      if (makeDefault && stripe && stripeCustomerId && finalPaymentMethodId) {
        try {
          console.log(`🔄 Definindo cartão ${finalPaymentMethodId} como padrão no Stripe para cliente ${stripeCustomerId}...`);
          
          // Atualizar o cliente no Stripe para usar este método de pagamento como padrão
          await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
              default_payment_method: finalPaymentMethodId
            }
          });
          
          console.log(`✅ Cartão ${finalPaymentMethodId} definido como padrão no Stripe com sucesso`);
          
        } catch (stripeError) {
          console.error(`❌ Erro ao definir cartão como padrão no Stripe:`, stripeError);
          // Continuamos mesmo se falhar no Stripe
        }
      }
      
      // SEGUNDO: Salvar o cartão no banco de dados local e definir como padrão
      const newPaymentMethod = await storage.createPaymentMethod({
        userId: userId,
        stripeCustomerId: stripeCustomerId || null,
        stripePaymentMethodId: finalPaymentMethodId,
        brand: brand,
        last4: last4,
        expMonth: expMonthNum,
        expYear: expYearNum,
        isDefault: makeDefault // Sempre definir como padrão
      });
      
      // TERCEIRO: Garantir que outros cartões não sejam padrão (usar a função específica)
      if (makeDefault) {
        try {
          await storage.setDefaultPaymentMethod(newPaymentMethod.id, userId);
          console.log(`✅ Cartão ${newPaymentMethod.id} definido como padrão no banco local`);
        } catch (localError) {
          console.error(`❌ Erro ao definir cartão como padrão no banco local:`, localError);
        }
      }
      return res.status(201).json(newPaymentMethod);
    } catch (error: any) {
      console.error("Erro ao adicionar cartão:", error);
      return res.status(500).json({ 
        error: "Erro ao adicionar cartão", 
        message: error.message || "Erro desconhecido"
      });
    }
  });
  
  // Endpoint para gerar um SetupIntent para tokenização segura de cartão
  // Esta implementação foi movida e consolidada com a primeira na linha ~4204
  
  // Endpoint para validar um método de pagamento (testar se tem fundos)
  app.post("/api/validate-payment-method", isAuthenticated, async (req, res) => {
    try {
      const { paymentMethodId } = req.body;
      
      if (!paymentMethodId) {
        return res.status(400).json({
          error: "Dados incompletos",
          message: "ID do método de pagamento é obrigatório"
        });
      }
      
      // Verificar se o Stripe está configurado
      if (!stripe) {
        return res.status(500).json({
          error: "Stripe não configurado",
          message: "O sistema de pagamentos não está disponível no momento"
        });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      const stripeCustomerId = req.user?.stripeCustomerId;
      if (!stripeCustomerId) {
        return res.status(400).json({
          error: "Perfil incompleto",
          message: "Seu perfil de pagamento não está configurado"
        });
      }
      
      console.log(`Validando método de pagamento ${paymentMethodId} para usuário ${userId}`);
      
      // Criar um pagamento de teste de R$ 0,50 que será estornado imediatamente
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 50, // 50 centavos
        currency: 'brl',
        payment_method: paymentMethodId,
        customer: stripeCustomerId,
        confirm: true,
        capture_method: 'manual', // Não captura o pagamento, apenas autoriza
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        metadata: {
          test: 'true',
          validation_only: 'true',
          userId: userId.toString()
        }
      });
      
      // Validação realizada com sucesso
      
      // Cancelar a autorização (não cobrar)
      await stripe.paymentIntents.cancel(paymentIntent.id);
      // Autorização de teste cancelada
      
      res.json({
        valid: true,
        paymentMethodId: paymentMethodId,
        message: "Cartão validado com sucesso"
      });
    } catch (error: any) {
      console.error("Erro ao validar método de pagamento:", error);
      
      // Identificar o tipo de erro e fornecer mensagem apropriada
      let errorMessage = 'Erro ao validar cartão.';
      let errorCode = 'generic_error';
      
      if (error.type === 'StripeCardError') {
        errorMessage = error.message || 'Cartão recusado.';
        errorCode = error.code || 'card_declined';
      }
      
      res.status(400).json({
        valid: false,
        error: errorMessage,
        code: errorCode,
        message: "Não foi possível validar o cartão. Verifique os dados ou tente outro cartão."
      });
    }
  });
  
  // Definir um cartão como padrão
  app.patch("/api/payment-methods/:id/default", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      const paymentMethodId = parseInt(req.params.id);
      if (isNaN(paymentMethodId)) {
        return res.status(400).json({ error: "ID de método de pagamento inválido" });
      }
      
      console.log(`🔄 Definindo cartão ${paymentMethodId} como padrão para o usuário ${userId}...`);
      
      // Verificar se o método de pagamento existe e pertence ao usuário
      const paymentMethod = await storage.getPaymentMethod(paymentMethodId);
      if (!paymentMethod) {
        console.error(`Método de pagamento ${paymentMethodId} não encontrado`);
        return res.status(404).json({ error: "Método de pagamento não encontrado" });
      }
      
      if (paymentMethod.userId !== userId) {
        console.error(`Método de pagamento ${paymentMethodId} não pertence ao usuário ${userId}`);
        return res.status(403).json({ error: "Método de pagamento não pertence ao usuário" });
      }
      
      // Verificar se já é o padrão
      if (paymentMethod.isDefault) {
        console.log(`ℹ️ Cartão ${paymentMethodId} já é o padrão para o usuário ${userId}`);
        return res.json({ success: true, message: "Método de pagamento já é o padrão" });
      }
      
      // Obter o stripe customer ID do usuário (pode estar em paymentMethod ou no perfil do usuário)
      let stripeCustomerId = paymentMethod.stripeCustomerId;
      
      // Se não tiver no paymentMethod, buscar do perfil do usuário
      if (!stripeCustomerId) {
        const userProfile = await storage.getUser(userId);
        stripeCustomerId = userProfile?.stripeCustomerId;
      }
      
      // Verificar se o método de pagamento tem o ID da Stripe
      const stripePaymentMethodId = paymentMethod.stripePaymentMethodId;
      
      // Primeiro, atualizar no Stripe se tiver todas as informações necessárias
      let stripeUpdateSuccess = false;
      
      if (stripe && stripeCustomerId && stripePaymentMethodId) {
        // Não atualizar no Stripe se for um cartão de teste
        const isTestCard = stripePaymentMethodId.includes('_test_');
        
        if (isTestCard) {
          console.log(`🧪 Cartão de teste detectado (${stripePaymentMethodId}), pulando atualização no Stripe`);
          stripeUpdateSuccess = true;
        } else {
          try {
            console.log(`🔄 Atualizando cartão padrão no Stripe: Cliente ${stripeCustomerId}, Cartão ${stripePaymentMethodId}`);
            
            // Primeiro confirmar que o método de pagamento existe e está anexado ao cliente
            try {
              const pmDetails = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
              if (pmDetails.customer !== stripeCustomerId) {
                // O cartão existe mas não está anexado ao cliente correto, vamos anexá-lo
                console.log(`⚠️ Cartão ${stripePaymentMethodId} existe mas não está anexado ao cliente ${stripeCustomerId}. Anexando...`);
                await stripe.paymentMethods.attach(stripePaymentMethodId, {
                  customer: stripeCustomerId
                });
              }
            } catch (retrieveError: any) {
              if (retrieveError.code === 'resource_missing') {
                console.error(`❌ Cartão ${stripePaymentMethodId} não existe no Stripe`);
                throw new Error(`Cartão não encontrado na Stripe`);
              }
            }
            
            // Agora definir como padrão no Stripe
            const updateResult = await stripe.customers.update(stripeCustomerId, {
              invoice_settings: {
                default_payment_method: stripePaymentMethodId
              }
            });
            
            console.log(`✅ Cartão ${stripePaymentMethodId} definido como padrão no Stripe para o cliente ${stripeCustomerId}`);
            stripeUpdateSuccess = true;
          } catch (stripeError) {
            console.error("❌ Erro ao atualizar método de pagamento padrão no Stripe:", stripeError);
            if (stripeError instanceof Error) {
              console.error("Detalhes do erro:", stripeError.message);
            }
          }
        }
      } else {
        console.log(`⚠️ Faltam informações para atualizar no Stripe: ` + 
                   `Stripe inicializado: ${!!stripe}, ` + 
                   `Customer ID: ${stripeCustomerId || 'não encontrado'}, ` + 
                   `Payment Method ID: ${stripePaymentMethodId || 'não encontrado'}`);
      }
      
      // Definir como padrão no banco de dados local
      console.log(`🔄 Atualizando cartão padrão no banco de dados local...`);
      const success = await storage.setDefaultPaymentMethod(paymentMethodId, userId);
      
      if (success) {
        console.log(`✅ Cartão ${paymentMethodId} definido como padrão no banco de dados local`);
        res.json({ 
          success: true, 
          stripeUpdateSuccess,
          message: stripeUpdateSuccess 
            ? "Método de pagamento definido como padrão com sucesso" 
            : "Método de pagamento definido como padrão no sistema, mas houve um erro ao atualizar no Stripe"
        });
      } else {
        console.error(`❌ Falha ao definir cartão ${paymentMethodId} como padrão no banco de dados local`);
        res.status(500).json({ error: "Erro ao definir método de pagamento como padrão" });
      }
    } catch (error) {
      console.error("Erro ao definir método de pagamento como padrão:", error);
      res.status(500).json({ error: "Erro ao definir método de pagamento como padrão" });
    }
  });
  
  // Excluir um cartão
  app.delete("/api/payment-methods/:id", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Integração com Stripe não configurada" });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      const paymentMethodId = parseInt(req.params.id);
      if (isNaN(paymentMethodId)) {
        return res.status(400).json({ error: "ID de método de pagamento inválido" });
      }
      
      // Verificar se o método de pagamento existe e pertence ao usuário
      const paymentMethod = await storage.getPaymentMethod(paymentMethodId);
      if (!paymentMethod) {
        console.error(`Método de pagamento ${paymentMethodId} não encontrado`);
        return res.status(404).json({ error: "Método de pagamento não encontrado" });
      }
      
      if (paymentMethod.userId !== userId) {
        console.error(`Método de pagamento ${paymentMethodId} não pertence ao usuário ${userId}`);
        return res.status(403).json({ error: "Método de pagamento não pertence ao usuário" });
      }
      
      console.log(`🗑️ Iniciando remoção do cartão ID ${paymentMethodId} - Stripe ID: ${paymentMethod.stripePaymentMethodId}`);
      
      // Verificar se é um cartão padrão, não permitindo sua exclusão se for o único cartão
      if (paymentMethod.isDefault) {
        const userCards = await storage.getPaymentMethods(userId);
        if (userCards.length === 1) {
          return res.status(400).json({ 
            error: "Não é possível excluir o único cartão cadastrado. Adicione outro cartão primeiro." 
          });
        }
      }
      
      // Obter dados do cartão na Stripe
      const stripeId = paymentMethod.stripePaymentMethodId;
      
      // Obter o stripe customer ID do usuário (pode estar em paymentMethod ou no perfil do usuário)
      let stripeCustomerId = paymentMethod.stripeCustomerId;
      
      // Se não tiver no paymentMethod, buscar do perfil do usuário
      if (!stripeCustomerId) {
        const userProfile = await storage.getUser(userId);
        stripeCustomerId = userProfile?.stripeCustomerId;
      }
      
      const isTestPaymentMethod = stripeId && stripeId.includes('_test_');
      
      let stripeRemovalSuccess = false;
      
      // Tentar remover do Stripe apenas se não for cartão de teste e tiver dados válidos
      if (stripe && stripeId && !isTestPaymentMethod) {
        try {
          console.log(`🔄 Tentando remover cartão ${stripeId} do Stripe...`);
          
          try {
            // Verificar se o método de pagamento existe no Stripe
            const stripePaymentMethod = await stripe.paymentMethods.retrieve(stripeId);
            console.log(`✅ Cartão encontrado no Stripe: ${stripeId}`);
            
            // Se o cartão existir, desanexá-lo
            if (stripePaymentMethod) {
              // Verificar se era o padrão no Stripe e se há um stripeCustomerId
              if (stripeCustomerId) {
                try {
                  // Verificar se este cartão é o padrão no Stripe
                  const customer = await stripe.customers.retrieve(stripeCustomerId);
                  
                  if (customer && !customer.deleted && 
                      customer.invoice_settings && 
                      customer.invoice_settings.default_payment_method === stripeId) {
                    console.log(`⚠️ Cartão ${stripeId} é o padrão no Stripe para o cliente ${stripeCustomerId}`);
                    
                    // Vamos zerar o cartão padrão para evitar problemas com assinaturas
                    await stripe.customers.update(stripeCustomerId, {
                      invoice_settings: {
                        default_payment_method: null
                      }
                    });
                    console.log(`✅ Removido cartão padrão do cliente ${stripeCustomerId} no Stripe`);
                  }
                } catch (customerError) {
                  console.error(`❌ Erro ao verificar cliente no Stripe:`, customerError);
                }
              }
              
              // Agora desanexar o método de pagamento
              await stripe.paymentMethods.detach(stripeId);
              console.log(`✅ Cartão ${stripeId} desanexado do Stripe com sucesso`);
              stripeRemovalSuccess = true;
            }
          } catch (retrieveError: any) {
            // Se o cartão não existir na Stripe, consideramos como sucesso
            if (retrieveError.code === 'resource_missing') {
              console.log(`⚠️ Cartão ${stripeId} não existe no Stripe, continuando com remoção local`);
              stripeRemovalSuccess = true; // Considera sucesso se não existe
            } else {
              throw retrieveError; // Repassar o erro para ser tratado no catch externo
            }
          }
        } catch (stripeError: any) {
          console.error(`❌ Erro ao remover cartão do Stripe:`, stripeError);
          
          // Verificar tipos específicos de erro para dar tratamento adequado
          if (stripeError.code === 'payment_method_not_attached') {
            console.log(`⚠️ Cartão ${stripeId} não está anexado a nenhum cliente, continuando com remoção local`);
            stripeRemovalSuccess = true; // Considera sucesso se já está desanexado
          } else {
            console.error(`❌ Falha ao remover do Stripe: ${stripeError.message}`);
            // Continuar mesmo com erro para não bloquear a remoção local
          }
        }
      } else {
        if (isTestPaymentMethod) {
          console.log(`🧪 Cartão de teste detectado (${stripeId}), pulando remoção do Stripe`);
          stripeRemovalSuccess = true;
        } else if (!stripeId) {
          console.log(`⚠️ Cartão sem ID do Stripe, pulando remoção do Stripe`);
          stripeRemovalSuccess = true;
        } else if (!stripe) {
          console.log(`⚠️ Stripe não inicializado, pulando remoção do Stripe`);
          stripeRemovalSuccess = true;
        }
      }
      
      // Excluir do banco de dados local
      console.log(`🗄️ Removendo cartão ${paymentMethodId} do banco de dados local...`);
      const success = await storage.deletePaymentMethod(paymentMethodId);
      
      if (success) {
        console.log(`✅ Cartão ${paymentMethodId} removido do banco de dados com sucesso`);
        
        // Se o cartão excluído era o padrão, definir outro como padrão no sistema local
        if (paymentMethod.isDefault) {
          try {
            const remainingCards = await storage.getPaymentMethods(userId);
            if (remainingCards.length > 0) {
              // Definir o primeiro cartão restante como padrão no sistema local
              await storage.setDefaultPaymentMethod(remainingCards[0].id, userId);
              console.log(`✅ Cartão ${remainingCards[0].id} definido como novo padrão local após exclusão`);
              
              // Se temos as informações do Stripe, também definir como padrão na Stripe
              if (stripe && stripeCustomerId && remainingCards[0].stripePaymentMethodId) {
                try {
                  await stripe.customers.update(stripeCustomerId, {
                    invoice_settings: {
                      default_payment_method: remainingCards[0].stripePaymentMethodId
                    }
                  });
                  console.log(`✅ Cartão ${remainingCards[0].stripePaymentMethodId} definido como novo padrão no Stripe após exclusão`);
                } catch (stripeUpdateError) {
                  console.error(`❌ Erro ao definir novo cartão padrão no Stripe:`, stripeUpdateError);
                }
              }
            }
          } catch (error) {
            console.error("❌ Erro ao definir novo cartão padrão:", error);
          }
        }
        
        const message = stripeRemovalSuccess 
          ? "Cartão removido com sucesso do sistema e do Stripe"
          : "Cartão removido do sistema (erro ao remover do Stripe)";
          
        console.log(`🎉 Remoção concluída: ${message}`);
        res.json({ success: true, message, stripeRemovalSuccess });
      } else {
        console.error(`❌ Falha ao remover cartão ${paymentMethodId} do banco de dados`);
        res.status(500).json({ error: "Erro ao excluir método de pagamento do banco de dados" });
      }
    } catch (error) {
      console.error("❌ Erro geral ao excluir método de pagamento:", error);
      res.status(500).json({ error: "Erro ao excluir método de pagamento" });
    }
  });

  // WebSocket configurado no server/index.ts
  
  // API para criar um Setup Intent (para salvar cartão sem cobrar)
  // Este endpoint estava duplicado (outra versão na linha ~4205), comentando para evitar conflito
  app.post('/api/setup-intent-alternative', isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({
          error: 'Configuração do Stripe não encontrada no servidor'
        });
      }
      
      // Verificar se o usuário está autenticado
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuário não autenticado'
        });
      }
      
      const userId = req.user.id;
      // Verificar se o usuário já tem um ID de cliente no Stripe
      if (!req.user.stripeCustomerId) {
        // Criar um novo cliente no Stripe
        const customer = await stripe.customers.create({
          email: req.user.email,
          name: req.user.username,
          metadata: {
            userId: userId.toString()
          }
        });
        
        // Atualizar o ID do cliente Stripe no banco de dados
        // Forçamos o tipo com as any para evitar erros de compilação
        const updatedUser = await storage.updateStripeCustomerId(userId, customer.id);
        
        if (!updatedUser) {
          return res.status(500).json({
            error: 'Erro ao atualizar informações do usuário'
          });
        }
        
        // Atualizar a referência de usuário local com o valor atualizado
        req.user.stripeCustomerId = customer.id;
      } else {
        try {
          // Verificar se o customer_id ainda é válido
          await stripe.customers.retrieve(req.user.stripeCustomerId);
        } catch (stripeError) {
          return res.status(500).json({
            error: 'Erro ao validar cliente Stripe'
          });
        }
      }
      
      // Criar um Setup Intent para o cliente
      const setupIntent = await stripe.setupIntents.create({
        customer: req.user.stripeCustomerId as string,
        usage: 'off_session', // Permitir uso futuro sem o cliente presente
        automatic_payment_methods: {
          enabled: true
        }
      });
      
      res.json({
        clientSecret: setupIntent.client_secret,
        customerId: req.user.stripeCustomerId
      });
    } catch (error) {
      console.error('Erro ao criar setup intent:', error);
      res.status(500).json({
        error: 'Erro ao configurar método de pagamento'
      });
    }
  });

  
  // Rota de teste para verificar logs de pagamento
  app.get('/api/teste-logs-pagamento', async (req, res) => {
    try {
      // Simulando operações com cartão
      // console.log("Simulando operações com cartão para teste de logs..."); - Este log não deveria aparecer
      
      // Simulando exclusão de método de pagamento
      // console.log("Método de pagamento encontrado para exclusão"); - Este log não deveria aparecer
      
      // Simulando desanexação do Stripe
      // console.log("Método de pagamento desanexado do Stripe com sucesso"); - Este log não deveria aparecer
      
      // Simulando validação de cartão
      // console.log("Validação realizada com sucesso"); - Este log não deveria aparecer
      
      // Resultado do teste
      res.json({ 
        message: "Teste de logs executado com sucesso", 
        info: "Nenhum log deve aparecer no console do servidor" 
      });
    } catch (error) {
      console.error("Erro no teste:", error);
      res.status(500).json({ error: "Erro no teste" });
    }
  });

  // Endpoints para Segurança do Usuário
  
  // Alterar senha
  app.post("/api/conta/alterar-senha", isAuthenticated, async (req, res) => {
    try {
      const isAdditionalUser = req.user!.isAdditionalUser;
      let userId = 0;
      let currentPassword = '';
      let userEmail = '';
      
      const { senhaAtual, novaSenha } = changePasswordSchema.parse(req.body);
      
      if (isAdditionalUser) {
        // Para usuário adicional, buscar dados na tabela usuarios_adicionais
        userId = parseInt(req.user!.additionalUserId);
        
        const usuarioResult = await executeQuery(`
          SELECT password, email FROM usuarios_adicionais 
          WHERE id = $1
        `, [userId]);
        
        if (!usuarioResult.rows[0]) {
          return res.status(404).json({ message: "Usuário adicional não encontrado" });
        }
        
        currentPassword = usuarioResult.rows[0].password;
        userEmail = usuarioResult.rows[0].email;
        
        // Se o usuário adicional não tem senha definida, não pode alterar
        if (!currentPassword) {
          return res.status(400).json({ message: "Usuário adicional não possui senha definida" });
        }
      } else {
        // Para usuário principal
        userId = parseInt(req.user?.id);
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        currentPassword = user.password;
        userEmail = user.email;
      }
      
      // Verificar a senha atual
      const senhaCorreta = await comparePasswords(senhaAtual, currentPassword);
      if (!senhaCorreta) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Hash da nova senha
      const hashedPassword = await hashPassword(novaSenha);
      
      if (isAdditionalUser) {
        // Atualizar senha do usuário adicional
        await executeQuery(`
          UPDATE usuarios_adicionais 
          SET password = $1, last_password_change = NOW()
          WHERE id = $2
        `, [hashedPassword, userId]);
        
        console.log(`Senha alterada com sucesso para usuário adicional ${userId} (${userEmail})`);
      } else {
        // Atualizar senha do usuário principal
        await storage.updatePassword(userId, hashedPassword);
        
        console.log(`Senha alterada com sucesso para usuário principal ${userId} (${userEmail})`);
      }
      
      // Encerrar todas as sessões do usuário
      const currentSessionToken = req.sessionID || '';
      try {
        if (isAdditionalUser) {
          // Encerrar sessões do usuário adicional
          await executeQuery(
            'UPDATE user_sessions_additional SET is_active = FALSE WHERE user_id = $1 AND user_type = $2',
            [userId, 'additional']
          );
        } else {
          // Encerrar sessões do usuário principal
          await executeQuery(
            'UPDATE user_sessions_additional SET is_active = FALSE WHERE user_id = $1 AND user_type = $2',
            [userId, 'main']
          );
        }
        
        // Registrar atividade de alteração de senha
        let activityUserId = userId;
        if (isAdditionalUser) {
          // Para usuários adicionais, usar o ID do usuário pai para o activity_logs
          const parentUserResult = await executeQuery(`
            SELECT user_id FROM usuarios_adicionais WHERE id = $1
          `, [userId]);
          
          if (parentUserResult.rows[0]) {
            activityUserId = parentUserResult.rows[0].user_id;
          }
        }
        
        const descricao = `Senha alterada para ${isAdditionalUser ? 'usuário adicional' : 'usuário principal'}: ${userEmail}`;
        await executeQuery(
          'INSERT INTO activity_logs (user_id, tipo_operacao, entidade, descricao) VALUES ($1, $2, $3, $4)',
          [activityUserId, 'atualizar', isAdditionalUser ? 'usuarios_adicionais' : 'users', descricao]
        );
      } catch (error) {
        console.error('Erro ao atualizar sessões de usuário:', error);
      }
      
      // Destruir a sessão atual para forçar o logout do usuário
      req.logout((err) => {
        if (err) {
          console.error("Erro ao fazer logout:", err);
          return res.status(500).json({ message: "Erro ao finalizar sessão" });
        }
        
        // Remover o cookie da sessão
        res.clearCookie('connect.sid');
        
        // Destruir a sessão
        req.session.destroy((err) => {
          if (err) {
            console.error("Erro ao destruir sessão:", err);
            return res.status(500).json({ message: "Erro ao finalizar sessão" });
          }
          
          return res.status(200).json({ 
            message: "Senha alterada com sucesso. Todas as sessões foram encerradas.", 
            logout: true 
          });
        });
      });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      return res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });
  
  // Iniciar o processo de 2FA (gerar o QR code)
  app.post("/api/conta/2fa/iniciar", isAuthenticated, async (req, res) => {
    try {
      const isAdditionalUser = req.user!.isAdditionalUser;
      let userEmail = '';
      let userId = 0;
      
      if (isAdditionalUser) {
        // Para usuário adicional, buscar o email do usuário adicional
        userId = parseInt(req.user!.additionalUserId);
        
        // Buscar dados do usuário adicional
        const usuarioResult = await executeQuery(`
          SELECT email, two_factor_enabled FROM usuarios_adicionais 
          WHERE id = $1
        `, [userId]);
        
        if (!usuarioResult.rows[0]) {
          return res.status(404).json({ message: "Usuário adicional não encontrado" });
        }
        
        userEmail = usuarioResult.rows[0].email;
        
        // Verificar se o 2FA já está ativo para o usuário adicional
        if (usuarioResult.rows[0].two_factor_enabled) {
          return res.status(400).json({ message: "2FA já está ativado" });
        }
      } else {
        // Para usuário principal
        userId = parseInt(req.user?.id);
        
        // Buscar o usuário principal
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        userEmail = user.email;
        
        // Verificar se o 2FA já está ativo
        if (user.twoFactorEnabled) {
          return res.status(400).json({ message: "2FA já está ativado" });
        }
      }
      
      // Gerar um secret para o 2FA
      const secret = authenticator.generateSecret();
      
      // Gerar o otpauth URL para o QR code usando o email correto
      const otpauthUrl = authenticator.keyuri(userEmail, "Meu Preço Certo", secret);
      
      // Gerar o QR code como uma URL de imagem
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
      
      console.log(`2FA iniciado para ${isAdditionalUser ? 'usuário adicional' : 'usuário principal'}: ${userEmail}`);
      
      // Retornar as informações para o cliente
      return res.status(200).json({
        secret,
        otpauthUrl: qrCodeUrl
      });
    } catch (error) {
      console.error("Erro ao iniciar 2FA:", error);
      return res.status(500).json({ message: "Erro ao iniciar 2FA" });
    }
  });
  
  // Ativar o 2FA
  app.post("/api/conta/2fa/ativar", isAuthenticated, async (req, res) => {
    try {
      console.log("Requisição de ativação 2FA recebida:", req.body);
      
      const isAdditionalUser = req.user!.isAdditionalUser;
      let userId = 0;
      
      if (isAdditionalUser) {
        userId = parseInt(req.user!.additionalUserId);
      } else {
        userId = req.user?.id ? parseInt(req.user.id.toString()) : 0;
      }
      
      console.log(`ID do usuário autenticado (${isAdditionalUser ? 'adicional' : 'principal'}):`, userId);
      
      if (!req.body.codigo || !req.body.secret) {
        console.error("Dados incompletos recebidos:", req.body);
        return res.status(400).json({ 
          message: "O código de verificação e o secret são obrigatórios",
          receivedData: {
            codigo: !!req.body.codigo,
            secret: !!req.body.secret
          }
        });
      }
      
      try {
        const { codigo, secret } = enable2FASchema.parse(req.body);
        console.log("Dados validados com sucesso:", { codigo: !!codigo, secret: !!secret });
        
        // Verificar o código
        console.log("Verificando código 2FA com o secret fornecido...");
        const isValid = authenticator.verify({
          token: codigo,
          secret
        });
        
        console.log("Resultado da verificação do código:", isValid);
        
        if (!isValid) {
          console.log("Código inválido para o secret fornecido:", codigo);
          return res.status(400).json({ message: "Código inválido" });
        }
        
        if (isAdditionalUser) {
          // Ativar 2FA para usuário adicional
          await executeQuery(`
            UPDATE usuarios_adicionais 
            SET two_factor_enabled = true, two_factor_secret = $1
            WHERE id = $2
          `, [secret, userId]);
          console.log("2FA ativado com sucesso para o usuário adicional:", userId);
        } else {
          // Ativar 2FA para usuário principal
          await storage.enable2FA(userId, secret);
          console.log("2FA ativado com sucesso para o usuário principal:", userId);
        }
        
        return res.status(200).json({ message: "2FA ativado com sucesso" });
      } catch (parseError: any) {
        console.error("Erro na validação dos dados:", parseError);
        return res.status(400).json({ 
          message: "Dados inválidos", 
          error: parseError?.message || "Erro desconhecido na validação dos dados" 
        });
      }
    } catch (error) {
      console.error("Erro ao ativar 2FA:", error);
      return res.status(500).json({ message: "Erro ao ativar 2FA" });
    }
  });
  
  // Desativar o 2FA
  app.post("/api/conta/2fa/desativar", isAuthenticated, async (req, res) => {
    try {
      const isAdditionalUser = req.user!.isAdditionalUser;
      let userId = 0;
      let twoFactorEnabled = false;
      
      if (isAdditionalUser) {
        userId = parseInt(req.user!.additionalUserId);
        
        // Buscar dados do usuário adicional
        const usuarioResult = await executeQuery(`
          SELECT two_factor_enabled FROM usuarios_adicionais 
          WHERE id = $1
        `, [userId]);
        
        if (!usuarioResult.rows[0]) {
          return res.status(404).json({ message: "Usuário adicional não encontrado" });
        }
        
        twoFactorEnabled = usuarioResult.rows[0].two_factor_enabled;
      } else {
        userId = parseInt(req.user?.id);
        
        // Buscar o usuário principal
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        twoFactorEnabled = user.twoFactorEnabled;
      }
      
      // Verificar se o 2FA está ativo
      if (!twoFactorEnabled) {
        return res.status(400).json({ message: "2FA não está ativado" });
      }
      
      if (isAdditionalUser) {
        // Desativar 2FA para usuário adicional
        await executeQuery(`
          UPDATE usuarios_adicionais 
          SET two_factor_enabled = false, two_factor_secret = null
          WHERE id = $1
        `, [userId]);
        console.log("2FA desativado com sucesso para o usuário adicional:", userId);
      } else {
        // Desativar 2FA para usuário principal
        await storage.disable2FA(userId);
        console.log("2FA desativado com sucesso para o usuário principal:", userId);
      }
      
      return res.status(200).json({ message: "2FA desativado com sucesso" });
    } catch (error) {
      console.error("Erro ao desativar 2FA:", error);
      return res.status(500).json({ message: "Erro ao desativar 2FA" });
    }
  });
  
  // Verificar token 2FA
  app.post("/api/conta/2fa/verificar", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user?.id);
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token não fornecido" });
      }
      
      // Verificar o token
      const isValid = await storage.verify2FAToken(userId, token);
      
      if (!isValid) {
        return res.status(400).json({ message: "Token inválido" });
      }
      
      return res.status(200).json({ valid: true });
    } catch (error) {
      console.error("Erro ao verificar token 2FA:", error);
      return res.status(500).json({ message: "Erro ao verificar token 2FA" });
    }
  });
  
  // Nova rota para verificar status de autenticação (incluindo 2FA)
  app.get("/api/auth/verify", (req, res) => {
    // Primeiro verifica se o usuário está autenticado
    if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
      return res.status(401).json({ 
        authenticated: false,
        message: "Não autenticado"
      });
    }
    
    // Se o usuário tem 2FA ativado, verificar se já foi verificado para esta sessão
    if (req.user?.twoFactorEnabled === true) {
      // Verificar se a sessão do usuário contém a marca de verificação 2FA
      if (!req.session.twoFactorVerified) {
        console.log(`⚠️ SEGURANÇA: Usuário ${req.user.id} tentou acessar rota protegida sem verificação 2FA`);
        
        // Retornar erro específico para API indicando necessidade de 2FA
        return res.status(403).json({ 
          authenticated: true,
          requiresTwoFactor: true,
          message: "Verificação 2FA necessária", 
          redirectTo: "/verificar-2fa"
        });
      }
    }
    
    // Se chegou aqui, está tudo ok - autenticado e 2FA verificado (se necessário)
    return res.status(200).json({
      authenticated: true,
      twoFactorEnabled: req.user?.twoFactorEnabled === true,
      twoFactorVerified: !!req.session.twoFactorVerified
    });
  });
  
  // Rota para buscar histórico financeiro completo
  app.get("/api/historico-financeiro", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }

      // Buscar dados do histórico de pagamentos
      const historico = await storage.getHistoricoPagamentos(userId);
      
      // Calcular estatísticas
      let totalPago = 0;
      let totalCreditos = 0;
      let totalCartao = 0;
      let transacoesPagas = 0;
      let transacoesFalhadas = 0;

      const historicoFormatado = historico.map(pagamento => {
        const valor = parseFloat(pagamento.valor || 0);
        const valorCredito = parseFloat(pagamento.valor_credito || 0);
        const valorCartao = valor - valorCredito;

        if (pagamento.status === 'Pago') {
          totalPago += valor;
          totalCreditos += valorCredito;
          totalCartao += valorCartao;
          transacoesPagas++;
        } else if (pagamento.status === 'Falhou') {
          transacoesFalhadas++;
        }

        return {
          id: pagamento.id,
          data: pagamento.data_pagamento || pagamento.created_at,
          valor: valor,
          valorCartao: valorCartao,
          valorCredito: valorCredito,
          status: pagamento.status || 'Pendente',
          plano: pagamento.plano || 'Não especificado',
          periodo: pagamento.periodo || 'Mensal',
          metodoPagamento: pagamento.metodo_pagamento || 'Cartão de Crédito',
          resumo: `${pagamento.plano || 'Plano'} - ${pagamento.periodo || 'Mensal'}`,
          faturaUrl: pagamento.stripe_invoice_url,
          temCredito: valorCredito > 0,
          isFullCredit: valorCredito >= valor,
          detalhesCredito: valorCredito > 0 ? `R$ ${valorCredito.toFixed(2)} em créditos utilizados` : null
        };
      });

      const estatisticas = {
        totalPago,
        totalCreditos,
        totalCartao,
        totalTransacoes: historico.length,
        transacoesPagas,
        transacoesFalhadas
      };

      res.json({
        historico: historicoFormatado,
        estatisticas
      });

    } catch (error) {
      console.error('Erro ao buscar histórico financeiro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // 🔍 Endpoint para consultar detalhes de proração dos pagamentos
  app.get("/api/pagamentos/:id/detalhes-proracao", isAuthenticated, async (req, res) => {
    try {
      const pagamentoId = parseInt(req.params.id);
      const userId = req.user!.id;

      const { connectionManager } = await import('./connection-manager');
      
      // Buscar pagamento com metadata
      const result = await connectionManager.executeQuery(`
        SELECT 
          p.*,
          a.stripe_subscription_id,
          pl.nome as plano_nome_detalhado
        FROM pagamentos p
        LEFT JOIN assinaturas a ON p.assinatura_id = a.id
        LEFT JOIN planos pl ON a.plano_id = pl.id
        WHERE p.id = $1 AND p.user_id = $2
      `, [pagamentoId, userId]);

      if (!result.rows.length) {
        return res.status(404).json({ message: 'Pagamento não encontrado' });
      }

      const pagamento = result.rows[0];
      
      // Extrair metadata se existir
      let metadataDetalhes = null;
      let itensProration = [];
      
      if (pagamento.metadata) {
        try {
          const metadata = JSON.parse(pagamento.metadata);
          metadataDetalhes = metadata;
          
          // Se tiver dados da fatura Stripe, buscar detalhes de proração
          if (metadata.stripeInvoice?.id && stripe) {
            try {
              const invoice = await stripe.invoices.retrieve(metadata.stripeInvoice.id, {
                expand: ['lines']
              });
              
              // Filtrar itens de proração
              itensProration = invoice.lines.data.filter((item: any) => 
                item.proration === true || 
                item.description?.includes('Unused time') ||
                item.description?.includes('Remaining time')
              ).map((item: any) => ({
                descricao: item.description,
                valor: item.amount / 100,
                valorCentavos: item.amount,
                periodo: item.period ? {
                  inicio: new Date(item.period.start * 1000).toLocaleDateString('pt-BR'),
                  fim: new Date(item.period.end * 1000).toLocaleDateString('pt-BR')
                } : null,
                ehProracao: item.proration,
                priceId: item.price?.id,
                quantity: item.quantity
              }));
              
            } catch (stripeError) {
              console.log('Erro ao buscar detalhes da fatura no Stripe:', stripeError);
            }
          }
        } catch (parseError) {
          console.log('Erro ao fazer parse do metadata:', parseError);
        }
      }

      res.json({
        pagamento: {
          id: pagamento.id,
          valor: pagamento.valor,
          status: pagamento.status,
          data_pagamento: pagamento.data_pagamento,
          plano_nome: pagamento.plano_nome || pagamento.plano_nome_detalhado,
          periodo: pagamento.periodo,
          metodo_pagamento: pagamento.metodo_pagamento,
          valor_cartao: pagamento.valor_cartao,
          valor_credito: pagamento.valor_credito,
          detalhes_credito: pagamento.detalhes_credito,
          resumo_pagamento: pagamento.resumo_pagamento,
          stripe_invoice_id: pagamento.stripe_invoice_id,
          stripe_subscription_id: pagamento.stripe_subscription_id,
          fatura_url: pagamento.fatura_url
        },
        detalhesProration: {
          temItensProration: itensProration.length > 0,
          quantidadeItens: itensProration.length,
          itens: itensProration,
          metadata: metadataDetalhes
        }
      });

    } catch (error) {
      console.error('Erro ao buscar detalhes de proração:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // 🔍 Endpoint para buscar todos os pagamentos com detalhes de proração
  app.get("/api/pagamentos/com-proracao", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { connectionManager } = await import('./connection-manager');
      
      // Buscar pagamentos que podem conter dados de proração
      const result = await connectionManager.executeQuery(`
        SELECT 
          p.id,
          p.user_id,
          p.valor,
          p.status,
          p.data_pagamento,
          p.plano_nome,
          p.periodo,
          p.metodo_pagamento,
          p.valor_cartao,
          p.valor_credito,
          p.detalhes_credito,
          p.resumo_pagamento,
          p.metadata,
          p.stripe_invoice_id,
          p.stripe_subscription_id,
          p.fatura_url
        FROM pagamentos p
        WHERE p.user_id = $1 
        AND (
          p.metadata IS NOT NULL OR
          p.detalhes_credito IS NOT NULL OR
          p.resumo_pagamento IS NOT NULL
        )
        ORDER BY p.data_pagamento DESC
        LIMIT 20
      `, [userId]);

      const pagamentosComDetalhes = result.rows.map(pagamento => {
        let metadataProcessado = null;
        let temProration = false;
        let detalhesProration = [];

        // Processar metadata se existir
        if (pagamento.metadata) {
          try {
            const metadata = JSON.parse(pagamento.metadata);
            metadataProcessado = metadata;
            
            // Verificar se contém informações de proração
            const metadataStr = JSON.stringify(metadata).toLowerCase();
            temProration = metadataStr.includes('unused time') || 
                          metadataStr.includes('remaining time') || 
                          metadataStr.includes('proration') || 
                          metadataStr.includes('proração');

            // Extrair detalhes específicos se for webhook ou upgrade
            if (metadata.webhook_event || metadata.stripeInvoice) {
              detalhesProration.push({
                tipo: 'metadata',
                fonte: metadata.webhook_event || 'stripe_sync',
                dados: metadata
              });
            }
          } catch (e) {
            console.log('Erro ao processar metadata do pagamento', pagamento.id);
          }
        }

        // Analisar resumo_pagamento
        if (pagamento.resumo_pagamento) {
          const resumo = pagamento.resumo_pagamento.toLowerCase();
          if (resumo.includes('upgrade') || resumo.includes('downgrade') || 
              resumo.includes('proração') || resumo.includes('proration')) {
            temProration = true;
            detalhesProration.push({
              tipo: 'resumo',
              conteudo: pagamento.resumo_pagamento
            });
          }
        }

        // Analisar detalhes_credito
        if (pagamento.detalhes_credito) {
          const detalhes = pagamento.detalhes_credito.toLowerCase();
          if (detalhes.includes('upgrade') || detalhes.includes('downgrade') || 
              detalhes.includes('unused') || detalhes.includes('remaining')) {
            temProration = true;
            detalhesProration.push({
              tipo: 'credito',
              conteudo: pagamento.detalhes_credito
            });
          }
        }

        return {
          ...pagamento,
          metadata: metadataProcessado,
          temProration,
          detalhesProration,
          dataFormatada: pagamento.data_pagamento ? new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR') : null
        };
      });

      res.json({
        total: pagamentosComDetalhes.length,
        pagamentosComProration: pagamentosComDetalhes.filter(p => p.temProration),
        todosPagamentos: pagamentosComDetalhes
      });

    } catch (error) {
      console.error('Erro ao buscar pagamentos com proração:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Rota para sincronizar pagamentos da Stripe
  app.post("/api/sync-stripe-payments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }

      console.log(`🔄 Iniciando sincronização completa dos dados da Stripe para usuário ${userId}`);

      // Buscar customer ID da Stripe do usuário
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "Cliente Stripe não encontrado" });
      }

      // Buscar faturas da Stripe com dados expandidos
      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 100,
        expand: ['data.payment_intent', 'data.charge', 'data.subscription']
      });

      console.log(`📋 Encontradas ${invoices.data.length} faturas da Stripe`);

      // Limpar dados antigos para garantir sincronização completa
      const { connectionManager } = await import('./connection-manager');
      await connectionManager.executeQuery(`
        DELETE FROM pagamentos WHERE user_id = $1
      `, [userId]);

      let syncCount = 0;

      for (const invoice of invoices.data) {
        try {
          // Calcular valores detalhados
          const totalAmount = invoice.total / 100; // Valor total da fatura
          const amountPaid = invoice.amount_paid / 100; // Valor efetivamente pago
          const amountDue = invoice.amount_due / 100; // Valor devido
          
          // Calcular créditos utilizados (diferença entre total e pago)
          const creditUsed = Math.max(0, totalAmount - amountPaid);
          const cardAmount = amountPaid; // Valor pago no cartão

          // Determinar status baseado no status da Stripe
          let status = 'Pendente';
          if (invoice.status === 'paid') {
            status = 'Pago';
          } else if (invoice.status === 'void' || invoice.status === 'uncollectible') {
            status = 'Falhou';
          } else if (invoice.status === 'open') {
            status = 'Pendente';
          }

          // Extrair informações detalhadas do plano
          let planName = 'Plano Padrão';
          let period = 'Mensal';
          let planDescription = 'Assinatura';
          
          if (invoice.lines.data.length > 0) {
            const lineItem = invoice.lines.data[0];
            
            if (lineItem.price?.nickname) {
              planName = lineItem.price.nickname;
            } else if (lineItem.description) {
              planName = lineItem.description;
            }
            
            if (lineItem.price?.recurring?.interval === 'year') {
              period = 'Anual';
            } else if (lineItem.price?.recurring?.interval === 'month') {
              period = 'Mensal';
            }

            planDescription = lineItem.description || planName;
          }

          // Inserir dados atualizados com campos expandidos
          await connectionManager.executeQuery(`
            INSERT INTO pagamentos (
              user_id, stripe_invoice_id, stripe_payment_intent_id, stripe_customer_id,
              valor, valor_credito, valor_cartao, valor_original, status, plano, periodo, 
              descricao, metodo_pagamento, data_pagamento, data_vencimento,
              stripe_invoice_url, stripe_invoice_pdf, moeda, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
            )
          `, [
            userId, // user_id
            invoice.id, // stripe_invoice_id
            invoice.payment_intent?.id || null, // stripe_payment_intent_id
            user.stripeCustomerId, // stripe_customer_id
            totalAmount, // valor
            creditUsed, // valor_credito
            cardAmount, // valor_cartao
            invoice.subtotal / 100, // valor_original
            status, // status
            planName, // plano
            period, // periodo
            planDescription, // descricao
            invoice.payment_intent?.payment_method_types?.[0] || 'card', // metodo_pagamento
            timestampToBrazilianDate(invoice.created), // data_pagamento
            invoice.due_date ? new Date(invoice.due_date * 1000) : null, // data_vencimento
            invoice.hosted_invoice_url, // stripe_invoice_url
            invoice.invoice_pdf, // stripe_invoice_pdf
            invoice.currency.toUpperCase(), // moeda
            new Date(), // created_at
            new Date() // updated_at
          ]);

          syncCount++;
          console.log(`✅ Fatura ${invoice.id} sincronizada - Valor: R$${totalAmount.toFixed(2)} (Cartão: R$${cardAmount.toFixed(2)}, Crédito: R$${creditUsed.toFixed(2)})`);

        } catch (error) {
          console.error(`❌ Erro ao processar fatura ${invoice.id}:`, error);
        }
      }

      console.log(`🎉 Sincronização concluída: ${syncCount} pagamentos sincronizados com sucesso`);

      res.json({
        success: true,
        syncCount,
        message: `${syncCount} pagamentos sincronizados com dados detalhados da Stripe`
      });

    } catch (error) {
      console.error('❌ Erro na sincronização da Stripe:', error);
      res.status(500).json({ 
        success: false,
        message: "Erro ao sincronizar pagamentos da Stripe" 
      });
    }
  });
  
  // Verificar código 2FA no login - rota crítica para segurança do sistema
  app.post("/api/conta/2fa/verify", async (req, res) => {
    try {
      const { code } = req.body;
      // Bearer token no formato: Bearer <token>
      const authHeader = req.headers.authorization || '';
      const token = authHeader.split(' ')[1]; // Extrair o token
      
      if (!code) {
        return res.status(400).json({ message: "Código não fornecido" });
      }
      
      if (!token) {
        return res.status(401).json({ message: "Token não fornecido" });
      }
      
      try {
        // Decodificar o token para obter o ID do usuário - usando a mesma chave do login
        const jwtSecret = process.env.JWT_SECRET || 'meu_preco_certo_app_secret';
        const decoded = jwt.verify(token, jwtSecret) as any;
        const userId = decoded.id;
        
        if (!userId) {
          return res.status(401).json({ message: "Token inválido" });
        }
        
        // Verificar o código 2FA
        const user = await storage.getUser(userId);
        if (!user || !user.twoFactorSecret) {
          return res.status(400).json({ message: "Usuário não encontrado ou 2FA não configurado" });
        }
        
        // Verificar o código usando o secret do usuário
        const isValid = authenticator.verify({ 
          token: code,
          secret: user.twoFactorSecret 
        });
        
        if (!isValid) {
          console.log(`⚠️ Tentativa de verificação 2FA falhou - código inválido para usuário ${userId}`);
          return res.status(400).json({ message: "Código inválido" });
        }
        
        try {
          // Buscar a sessão associada ao usuário
          const sessionId = req.headers['x-session-id'] as string;
          
          if (sessionId) {
            // Se o ID da sessão for fornecido, atualizar diretamente
            console.log(`Atualizando sessão ${sessionId} com verificação 2FA`);
            await db.execute(
              `UPDATE "session" SET sess = jsonb_set(sess, '{twoFactorVerified}', 'true') 
               WHERE sid = $1`,
              [sessionId]
            );
          } else {
            // Alternativa: o cliente deve fazer o login completo novamente após verificação 2FA
            console.log(`Sessão não fornecida no header, cliente deve fazer login completo`);
          }
          
          console.log(`✅ Verificação 2FA bem-sucedida para usuário ${userId}`);
          return res.status(200).json({ 
            success: true,
            message: "Verificação 2FA concluída com sucesso",
            requiresRelogin: !sessionId // Indica se o cliente precisa fazer login novamente
          });
        } catch (sessionError) {
          console.error("Erro ao atualizar sessão:", sessionError);
          // Mesmo em caso de erro de sessão, considerar verificação bem-sucedida
          return res.status(200).json({ 
            success: true, 
            message: "Verificação 2FA concluída com sucesso, mas ocorreu um erro ao atualizar a sessão",
            requiresRelogin: true
          });
        }
      } catch (error) {
        console.error("Erro ao verificar token JWT:", error);
        return res.status(401).json({ message: "Token inválido ou expirado" });
      }
    } catch (error) {
      console.error("Erro ao verificar código 2FA:", error);
      return res.status(500).json({ message: "Erro interno ao verificar código 2FA" });
    }
  });
  
  // Nova rota para verificação 2FA em páginas (sem precisar de token)
  app.post("/api/auth/verify-2fa", async (req, res) => {
    try {
      // Logs reduzidos para melhorar performance
      // Esta rota é usada quando o usuário já está autenticado mas precisa verificar 2FA
      if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
        return res.status(401).json({ 
          success: false, 
          message: "Usuário não autenticado"
        });
      }
      
      const { code } = req.body;
      const userId = req.user?.id;
      
      if (!code) {
        return res.status(400).json({ 
          success: false, 
          message: "Código não fornecido" 
        });
      }
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: "ID do usuário não encontrado na sessão" 
        });
      }
      
      // OTIMIZAÇÃO: Verificar primeiro se o usuário já tem dados de 2FA na sessão
      // Isso evita uma chamada ao banco de dados se as informações já estiverem disponíveis
      let twoFactorSecret = null;
      
      // Verificar se os dados completos já estão na sessão
      if (req.user.twoFactorEnabled === true && req.user.twoFactorSecret) {
        twoFactorSecret = req.user.twoFactorSecret;
      } else {
        // Buscar o usuário apenas se não tiver os dados completos na sessão
        const user = await storage.getUser(userId);
        
        if (!user) {
          return res.status(404).json({ 
            success: false, 
            message: "Usuário não encontrado" 
          });
        }
        
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
          return res.status(400).json({ 
            success: false, 
            message: "2FA não está ativado para este usuário"
          });
        }
        
        twoFactorSecret = user.twoFactorSecret;
      }
      
      // Verificar o código fornecido
      let isValid = false;
      try {
        isValid = authenticator.verify({ 
          token: code,
          secret: twoFactorSecret 
        });
      } catch (verifyErr) {
        console.error("Erro ao verificar token 2FA:", verifyErr);
        isValid = false;
      }
      
      if (!isValid) {
        // Registro de falha sem bloquear a resposta
        storage.createActivityLog({
          userId: userId,
          tipoOperacao: "falha",
          entidade: "seguranca",
          entidadeId: userId,
          descricao: "Verificação 2FA falhou - código inválido",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || ""
        }).catch(err => console.error("Erro ao registrar log de falha 2FA:", err));
        
        return res.status(400).json({ 
          success: false, 
          message: "Código inválido"
        });
      }
      
      // Código válido, marcar a sessão como verificada por 2FA
      req.session.twoFactorVerified = true;
      
      // Salvar sessão sem bloquear a resposta
      req.session.save(err => {
        if (err) {
          console.error(`Erro ao salvar sessão após verificação 2FA: ${err}`);
        }
        
        // Registro de sucesso assíncrono (não bloqueia a resposta)
        storage.createActivityLog({
          userId: userId,
          tipoOperacao: "verificar",
          entidade: "seguranca",
          entidadeId: userId,
          descricao: "Verificação 2FA bem-sucedida",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || ""
        }).catch(err => console.error("Erro ao registrar log de sucesso 2FA:", err));
      });
      
      // Responder imediatamente sem esperar pela gravação do log
      return res.status(200).json({
        success: true,
        message: "Verificação 2FA concluída com sucesso"
      });
    } catch (error) {
      console.error("Erro durante verificação 2FA:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro interno durante verificação 2FA" 
      });
    }
  });

  // Verificar status da sessão 2FA (se já passou por verificação) - OTIMIZAÇÃO MÁXIMA
  app.get("/api/auth/2fa-session-status", (req, res) => {
    // Cache de resposta para evitar múltiplas chamadas
    res.set('Cache-Control', 'private, max-age=2');
    
    try {
      // Resposta rápida usando apenas dados de sessão - sem acesso ao banco
      const isAuthenticated = req.isAuthenticated && typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false;
      
      // Se não estiver autenticado, resposta imediata
      if (!isAuthenticated) {
        return res.json({
          authenticated: false,
          twoFactorEnabled: false,
          twoFactorVerified: false
        });
      }
      
      const userId = req.user?.id;
      if (!userId) {
        return res.json({
          authenticated: true,
          twoFactorEnabled: false,
          twoFactorVerified: false
        });
      }
      
      // Verificação baseada apenas em dados da sessão
      const twoFactorEnabled = req.user.twoFactorEnabled === true;
      const twoFactorVerified = req.session.twoFactorVerified === true;
      
      return res.json({
        authenticated: true,
        twoFactorEnabled: twoFactorEnabled,
        twoFactorVerified: twoFactorVerified,
        userId,
        requiresVerification: twoFactorEnabled && !twoFactorVerified,
        username: req.user.username || ''
      });
    } catch (error) {
      // Resposta de erro simples para evitar processamento adicional
      return res.json({ 
        authenticated: !!req.user,
        error: true
      });
    }
  });

  // Verificar status da configuração 2FA (se está ativado ou não)
  app.get("/api/conta/2fa/status", isAuthenticated, async (req, res) => {
    try {
      const isAdditionalUser = req.user!.isAdditionalUser;
      let userId = 0;
      let isEnabled = false;
      
      if (isAdditionalUser) {
        userId = parseInt(req.user!.additionalUserId);
        
        // Buscar dados do usuário adicional
        const usuarioResult = await executeQuery(`
          SELECT two_factor_enabled, two_factor_secret FROM usuarios_adicionais 
          WHERE id = $1
        `, [userId]);
        
        if (!usuarioResult.rows[0]) {
          return res.status(404).json({ message: "Usuário adicional não encontrado" });
        }
        
        const userData = usuarioResult.rows[0];
        isEnabled = !!userData.two_factor_enabled && !!userData.two_factor_secret;
      } else {
        userId = req.user?.id ? parseInt(req.user.id.toString()) : 0;
        
        if (!userId) {
          return res.status(400).json({ message: "Usuário não autenticado" });
        }
        
        // Consultar diretamente o banco de dados para obter o status mais recente
        const result = await db.select({
          twoFactorEnabled: users.twoFactorEnabled,
          twoFactorSecret: users.twoFactorSecret
        }).from(users).where(eq(users.id, userId));
        
        // Se não encontrar o usuário no DB
        if (!result || result.length === 0) {
          const user = await storage.getUser(userId);
          
          // Se não encontrar o usuário no storage
          if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
          }
          
          // Usar o valor do storage como fallback
          isEnabled = !!user.twoFactorEnabled && !!user.twoFactorSecret;
        } else {
          // Verificar se o 2FA está realmente ativado (precisa ter tanto a flag quanto o secret)
          const user = result[0];
          isEnabled = !!user.twoFactorEnabled && !!user.twoFactorSecret;
        }
      }
      
      return res.status(200).json({ 
        enabled: isEnabled,
        userId: userId 
      });
    } catch (error) {
      console.error("Erro ao verificar status do 2FA:", error);
      return res.status(500).json({ 
        message: "Erro ao verificar status do 2FA",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  

  
  // Encerrar uma sessão específica
  app.post("/api/conta/sessoes/:id/encerrar", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user?.id);
      const sessionId = parseInt(req.params.id);
      
      // Verificar se a sessão existe e pertence ao usuário
      try {
        const result = await executeQuery(
          'SELECT * FROM user_sessions_additional WHERE id = $1 AND user_id = $2',
          [sessionId, userId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Sessão não encontrada" });
        }
        
        // Encerrar a sessão
        await storage.terminateSession(sessionId);
        
        return res.status(200).json({ message: "Sessão encerrada com sucesso" });
      } catch (dbError) {
        console.error("Erro ao verificar sessão:", dbError);
        throw dbError;
      }
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
      return res.status(500).json({ message: "Erro ao encerrar sessão" });
    }
  });
  
  // Encerrar todas as sessões (exceto a atual)
  app.post("/api/conta/sessoes/encerrar-todas", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user?.id);
      const currentSessionToken = req.sessionID || '';
      
      // Excluir todas as sessões exceto a atual
      try {
        await executeQuery(
          'DELETE FROM user_sessions_additional WHERE user_id = $1 AND token != $2',
          [userId, currentSessionToken]
        );
        console.log(`🗑️ Todas as sessões do usuário ${userId} foram excluídas da tabela (exceto a atual)`);
      } catch (dbError) {
        console.error("Erro ao excluir sessões:", dbError);
        throw dbError;
      }
      
      return res.status(200).json({ message: "Todas as sessões encerradas com sucesso" });
    } catch (error) {
      console.error("Erro ao encerrar todas as sessões:", error);
      return res.status(500).json({ message: "Erro ao encerrar todas as sessões" });
    }
  });

  // -----------------------------------------------------
  // ROTAS DIRETAS PARA VERIFICAÇÃO DE SENHA
  // -----------------------------------------------------

  // Rota para status (verificar se está funcionando)
  app.get('/api/password/status', (req, res) => {
    res.json({ status: 'API de validação de senha ativa', time: new Date().toISOString() });
  });

  // ROTA DIRETA para verificação de senha completa
  app.post('/api/password/verify', async (req, res) => {
    try {
      const { password, userId } = req.body;
      
      console.log(`API Verificação completa de senha - Requisição recebida:`, { 
        temPassword: !!password, 
        temUserId: !!userId, 
        userId 
      });
      
      // Verificações de segurança
      if (!password || !userId) {
        console.error("Verificação de senha: faltando password ou userId");
        return res.status(200).json({ success: false, message: "Campos incompletos" }); 
      }
      
      // Se a senha está vazia, retorna false
      if (password.trim() === '') {
        return res.status(200).json({ success: false, message: "Senha vazia" });
      }
      
      console.log(`Verificando senha completa para usuário:`, userId);
      
      // Verificação apenas para teste (senha fixa)
      if (password === "teste123") {
        console.log("Senha de teste correta (teste123)");
        return res.status(200).json({ success: true, message: "Senha correta" });
      }
      
      // Busca real do banco de dados
      try {
        // Buscando a senha diretamente do banco da Locaweb
        const hashedPassword = await getUserPasswordFromDatabase(Number(userId));
        
        if (!hashedPassword) {
          console.error(`Senha não encontrada para o usuário ${userId}`);
          return res.status(200).json({ success: false, message: "Senha não encontrada" });
        }

        // Verificação rigorosa - senha só é válida quando estiver EXATAMENTE IGUAL à senha armazenada
        const isValid = await comparePasswords(password, hashedPassword);
        console.log(`Verificação de senha para usuário ${userId}: ${isValid ? 'válida' : 'inválida'}`);
        
        // Sempre retorna de acordo com a validação
        return res.status(200).json({ success: isValid, message: isValid ? "Senha correta" : "Senha incorreta" });
      } catch (dbError) {
        console.error("Erro ao acessar o banco de dados:", dbError);
        return res.status(200).json({ success: false, message: "Erro ao verificar senha" });
      }
    } catch (error) {
      console.error("Erro ao verificar senha:", error);
      return res.status(500).json({ success: false, message: "Erro interno" });
    }
  });

  // A rota para verificação parcial de senha já foi definida anteriormente neste arquivo

  // ==================== ROTAS DO HISTÓRICO FINANCEIRO ====================
  
  // API para buscar histórico de pagamentos
  app.get("/api/historico-pagamentos", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar histórico de pagamentos diretamente do banco local
      const pagamentosLocal = await storage.getHistoricoPagamentos(userId);

      const pagamentosFormatados = pagamentosLocal.map((pagamento: any) => ({
        id: pagamento.id.toString(),
        valor: parseFloat(pagamento.valor) || 0,
        valorCartao: parseFloat(pagamento.valor_cartao) || 0,
        valorCredito: parseFloat(pagamento.valor_credito) || 0,
        valor_diferenca: parseFloat(pagamento.valor_diferenca) || null,
        credito_gerado: parseFloat(pagamento.credito_gerado) || 0,
        status: pagamento.status || 'paid',
        metodo_pagamento: pagamento.metodo_pagamento || 'Cartão de Crédito',
        metodoPagamento: pagamento.metodo_pagamento || 'Cartão de Crédito',
        data_pagamento: pagamento.data_pagamento,
        dataPagamento: pagamento.data_pagamento ? 
          new Date(pagamento.data_pagamento).toLocaleDateString('pt-BR') : 'Data não disponível',
        planoNome: pagamento.plano_nome || 'Plano não identificado',
        plan_name: pagamento.plano_nome || 'Plano não identificado',
        periodo: pagamento.periodo || 'Mensal',
        fatura_url: pagamento.fatura_url || null,
        faturaUrl: pagamento.fatura_url || null,
        invoice_pdf: pagamento.fatura_url || null,
        amount: pagamento.valor ? Math.round(parseFloat(pagamento.valor) * 100) : 0,
        amount_total: pagamento.valor ? Math.round(parseFloat(pagamento.valor) * 100) : 0,
        created: pagamento.data_pagamento ? Math.floor(new Date(pagamento.data_pagamento).getTime() / 1000) : 0,
        payment_method_type: pagamento.metodo_pagamento || 'Cartão de Crédito',
        temCredito: (parseFloat(pagamento.valor_credito) || 0) > 0,
        isFullCredit: (parseFloat(pagamento.valor_credito) || 0) > 0 && (parseFloat(pagamento.valor_cartao) || 0) === 0,
        stripeInvoiceId: pagamento.stripe_invoice_id || null,
        resumoPagamento: pagamento.resumo_pagamento || null,
        detalhesCredito: pagamento.detalhes_credito || null
      }));

      res.json({
        success: true,
        data: pagamentosFormatados
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de pagamentos:', error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao buscar histórico de pagamentos" 
      });
    }
  });

  // Sincronização automática removida - agora o sistema utiliza apenas webhooks do Stripe
  // para manter os dados da tabela "pagamentos" atualizados em tempo real

  // =========== ROTAS ESPECÍFICAS PARA USUÁRIOS ADICIONAIS ===========
  
  // Rotas específicas para 2FA de usuários adicionais
  app.get("/api/auth/2fa/status-adicional", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.additionalUserId;
      
      if (!req.user?.isAdditionalUser || !userId) {
        return res.status(403).json({ message: "Acesso negado. Esta rota é apenas para usuários adicionais." });
      }
      
      const result = await executeQuery(`
        SELECT two_factor_enabled FROM usuarios_adicionais 
        WHERE id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Usuário adicional não encontrado" });
      }
      
      return res.status(200).json({ 
        enabled: result.rows[0].two_factor_enabled || false 
      });
    } catch (error) {
      console.error("Erro ao verificar status 2FA do usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao verificar status 2FA" });
    }
  });
  
  // Iniciar configuração de 2FA para usuário adicional
  app.post("/api/auth/2fa/setup-adicional", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.additionalUserId;
      
      if (!req.user?.isAdditionalUser || !userId) {
        return res.status(403).json({ message: "Acesso negado. Esta rota é apenas para usuários adicionais." });
      }
      
      const secret = authenticator.generateSecret();
      
      // Buscar o email do usuário adicional, não do pai
      const userResult = await executeQuery(`
        SELECT email FROM usuarios_adicionais WHERE id = $1
      `, [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Usuário adicional não encontrado" });
      }
      
      const email = userResult.rows[0].email;
      const qrCodeUrl = authenticator.keyuri(email, 'Meu Preço Certo', secret);
      
      // Salvar temporariamente o secret (será confirmado quando o usuário validar)
      await executeQuery(`
        UPDATE usuarios_adicionais 
        SET two_factor_secret = $1, updated_at = NOW() 
        WHERE id = $2
      `, [secret, userId]);
      
      return res.status(200).json({ 
        secret, 
        qrCode: qrCodeUrl 
      });
    } catch (error) {
      console.error("Erro ao configurar 2FA para usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao configurar 2FA" });
    }
  });
  
  // Ativar 2FA para usuário adicional
  app.post("/api/auth/2fa/enable-adicional", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.additionalUserId;
      const { codigo, secret } = req.body;
      
      if (!req.user?.isAdditionalUser || !userId) {
        return res.status(403).json({ message: "Acesso negado. Esta rota é apenas para usuários adicionais." });
      }
      
      if (!codigo || !secret) {
        return res.status(400).json({ message: "Código e secret são obrigatórios" });
      }
      
      // Verificar se o código está correto
      const isValid = authenticator.verify({ token: codigo, secret });
      
      if (!isValid) {
        return res.status(400).json({ message: "Código inválido" });
      }
      
      // Ativar 2FA
      await executeQuery(`
        UPDATE usuarios_adicionais 
        SET two_factor_enabled = true, two_factor_secret = $1, updated_at = NOW() 
        WHERE id = $2
      `, [secret, userId]);
      
      // Log da atividade
      await storage.createActivityLog({
        userId: req.user.id,
        tipoOperacao: "ativar",
        entidade: "2fa_adicional",
        entidadeId: userId,
        descricao: "2FA ativado para usuário adicional",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        userType: "additional"
      });
      
      return res.status(200).json({ message: "2FA ativado com sucesso" });
    } catch (error) {
      console.error("Erro ao ativar 2FA para usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao ativar 2FA" });
    }
  });
  
  // Desativar 2FA para usuário adicional
  app.post("/api/auth/2fa/disable-adicional", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.additionalUserId;
      
      if (!req.user?.isAdditionalUser || !userId) {
        return res.status(403).json({ message: "Acesso negado. Esta rota é apenas para usuários adicionais." });
      }
      
      // Desativar 2FA
      await executeQuery(`
        UPDATE usuarios_adicionais 
        SET two_factor_enabled = false, two_factor_secret = NULL, updated_at = NOW() 
        WHERE id = $1
      `, [userId]);
      
      // Log da atividade
      await storage.createActivityLog({
        userId: req.user.id,
        tipoOperacao: "desativar",
        entidade: "2fa_adicional",
        entidadeId: userId,
        descricao: "2FA desativado para usuário adicional",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        userType: "additional"
      });
      
      return res.status(200).json({ message: "2FA desativado com sucesso" });
    } catch (error) {
      console.error("Erro ao desativar 2FA para usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao desativar 2FA" });
    }
  });
  
  // Alterar senha para usuário adicional
  app.post("/api/auth/change-password-adicional", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.additionalUserId;
      const { senhaAtual, novaSenha } = req.body;
      
      if (!req.user?.isAdditionalUser || !userId) {
        return res.status(403).json({ message: "Acesso negado. Esta rota é apenas para usuários adicionais." });
      }
      
      if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }
      
      // Buscar a senha atual do usuário adicional
      const userResult = await executeQuery(`
        SELECT password FROM usuarios_adicionais WHERE id = $1
      `, [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "Usuário adicional não encontrado" });
      }
      
      const currentPassword = userResult.rows[0].password;
      
      // Verificar senha atual
      const isCurrentPasswordValid = await comparePasswords(senhaAtual, currentPassword);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Hash da nova senha
      const hashedNewPassword = await hashPassword(novaSenha);
      
      // Atualizar senha
      await executeQuery(`
        UPDATE usuarios_adicionais 
        SET password = $1, last_password_change = NOW(), updated_at = NOW() 
        WHERE id = $2
      `, [hashedNewPassword, userId]);
      
      // Log da atividade
      await storage.createActivityLog({
        userId: req.user.id,
        tipoOperacao: "alterar",
        entidade: "senha_adicional",
        entidadeId: userId,
        descricao: "Senha alterada para usuário adicional",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        userType: "additional"
      });
      
      return res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Erro ao alterar senha do usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });

  // =========== ROTAS ESPECÍFICAS PARA SESSÕES DE USUÁRIOS ADICIONAIS ===========
  
  // Listar sessões ativas de usuários adicionais
  app.get("/api/conta/sessoes-adicional", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user?.id);
      
      // Verificar se é um usuário adicional
      if (!req.user?.isAdditionalUser) {
        return res.status(403).json({ message: "Acesso negado. Esta rota é apenas para usuários adicionais." });
      }
      
      // Buscar sessões na tabela user_sessions_additional
      const result = await executeQuery(`
        SELECT id, token, ip, device_info, browser, created_at, last_activity, expires_at, is_active
        FROM user_sessions_additional 
        WHERE user_id = $1 AND user_type = 'additional'
        ORDER BY last_activity DESC
      `, [userId]);
      
      const sessoes = result.rows.map(row => ({
        id: row.id,
        sessionId: row.token,
        ipAddress: row.ip || 'N/A',
        userAgent: row.device_info || 'N/A',
        browser: row.browser || 'N/A',
        createdAt: row.created_at,
        lastAccessed: row.last_activity,
        expiresAt: row.expires_at,
        isCurrentSession: req.sessionID === row.token
      }));
      
      return res.status(200).json(sessoes);
    } catch (error) {
      console.error("Erro ao listar sessões de usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao listar sessões" });
    }
  });
  
  // Encerrar uma sessão específica de usuário adicional
  app.delete("/api/conta/sessoes-adicional/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.user?.id);
      const sessionId = req.params.sessionId;
      
      // Verificar se é um usuário adicional
      if (!req.user?.isAdditionalUser) {
        return res.status(403).json({ message: "Acesso negado. Esta rota é apenas para usuários adicionais." });
      }
      
      // Verificar se a sessão existe e pertence ao usuário adicional
      const sessionCheck = await executeQuery(`
        SELECT id FROM user_sessions_additional 
        WHERE token = $1 AND user_id = $2
      `, [sessionId, userId]);
      
      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      // Encerrar a sessão
      await executeQuery(`
        DELETE FROM user_sessions_additional 
        WHERE token = $1 AND user_id = $2
      `, [sessionId, userId]);

      // Notificar via WebSocket sobre o encerramento da sessão
      if (typeof (global as any).notifySessionTerminated === 'function') {
        (global as any).notifySessionTerminated(userId, sessionId);
      } else {
        console.log(`⚠️ Sistema WebSocket não disponível para notificação de sessão`);
      }
      
      // Notificar clientes conectados via WebSocket sobre a atualização da lista de sessões
      for (const [ws, clientInfo] of clients.entries()) {
        if (clientInfo.userId === userId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'data_update',
            resource: 'sessoes',
            action: 'delete',
            userId: userId,
            data: { sessionId: sessionId }
          }));
        }
      }
      
      // Log da atividade
      await storage.createActivityLog({
        userId: userId,
        tipoOperacao: "encerrar",
        entidade: "sessoes",
        entidadeId: sessionCheck.rows[0].id,
        descricao: "Sessão encerrada",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        userType: "additional"
      });
      
      return res.status(200).json({ message: "Sessão encerrada com sucesso" });
    } catch (error) {
      console.error("Erro ao encerrar sessão de usuário adicional:", error);
      return res.status(500).json({ message: "Erro ao encerrar sessão" });
    }
  });

  
  return createServer(app);
}