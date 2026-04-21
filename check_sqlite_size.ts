import fs from 'fs';
['database.sqlite', 'database.db', 'sqlite.db'].forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`${f} size: ${fs.statSync(f).size}`);
  }
});
