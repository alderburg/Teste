import { createHash } from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do banco de dados
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

// Funções auxiliares
async function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

// Função principal para criar um usuário de teste
async function createTestUser() {
  const client = await pool.connect();
  
  try {
    console.log('Conectado ao banco de dados. Criando usuário de teste...');
    
    // Dados do usuário de teste
    const username = 'testemail';
    const email = 'ritielepf@gmail.com';
    const password = await hashPassword('Teste@123');
    
    // Verificar se o usuário já existe
    const checkUserQuery = 'SELECT * FROM users WHERE email = $1 OR username = $2';
    const existingUser = await client.query(checkUserQuery, [email, username]);
    
    if (existingUser.rows.length > 0) {
      console.log('Usuário já existe. Atualizando para não verificado...');
      
      // Atualizar o usuário existente para não verificado
      const updateQuery = 'UPDATE users SET email_verified = false WHERE email = $1 RETURNING id';
      const updateResult = await client.query(updateQuery, [email]);
      
      if (updateResult.rows.length > 0) {
        console.log(`Usuário atualizado com sucesso. ID: ${updateResult.rows[0].id}`);
        
        // Excluir possíveis tokens existentes
        await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [updateResult.rows[0].id]);
        
        console.log('Tokens antigos excluídos.');
        return updateResult.rows[0].id;
      }
    } else {
      console.log('Criando novo usuário de teste...');
      
      // Criar novo usuário
      const insertQuery = `
        INSERT INTO users (
          username, email, password, role, is_active, email_verified, 
          two_factor_enabled, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, 'user', true, false, false, NOW(), NOW())
        RETURNING id
      `;
      
      const result = await client.query(insertQuery, [username, email, password]);
      
      if (result.rows.length > 0) {
        const userId = result.rows[0].id;
        console.log(`Usuário criado com sucesso. ID: ${userId}`);
        
        // Criar perfil básico
        const profileQuery = `
          INSERT INTO user_profiles (
            user_id, primeiro_nome, ultimo_nome, 
            tipo_pessoa, created_at, updated_at,
            configuracoes
          )
          VALUES ($1, 'Teste', 'Email', 'fisica', NOW(), NOW(), '{"tema":"light","notificacoes":true,"exibirTutorial":true}')
        `;
        
        await client.query(profileQuery, [userId]);
        console.log('Perfil de usuário criado com sucesso.');
        
        return userId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao criar usuário de teste:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar a função
createTestUser()
  .then(userId => {
    if (userId) {
      console.log(`Usuário de teste pronto para verificação. ID: ${userId}`);
      console.log('Email para teste: ritielepf@gmail.com');
      console.log('Senha: Teste@123');
    } else {
      console.log('Não foi possível criar o usuário de teste.');
    }
    pool.end();
  })
  .catch(err => {
    console.error('Erro crítico:', err);
    pool.end();
    process.exit(1);
  });