const fs = require('fs');

let generatorsContent = fs.readFileSync('src/lib/pdf/generators.ts', 'utf-8');

generatorsContent = generatorsContent.replace(
  "import { generateBarcodeDataURL } from '../barcodeUtils';",
  "import { generateBarcodeDataURL, generateQRCodeDataURL } from '../barcodeUtils';"
);

generatorsContent = generatorsContent.replace(
  "  storage: any;",
  "  storage: any;\n  currentUser: any;\n"
);

fs.writeFileSync('src/lib/pdf/generators.ts', generatorsContent);

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
appContent = appContent.replace(
  "    storage",
  "    storage,\n    currentUser"
);
fs.writeFileSync('src/App.tsx', appContent);
