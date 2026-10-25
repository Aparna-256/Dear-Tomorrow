import dotenv from 'dotenv';
import { app } from './app.js';
import { initDatabase } from './db.js';
import { startScheduler } from './scheduler.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

async function startServer() {
  await initDatabase();
  startScheduler(20000); // Check every 20 seconds

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Dear Tomorrow Server] Listening gently on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Dear Tomorrow Server] Fatal startup error:', err);
  process.exit(1);
});
