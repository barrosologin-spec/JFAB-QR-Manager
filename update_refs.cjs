const fs = require('fs');

const files = [
  'src/components/ChangelogAndAuditModalContent.tsx',
  'src/hooks/useSyncData.ts',
  'src/App.tsx',
  'README.md',
  'vite.config.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (file === 'vite.config.ts') {
    content = content.replace('**/storage.json', '**/storage.*');
  } else {
    content = content.replace(/storage\.json/g, 'storage.db (SQLite)');
  }
  fs.writeFileSync(file, content);
}
