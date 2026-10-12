import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from './db.js';
import { sendLetterEmail } from './email.js';
import { checkAndDispatchDueLetters, startScheduler } from './scheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Simple in-memory rate limiter per IP (max 30 requests per 10 minutes)
const ipRateMap = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(req: Request, res: Response, next: () => void) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;

  const current = ipRateMap.get(ip);
  if (!current || now > current.resetTime) {
    ipRateMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= 30) {
    return res.status(429).json({
      error: 'Too many requests. Please pause for a moment before sealing more letters.',
    });
  }

  current.count++;
  next();
}

// Health and Diagnostics
app.get('/api/letters/health', async (_req: Request, res: Response) => {
  try {
    const countRes = await db.execute(`SELECT COUNT(*) as count FROM letters WHERE status = 'pending'`);
    const count = countRes.rows[0]?.count ?? 0;

    res.json({
      status: 'ok',
      service: 'Dear Tomorrow',
      time: new Date().toISOString(),
      database: 'connected',
      scheduler: 'running',
      pendingLettersCount: Number(count),
      emailConfigured: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Create & Schedule Letter
app.post('/api/letters', rateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      recipientEmail,
      recipientName,
      title,
      letterContent,
      deliverAt,
      timezone = 'UTC',
    } = req.body;

    // Validation
    if (!letterContent || typeof letterContent !== 'string' || letterContent.trim().length < 5) {
      return res.status(400).json({
        error: 'Please pour a little more of your heart into your letter before sealing it.',
      });
    }

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid destination email address.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      return res.status(400).json({ error: 'The email address looks incomplete or invalid.' });
    }

    if (!deliverAt || typeof deliverAt !== 'string') {
      return res.status(400).json({ error: 'Please choose a delivery date in the future.' });
    }

    const parsedDate = new Date(deliverAt);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'The chosen delivery date is not recognized.' });
    }

    const now = new Date();
    // Allow a tiny buffer of 30 seconds for clock skew if user picks near-immediate test
    if (parsedDate.getTime() < now.getTime() - 30000) {
      return res.status(400).json({
        error: 'Letters cannot travel backwards in time. Please select a date in the future.',
      });
    }

    const finalTitle = title && title.trim().length > 0 ? title.trim() : 'Dear Future Me';
    const letterId = `dt_${crypto.randomBytes(6).toString('hex')}`;
    const createdAt = now.toISOString();
    const deliverAtIso = parsedDate.toISOString();

    // Persist to SQLite
    await db.execute({
      sql: `
        INSERT INTO letters (
          id, recipient_email, recipient_name, title, content, 
          deliver_at, timezone, status, created_at, attempts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0)
      `,
      args: [
        letterId,
        recipientEmail.trim().toLowerCase(),
        recipientName ? String(recipientName).trim() : null,
        finalTitle,
        letterContent.trim(),
        deliverAtIso,
        timezone,
        createdAt,
      ],
    });

    console.log(`[API] Letter #${letterId} scheduled for ${deliverAtIso} (to: ${recipientEmail.trim()})`);

    // If scheduled for practically now (e.g., within 30 seconds for immediate test), trigger scheduler check
    if (parsedDate.getTime() - now.getTime() <= 30000) {
      setTimeout(() => {
        checkAndDispatchDueLetters().catch(console.error);
      }, 1000);
    }

    return res.status(201).json({
      success: true,
      id: letterId,
      title: finalTitle,
      deliverAt: deliverAtIso,
      recipientEmail: recipientEmail.trim(),
      message: 'Your letter is safely tucked away! 💌',
    });
  } catch (err: any) {
    console.error('[API] Error scheduling letter:', err);
    return res.status(500).json({
      error: 'Our time-travelling post failed to save your letter. Please try again.',
      details: err?.message,
    });
  }
});

// Check Letter Status (Safe: returns non-sensitive metadata only)
app.get('/api/letters/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.execute({
      sql: `SELECT id, title, deliver_at, status, created_at, delivered_at FROM letters WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Letter not found in the archives.' });
    }

    const row = result.rows[0];

    // Query delivery logs for preview link or provider
    const logRes = await db.execute({
      sql: `SELECT details FROM delivery_logs WHERE letter_id = ? ORDER BY id DESC LIMIT 1`,
      args: [id],
    });

    let previewUrl: string | undefined = undefined;
    let provider: string | undefined = undefined;
    if (logRes.rows.length > 0 && logRes.rows[0].details) {
      try {
        const details = JSON.parse(logRes.rows[0].details as string);
        previewUrl = details.previewUrl;
        provider = details.provider;
      } catch {}
    }

    res.json({
      id: row.id,
      title: row.title,
      deliverAt: row.deliver_at,
      status: row.status,
      createdAt: row.created_at,
      deliveredAt: row.delivered_at,
      provider: provider || (Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST) ? 'live' : 'ethereal'),
      previewUrl,
      isLiveDelivered: provider === 'resend' || provider === 'smtp',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Configure Email Provider (Resend or Gmail SMTP)
app.post('/api/settings/email', async (req: Request, res: Response) => {
  try {
    const { resendApiKey, smtpHost, smtpUser, smtpPass, smtpPort = 465, smtpSecure = true, emailFrom } = req.body;

    const envLines: string[] = [];
    if (resendApiKey) envLines.push(`RESEND_API_KEY=${resendApiKey.trim()}`);
    if (smtpHost) envLines.push(`SMTP_HOST=${smtpHost.trim()}`);
    if (smtpPort) envLines.push(`SMTP_PORT=${smtpPort}`);
    if (smtpSecure !== undefined) envLines.push(`SMTP_SECURE=${smtpSecure}`);
    if (smtpUser) envLines.push(`SMTP_USER=${smtpUser.trim()}`);
    if (smtpPass) envLines.push(`SMTP_PASS=${smtpPass.trim()}`);
    if (emailFrom) envLines.push(`EMAIL_FROM=${emailFrom.trim()}`);

    const envPath = path.resolve(__dirname, '../.env');
    fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf-8');

    // Update in-memory process environment immediately
    if (resendApiKey) process.env.RESEND_API_KEY = resendApiKey.trim();
    if (smtpHost) process.env.SMTP_HOST = smtpHost.trim();
    if (smtpPort) process.env.SMTP_PORT = String(smtpPort);
    if (smtpSecure !== undefined) process.env.SMTP_SECURE = String(smtpSecure);
    if (smtpUser) process.env.SMTP_USER = smtpUser.trim();
    if (smtpPass) process.env.SMTP_PASS = smtpPass.trim();
    if (emailFrom) process.env.EMAIL_FROM = emailFrom.trim();

    console.log('[Email Config] Updated email settings in memory and .env file!');

    res.json({
      success: true,
      message: 'Email credentials configured and activated successfully!',
      emailConfigured: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send an immediate test letter to verify delivery and inbox formatting
app.post('/api/letters/send-test', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { recipientEmail } = req.body;
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({ error: 'Recipient email required' });
    }

    const testLetter = {
      id: `test_${Date.now()}`,
      recipient_email: recipientEmail.trim(),
      title: 'A Test Whispered Through the Stars ✧',
      content: `Hello there!\n\nThis is a sample test dispatch from Dear Tomorrow to verify that your whimsical mailbox is connected and delivering letters with charm.\n\nMay your future hold gentle days and warm memories.`,
      deliver_at: new Date().toISOString(),
      timezone: 'UTC',
      created_at: new Date().toISOString(),
    };

    const result = await sendLetterEmail(testLetter);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend in production
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for SPA routing in Express 5
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Boot Database and Scheduler
async function startServer() {
  await initDatabase();
  startScheduler(20000); // Check every 20 seconds

  app.listen(PORT, () => {
    console.log(`[Dear Tomorrow Server] Listening gently on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Dear Tomorrow Server] Fatal startup error:', err);
  process.exit(1);
});
