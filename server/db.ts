import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data folder exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dear_tomorrow.db');
export const db = createClient({
  url: `file:${dbPath}`,
});

export async function initDatabase() {
  // Letters table: persistent store of all scheduled letters
  await db.execute(`
    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      sender_name TEXT,
      view_token TEXT UNIQUE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      deliver_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      delivered_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    )
  `);

  // Migrate existing tables if columns are missing
  try {
    const tableInfo = await db.execute(`PRAGMA table_info(letters)`);
    const columnNames = tableInfo.rows.map((r: any) => r.name);

    if (!columnNames.includes('sender_name')) {
      await db.execute(`ALTER TABLE letters ADD COLUMN sender_name TEXT`);
      console.log(`[Database] Added sender_name column to letters table`);
    }

    if (!columnNames.includes('view_token')) {
      await db.execute(`ALTER TABLE letters ADD COLUMN view_token TEXT`);
      console.log(`[Database] Added view_token column to letters table`);
    }

    // Ensure all existing rows without a view_token get assigned one
    const rowsWithoutToken = await db.execute(`SELECT id FROM letters WHERE view_token IS NULL OR view_token = ''`);
    for (const row of rowsWithoutToken.rows) {
      const fallbackToken = `token_${(row.id as string).replace(/[^a-zA-Z0-9]/g, '')}_${Math.random().toString(36).slice(2, 10)}`;
      await db.execute({
        sql: `UPDATE letters SET view_token = ? WHERE id = ?`,
        args: [fallbackToken, row.id],
      });
    }
  } catch (migErr) {
    console.warn(`[Database] Migration check notice:`, migErr);
  }

  // Index for scheduler query speed
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_letters_due 
    ON letters (status, deliver_at)
  `);

  // Index for unique view token lookups
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_letters_view_token 
    ON letters (view_token)
  `);

  // Delivery audit logs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letter_id TEXT NOT NULL,
      attempted_at TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      FOREIGN KEY (letter_id) REFERENCES letters (id) ON DELETE CASCADE
    )
  `);

  console.log(`[Database] SQLite initialized at ${dbPath}`);
}
