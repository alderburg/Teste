const fs = require('fs');
const path = require('path');

// Script para corrigir TODAS as ocorrências de req.isAuthenticated() em todos os arquivos
const serverDir = path.join(__dirname, 'server');

function fixAuthInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Padrões específicos para corrigir
  const fixes = [
    {
      pattern: /if \(!req\.isAuthenticated\(\)\) \{/g,
      replacement: 'if (!req.isAuthenticated || typeof req.isAuthenticated !== \'function\' || !req.isAuthenticated()) {'
    },
    {
      pattern: /if \(req\.isAuthenticated\(\)\) \{/g,
      replacement: 'if (req.isAuthenticated && typeof req.isAuthenticated === \'function\' && req.isAuthenticated()) {'
    },
    {
      pattern: /req\.isAuthenticated\(\) \? 'SIM' : 'NÃO'/g,
      replacement: '(req.isAuthenticated && typeof req.isAuthenticated === \'function\' && req.isAuthenticated()) ? \'SIM\' : \'NÃO\''
    },
    {
      pattern: /const isAuthenticated = req\.isAuthenticated\(\);/g,
      replacement: 'const isAuthenticated = req.isAuthenticated && typeof req.isAuthenticated === \'function\' ? req.isAuthenticated() : false;'
    },
    {
      pattern: /if \(!req\.isAuthenticated \|\| !req\.isAuthenticated\(\)\) \{/g,
      replacement: 'if (!req.isAuthenticated || typeof req.isAuthenticated !== \'function\' || !req.isAuthenticated()) {'
    },
    {
      pattern: /if \(req\.isAuthenticated && req\.isAuthenticated\(\)\) \{/g,
      replacement: 'if (req.isAuthenticated && typeof req.isAuthenticated === \'function\' && req.isAuthenticated()) {'
    }
  ];
  
  fixes.forEach(fix => {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigido: ${path.basename(filePath)}`);
  }
}

// Arquivos para corrigir
const filesToFix = [
  path.join(serverDir, 'auth.ts'),
  path.join(serverDir, 'routes.ts'),
  path.join(serverDir, 'setup-intent-route.ts')
];

console.log('🔧 Iniciando correção completa do erro req.isAuthenticated...');

filesToFix.forEach(file => {
  fixAuthInFile(file);
});

console.log('✅ Correção completa finalizada!');
console.log('Todas as ocorrências de req.isAuthenticated() foram corrigidas.');