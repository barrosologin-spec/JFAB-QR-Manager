const fs = require('fs');

let generatorsContent = fs.readFileSync('src/lib/pdf/generators.ts', 'utf-8');

generatorsContent = generatorsContent.replace(
  "const { items, selectedContainer, selectedCategory, selectedDate, pdfSettings, setPdfProgress, addNotification, addCustomAuditLog } = ctx;",
  "const { items, selectedContainer, selectedCategory, selectedDate, isFinalized, pdfSettings, setPdfProgress, addNotification, addCustomAuditLog } = ctx;"
);

fs.writeFileSync('src/lib/pdf/generators.ts', generatorsContent);
