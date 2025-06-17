import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuração para obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações do banco de dados
const dbConfig = {
  host: 'meuprecocerto.postgresql.dbaas.com.br',
  port: 5432,
  user: 'meuprecocerto',
  password: 'Dr19122010@@',
  database: 'meuprecocerto'
};

// Tabelas que devemos excluir do backup completo de dados (apenas estrutura)
// por serem muito grandes ou conterem dados temporários
const EXCLUDE_DATA_TABLES = ['activity_logs', 'session'];

async function criarBackupCompleto() {
  console.log('Iniciando backup completo do banco de dados...');
  
  // Criar diretório de backup
  const backupDir = path.join(__dirname, '../backups/database');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(backupDir, `backup_completo_${timestamp}.sql`);
  
  // Criar arquivo de backup e abrir stream para escrita
  const stream = fs.createWriteStream(filename);
  
  // Escrever cabeçalho
  stream.write(`-- Backup completo do banco de dados ${dbConfig.database}\n`);
  stream.write(`-- Data: ${new Date().toISOString()}\n`);
  stream.write(`-- Este script cria as tabelas caso não existam e insere os dados\n\n`);
  
  const pool = new Pool(dbConfig);
  
  try {
    // Coletar todos os nomes de tabelas no esquema public
    console.log('Obtendo lista de tabelas...');
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesRes.rows.map(row => row.table_name);
    console.log(`Encontradas ${tables.length} tabelas no banco de dados.`);
    
    // Adicionar verificação de existência para cada tabela antes de criar
    stream.write(`-- Função para verificar se uma tabela existe\n`);
    stream.write(`CREATE OR REPLACE FUNCTION table_exists(table_name TEXT) RETURNS BOOLEAN AS $$\n`);
    stream.write(`BEGIN\n`);
    stream.write(`  RETURN EXISTS (\n`);
    stream.write(`    SELECT FROM information_schema.tables \n`);
    stream.write(`    WHERE table_schema = 'public' AND table_name = table_name\n`);
    stream.write(`  );\n`);
    stream.write(`END;\n`);
    stream.write(`$$ LANGUAGE plpgsql;\n\n`);
    
    // Para cada tabela, gerar comandos IF NOT EXISTS
    for (const table of tables) {
      console.log(`Processando tabela: ${table}`);
      
      try {
        // 1. Obter estrutura da tabela (DDL)
        const schemaRes = await pool.query(`
          SELECT column_name, data_type, character_maximum_length, 
                is_nullable, column_default, ordinal_position
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        // Construir o comando CREATE TABLE IF NOT EXISTS
        stream.write(`-- Estrutura da tabela ${table}\n`);
        stream.write(`DO $$\n`);
        stream.write(`BEGIN\n`);
        stream.write(`  IF NOT table_exists('${table}') THEN\n`);
        stream.write(`    CREATE TABLE "${table}" (\n`);
        
        const columns = schemaRes.rows.map((col, index, arr) => {
          let dataType = col.data_type;
          if (col.character_maximum_length) {
            dataType += `(${col.character_maximum_length})`;
          }
          
          let columnDef = `      "${col.column_name}" ${dataType}`;
          
          if (col.is_nullable === 'NO') {
            columnDef += ' NOT NULL';
          }
          
          if (col.column_default) {
            columnDef += ` DEFAULT ${col.column_default}`;
          }
          
          return columnDef + (index === arr.length - 1 ? '' : ',');
        });
        
        // Adicionar constraints de chave primária se existirem
        try {
          const pkRes = await pool.query(`
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = $1::regclass AND i.indisprimary
          `, [table]);
          
          if (pkRes.rows.length > 0) {
            const pkColumns = pkRes.rows.map(row => `"${row.attname}"`).join(', ');
            if (columns.length > 0) {
              columns.push(`      PRIMARY KEY (${pkColumns})`);
            } else {
              columns.push(`      PRIMARY KEY (${pkColumns})`);
            }
          }
        } catch (err) {
          console.error(`  → Erro ao obter chave primária para ${table}:`, err.message);
        }
        
        stream.write(columns.join('\n'));
        stream.write('\n    );\n');
        stream.write(`    RAISE NOTICE 'Tabela ${table} criada';\n`);
        stream.write(`  ELSE\n`);
        stream.write(`    RAISE NOTICE 'Tabela ${table} já existe';\n`);
        stream.write(`  END IF;\n`);
        stream.write(`END $$;\n\n`);
        
        // 2. Obter dados da tabela (se não estiver na lista de exclusão)
        if (!EXCLUDE_DATA_TABLES.includes(table)) {
          const dataRes = await pool.query(`SELECT * FROM "${table}"`);
          
          if (dataRes.rows.length > 0) {
            stream.write(`-- Dados da tabela ${table}\n`);
            
            // Verificar se a tabela já tem dados para evitar duplicações
            stream.write(`DO $$\n`);
            stream.write(`BEGIN\n`);
            stream.write(`  IF (SELECT COUNT(*) FROM "${table}") = 0 THEN\n`);
            
            // Usar transação para inserção de dados
            stream.write(`    BEGIN;\n`);
            
            // Dividir em blocos de 50 registros para melhor desempenho
            const chunkSize = 50;
            for (let i = 0; i < dataRes.rows.length; i += chunkSize) {
              const chunk = dataRes.rows.slice(i, i + chunkSize);
              
              // Obter nomes das colunas
              const columnNames = Object.keys(chunk[0]).map(col => `"${col}"`).join(', ');
              
              stream.write(`    INSERT INTO "${table}" (${columnNames}) VALUES\n`);
              
              // Formatar os valores para SQL
              const values = chunk.map((row, idx) => {
                const rowValues = Object.values(row).map(val => {
                  if (val === null) return 'NULL';
                  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                  if (typeof val === 'object' && val instanceof Date) return `'${val.toISOString()}'`;
                  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                  return val;
                }).join(', ');
                
                return `      (${rowValues})${idx === chunk.length - 1 ? '' : ','}`;
              }).join('\n');
              
              stream.write(values + ';\n');
            }
            
            stream.write(`    COMMIT;\n`);
            stream.write(`    RAISE NOTICE 'Dados inseridos na tabela ${table}';\n`);
            stream.write(`  ELSE\n`);
            stream.write(`    RAISE NOTICE 'Tabela ${table} já contém dados, pulando inserção';\n`);
            stream.write(`  END IF;\n`);
            stream.write(`EXCEPTION WHEN OTHERS THEN\n`);
            stream.write(`  ROLLBACK;\n`);
            stream.write(`  RAISE NOTICE 'Erro ao inserir dados na tabela ${table}: %', SQLERRM;\n`);
            stream.write(`END $$;\n\n`);
            
            console.log(`  → ${dataRes.rows.length} registros processados da tabela ${table}`);
          } else {
            stream.write(`-- Tabela ${table} está vazia\n\n`);
          }
        } else {
          stream.write(`-- Dados da tabela ${table} excluídos do backup por ser muito grande\n\n`);
        }
        
        // 3. Adicionar índices e constraints
        try {
          // Índices (exceto chaves primárias que já foram adicionadas)
          const indexesRes = await pool.query(`
            SELECT
              i.relname as index_name,
              a.attname as column_name,
              ix.indisunique as is_unique,
              pg_get_indexdef(ix.indexrelid) as index_def
            FROM
              pg_class t,
              pg_class i,
              pg_index ix,
              pg_attribute a
            WHERE
              t.oid = ix.indrelid
              and i.oid = ix.indexrelid
              and a.attrelid = t.oid
              and a.attnum = ANY(ix.indkey)
              and t.relkind = 'r'
              and t.relname = $1
              and not ix.indisprimary
            ORDER BY
              i.relname
          `, [table]);
          
          if (indexesRes.rows.length > 0) {
            stream.write(`-- Índices para a tabela ${table}\n`);
            
            // Agrupar índices por nome (um índice pode ter várias colunas)
            const indexMap = {};
            for (const idx of indexesRes.rows) {
              if (!indexMap[idx.index_name]) {
                indexMap[idx.index_name] = idx;
              }
            }
            
            for (const indexName in indexMap) {
              const idx = indexMap[indexName];
              stream.write(`DO $$\n`);
              stream.write(`BEGIN\n`);
              stream.write(`  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '${indexName}') THEN\n`);
              stream.write(`    ${idx.index_def};\n`);
              stream.write(`    RAISE NOTICE 'Índice ${indexName} criado';\n`);
              stream.write(`  ELSE\n`);
              stream.write(`    RAISE NOTICE 'Índice ${indexName} já existe';\n`);
              stream.write(`  END IF;\n`);
              stream.write(`EXCEPTION WHEN OTHERS THEN\n`);
              stream.write(`  RAISE NOTICE 'Erro ao criar índice ${indexName}: %', SQLERRM;\n`);
              stream.write(`END $$;\n\n`);
            }
          }
          
          // Foreign Keys
          const fkRes = await pool.query(`
            SELECT
              tc.constraint_name,
              tc.table_name,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name,
              rc.update_rule,
              rc.delete_rule
            FROM
              information_schema.table_constraints AS tc
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
              JOIN information_schema.referential_constraints AS rc
                ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
          `, [table]);
          
          if (fkRes.rows.length > 0) {
            stream.write(`-- Foreign Keys para a tabela ${table}\n`);
            
            for (const fk of fkRes.rows) {
              stream.write(`DO $$\n`);
              stream.write(`BEGIN\n`);
              stream.write(`  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '${fk.constraint_name}' AND constraint_type = 'FOREIGN KEY') THEN\n`);
              stream.write(`    ALTER TABLE "${table}" ADD CONSTRAINT "${fk.constraint_name}"\n`);
              stream.write(`      FOREIGN KEY ("${fk.column_name}")\n`);
              stream.write(`      REFERENCES "${fk.foreign_table_name}" ("${fk.foreign_column_name}")\n`);
              stream.write(`      ON UPDATE ${fk.update_rule} ON DELETE ${fk.delete_rule};\n`);
              stream.write(`    RAISE NOTICE 'Foreign Key ${fk.constraint_name} criada';\n`);
              stream.write(`  ELSE\n`);
              stream.write(`    RAISE NOTICE 'Foreign Key ${fk.constraint_name} já existe';\n`);
              stream.write(`  END IF;\n`);
              stream.write(`EXCEPTION WHEN OTHERS THEN\n`);
              stream.write(`  RAISE NOTICE 'Erro ao criar Foreign Key ${fk.constraint_name}: %', SQLERRM;\n`);
              stream.write(`END $$;\n\n`);
            }
          }
        } catch (err) {
          console.error(`  → Erro ao obter índices ou constraints para ${table}:`, err.message);
        }
        
      } catch (err) {
        console.error(`  → Erro ao processar tabela ${table}:`, err.message);
        stream.write(`-- ERRO ao processar tabela ${table}: ${err.message}\n\n`);
      }
    }
    
    // Resetar sequências para o valor correto
    stream.write(`-- Atualizando sequências\n`);
    
    try {
      const seqRes = await pool.query(`
        SELECT sequence_name 
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
      `);
      
      for (const seq of seqRes.rows) {
        // Detectar tabela associada (assumindo convenção de nomenclatura tablename_columnname_seq)
        const seqName = seq.sequence_name;
        const tableMatch = seqName.match(/^(.+?)_(.+?)_seq$/);
        
        if (tableMatch) {
          const tableName = tableMatch[1];
          const columnName = tableMatch[2];
          
          stream.write(`DO $$\n`);
          stream.write(`BEGIN\n`);
          stream.write(`  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${tableName}') THEN\n`);
          stream.write(`    PERFORM setval('${seqName}', COALESCE((SELECT MAX("${columnName}") FROM "${tableName}"), 1), true);\n`);
          stream.write(`    RAISE NOTICE 'Sequência ${seqName} atualizada';\n`);
          stream.write(`  ELSE\n`);
          stream.write(`    RAISE NOTICE 'Tabela ${tableName} não encontrada para sequência ${seqName}';\n`);
          stream.write(`  END IF;\n`);
          stream.write(`EXCEPTION WHEN OTHERS THEN\n`);
          stream.write(`  RAISE NOTICE 'Erro ao atualizar sequência ${seqName}: %', SQLERRM;\n`);
          stream.write(`END $$;\n\n`);
        }
      }
    } catch (err) {
      console.error('Erro ao processar sequências:', err.message);
    }
    
    // Fechar o stream de escrita
    stream.end();
    
    console.log(`\nBackup completo concluído com sucesso!`);
    console.log(`Arquivo: ${filename}`);
    
    // Aguardar o stream ser completamente escrito antes de verificar o tamanho
    await new Promise(resolve => {
      stream.on('finish', () => {
        console.log(`Tamanho: ${(fs.statSync(filename).size / (1024 * 1024)).toFixed(2)} MB`);
        resolve();
      });
    });
    
  } catch (err) {
    console.error('Erro durante o backup:', err);
    // Garantir que o stream seja fechado em caso de erro
    stream.end(`-- Backup interrompido por erro: ${err.message}`);
  } finally {
    // Encerrar conexão com o pool
    await pool.end();
    console.log('Conexão com o banco de dados encerrada.');
  }
}

// Executar o backup
criarBackupCompleto().catch(err => {
  console.error('Erro fatal durante o processo de backup:', err);
});