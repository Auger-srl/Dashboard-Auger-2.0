import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const dbPath = 'database.sqlite';
const db = new Database(dbPath);

console.log('Reading CSV files...');
let csvText = readFileSync('csv_1.txt', 'utf-8');
csvText += '\n' + readFileSync('csv_2.txt', 'utf-8');

const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);

const insertArticle = db.prepare(`
  INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta, prezzo, famiglia, is_blocked) 
  VALUES (?, ?, 0, 0, ?, ?, 0, ?, 0)
  ON CONFLICT(codice) DO UPDATE SET 
    nome = excluded.nome, 
    famiglia = excluded.famiglia,
    piega = excluded.piega,
    scorta = excluded.scorta
`);

const insertProcess = db.prepare(`
  INSERT OR IGNORE INTO processes (articolo_id, taglio, piega, saldatura, verniciatura)
  VALUES (?, 0, 0, 0, 0)
`);

let inserted = 0;

db.transaction(() => {
  for (const line of lines) {
    if (line.includes('DESCRIZIONE,ARTICOLO,FAMIGLIA')) continue; // skip header if exists
    // parse line: id, nome, codice, famiglia, taglio, piegato, saldato, verniciato, scorta
    const parts = line.split(',');
    if (parts.length >= 9) {
      const nome = parts[1].trim();
      const codice = parts[2].trim();
      const famiglia = parts[3].trim();
      
      const piegato = parseInt(parts[5].trim(), 10) || 0;
      const scorta = parseInt(parts[8].trim(), 10) || 0;
      
      if (nome && codice) {
        insertArticle.run(nome, codice, piegato, scorta, famiglia);
        
        // Also insert process
        const row = db.prepare('SELECT id FROM articles WHERE codice = ?').get(codice) as {id: number};
        if (row && row.id) {
            insertProcess.run(row.id);
        }
        
        inserted++;
      }
    }
  }
})();

console.log(`Inserted/updated ${inserted} rows from CSV.`);
