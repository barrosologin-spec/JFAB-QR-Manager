const fs = require('fs');

const appContent = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = appContent.split('\n');

const startLine = lines.findIndex(l => l.includes('const handleDownloadDanfePDF = async (targetItems?: QRItem[]) => {'));
let endLine = -1;
let braces = 0;
let started = false;

for (let i = startLine; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('{')) braces += (line.match(/{/g) || []).length;
  if (line.includes('}')) braces -= (line.match(/}/g) || []).length;
  
  if (braces > 0) started = true;
  if (started && braces === 0) {
    endLine = i;
    break;
  }
}

console.log(`Found from line ${startLine + 1} to ${endLine + 1}`);

const functionContent = lines.slice(startLine, endLine + 1).join('\n');
fs.writeFileSync('src/lib/pdf/generateDanfeContent.ts', functionContent);

// Remove the function from App.tsx
lines.splice(startLine, endLine - startLine + 1, '// handleDownloadDanfePDF moved to generateDanfe.ts');
fs.writeFileSync('src/App.tsx', lines.join('\n'));
