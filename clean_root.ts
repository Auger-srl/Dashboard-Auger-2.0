import fs from 'fs';
const trash = [
  'database.sqlite.corrupt',
  'db_copy.sqlite',
  'db_copy.sqlite-shm',
  'db_copy.sqlite-wal',
  'dump.sql',
  'check_size_temp.ts',
  'check_symlinks.ts',
  'untitled-3.tsx',
  'archive',
  'apphosting.yaml',
  'tsconfig.server.json'
];

trash.forEach(f => {
  try {
    if (fs.existsSync(f)) {
      if (fs.lstatSync(f).isDirectory()) fs.rmSync(f, { recursive: true, force: true });
      else fs.unlinkSync(f);
      console.log('Deleted', f);
    }
  } catch(e) {
    console.error(e);
  }
});
