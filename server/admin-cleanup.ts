import { pool } from './db';

// Função para excluir todos os usuários exceto o administrador especificado
export async function limparUsuariosExcetoAdmin(adminId: number = 3) {
  try {
    console.log(`Iniciando exclusão de usuários exceto o administrador (ID: ${adminId})...`);
    
    // Verificar se o administrador existe
    const adminResult = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [adminId]
    );
    
    if (adminResult.rows.length === 0) {
      console.error(`Erro: Usuário administrador com ID ${adminId} não encontrado!`);
      return {
        success: false,
        message: `Administrador com ID ${adminId} não encontrado!`
      };
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
    const usuariosExcluidos = [];
    usuariosResult.rows.forEach(usuario => {
      console.log(`- ID: ${usuario.id}, Email: ${usuario.email}`);
      usuariosExcluidos.push({
        id: usuario.id,
        email: usuario.email
      });
    });
    
    // Excluir registros relacionados em outras tabelas
    await pool.query('DELETE FROM user_profiles WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM enderecos WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM contatos WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM assinaturas WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM produtos WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM servicos WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM itens_aluguel WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM fornecedores WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM clientes WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM marketplaces WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM custos WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM despesas WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM taxas WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM tributos WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM precificacoes WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM categorias WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM payment_methods WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM stripe_customers WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM activity_logs WHERE user_id != $1', [adminId]);
    await pool.query('DELETE FROM usuarios_adicionais WHERE user_id != $1', [adminId]);
    
    // Por fim, excluir os usuários
    const deleteResult = await pool.query(
      'DELETE FROM users WHERE id != $1 RETURNING id',
      [adminId]
    );
    
    console.log(`Exclusão concluída! ${deleteResult.rowCount} usuários foram removidos.`);
    console.log(`Apenas o administrador (ID: ${adminId}, Email: ${adminEmail}) permanece no sistema.`);
    
    return {
      success: true,
      message: `Exclusão concluída! ${deleteResult.rowCount} usuários foram removidos.`,
      admin: {
        id: adminId,
        email: adminEmail
      },
      usuariosExcluidos
    };
  } catch (error) {
    console.error('Erro ao excluir usuários:', error);
    return {
      success: false,
      message: 'Erro ao excluir usuários',
      error: String(error)
    };
  }
}