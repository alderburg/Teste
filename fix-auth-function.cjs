const fs = require('fs');
const path = require('path');

// Script para corrigir todas as ocorrências de req.isAuthenticated() no arquivo auth.ts
const authFilePath = path.join(__dirname, 'server', 'auth.ts');
let content = fs.readFileSync(authFilePath, 'utf8');

// Padrões a serem corrigidos
const patterns = [
  {
    old: /if \(!req\.isAuthenticated\(\)\) \{/g,
    new: 'if (!req.isAuthenticated || typeof req.isAuthenticated !== \'function\' || !req.isAuthenticated()) {'
  },
  {
    old: /if \(req\.isAuthenticated\(\)\) \{/g,
    new: 'if (req.isAuthenticated && typeof req.isAuthenticated === \'function\' && req.isAuthenticated()) {'
  }
];

// Aplicar correções
patterns.forEach(pattern => {
  content = content.replace(pattern.old, pattern.new);
});

// Salvar arquivo corrigido
fs.writeFileSync(authFilePath, content);
console.log('✅ Arquivo auth.ts corrigido com sucesso!');
console.log('Todas as ocorrências de req.isAuthenticated() foram corrigidas.');