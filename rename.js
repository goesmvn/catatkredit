const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      content = content.replace(/CatatBon/g, 'CatatKredit');
      content = content.replace(/Catat Bon/g, 'Catat Kredit');
      content = content.replace(/catat bon/g, 'catat kredit');
      content = content.replace(/Catat bon/g, 'Catat kredit');
      
      content = content.replace(/Terima Cicilan/g, 'Bayar Kredit');
      content = content.replace(/terima cicilan/g, 'bayar kredit');
      
      content = content.replace(/Bon Baru/g, 'Kredit Baru');
      content = content.replace(/Bon baru/g, 'Kredit baru');
      
      content = content.replace(/Bon di Luar/g, 'Kredit di Luar');
      content = content.replace(/Simpan Bon/g, 'Simpan Kredit');
      content = content.replace(/simpan bon/g, 'simpan kredit');
      content = content.replace(/mencatat bon/g, 'mencatat kredit');
      content = content.replace(/Total Bon/g, 'Total Kredit');
      content = content.replace(/total bon/g, 'total kredit');
      content = content.replace(/mengambil bon/g, 'mengambil kredit');
      
      content = content.replace(/Cicilan/g, 'Kredit');
      content = content.replace(/cicilan/g, 'kredit');
      
      content = content.replace(/\bBon\b/g, 'Kredit');
      content = content.replace(/\bbon\b(?!\-)/g, 'kredit'); 
      // (?!\-) prevents matching "bon-baru" but allows "bon"
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir('./app');
processDir('./components');
processDir('./lib');
