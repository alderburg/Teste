-- Script para remover a restrição de unicidade do campo username na tabela users
ALTER TABLE users DROP CONSTRAINT users_username_key;