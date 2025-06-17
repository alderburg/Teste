import dotenv from 'dotenv';
dotenv.config();

import { pool } from './server/db';

// Função principal para executar a limpeza
async function limparUsuarios() {
  try {
    const adminId = 3; // ID do administrador (ritialdeburg@gmail.com)
    
    console.log(`Iniciando limpeza do banco de dados - mantendo apenas o usuário ID ${adminId}...`);
    
    // Verificar se o administrador existe
    const adminResult = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [adminId]
    );
    
    if (adminResult.rows.length === 0) {
      console.error(`Erro: Usuário administrador com ID ${adminId} não encontrado!`);
      process.exit(1);
    }
    
    const adminEmail = adminResult.rows[0].email;
    console.log(`Administrador encontrado: ID ${adminId}, Email: ${adminEmail}`);
    
    // Listar usuários a serem excluídos
    const usuariosResult = await pool.query(
      'SELECT id, email FROM users WHERE id != $1',
      [adminId]
    );
    
    if (usuariosResult.rows.length === 0) {
      console.log('Não há outros usuários para excluir.');
      process.exit(0);
    }
    
    console.log(`\nTotal de usuários a serem excluídos: ${usuariosResult.rows.length}`);
    console.log('\nUsuários que serão excluídos:');
    usuariosResult.rows.forEach(usuario => {
      console.log(`- ID: ${usuario.id}, Email: ${usuario.email}`);
    });
    
    // Excluir registros relacionados em diversas tabelas
    console.log('\nExcluindo dados relacionados...');
    
    await pool.query('DELETE FROM user_profiles WHERE user_id != $1', [adminId]);
    console.log('✓ Perfis de usuário removidos');
    
    await pool.query('DELETE FROM enderecos WHERE user_id != $1', [adminId]);
    console.log('✓ Endereços removidos');
    
    await pool.query('DELETE FROM contatos WHERE user_id != $1', [adminId]);
    console.log('✓ Contatos removidos');
    
    await pool.query('DELETE FROM assinaturas WHERE user_id != $1', [adminId]);
    console.log('✓ Assinaturas removidas');
    
    await pool.query('DELETE FROM produtos WHERE user_id != $1', [adminId]);
    console.log('✓ Produtos removidos');
    
    await pool.query('DELETE FROM servicos WHERE user_id != $1', [adminId]);
    console.log('✓ Serviços removidos');
    
    await pool.query('DELETE FROM itens_aluguel WHERE user_id != $1', [adminId]);
    console.log('✓ Itens de aluguel removidos');
    
    // Vamos verificar se a tabela existe antes de tentar excluir
    try {
      await pool.query('DELETE FROM fornecedores WHERE user_id != $1', [adminId]);
      console.log('✓ Fornecedores removidos');
    } catch (error) {
      console.log('× Tabela fornecedores não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM clientes WHERE user_id != $1', [adminId]);
      console.log('✓ Clientes removidos');
    } catch (error) {
      console.log('× Tabela clientes não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM marketplaces WHERE user_id != $1', [adminId]);
      console.log('✓ Marketplaces removidos');
    } catch (error) {
      console.log('× Tabela marketplaces não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM custos WHERE user_id != $1', [adminId]);
      console.log('✓ Custos removidos');
    } catch (error) {
      console.log('× Tabela custos não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM despesas WHERE user_id != $1', [adminId]);
      console.log('✓ Despesas removidas');
    } catch (error) {
      console.log('× Tabela despesas não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM taxas WHERE user_id != $1', [adminId]);
      console.log('✓ Taxas removidas');
    } catch (error) {
      console.log('× Tabela taxas não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM tributos WHERE user_id != $1', [adminId]);
      console.log('✓ Tributos removidos');
    } catch (error) {
      console.log('× Tabela tributos não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM precificacoes WHERE user_id != $1', [adminId]);
      console.log('✓ Precificações removidas');
    } catch (error) {
      console.log('× Tabela precificacoes não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM categorias WHERE user_id != $1', [adminId]);
      console.log('✓ Categorias removidas');
    } catch (error) {
      console.log('× Tabela categorias não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM payment_methods WHERE user_id != $1', [adminId]);
      console.log('✓ Métodos de pagamento removidos');
    } catch (error) {
      console.log('× Tabela payment_methods não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM stripe_customers WHERE user_id != $1', [adminId]);
      console.log('✓ Clientes Stripe removidos');
    } catch (error) {
      console.log('× Tabela stripe_customers não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM activity_logs WHERE user_id != $1', [adminId]);
      console.log('✓ Logs de atividade removidos');
    } catch (error) {
      console.log('× Tabela activity_logs não existe, ignorando');
    }
    
    try {
      await pool.query('DELETE FROM usuarios_adicionais WHERE user_id != $1', [adminId]);
      console.log('✓ Usuários adicionais removidos');
    } catch (error) {
      console.log('× Tabela usuarios_adicionais não existe, ignorando');
    }
    
    // Remover tokens de redefinição de senha
    try {
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id != $1', [adminId]);
      console.log('✓ Tokens de redefinição de senha removidos');
    } catch (error) {
      console.log('× Tabela password_reset_tokens não existe, ignorando');
    }
    
    // Remover tokens de verificação de email
    try {
      await pool.query('DELETE FROM email_verification_tokens WHERE user_id != $1', [adminId]);
      console.log('✓ Tokens de verificação de email removidos');
    } catch (error) {
      console.log('× Tabela email_verification_tokens não existe, ignorando');
    }
    
    // Verificar e excluir os usuários
    try {
      const deleteResult = await pool.query(
        'DELETE FROM users WHERE id != $1 RETURNING id',
        [adminId]
      );
      
      console.log(`\n✅ Limpeza concluída! ${deleteResult.rowCount} usuários foram removidos.`);
      console.log(`Apenas o administrador (ID: ${adminId}, Email: ${adminEmail}) permanece no sistema.`);
    } catch (error) {
      console.error(`\n❌ Erro ao excluir usuários: ${error.message}`);
    }
    
    // Encerrar conexão com o banco de dados
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ Erro ao limpar usuários:', error);
    process.exit(1);
  }
}

// Executar a função principal
limparUsuarios();