const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

appContent = appContent.replace(
  "  const handleDownloadDanfePDF = (targetItems?: QRItem[]) => generateDanfe(pdfCtx, targetItems);\n  const handleDownloadPDF = () => generateContainerReport(pdfCtx);\n  const handlePrintPlate = () => printContainerPlate(pdfCtx);",
  ""
);

appContent = appContent.replace(
  "  const pdfCtx = {",
  ""
);

appContent = appContent.replace(
  "    storage,\n    currentUser\n  };\n\n\n\n  return (",
  "  return ("
);

// We should insert them earlier in App.tsx, maybe after we define `isFinalized`
appContent = appContent.replace(
  "  const isFinalized = (selectedCategory && selectedDate && selectedContainer)\n    ? storage[selectedCategory]?.[selectedDate]?.[selectedContainer]?.finalized || false\n    : false;",
  `  const isFinalized = (selectedCategory && selectedDate && selectedContainer)
    ? storage[selectedCategory]?.[selectedDate]?.[selectedContainer]?.finalized || false
    : false;

  const pdfCtx = {
    items,
    selectedContainer,
    selectedCategory,
    selectedDate,
    isFinalized,
    pdfSettings,
    setPdfProgress,
    addNotification,
    addCustomAuditLog,
    storage,
    currentUser
  };

  const handleDownloadDanfePDF = (targetItems?: QRItem[]) => generateDanfe(pdfCtx, targetItems);
  const handleDownloadPDF = () => generateContainerReport(pdfCtx);
  const handlePrintPlate = () => printContainerPlate(pdfCtx);
`
);

fs.writeFileSync('src/App.tsx', appContent);

let generatorsContent = fs.readFileSync('src/lib/pdf/generators.ts', 'utf-8');
generatorsContent = generatorsContent.replace(
  "addCustomAuditLog: (action: string, details: string) => Promise<void>;",
  "addCustomAuditLog: (action: string, details: string) => Promise<boolean>;"
);
fs.writeFileSync('src/lib/pdf/generators.ts', generatorsContent);
