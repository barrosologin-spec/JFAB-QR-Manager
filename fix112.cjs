const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = appContent.split('\n');
lines.splice(112, 10);
fs.writeFileSync('src/App.tsx', lines.join('\n'));
