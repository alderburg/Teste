#!/bin/bash

# Script para backup do banco de dados PostgreSQL
# Criado em: $(date)

# Configurações do banco de dados
DB_HOST="meuprecocerto.postgresql.dbaas.com.br"
DB_PORT="5432"
DB_USER="meuprecocerto"
DB_PASSWORD="Dr19122010@@"
DB_NAME="meuprecocerto"

# Diretório para armazenar backups
BACKUP_DIR="./backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Criar o diretório de backup se não existir
mkdir -p $BACKUP_DIR

echo "Iniciando backup do banco de dados PostgreSQL..."
echo "Data e hora: $(date)"
echo "Servidor: $DB_HOST"
echo "Banco de dados: $DB_NAME"
echo "Arquivo de backup: $BACKUP_FILE"

# Executar o backup usando PGPASSWORD para evitar prompt de senha
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

# Verificar se o backup foi bem-sucedido
if [ $? -eq 0 ]; then
  echo "Backup concluído com sucesso!"
  echo "Tamanho do arquivo de backup: $(du -h $BACKUP_FILE | cut -f1)"
else
  echo "Falha ao criar o backup do banco de dados."
fi

# Listar backups disponíveis
echo "Backups disponíveis:"
ls -lh $BACKUP_DIR