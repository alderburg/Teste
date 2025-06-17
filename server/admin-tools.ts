import { pool } from './db';

// Função para excluir todos os usuários exceto o administrador
export async function excluirUsuariosExcetoAdmin(adminId: number = 3) {
  try {
    console.log(`Iniciando exclusão de usuários exceto o administrador (ID: ${adminId})...`);
    
    // Verificar se o administrador existe
    const adminResult = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [adminId]
    );
    
    if (adminResult.rows.length === 0) {
      console.error(`Erro: Usuário administrador com ID ${adminId} não encontrado!`);
      return false;
    }
    
    const adminEmail = adminResult.rows[0].email;
    console.log(`Administrador encontrado: ID ${adminId}, Email: ${adminEmail}`);
    
    // Contar quantos usuários serão excluídos
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE id != $1',
      [adminId]
    );
    
    const totalUsuarios = parseInt(countResult.rows[0].total);
    console.log(`Total de usuários a serem excluídos: ${totalUsuarios}`);
    
    // Listar IDs dos usuários que serão excluídos
    const usuariosResult = await pool.query(
      'SELECT id, email FROM users WHERE id != $1',
      [adminId]
    );
    
    console.log('Usuários que serão excluídos:');
    usuariosResult.rows.forEach(usuario => {
      console.log(`- ID: ${usuario.id}, Email: ${usuario.email}`);
    });
    
    // Excluir registros relacionados na tabela user_profiles
    await pool.query(
      'DELETE FROM user_profiles WHERE user_id != $1',
      [adminId]
    );
    console.log('Perfis de usuários excluídos.');
    
    // Excluir registros relacionados em outras tabelas que têm user_id como chave estrangeira
    // Endereços
    await pool.query(
      'DELETE FROM enderecos WHERE user_id != $1',
      [adminId]
    );
    console.log('Endereços excluídos.');
    
    // Contatos
    await pool.query(
      'DELETE FROM contatos WHERE user_id != $1',
      [adminId]
    );
    console.log('Contatos excluídos.');
    
    // Assinaturas
    await pool.query(
      'DELETE FROM assinaturas WHERE user_id != $1',
      [adminId]
    );
    console.log('Assinaturas excluídas.');
    
    // Produtos
    await pool.query(
      'DELETE FROM produtos WHERE user_id != $1',
      [adminId]
    );
    console.log('Produtos excluídos.');
    
    // Precificações
    await pool.query(
      'DELETE FROM precificacoes WHERE user_id != $1',
      [adminId]
    );
    console.log('Precificações excluídas.');
    
    // StripeCustomers
    await pool.query(
      'DELETE FROM stripe_customers WHERE user_id != $1',
      [adminId]
    );
    console.log('Stripe Customers excluídos.');
    
    // PaymentMethods
    await pool.query(
      'DELETE FROM payment_methods WHERE user_id != $1',
      [adminId]
    );
    console.log('Métodos de pagamento excluídos.');
    
    // Por fim, excluir os usuários
    const deleteResult = await pool.query(
      'DELETE FROM users WHERE id != $1 RETURNING id',
      [adminId]
    );
    
    console.log(`Exclusão concluída! ${deleteResult.rowCount} usuários foram removidos.`);
    console.log(`Apenas o administrador (ID: ${adminId}, Email: ${adminEmail}) permanece no sistema.`);
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir usuários:', error);
    return false;
  }
}