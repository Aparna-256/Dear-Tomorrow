import type { Request, Response } from 'express';
import { app } from '../server/app.js';
import { initDatabase } from '../server/db.js';

let dbReadyPromise: Promise<void> | null = null;

export default async function handler(req: Request, res: Response) {
  // Lazily ensure database tables are initialized once per serverless container
  if (!dbReadyPromise) {
    dbReadyPromise = initDatabase().catch(err => {
      console.warn('[Vercel Serverless] DB initialization notice:', err);
    });
  }
  await dbReadyPromise;

  return app(req, res);
}
