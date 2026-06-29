const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

// I injected fragments around line 122, let's find that exact fragment and remove it.
appContent = appContent.replace(
`    selectedCategory,
    selectedDate,
    isFinalized,
    pdfSettings,
    setPdfProgress,
    addNotification,
    addCustomAuditLog,
  return () => window.removeEventListener('hashchange', handleHashChange);`,
"    return () => window.removeEventListener('hashchange', handleHashChange);"
);

// wait, did I leave `  const pdfCtx = { \n items, \n selectedContainer, ` ? 
appContent = appContent.replace(
`    items,
    selectedContainer,
    return () => window.removeEventListener('hashchange', handleHashChange);`,
"    return () => window.removeEventListener('hashchange', handleHashChange);"
);

fs.writeFileSync('src/App.tsx', appContent);
