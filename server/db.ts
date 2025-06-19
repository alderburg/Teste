import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { connectionManager, executeQuery as executeManagerQuery } from './connection-manager';

// Garantir que as variáveis de ambiente sejam carregadas
dotenv.config();

// Configuração usando variáveis de ambiente fornecidas da Locaweb
console.log("Usando implementação de banco de dados PostgreSQL da Locaweb");
// As outras mensagens relacionadas ao banco de dados aparecerão sequencialmente:

// Vamos usar o connectionManager para gerenciar todas as conexões
// Esta é a implementação profissional de gerenciamento de conexões

// Compatibilidade com código existente
export const pool = {
  query: async (text: string, params?: any[]) => {
    return executeManagerQuery(text, params, { 
      tag: 'pool-query',
      maxRetries: 1,
      timeout: 30000
    });
  },
  connect: async () => {
    throw new Error('Método connect() não disponível - use executeQuery() diretamente');
  },
  // Propriedades para compatibilidade com código existente
  get totalCount() { 
    const stats = connectionManager.getStats();
    return stats.activeConnections;
  },
  get idleCount() { return 0; },
  get waitingCount() { return 0; },
  // Método para encerrar o pool
  end: async () => {
    return connectionManager.shutdown();
  }
};

// Função para executar uma consulta com tratamento de "too many connections"
// Esta função usa nosso gerenciador de conexões profissional
export async function executeQuery(queryText: string, params: any[] = []) {
  return executeManagerQuery(queryText, params, {
    maxRetries: 1,
    timeout: 30000,
    tag: 'db-module'
  });
}

// Verificar conexão assim que o servidor iniciar (verificação essencial)
pool.query('SELECT NOW()').then(async () => {
  console.log("Conexão com o banco de dados estabelecida com sucesso");

  // Listar todas as tabelas do banco de dados
  try {
    const tablesResult = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("Verificando estrutura do banco de dados...");

    // Tabelas verificadas com sucesso

    // Verificação de tabelas concluída

    // Executar verificação de tabelas e depois exibir o status do sistema
    await checkAndCreateTables();
    console.log("Sistema ativo!");
  } catch (error) {
    console.error("Erro ao listar tabelas:", error);
  }
}).catch(err => {
  console.error("Erro ao conectar ao banco de dados:", err.message);
});

// Cliente Drizzle ORM
export const db = drizzle(pool, { schema });

// Função para recuperar senha em texto plano para verificação parcial
// OBSERVAÇÃO: Esta função é apenas para desenvolvimento/teste e não deve ser usada em produção
// Em um ambiente de produção, não se deve nunca armazenar ou recuperar senhas em texto plano
export async function getUserPasswordFromDatabase(userId: number): Promise<string | null> {
  try {
    // Obter a senha real do usuário no banco de dados
    const result = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      console.error(`Usuário com ID ${userId} não encontrado no banco de dados`);
      return null;
    }

    const hashedPassword = result.rows[0].password;

    // Também verificamos se existe um registro na tabela user_profiles para segurança adicional
    const profileResult = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (!hashedPassword) {
      console.error(`Senha não encontrada para o usuário ${userId}`);
      return null;
    }

    // Importante: isso retorna a senha HASHEADA do banco para a validação
    // Não podemos obter a senha em texto plano pois ela não é armazenada assim
    console.log(`Senha hasheada recuperada para o usuário ${userId}`);
    return hashedPassword;
  } catch (error) {
    console.error(`Erro ao recuperar senha do usuário ${userId}:`, error);
    return null;
  }
}

// Função para verificar e criar tabelas
export async function checkAndCreateTables() {  
  try {
    // Verificar colunas obsoletas na tabela planos e removê-las
    const planosColunaObsoletaResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND (column_name = 'cadastro_produtos' OR column_name = 'usuarios_permitidos')
      )
    `);

    if (planosColunaObsoletaResult.rows[0].exists) {
      console.log('Removendo colunas obsoletas da tabela planos...');
      await pool.query(`
        ALTER TABLE planos 
        DROP COLUMN IF EXISTS cadastro_produtos,
        DROP COLUMN IF EXISTS usuarios_permitidos
      `);
      console.log('Colunas obsoletas removidas com sucesso da tabela planos');
    }

    // Verificar se existe a coluna 'limite_usuarios' na tabela planos
    const limiteUsuariosExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND column_name = 'limite_usuarios'
      )
    `);

    if (!limiteUsuariosExistsResult.rows[0].exists) {
      console.log('Adicionando coluna limite_usuarios à tabela planos...');
      await pool.query(`
        ALTER TABLE planos 
        ADD COLUMN limite_usuarios INTEGER DEFAULT 1 NOT NULL
      `);

      // Atualizando os valores conforme os planos existentes
      await pool.query(`
        UPDATE planos SET limite_usuarios = 
        CASE 
          WHEN nome = 'Essencial' THEN 1
          WHEN nome = 'Profissional' THEN 3
          WHEN nome = 'Empresarial' THEN 5
          WHEN nome = 'Premium' THEN 999999
          ELSE 1
        END
      `);
      console.log('Coluna limite_usuarios adicionada e valores atualizados com sucesso');
    }

    // Verificar tipo da coluna 'central_treinamento' na tabela planos
    const centralTreinamentoColInfoResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'central_treinamento'
    `);

    // Verificar se a coluna temporária já existe
    const tempColumnExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND column_name = 'central_treinamento_temp'
      )
    `);
    const tempColumnExists = tempColumnExistsResult.rows[0].exists;

    // Se a coluna central_treinamento existir e for do tipo boolean, alterá-la para text
    if (centralTreinamentoColInfoResult.rows.length > 0 && 
        centralTreinamentoColInfoResult.rows[0].data_type === 'boolean') {
      console.log('Alterando tipo da coluna central_treinamento de boolean para text...');

      try {
        // Verificar se precisamos criar a coluna temporária ou apenas usá-la se já existir
        if (!tempColumnExists) {
          // Primeiro, criar uma coluna temporária
          await pool.query(`
            ALTER TABLE planos 
            ADD COLUMN central_treinamento_temp TEXT DEFAULT '' NOT NULL
          `);
        }

        // Atualizar os valores da coluna temporária com base nos valores da coluna boolean
        await pool.query(`
          UPDATE planos SET central_treinamento_temp = 
          CASE 
            WHEN central_treinamento = true AND nome = 'ESSENCIAL' THEN 'essencial'
            WHEN central_treinamento = true AND nome = 'PROFISSIONAL' THEN 'profissional'
            WHEN central_treinamento = true AND nome = 'EMPRESARIAL' THEN 'empresarial'
            WHEN central_treinamento = true AND nome = 'PREMIUM' THEN 'premium'
            ELSE ''
          END
        `);

        // Remover a coluna original e renomear a temporária
        await pool.query(`ALTER TABLE planos DROP COLUMN central_treinamento`);
        await pool.query(`ALTER TABLE planos RENAME COLUMN central_treinamento_temp TO central_treinamento`);

        console.log('Coluna central_treinamento alterada de boolean para text com sucesso');
      } catch (error) {
        console.error('Erro ao alterar coluna central_treinamento:', error.message);
      }
    }

    // Verificar tipo da coluna 'suporte' na tabela planos
    const suporteColInfoResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'suporte'
    `);

    // Verificar se a coluna temporária suporte já existe
    const suporteTempColumnExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND column_name = 'suporte_temp'
      )
    `);
    const suporteTempColumnExists = suporteTempColumnExistsResult.rows[0].exists;

    // Se a coluna suporte existir e for do tipo boolean, alterá-la para text
    if (suporteColInfoResult.rows.length > 0 && 
        suporteColInfoResult.rows[0].data_type === 'boolean') {
      console.log('Alterando tipo da coluna suporte de boolean para text...');

      try {
        // Verificar se precisamos criar a coluna temporária ou apenas usá-la se já existir
        if (!suporteTempColumnExists) {
          // Primeiro, criar uma coluna temporária
          await pool.query(`
            ALTER TABLE planos 
            ADD COLUMN suporte_temp TEXT DEFAULT '' NOT NULL
          `);
        }

        // Atualizar os valores da coluna temporária com base nos valores da coluna boolean
        await pool.query(`
          UPDATE planos SET suporte_temp = 
          CASE 
            WHEN suporte = true AND nome = 'ESSENCIAL' THEN 'E-mail'
            WHEN suporte = true AND nome = 'PROFISSIONAL' THEN 'Chat'
            WHEN suporte = true AND nome = 'EMPRESARIAL' THEN 'Prioritário'
            WHEN suporte = true AND nome = 'PREMIUM' THEN 'WhatsApp'
            ELSE ''
          END
        `);

        // Remover a coluna original e renomear a temporária
        await pool.query(`ALTER TABLE planos DROP COLUMN suporte`);
        await pool.query(`ALTER TABLE planos RENAME COLUMN suporte_temp TO suporte`);

        console.log('Coluna suporte alterada de boolean para text com sucesso');
      } catch (error) {
        console.error('Erro ao alterar coluna suporte:', error.message);
      }
    }

    // Verificar tipo da coluna 'relatorios_personalizados' na tabela planos
    const relatoriosColInfoResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'relatorios_personalizados'
    `);

    // Verificar se a coluna temporária relatorios_personalizados já existe
    const relatoriosTempColumnExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND column_name = 'relatorios_personalizados_temp'
      )
    `);
    const relatoriosTempColumnExists = relatoriosTempColumnExistsResult.rows[0].exists;

    // Se a coluna relatorios_personalizados existir e for do tipo boolean, alterá-la para text
    if (relatoriosColInfoResult.rows.length > 0 && 
        relatoriosColInfoResult.rows[0].data_type === 'boolean') {
      console.log('Alterando tipo da coluna relatorios_personalizados de boolean para text...');

      try {
        // Verificar se precisamos criar a coluna temporária ou apenas usá-la se já existir
        if (!relatoriosTempColumnExists) {
          // Primeiro, criar uma coluna temporária
          await pool.query(`
            ALTER TABLE planos 
            ADD COLUMN relatorios_personalizados_temp TEXT DEFAULT '' NOT NULL
          `);
        }

        // Atualizar os valores da coluna temporária com base nos valores da coluna boolean e no tipo de plano
        await pool.query(`
          UPDATE planos SET relatorios_personalizados_temp = 
          CASE 
            WHEN relatorios_personalizados = true AND nome = 'ESSENCIAL' THEN 'Básicos'
            WHEN relatorios_personalizados = true AND nome = 'PROFISSIONAL' THEN 'Intermediários'
            WHEN relatorios_personalizados = true AND nome = 'EMPRESARIAL' THEN 'Avançados'
            WHEN relatorios_personalizados = true AND nome = 'PREMIUM' THEN 'Exportação'
            ELSE ''
          END
        `);

        // Remover a coluna original e renomear a temporária
        await pool.query(`ALTER TABLE planos DROP COLUMN relatorios_personalizados`);
        await pool.query(`ALTER TABLE planos RENAME COLUMN relatorios_personalizados_temp TO relatorios_personalizados`);

        console.log('Coluna relatorios_personalizados alterada de boolean para text com sucesso');
      } catch (error) {
        console.error('Erro ao alterar coluna relatorios_personalizados:', error.message);
      }
    }

    // Verificar e atualizar o plano ESSENCIAL com valor padrão para relatorios_personalizados
    try {
      // Consultar o plano ESSENCIAL
      const planoEssencialResult = await pool.query(`
        SELECT id, relatorios_personalizados FROM planos 
        WHERE nome = 'ESSENCIAL' AND relatorios_personalizados = ''
      `);

      // Se encontrarmos um plano ESSENCIAL com valor vazio
      if (planoEssencialResult.rows.length > 0) {
        console.log('Atualizando valor padrão de relatórios para o plano ESSENCIAL...');
        await pool.query(`
          UPDATE planos 
          SET relatorios_personalizados = 'Básicos' 
          WHERE nome = 'ESSENCIAL' AND relatorios_personalizados = ''
        `);
        console.log('Valor de relatórios para o plano ESSENCIAL atualizado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao atualizar valor de relatórios do plano ESSENCIAL:', error.message);
    }

    // Verificar tipo da coluna 'cadastro_clientes' na tabela planos
    const cadastroClientesColInfoResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'cadastro_clientes'
    `);

    // Verificar se a coluna temporária cadastro_clientes já existe
    const clientesTempColumnExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND column_name = 'cadastro_clientes_temp'
      )
    `);
    const clientesTempColumnExists = clientesTempColumnExistsResult.rows[0].exists;

    // Se a coluna cadastro_clientes existir e for do tipo boolean, alterá-la para text
    if (cadastroClientesColInfoResult.rows.length > 0 && 
        cadastroClientesColInfoResult.rows[0].data_type === 'boolean') {
      console.log('Alterando tipo da coluna cadastro_clientes de boolean para text...');

      try {
        // Verificar se precisamos criar a coluna temporária ou apenas usá-la se já existir
        if (!clientesTempColumnExists) {
          // Primeiro, criar uma coluna temporária
          await pool.query(`
            ALTER TABLE planos 
            ADD COLUMN cadastro_clientes_temp TEXT DEFAULT 'X' NOT NULL
          `);
        }

        // Atualizar os valores da coluna temporária com base nos valores da coluna boolean e no tipo de plano
        await pool.query(`
          UPDATE planos SET cadastro_clientes_temp = 
          CASE 
            WHEN cadastro_clientes = false AND nome = 'ESSENCIAL' THEN 'X'
            WHEN cadastro_clientes = true AND nome = 'PROFISSIONAL' THEN '250'
            WHEN cadastro_clientes = true AND nome = 'EMPRESARIAL' THEN '500'
            WHEN cadastro_clientes = true AND nome = 'PREMIUM' THEN 'Ilimitado'
            ELSE 'X'
          END
        `);

        // Remover a coluna original e renomear a temporária
        await pool.query(`ALTER TABLE planos DROP COLUMN cadastro_clientes`);
        await pool.query(`ALTER TABLE planos RENAME COLUMN cadastro_clientes_temp TO cadastro_clientes`);

        console.log('Coluna cadastro_clientes alterada de boolean para text com sucesso');
      } catch (error) {
        console.error('Erro ao alterar coluna cadastro_clientes:', error.message);
      }
    }

    // Verificar tipo da coluna 'importacao' na tabela planos
    const importacaoColInfoResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'importacao'
    `);

    // Verificar se a coluna temporária importacao já existe
    const importacaoTempColumnExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND column_name = 'importacao_temp'
      )
    `);
    const importacaoTempColumnExists = importacaoTempColumnExistsResult.rows[0].exists;

    // Se a coluna importacao existir e for do tipo boolean, alterá-la para text
    if (importacaoColInfoResult.rows.length > 0 && 
        importacaoColInfoResult.rows[0].data_type === 'boolean') {
      console.log('Alterando tipo da coluna importacao de boolean para text...');

      try {
        // Verificar se precisamos criar a coluna temporária ou apenas usá-la se já existir
        if (!importacaoTempColumnExists) {
          // Primeiro, criar uma coluna temporária
          await pool.query(`
            ALTER TABLE planos 
            ADD COLUMN importacao_temp TEXT DEFAULT 'X' NOT NULL
          `);
        }

        // Atualizar os valores da coluna temporária com base nos valores da coluna boolean e no tipo de plano
        await pool.query(`
          UPDATE planos SET importacao_temp = 
          CASE 
            WHEN importacao = false AND nome = 'ESSENCIAL' THEN 'X'
            WHEN importacao = true AND nome = 'PROFISSIONAL' THEN 'Excel'
            WHEN importacao = true AND nome = 'EMPRESARIAL' THEN 'Excel + XML'
            WHEN importacao = true AND nome = 'PREMIUM' THEN 'Excel + XML + API'
            ELSE 'X'
          END
        `);

        // Remover a coluna original e renomear a temporária
        await pool.query(`ALTER TABLE planos DROP COLUMN importacao`);
        await pool.query(`ALTER TABLE planos RENAME COLUMN importacao_temp TO importacao`);

        console.log('Coluna importacao alterada de boolean para text com sucesso');
      } catch (error) {
        console.error('Erro ao alterar coluna importacao:', error.message);
      }
    }

    // Verificar tipo da coluna 'cadastro_clientes' na tabela planos
    const cadastroClientesColTypeResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'cadastro_clientes'
    `);

    // Verificar se a coluna temporária cadastro_clientes_int já existe
    const cadastroClientesTempColumnExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND column_name = 'cadastro_clientes_int'
      )
    `);
    const cadastroClientesTempColumnExists = cadastroClientesTempColumnExistsResult.rows[0].exists;

    // Se a coluna cadastro_clientes existir e for do tipo text, alterá-la para integer
    if (cadastroClientesColTypeResult.rows.length > 0 && 
        cadastroClientesColTypeResult.rows[0].data_type === 'text') {
      console.log('Alterando tipo da coluna cadastro_clientes de text para integer...');

      try {
        // Verificar se precisamos criar a coluna temporária ou apenas usá-la se já existir
        if (!cadastroClientesTempColumnExists) {
          // Primeiro, criar uma coluna temporária
          await pool.query(`
            ALTER TABLE planos 
            ADD COLUMN cadastro_clientes_int INTEGER DEFAULT 0 NOT NULL
          `);
        }

        // Atualizar os valores da coluna temporária com base nos valores da coluna texto
        await pool.query(`
          UPDATE planos SET cadastro_clientes_int = 
          CASE 
            WHEN cadastro_clientes = 'X' THEN 0
            WHEN cadastro_clientes = '250' THEN 250
            WHEN cadastro_clientes = '500' THEN 500
            WHEN cadastro_clientes = 'Ilimitado' THEN 999999
            ELSE 0
          END
        `);

        // Remover a coluna original e renomear a temporária
        await pool.query(`ALTER TABLE planos DROP COLUMN cadastro_clientes`);
        await pool.query(`ALTER TABLE planos RENAME COLUMN cadastro_clientes_int TO cadastro_clientes`);

        console.log('Coluna cadastro_clientes alterada de text para integer com sucesso');
      } catch (error) {
        console.error('Erro ao alterar coluna cadastro_clientes:', error.message);
      }
    }

    // Verificar tipo da coluna 'gerenciamento_custos' na tabela planos
    const gerenciamentoCustosColTypeResult = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'gerenciamento_custos'
    `);

    // Verificar se a coluna temporária gerenciamento_custos_text já existe
    const gerenciamentoCustosTempColumnExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'planos'
        AND column_name = 'gerenciamento_custos_text'
      )
    `);
    const gerenciamentoCustosTempColumnExists = gerenciamentoCustosTempColumnExistsResult.rows[0].exists;

    // Se a coluna gerenciamento_custos existir e for do tipo boolean, alterá-la para text
    if (gerenciamentoCustosColTypeResult.rows.length > 0 && 
        gerenciamentoCustosColTypeResult.rows[0].data_type === 'boolean') {
      console.log('Alterando tipo da coluna gerenciamento_custos de boolean para text...');

      try {
        // Verificar se precisamos criar a coluna temporária ou apenas usá-la se já existir
        if (!gerenciamentoCustosTempColumnExists) {
          // Primeiro, criar uma coluna temporária
          await pool.query(`
            ALTER TABLE planos 
            ADD COLUMN gerenciamento_custos_text TEXT DEFAULT 'Parcial' NOT NULL
          `);
        }

        // Atualizar os valores da coluna temporária com base nos valores da coluna boolean e no tipo de plano
        await pool.query(`
          UPDATE planos SET gerenciamento_custos_text = 
          CASE 
            WHEN nome = 'ESSENCIAL' THEN 'Parcial'
            WHEN nome = 'PROFISSIONAL' THEN 'Completo'
            WHEN nome = 'EMPRESARIAL' THEN 'Completo'
            WHEN nome = 'PREMIUM' THEN 'Completo'
            ELSE 'Parcial'
          END
        `);

        // Remover a coluna original e renomear a temporária
        await pool.query(`ALTER TABLE planos DROP COLUMN gerenciamento_custos`);
        await pool.query(`ALTER TABLE planos RENAME COLUMN gerenciamento_custos_text TO gerenciamento_custos`);

        console.log('Coluna gerenciamento_custos alterada de boolean para text com sucesso');
      } catch (error) {
        console.error('Erro ao alterar coluna gerenciamento_custos:', error.message);
      }
    }

    // Verificar se existe a coluna 'primeiro_nome' na tabela user_profiles
    const columnResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'primeiro_nome'
      )
    `);

    // Verificar se temos os campos de endereço ainda na tabela user_profiles
    const enderecoColumnResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'endereco'
      )
    `);

    // Se ainda tivermos os campos de endereço, mover esses dados para a tabela enderecos
    if (enderecoColumnResult.rows[0].exists) {
      // Verificar se já existem dados na tabela enderecos
      const enderecoCountResult = await pool.query(`
        SELECT COUNT(*) as total FROM enderecos
      `);

      // Só copiar os dados se a tabela enderecos estiver vazia
      if (parseInt(enderecoCountResult.rows[0].total) === 0) {
        try {
          // Copiar os dados de endereço da tabela user_profiles para a tabela enderecos
          const userProfilesWithAddress = await pool.query(`
            SELECT * FROM user_profiles
            WHERE endereco IS NOT NULL 
              AND endereco != ''
              AND cep IS NOT NULL
              AND cep != ''
          `);

          if (userProfilesWithAddress.rows.length > 0) {

            // Para cada perfil com endereço, criar um registro na tabela enderecos
            for (const profile of userProfilesWithAddress.rows) {
              await pool.query(`
                INSERT INTO enderecos (
                  user_id, 
                  tipo, 
                  cep, 
                  logradouro, 
                  numero, 
                  complemento, 
                  bairro, 
                  cidade, 
                  estado, 
                  principal, 
                  created_at, 
                  updated_at
                ) VALUES (
                  $1, 'comercial', $2, $3, 'S/N', NULL, 'Centro', $4, $5, TRUE, NOW(), NOW()
                )
              `, [profile.user_id, profile.cep, profile.endereco, profile.cidade, profile.estado]);
            }

            // Migração de endereços concluída
          } else {
            console.log("Nenhum perfil com dados de endereço encontrado para migrar");
          }
        } catch (err) {
          console.error("Erro durante a migração de endereços:", err);
        }
      } else {
        console.log(`A tabela enderecos já possui ${enderecoCountResult.rows[0].total} registros. Migração não necessária.`);
      }

      // Remover as colunas de endereço da tabela user_profiles
      try {
        // Remover colunas de endereço redundantes da tabela user_profiles
        await pool.query(`
          ALTER TABLE user_profiles 
            DROP COLUMN IF EXISTS endereco,
            DROP COLUMN IF EXISTS cidade,
            DROP COLUMN IF EXISTS estado,
            DROP COLUMN IF EXISTS cep
        `);
      } catch (err) {
        console.error("Erro ao remover colunas de endereço:", err);
      }
    }

    // Se a coluna não existir, alterar a tabela conforme necessário
    if (!columnResult.rows[0].exists) {
      console.log("Alterando estrutura da tabela user_profiles para corresponder ao schema...");

      // Criar backup da tabela
      await pool.query(`CREATE TABLE IF NOT EXISTS user_profiles_backup AS SELECT * FROM user_profiles`);

      // Renomear colunas existentes quando possível
      try {
        await pool.query(`ALTER TABLE user_profiles RENAME COLUMN nome TO primeiro_nome`);
        console.log("Renomeado: nome -> primeiro_nome");
      } catch (err) {
        console.log("Coluna 'nome' não encontrada ou já renomeada");
      }

      try {
        await pool.query(`ALTER TABLE user_profiles RENAME COLUMN sobrenome TO ultimo_nome`);
        console.log("Renomeado: sobrenome -> ultimo_nome");
      } catch (err) {
        console.log("Coluna 'sobrenome' não encontrada ou já renomeada");
      }

      try {
        await pool.query(`ALTER TABLE user_profiles RENAME COLUMN empresa TO razao_social`);
        console.log("Renomeado: empresa -> razao_social");
      } catch (err) {
        console.log("Coluna 'empresa' não encontrada ou já renomeada");
      }

      try {
        await pool.query(`ALTER TABLE user_profiles RENAME COLUMN avatar_url TO logo_url`);
        console.log("Renomeado: avatar_url -> logo_url");
      } catch (err) {
        console.log("Coluna 'avatar_url' não encontrada ou já renomeada");
      }

      // Adicionar novas colunas
      await pool.query(`
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
        ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT DEFAULT 'fisica',
        ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
        ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
        ADD COLUMN IF NOT EXISTS cnae TEXT,
        ADD COLUMN IF NOT EXISTS regime_tributario TEXT,
        ADD COLUMN IF NOT EXISTS atividade_principal TEXT,
        ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
        ADD COLUMN IF NOT EXISTS responsavel_email TEXT,
        ADD COLUMN IF NOT EXISTS responsavel_telefone TEXT,
        ADD COLUMN IF NOT EXISTS responsavel_setor TEXT,
        ADD COLUMN IF NOT EXISTS contador_nome TEXT,
        ADD COLUMN IF NOT EXISTS contador_email TEXT,
        ADD COLUMN IF NOT EXISTS contador_telefone TEXT
      `);

      // Atualização inicial para dados já existentes quando possível
      await pool.query(`
        UPDATE user_profiles SET 
          nome_fantasia = razao_social
        WHERE nome_fantasia IS NULL AND razao_social IS NOT NULL
      `);

      // Copiar dados do telefone para o responsável quando aplicável
      await pool.query(`
        UPDATE user_profiles SET 
          responsavel_telefone = telefone
        WHERE responsavel_telefone IS NULL AND telefone IS NOT NULL
      `);

      console.log("Estrutura da tabela user_profiles atualizada com sucesso!");
    }

    // Verificação silenciosa dos tipos enum
    const produtoTipoEnumResult = await pool.query(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'produto_tipo')`);
    if (!produtoTipoEnumResult.rows[0].exists) {
      await pool.query(`CREATE TYPE produto_tipo AS ENUM ('novo', 'usado')`);
    }

    const custoTipoEnumResult = await pool.query(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custo_tipo')`);
    if (!custoTipoEnumResult.rows[0].exists) {
      await pool.query(`CREATE TYPE custo_tipo AS ENUM ('novo', 'usado', 'aluguel', 'servico', 'marketplace')`);
    }

    const despesaTipoEnumResult = await pool.query(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'despesa_tipo')`);
    if (!despesaTipoEnumResult.rows[0].exists) {
      await pool.query(`CREATE TYPE despesa_tipo AS ENUM ('fixa', 'variavel')`);
    }

    // Verificar se o tipo enum forma_pagamento existe
    const formaPagamentoEnumResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'forma_pagamento'
      )
    `);

    if (!formaPagamentoEnumResult.rows[0].exists) {
      console.log('Criando enum forma_pagamento...');
      await pool.query(`CREATE TYPE forma_pagamento AS ENUM ('a_vista', 'cartao_credito', 'boleto', 'pix', 'transferencia')`);
    }

    // Verificar se o tipo enum categoria_tipo existe
    const categoriaTipoEnumResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'categoria_tipo'
      )
    `);

    if (!categoriaTipoEnumResult.rows[0].exists) {
      console.log('Criando enum categoria_tipo...');
      await pool.query(`CREATE TYPE categoria_tipo AS ENUM ('produto', 'servico', 'despesa', 'custo')`);
    }

    // Verificar tabela 'users'
    const usersResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);

    const usersExists = usersResult.rows[0].exists;

    // Se não existir, criar a tabela users
    if (!usersExists) {
      console.log('Criando tabela users...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT DEFAULT 'user' NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Tabela users criada com sucesso');
    }

    // Verificar tabela 'enderecos'
    const enderecosResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
                AND table_name = 'enderecos'
      )
    `);

    const enderecosExists = enderecosResult.rows[0].exists;

    // Criar tabela enderecos se não existir
    if (!enderecosExists) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS enderecos (
          id SERIAL PRIMARY KEY NOT NULL,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          tipo TEXT NOT NULL,
          cep TEXT NOT NULL,
          logradouro TEXT NOT NULL,
          numero TEXT NOT NULL,
          complemento TEXT,
          bairro TEXT NOT NULL,
          cidade TEXT NOT NULL,
          estado TEXT NOT NULL,
          pais TEXT DEFAULT 'Brasil' NOT NULL,
          principal BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // Verificar tabela 'contatos'
    const contatosResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contatos'
      )
    `);

    const contatosExists = contatosResult.rows[0].exists;

    // Criar tabela contatos se não existir
    if (!contatosExists) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contatos (
          id SERIAL PRIMARY KEY NOT NULL,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          nome TEXT NOT NULL,
          tipo TEXT NOT NULL,
          setor TEXT DEFAULT 'comercial',
          cargo TEXT NOT NULL,
          telefone TEXT NOT NULL,
          celular TEXT,
          whatsapp TEXT,
          email TEXT NOT NULL,
          principal BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    // Verificar tabela 'usuarios_adicionais'
    const usuariosAdicionaisResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios_adicionais'
      )
    `);

    const usuariosAdicionaisExists = usuariosAdicionaisResult.rows[0].exists;

    // Se não existir, criar a tabela usuarios_adicionais
    if (!usuariosAdicionaisExists) {
      console.log('Criando tabela usuarios_adicionais...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios_adicionais (
          id SERIAL PRIMARY KEY NOT NULL,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          nome TEXT NOT NULL,
          email TEXT NOT NULL,
          cargo TEXT NOT NULL,
          perfil TEXT NOT NULL,
          status TEXT DEFAULT 'ativo' NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Tabela usuarios_adicionais criada com sucesso');
    }

    // Verificar tabela 'activity_logs'
    const activityLogsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      )
    `);

    const activityLogsExists = activityLogsResult.rows[0].exists;

    // Se não existir, criar a tabela activity_logs
    if (!activityLogsExists) {
      console.log('Criando tabela activity_logs...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY NOT NULL,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          tipo_operacao TEXT NOT NULL,
          entidade TEXT NOT NULL,
          entidade_id INTEGER,
          descricao TEXT NOT NULL,
          detalhes JSONB,
          ip_address TEXT,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Tabela activity_logs criada com sucesso');
    }

    // Verificar tabela 'payment_methods'
    const paymentMethodsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_methods'
      )
    `);

    const paymentMethodsExists = paymentMethodsResult.rows[0].exists;

    // Se não existir, criar a tabela payment_methods
    if (!paymentMethodsExists) {
      console.log('Criando tabela payment_methods...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_methods (
          id SERIAL PRIMARY KEY NOT NULL,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          stripe_customer_id TEXT,
          stripe_payment_method_id TEXT,
          brand TEXT NOT NULL,
          last4 TEXT NOT NULL,
          exp_month INTEGER NOT NULL,
          exp_year INTEGER NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Tabela payment_methods criada com sucesso');
    }

    // Verificar se a coluna stripe_customer_id existe na tabela users
    const stripeCustomerIdResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'stripe_customer_id'
      )
    `);

    if (!stripeCustomerIdResult.rows[0].exists) {
      console.log('Adicionando coluna stripe_customer_id à tabela users...');
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN stripe_customer_id TEXT
      `);
      console.log('Coluna stripe_customer_id adicionada com sucesso');
    }

    // Verificar tabela 'planos'
    const planosResult = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'planos')");
    let planosExists = planosResult.rows[0].exists;

    // Limpeza silenciosa de tabelas temporárias
    try {
      // Excluir tabelas temporárias sem logs
      await pool.query(`DROP TABLE IF EXISTS planos_backup CASCADE`);

      // Excluir outras tabelas temporárias
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (
          table_name LIKE 'planos_%'
          OR table_name LIKE '%_temp'
          OR table_name LIKE '%_backup'
          OR table_name LIKE '%_old'
        )
        AND table_name != 'planos'
      `);

      for (const row of tablesResult.rows) {
        await pool.query(`DROP TABLE IF EXISTS ${row.table_name} CASCADE`);
      }
    } catch (error) {
      // Silenciando erros na limpeza
    }

    // Criar tabela 'planos' se não existir
    if (!planosExists) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS planos (
          id SERIAL PRIMARY KEY NOT NULL,
          nome TEXT NOT NULL UNIQUE,
          descricao TEXT,
          valor_mensal NUMERIC NOT NULL,
          valor_anual NUMERIC NOT NULL,
          economia_anual NUMERIC NOT NULL,
          valor_anual_total NUMERIC NOT NULL,
          ordem INTEGER NOT NULL,
          ativo BOOLEAN DEFAULT TRUE NOT NULL,
          dashboard BOOLEAN DEFAULT FALSE NOT NULL,
          precificacao BOOLEAN DEFAULT FALSE NOT NULL,
          precificacao_unitaria BOOLEAN DEFAULT FALSE NOT NULL,
          importacao BOOLEAN DEFAULT FALSE NOT NULL,
          cadastro_produtos BOOLEAN DEFAULT FALSE NOT NULL,
          cadastro_clientes BOOLEAN DEFAULT FALSE NOT NULL,
          cadastro_fornecedores BOOLEAN DEFAULT FALSE NOT NULL,
          relatorios BOOLEAN DEFAULT FALSE NOT NULL,
          gerenciamento_custos BOOLEAN DEFAULT FALSE NOT NULL,
          gerenciamento_taxas BOOLEAN DEFAULT FALSE NOT NULL,
          gerenciamento_tributos BOOLEAN DEFAULT FALSE NOT NULL,
          integracao_marketplaces BOOLEAN DEFAULT FALSE NOT NULL,
          central_treinamentos BOOLEAN DEFAULT FALSE NOT NULL,
          suporte BOOLEAN DEFAULT FALSE NOT NULL,
          usuarios_permitidos INTEGER DEFAULT 1 NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      try {
        await pool.query(`
          INSERT INTO planos (
            nome, descricao, valor_mensal, valor_anual, economia_anual, 
            valor_anual_total, ordem, ativo, dashboard, precificacao, 
            precificacao_unitaria, importacao, cadastro_produtos, cadastro_clientes, 
            cadastro_fornecedores, relatorios, gerenciamento_custos, gerenciamento_taxas, 
            gerenciamento_tributos, integracao_marketplaces, central_treinamentos, 
            suporte, usuarios_permitidos, created_at, updated_at
          )
          SELECT 
            nome, descricao, valor_mensal, valor_anual, economia_anual, 
            valor_anual_total, ordem, ativo, dashboard, precificacao, 
            precificacao_unitaria, importacao, cadastro_produtos, cadastro_clientes, 
            cadastro_fornecedores, relatorios, gerenciamento_custos, gerenciamento_taxas, 
            gerenciamento_tributos, integracao_marketplaces, central_treinamentos, 
            suporte, usuarios_permitidos, created_at, updated_at
          FROM planos_temp
        `);
        // Remover tabela temporária após restauração dos dados
        await pool.query(`DROP TABLE IF EXISTS planos_temp`);
      } catch (error) {
        console.warn('Aviso: Não foi possível restaurar dados da tabela temporária:', error.message);
        console.log('A tabela foi criada, mas pode estar vazia se este for um primeiro uso');

        // Criar registros padrão para planos
        console.log('Criando registros padrão para planos...');
        await pool.query(`
          INSERT INTO planos (nome, descricao, valor_mensal, valor_anual, economia_anual, valor_anual_total, ordem, ativo, 
                             dashboard, precificacao, precificacao_unitaria, importacao, 
                             cadastro_produtos, cadastro_clientes, cadastro_fornecedores, 
                             relatorios, gerenciamento_custos, gerenciamento_taxas, 
                             gerenciamento_tributos, integracao_marketplaces, 
                             central_treinamentos, suporte, usuarios_permitidos)
          VALUES 
            ('ESSENCIAL', 'Plano básico para pequenos empreendedores', 9.90, 7.90, 24.00, 94.80, 1, true, 
             true, true, false, false, true, true, true, false, false, false, false, false, false, true, 1),

            ('PROFISSIONAL', 'Plano completo para profissionais autônomos', 19.90, 16.90, 36.00, 202.80, 2, true, 
             true, true, true, true, true, true, true, true, true, false, false, false, true, true, 2),

            ('EMPRESARIAL', 'Solução completa para pequenas empresas', 29.90, 25.90, 48.00, 310.80, 3, true, 
             true, true, true, true, true, true, true, true, true, true, true, false, true, true, 5),

            ('PREMIUM', 'Pacote completo para médias e grandes empresas', 49.90, 42.90, 84.00, 514.80, 4, true, 
             true, true, true, true, true, true, true, true, true, true, true, true, true, true, 10)
        `);
        // Planos criados com sucesso
      }

      // Atualizar a flag de existência da tabela
      planosExists = true;
    }

    // Verificar se existem atualizações a fazer na tabela planos já existente
    // Essa parte só será executada se a tabela planos existir, para garantir que tenha a estrutura correta
    else if (planosExists) {
      // Verificar se a coluna valor_anual_total existe
      const valorAnualTotalResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'planos'
          AND column_name = 'valor_anual_total'
        )
      `);

      const valorAnualTotalExists = valorAnualTotalResult.rows[0].exists;

      // Se não existir a coluna valor_anual_total, adicionar e preencher com valores calculados
      if (!valorAnualTotalExists) {
        console.log('Adicionando coluna valor_anual_total à tabela planos...');
        await pool.query(`
          ALTER TABLE planos
          ADD COLUMN valor_anual_total NUMERIC NOT NULL DEFAULT 0
        `);

        // Atualizar os valores existentes multiplicando valor_anual por 12
        console.log('Atualizando valores anuais totais para os planos existentes...');
        await pool.query(`
          UPDATE planos
          SET valor_anual_total = valor_anual * 12
        `);

        console.log('Coluna valor_anual_total adicionada e valores atualizados com sucesso!');
      }

      // Verificar ordem das colunas e recursos específicos
      // 1. Verificar se a coluna recursos ainda existe (deve ser removida)
      const recursosResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'planos'
          AND column_name = 'recursos'
        )
      `);

      const recursosExists = recursosResult.rows[0].exists;

      // 2. Verificar se já temos as colunas específicas de recursos
      const dashboardResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'planos'
          AND column_name = 'dashboard'
        )
      `);

      const dashboardExists = dashboardResult.rows[0].exists;

      // Se temos a coluna recursos e não temos as colunas específicas, fazer a migração
      if (recursosExists && !dashboardExists) {
        console.log('Iniciando migração da tabela planos para novo formato de recursos...');

        // 1. Criar backup da tabela planos
        await pool.query(`CREATE TABLE planos_backup AS SELECT * FROM planos`);
        console.log('Backup da tabela planos criado');

        // 2. Adicionar as novas colunas
        console.log('Adicionando colunas de recursos específicos...');
        await pool.query(`
          ALTER TABLE planos
          ADD COLUMN dashboard BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN precificacao BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN precificacao_unitaria BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN importacao BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN cadastro_produtos BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN cadastro_clientes BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN relatorios_personalizados BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN gerenciamento_custos BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN gerenciamento_taxas BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN gerenciamento_tributacao BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN integracao_marketplaces BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN central_treinamento BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN suporte BOOLEAN DEFAULT FALSE NOT NULL,
          ADD COLUMN usuarios_permitidos INTEGER DEFAULT 1 NOT NULL
        `);

        // 3. Preencher valores padrão baseados nos planos existentes
        await pool.query(`
          UPDATE planos
          SET dashboard = TRUE,
              precificacao = TRUE,
              precificacao_unitaria = TRUE,
              gerenciamento_custos = TRUE,
              suporte = TRUE
          WHERE nome = 'ESSENCIAL' OR nome = 'PROFISSIONAL' OR nome = 'EMPRESARIAL' OR nome = 'PREMIUM'
        `);

        await pool.query(`
          UPDATE planos
          SET importacao = TRUE,
              cadastro_produtos = TRUE,
              cadastro_clientes = TRUE,
              relatorios_personalizados = TRUE
          WHERE nome = 'PROFISSIONAL' OR nome = 'EMPRESARIAL' OR nome = 'PREMIUM'
        `);

        await pool.query(`
          UPDATE planos
          SET gerenciamento_taxas = TRUE,
              gerenciamento_tributacao = TRUE,
              central_treinamento = TRUE,
              usuarios_permitidos = 3
          WHERE nome = 'EMPRESARIAL' OR nome = 'PREMIUM'
        `);

        await pool.query(`
          UPDATE planos
          SET integracao_marketplaces = TRUE,
              usuarios_permitidos = 5
          WHERE nome = 'PREMIUM'
        `);

        // 4. Reposicionar a coluna valor_anual_total após economia_anual
        // PostgreSQL não permite facilmente reordenar colunas, mas podemos usar uma tabela temporária
        console.log('Reposicionando coluna valor_anual_total...');

        // 4.1 Criar uma tabela temporária com a ordem correta
        await pool.query(`
          CREATE TABLE planos_temp (
            id SERIAL PRIMARY KEY NOT NULL,
            nome TEXT NOT NULL UNIQUE,
            descricao TEXT,
            valor_mensal NUMERIC NOT NULL,
            valor_anual NUMERIC NOT NULL,
            economia_anual NUMERIC NOT NULL,
            valor_anual_total NUMERIC NOT NULL,
            ordem INTEGER NOT NULL,
            ativo BOOLEAN DEFAULT TRUE NOT NULL,
            dashboard BOOLEAN DEFAULT FALSE NOT NULL,
            precificacao BOOLEAN DEFAULT FALSE NOT NULL,
            precificacao_unitaria BOOLEAN DEFAULT FALSE NOT NULL,
            importacao BOOLEAN DEFAULT FALSE NOT NULL,
            cadastro_produtos BOOLEAN DEFAULT FALSE NOT NULL,
            cadastro_clientes BOOLEAN DEFAULT FALSE NOT NULL,
            relatorios_personalizados BOOLEAN DEFAULT FALSE NOT NULL,
            gerenciamento_custos BOOLEAN DEFAULT FALSE NOT NULL,
            gerenciamento_taxas BOOLEAN DEFAULT FALSE NOT NULL,
            gerenciamento_tributacao BOOLEAN DEFAULT FALSE NOT NULL,
            integracao_marketplaces BOOLEAN DEFAULT FALSE NOT NULL,
            central_treinamento BOOLEAN DEFAULT FALSE NOT NULL,
            suporte BOOLEAN DEFAULT FALSE NOT NULL,
            usuarios_permitidos INTEGER DEFAULT 1 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);

        // 4.2 Copiar dados para a tabela temporária
        await pool.query(`
          INSERT INTO planos_temp 
          (id, nome, descricao, valor_mensal, valor_anual, economia_anual, valor_anual_total, ordem, ativo, 
           dashboard, precificacao, precificacao_unitaria, importacao, cadastro_produtos, cadastro_clientes, 
           relatorios_personalizados, gerenciamento_custos, gerenciamento_taxas, gerenciamento_tributacao, 
           integracao_marketplaces, central_treinamento, suporte, usuarios_permitidos, created_at, updated_at)
          SELECT id, nome, descricao, valor_mensal, valor_anual, economia_anual, valor_anual_total, ordem, ativo, 
                 dashboard, precificacao, precificacao_unitaria, importacao, cadastro_produtos, cadastro_clientes, 
                 relatorios_personalizados, gerenciamento_custos, gerenciamento_taxas, gerenciamento_tributacao, 
                 integracao_marketplaces, central_treinamento, suporte, usuarios_permitidos, created_at, updated_at
          FROM planos
        `);

        // 4.3 Verificar sequência atual
        const sequenceResult = await pool.query(`
          SELECT pg_get_serial_sequence('planos', 'id') as sequence_name
        `);
        const sequenceName = sequenceResult.rows[0].sequence_name;

        // 4.4 Renomear tabelas - usando CASCADE para lidar com dependências
        try {
          // Primeiro criar um índice com o mesmo nome na tabela temporária
          await pool.query(`CREATE INDEX IF NOT EXISTS planos_pkey ON planos_temp (id)`);

          // Depois excluir a tabela original com CASCADE (para remover as constraints)
          await pool.query(`DROP TABLE planos CASCADE`);

          // Renomear a tabela temporária
          await pool.query(`ALTER TABLE planos_temp RENAME TO planos`);

          // Recriar as constraints
          await pool.query(`
            ALTER TABLE assinaturas 
            ADD CONSTRAINT assinaturas_plano_id_fkey 
            FOREIGN KEY (plano_id) REFERENCES planos(id)
          `);

          console.log('Tabela planos renomeada e restrições recriadas com sucesso');
        } catch (err) {
          console.error('Erro ao renomear tabela:', err);
          // Abordagem alternativa: alterar a tabela em vez de recriá-la
          console.log('Tentando abordagem alternativa de migração...');

          // Em vez de recriar a tabela, vamos modificar a existente
          try {
            // 1. Fazer backup dos dados
            await pool.query(`CREATE TABLE IF NOT EXISTS planos_backup AS SELECT * FROM planos`);

            // 2. Adicionar as novas colunas de recursos (se ainda não existirem)
            // Já foi feito anteriormente

            // 3. Mover a coluna valor_anual_total
            // Em PostgreSQL, não é possível alterar a ordem das colunas diretamente
            // Mas podemos criar uma VISUALIZAÇÃO com a ordem desejada para consultas
            await pool.query(`
              CREATE OR REPLACE VIEW planos_view AS
              SELECT 
                id, nome, descricao, valor_mensal, valor_anual, economia_anual, valor_anual_total,
                ordem, ativo, dashboard, precificacao, precificacao_unitaria, importacao,
                cadastro_produtos, cadastro_clientes, relatorios_personalizados, gerenciamento_custos,
                gerenciamento_taxas, gerenciamento_tributacao, integracao_marketplaces,
                central_treinamento, suporte, usuarios_permitidos, created_at, updated_at
              FROM planos
            `);

            console.log('Criada visualização planos_view com a ordem correta das colunas');
          } catch (viewErr) {
            console.error('Erro ao criar visualização alternativa:', viewErr);
          }
        }

        // 4.5 Ajustar a sequência se necessário
        try {
          if (sequenceName) {
            await pool.query(`ALTER SEQUENCE ${sequenceName} OWNED BY planos.id`);
          }
        } catch (seqErr) {
          console.error('Erro ao ajustar sequência:', seqErr);
        }

        // 5. Remover a coluna recursos (já foi substituída pelas colunas específicas)
        // A coluna recursos não existe mais na nova tabela, então não precisamos removê-la explicitamente

        // Migração concluída
      }
    }

    // Criar tabela planos se não existir
    if (!planosExists) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS planos (
          id SERIAL PRIMARY KEY NOT NULL,
          nome TEXT NOT NULL UNIQUE,
          descricao TEXT,
          valor_mensal NUMERIC NOT NULL,
          valor_anual NUMERIC NOT NULL,
          economia_anual NUMERIC NOT NULL,
          valor_anual_total NUMERIC NOT NULL,
          ordem INTEGER NOT NULL,
          ativo BOOLEAN DEFAULT TRUE NOT NULL,
          dashboard BOOLEAN DEFAULT FALSE NOT NULL,
          precificacao BOOLEAN DEFAULT FALSE NOT NULL,
          precificacao_unitaria BOOLEAN DEFAULT FALSE NOT NULL,
          importacao BOOLEAN DEFAULT FALSE NOT NULL,
          cadastro_produtos BOOLEAN DEFAULT FALSE NOT NULL,
          cadastro_clientes BOOLEAN DEFAULT FALSE NOT NULL,
          relatorios_personalizados BOOLEAN DEFAULT FALSE NOT NULL,
          gerenciamento_custos BOOLEAN DEFAULT FALSE NOT NULL,
          gerenciamento_taxas BOOLEAN DEFAULT FALSE NOT NULL,
          gerenciamento_tributacao BOOLEAN DEFAULT FALSE NOT NULL,
          integracao_marketplaces BOOLEAN DEFAULT FALSE NOT NULL,
          central_treinamento BOOLEAN DEFAULT FALSE NOT NULL,
          suporte BOOLEAN DEFAULT FALSE NOT NULL,
          usuarios_permitidos INTEGER DEFAULT 1 NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      // Inserir os planos padrão silenciosamente
      await pool.query(`
        INSERT INTO planos (
          nome, descricao, valor_mensal, valor_anual, economia_anual, valor_anual_total, ordem,
          dashboard, precificacao, precificacao_unitaria, importacao, cadastro_produtos,
          cadastro_clientes, relatorios_personalizados, gerenciamento_custos,
          gerenciamento_taxas, gerenciamento_tributacao, integracao_marketplaces,
          central_treinamento, suporte, usuarios_permitidos
        )
        VALUES 
          (
            'ESSENCIAL', 'Ideal para autônomos e iniciantes', 87.90, 73.25, 175.80, 879.00, 1,
            TRUE, TRUE, TRUE, FALSE, FALSE,
            FALSE, FALSE, TRUE,
            FALSE, FALSE, FALSE,
            FALSE, TRUE, 1
          ),
          (
            'PROFISSIONAL', 'Ideal para pequenas empresas em crescimento', 197.90, 164.92, 395.76, 1979.00, 2,
            TRUE, TRUE, TRUE, TRUE, TRUE,
            TRUE, TRUE, TRUE,
            FALSE, FALSE, FALSE,
            FALSE, TRUE, 3
          ),
          (
            'EMPRESARIAL', 'Ideal para empresas médias', 397.90, 331.58, 795.84, 3979.00, 3,
            TRUE, TRUE, TRUE, TRUE, TRUE,
            TRUE, TRUE, TRUE,
            TRUE, TRUE, FALSE,
            TRUE, TRUE, 5
          ),
          (
            'PREMIUM', 'Ideal para corporações e grandes empresas', 697.90, 581.58, 1395.84, 6979.00, 4,
            TRUE, TRUE, TRUE, TRUE, TRUE,
            TRUE, TRUE, TRUE,
            TRUE, TRUE, TRUE,
            TRUE, TRUE, 10
          )
      `);
      console.log('Planos padrão inseridos com sucesso');
    }

    // Verificar tabela 'assinaturas'
    const assinaturasResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assinaturas'
      )
    `);

    const assinaturasExists = assinaturasResult.rows[0].exists;

    // Se não existir, criar a tabela assinaturas
    if (!assinaturasExists) {
      console.log('Criando tabela assinaturas...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS assinaturas (
          id SERIAL PRIMARY KEY NOT NULL,
          user_id INTEGER REFERENCES users(id) NOT NULL,
          plano_id INTEGER REFERENCES planos(id) NOT NULL,
          plano TEXT,
          stripe_subscription_id TEXT,
          data_inicio TIMESTAMP DEFAULT NOW() NOT NULL,
          data_fim TIMESTAMP,
          status TEXT DEFAULT 'ativa' NOT NULL,
          tipo_cobranca TEXT NOT NULL,
          valor_pago NUMERIC NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Tabela assinaturas criada com sucesso');
    } else {
      // Verificar se a coluna 'plano' existe e criar se necessário
      const planoColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'assinaturas' 
          AND column_name = 'plano'
        )
      `);
      
      if (!planoColumnExists.rows[0].exists) {
        console.log('Adicionando coluna plano à tabela assinaturas...');
        await pool.query(`
          ALTER TABLE assinaturas ADD COLUMN plano TEXT
        `);
        console.log('Coluna plano adicionada com sucesso');
      }
    }

    // Criar plano padrão para usuários existentes
    console.log('Verificando usuários ativos sem assinatura...');
    const usersWithoutSubscription = await pool.query(`
      SELECT id FROM users 
      WHERE is_active = TRUE AND id NOT IN (SELECT user_id FROM assinaturas)
    `);

    if (usersWithoutSubscription.rows.length > 0) {
      console.log(`Encontrados ${usersWithoutSubscription.rows.length} usuários sem assinatura.`);

      // Obter o ID do plano "ESSENCIAL"
      const planoEssencialResult = await pool.query(`
        SELECT id FROM planos WHERE nome = 'ESSENCIAL' LIMIT 1
      `);

      if (planoEssencialResult.rows.length > 0) {
        const planoEssencialId = planoEssencialResult.rows[0].id;
        console.log(`Plano ESSENCIAL encontrado. ID: ${planoEssencialId}`);

        // Criar assinaturas para todos os usuários sem assinatura
        for (const user of usersWithoutSubscription.rows) {
          await pool.query(`
            INSERT INTO assinaturas 
              (user_id, plano_id, status, tipo_cobranca, valor_pago) 
            VALUES 
              ($1, $2, 'ativa', 'mensal', 87.90)
          `, [user.id, planoEssencialId]);
        }

        console.log(`Assinaturas criadas para ${usersWithoutSubscription.rows.length} usuários.`);
      } else {
        console.log('Plano ESSENCIAL não encontrado. Assinaturas não criadas.');
      }
    } else {
      console.log('Nenhum usuário ativo sem assinatura encontrado.');
    }

    // Verificação de segurança na tabela users
    const twoFactorEnabledExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'two_factor_enabled'
      )
    `);

    if (!twoFactorEnabledExists.rows[0].exists) {
      console.log('Adicionando colunas de segurança à tabela users...');
      try {
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
          ADD COLUMN two_factor_secret TEXT,
          ADD COLUMN last_password_change TIMESTAMP
        `);
        console.log('Colunas de segurança adicionadas com sucesso à tabela users');
      } catch (error) {
        console.error('Erro ao adicionar colunas de segurança:', error);
      }
    }

    // Verificar se a tabela user_sessions existe
    const userSessionsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_sessions'
      )
    `);

    if (!userSessionsExists.rows[0].exists) {
      console.log('Criando tabela user_sessions...');
      try {
        await pool.query(`
          CREATE TABLE user_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            token TEXT NOT NULL UNIQUE,
            device_info TEXT,
            browser TEXT,
            ip TEXT,
            location TEXT,
            last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log('Tabela user_sessions criada com sucesso');
      } catch (error) {
        console.error('Erro ao criar tabela user_sessions:', error);
      }
    }

    // Verificar se a tabela pagamentos existe
    const pagamentosExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'pagamentos'
        )
      `);

    if (!pagamentosExists.rows[0].exists) {
      console.log('Criando tabela pagamentos...');
      await executeQuery(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        plano_id INTEGER,
        valor DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pendente',
        metodo_pagamento VARCHAR(100),
        stripe_payment_intent_id VARCHAR(255),
        stripe_invoice_id VARCHAR(255),
        data_pagamento TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        plano_nome VARCHAR(100),
        periodo VARCHAR(20) DEFAULT 'mensal',
        fatura_url TEXT,
        CONSTRAINT pagamentos_stripe_invoice_id_key UNIQUE (stripe_invoice_id)
      )
    `);
      console.log('Tabela pagamentos criada com sucesso');
    }

    console.log("Verificação de tabelas completada com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao verificar/criar tabelas:", error);
    return false;
  }
}