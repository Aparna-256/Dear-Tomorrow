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

  // Index for scheduler query speed
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_letters_due 
    ON letters (status, deliver_at)
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
