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

async function fazerBackupSQLOtimizado() {
  console.log('Iniciando backup SQL otimizado do banco de dados...');
  
  // Criar diretório de backup
  const backupDir = path.join(__dirname, '../backups/database');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(backupDir, `backup_sql_${timestamp}.sql`);
  
  // Criar arquivo de backup e abrir stream para escrita
  const stream = fs.createWriteStream(filename);
  
  // Escrever cabeçalho
  stream.write(`-- Backup do banco de dados ${dbConfig.database}\n`);
  stream.write(`-- Data: ${new Date().toISOString()}\n`);
  stream.write(`-- Gerado automaticamente\n\n`);
  
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
    
    // Primeiro escrever todas as instruções DROP TABLE para garantir ordem de recriação
    stream.write('-- Remover todas as tabelas existentes\n');
    
    for (const table of tables) {
      stream.write(`DROP TABLE IF EXISTS "${table}" CASCADE;\n`);
    }
    stream.write('\n');
    
    // Para cada tabela, primeiro criar a estrutura
    for (const table of tables) {
      console.log(`Processando estrutura da tabela: ${table}`);
      
      try {
        // Obter definição da tabela diretamente do PostgreSQL
        const tableDefRes = await pool.query(`
          SELECT pg_get_tabledef('${table}') as tabledef;
        `);
        
        if (tableDefRes.rows.length > 0 && tableDefRes.rows[0].tabledef) {
          stream.write(`-- Estrutura da tabela ${table}\n`);
          stream.write(`${tableDefRes.rows[0].tabledef};\n\n`);
        } else {
          // Fallback - obter estrutura da tabela (DDL) usando information_schema
          const schemaRes = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, 
                  is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position
          `, [table]);
          
          // Construir o comando CREATE TABLE
          stream.write(`-- Estrutura da tabela ${table} (gerada via information_schema)\n`);
          stream.write(`CREATE TABLE "${table}" (\n`);
          
          const columns = schemaRes.rows.map(col => {
            let dataType = col.data_type;
            if (col.character_maximum_length) {
              dataType += `(${col.character_maximum_length})`;
            }
            
            let columnDef = `  "${col.column_name}" ${dataType}`;
            
            if (col.is_nullable === 'NO') {
              columnDef += ' NOT NULL';
            }
            
            if (col.column_default) {
              columnDef += ` DEFAULT ${col.column_default}`;
            }
            
            return columnDef;
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
              columns.push(`  PRIMARY KEY (${pkColumns})`);
            }
          } catch (err) {
            console.error(`  → Erro ao obter chave primária para ${table}:`, err.message);
          }
          
          stream.write(columns.join(',\n'));
          stream.write('\n);\n\n');
        }
      } catch (err) {
        console.error(`  → Erro ao obter estrutura para ${table}:`, err.message);
        stream.write(`-- ERRO ao processar estrutura da tabela ${table}: ${err.message}\n\n`);
        
        // Se a função pg_get_tabledef não estiver disponível, adicionamos ela
        if (err.message.includes('function pg_get_tabledef')) {
          console.log('Criando função pg_get_tabledef...');
          try {
            await pool.query(`
              CREATE OR REPLACE FUNCTION pg_get_tabledef(p_table_name varchar) 
              RETURNS text AS
              $$
              DECLARE
                  v_table_ddl   text;
                  column_record record;
                  table_rec     record;
                  constraint_rec record;
                  firstrec      boolean;
              BEGIN
                  FOR table_rec IN
                      SELECT c.relname FROM pg_catalog.pg_class c
                      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                      WHERE relkind = 'r' AND relname=p_table_name AND n.nspname='public'
                  LOOP            
                      v_table_ddl:='CREATE TABLE "' || table_rec.relname || '" (';
                  
                      firstrec=true;
                      FOR column_record IN 
                          SELECT 
                              b.attnum,
                              b.attname AS column_name,
                              pg_catalog.format_type(b.atttypid, b.atttypmod) as data_type,
                              CASE WHEN b.attnotnull = true THEN 'NOT NULL' ELSE 'NULL' END as nullable,
                              CASE WHEN b.atthasdef = true THEN pg_get_expr(d.adbin, d.adrelid) ELSE '' END as default_value
                          FROM pg_catalog.pg_attribute b
                          LEFT JOIN pg_catalog.pg_attrdef d ON (b.attrelid, b.attnum) = (d.adrelid, d.adnum)
                          WHERE b.attrelid = (SELECT oid FROM pg_catalog.pg_class WHERE relname = p_table_name) AND b.attnum > 0 AND b.attisdropped = false
                          ORDER BY b.attnum
                      LOOP
                          IF NOT firstrec THEN
                              v_table_ddl:=v_table_ddl||',';
                          END IF;
                          firstrec=false;

                          v_table_ddl:=v_table_ddl||chr(10)||'    "'||column_record.column_name||'" '||column_record.data_type||' '||column_record.nullable;
                      
                          -- Add default value if present
                          IF length(column_record.default_value) > 0 THEN
                              v_table_ddl:=v_table_ddl||' DEFAULT '||column_record.default_value;
                          END IF;
                      END LOOP;
                      
                      -- Add primary key constraint
                      FOR constraint_rec IN 
                          SELECT conname, pg_catalog.pg_get_constraintdef(oid) as constraintdef
                          FROM pg_catalog.pg_constraint
                          WHERE conrelid = (SELECT oid FROM pg_catalog.pg_class WHERE relname = p_table_name)
                          AND contype = 'p'
                      LOOP
                          v_table_ddl:=v_table_ddl||','||chr(10)||'    CONSTRAINT "'||constraint_rec.conname||'" '||constraint_rec.constraintdef;
                      END LOOP;
                      
                      v_table_ddl:=v_table_ddl||chr(10)||')';
                  END LOOP;
                  
                  RETURN v_table_ddl;
              END;
              $$ LANGUAGE plpgsql;
            `);
            console.log('Função pg_get_tabledef criada com sucesso');
          } catch (createErr) {
            console.error('Erro ao criar função auxiliar:', createErr.message);
          }
        }
      }
    }
    
    // Agora processar os dados de cada tabela
    for (const table of tables) {
      // Pular dados de tabelas grandes
      if (EXCLUDE_DATA_TABLES.includes(table)) {
        console.log(`Pulando dados da tabela ${table} (muito grande)`);
        stream.write(`-- Dados da tabela ${table} não incluídos para economizar espaço\n\n`);
        continue;
      }
      
      console.log(`Processando dados da tabela: ${table}`);
      
      try {
        // Obter dados da tabela
        const dataRes = await pool.query(`SELECT * FROM "${table}" LIMIT 1000`);
        
        if (dataRes.rows.length > 0) {
          stream.write(`-- Dados da tabela ${table}\n`);
          
          // Usar bulk insert é mais eficiente
          const columns = Object.keys(dataRes.rows[0]).map(col => `"${col}"`).join(', ');
          
          // Dividir em blocos de 50 registros por INSERT para evitar sobrecarga
          const chunkSize = 50;
          for (let i = 0; i < dataRes.rows.length; i += chunkSize) {
            const chunk = dataRes.rows.slice(i, i + chunkSize);
            
            stream.write(`INSERT INTO "${table}" (${columns}) VALUES\n`);
            
            const values = chunk.map(row => {
              const rowValues = Object.values(row).map(val => {
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'object' && val instanceof Date) return `'${val.toISOString()}'`;
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return val;
              }).join(', ');
              
              return `  (${rowValues})`;
            }).join(',\n');
            
            stream.write(values);
            stream.write(';\n\n');
          }
        } else {
          stream.write(`-- Tabela ${table} está vazia\n\n`);
        }
        
        console.log(`  → ${dataRes.rows.length} registros processados da tabela ${table}`);
      } catch (err) {
        console.error(`  → Erro ao processar dados da tabela ${table}:`, err.message);
        stream.write(`-- ERRO ao processar dados da tabela ${table}: ${err.message}\n\n`);
      }
    }
    
    // Processar sequências
    console.log('Processando sequências...');
    try {
      const seqRes = await pool.query(`
        SELECT sequence_name 
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
      `);
      
      if (seqRes.rows.length > 0) {
        stream.write('-- Restauração de sequências\n');
        
        for (const seq of seqRes.rows) {
          // Detectar tabela associada (assumindo convenção de nomenclatura tablename_columnname_seq)
          const seqName = seq.sequence_name;
          const tableMatch = seqName.match(/^(.+?)_.*_seq$/);
          
          if (tableMatch) {
            const tableName = tableMatch[1];
            stream.write(`SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM "${tableName}"), 1), true);\n`);
          } else {
            stream.write(`-- Não foi possível determinar a tabela para a sequência ${seqName}\n`);
          }
        }
        stream.write('\n');
      }
    } catch (err) {
      console.error('Erro ao processar sequências:', err.message);
    }
    
    // Fechar o stream de escrita
    stream.end();
    
    console.log(`\nBackup SQL concluído com sucesso!`);
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
fazerBackupSQLOtimizado().catch(err => {
  console.error('Erro fatal durante o processo de backup:', err);
});