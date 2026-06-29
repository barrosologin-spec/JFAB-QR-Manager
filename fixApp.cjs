const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

appContent = appContent.replace(
  "    storage,\n    currentUser,\n    loading",
  "    storage,\n    loading"
);

// We need to fix the pdfCtx as well, it didn't get `currentUser` properly?
// In injectPdfCtx.cjs we put:
/*
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
    storage
  };
*/
appContent = appContent.replace(
  "    addCustomAuditLog,\n    storage\n  };",
  "    addCustomAuditLog,\n    storage,\n    currentUser\n  };"
);

fs.writeFileSync('src/App.tsx', appContent);
