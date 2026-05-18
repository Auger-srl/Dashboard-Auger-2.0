import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const dbPath = 'database.sqlite';
const db = new Database(dbPath);

const csv1 = readFileSync('csv_1.txt', 'utf-8');
const csv2 = readFileSync('csv_2.txt', 'utf-8');
const csvText = csv1 + '\n' + csv2;

const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);

const sanitizeName = (name: string) => {
    return 'famiglia_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/(^_|_$)/g, '');
};

const tables = new Set<string>();

for (const line of lines) {
    if (line.includes('DESCRIZIONE,ARTICOLO,FAMIGLIA')) continue;
    const parts = line.split(',');
    if (parts.length >= 9) {
        const famiglia = parts[3].trim();
        if (famiglia) {
            tables.add(famiglia);
        }
    }
}

console.log('Famiglie trovate:', Array.from(tables));

db.transaction(() => {
    // Cancella vecchie tabelle
    db.exec(`
        DROP TABLE IF EXISTS piastre_at;
        DROP TABLE IF EXISTS porte_at;
        DROP TABLE IF EXISTS involucro_at;
        DROP TABLE IF EXISTS casse_complete_at;
    `);

    // Per ogni famiglia creiamo una tabella
    for (const fam of tables) {
        const tableName = sanitizeName(fam);
        db.exec(`
            CREATE TABLE IF NOT EXISTS ${tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                articolo TEXT NOT NULL,
                codice TEXT NOT NULL UNIQUE,
                famiglia TEXT,
                piega INTEGER DEFAULT 0,
                verniciatura INTEGER DEFAULT 0,
                saldatura INTEGER DEFAULT 0,
                scorta INTEGER DEFAULT 0
            );
            DELETE FROM ${tableName}; -- clean before inserting
        `);
    }

    // Inseriamo i dati
    for (const line of lines) {
        if (line.includes('DESCRIZIONE,ARTICOLO,FAMIGLIA') || !line.trim()) continue;
        const parts = line.split(',');
        if (parts.length >= 9) {
            const articolo = parts[1].trim();
            const codice = parts[2].trim();
            const famiglia = parts[3].trim();
            const piega = parseInt(parts[4].trim(), 10) || 0;
            const verniciatura = parseInt(parts[5].trim(), 10) || 0;
            const saldatura = parseInt(parts[6].trim(), 10) || 0;
            const scorta = parseInt(parts[8].trim(), 10) || 0;

            const tableName = sanitizeName(famiglia);
            const stmt = db.prepare(`
                INSERT INTO ${tableName} (articolo, codice, famiglia, piega, verniciatura, saldatura, scorta)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(codice) DO UPDATE SET
                    articolo = excluded.articolo,
                    famiglia = excluded.famiglia,
                    piega = excluded.piega,
                    verniciatura = excluded.verniciatura,
                    saldatura = excluded.saldatura,
                    scorta = excluded.scorta
            `);
            stmt.run(articolo, codice, famiglia, piega, verniciatura, saldatura, scorta);
            // Also optionally delete from old articles table to avoid conflict
            db.prepare('DELETE FROM articles WHERE codice = ?').run(codice);
        }
    }
})();

console.log('Importazione completata con successo!');
