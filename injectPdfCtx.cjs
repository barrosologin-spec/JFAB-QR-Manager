const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert pdfCtx creation right before the return statement of App
appContent = appContent.replace(
  "  return (",
  `  const pdfCtx = {
    items,
    selectedContainer,
    selectedCategory,
    selectedDate,
    isFinalized,
    pdfSettings,
    setPdfProgress,
    addNotification,
    addCustomAuditLog,
    storage
  };

  const handleDownloadDanfePDF = (targetItems?: QRItem[]) => generateDanfe(pdfCtx, targetItems);
  const handleDownloadPDF = () => generateContainerReport(pdfCtx);
  const handlePrintPlate = () => printContainerPlate(pdfCtx);

  return (`
);

fs.writeFileSync('src/App.tsx', appContent);
