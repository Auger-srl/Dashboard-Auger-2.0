import Database from 'better-sqlite3';

const db = new Database('database.sqlite');
console.log('Articles:', db.prepare('SELECT count(*) as count FROM articles').get());
try {
  console.log('Users:', db.prepare('SELECT * FROM users').all());
} catch(e: any) {
  console.log('Users table error:', e.message);
}
