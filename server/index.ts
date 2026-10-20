import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from './db.js';
import { getLetterViewUrl, sendLetterEmail } from './email.js';
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
      senderName,
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
    // Allow a buffer of 60 seconds for clock skew if user picks near-immediate test
    if (parsedDate.getTime() < now.getTime() - 60000) {
      return res.status(400).json({
        error: 'Letters cannot travel backwards in time. Please select a date in the future.',
      });
    }

    const finalTitle = title && title.trim().length > 0 ? title.trim() : 'Dear Future Me';
    const letterId = `dt_${crypto.randomBytes(6).toString('hex')}`;
    const viewToken = `dtv_${crypto.randomBytes(16).toString('hex')}`;
    const createdAt = now.toISOString();
    const deliverAtIso = parsedDate.toISOString();

    const rawSender = senderName && typeof senderName === 'string' && senderName.trim().length > 0
      ? senderName.trim()
      : null;

    // Persist to SQLite
    await db.execute({
      sql: `
        INSERT INTO letters (
          id, recipient_email, recipient_name, sender_name, view_token, title, content, 
          deliver_at, timezone, status, created_at, attempts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0)
      `,
      args: [
        letterId,
        recipientEmail.trim().toLowerCase(),
        recipientName ? String(recipientName).trim() : null,
        rawSender,
        viewToken,
        finalTitle,
        letterContent.trim(),
        deliverAtIso,
        timezone,
        createdAt,
      ],
    });

    const hostOrigin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer).origin : undefined);
    const appUrl = (process.env.APP_URL || hostOrigin || 'http://localhost:5173').replace(/\/+$/, '');
    const viewUrl = `${appUrl}/letter/${viewToken}`;

    console.log(`[API] Letter #${letterId} scheduled for ${deliverAtIso} (to: ${recipientEmail.trim()}, viewToken: ${viewToken})`);

    // If scheduled for practically now (e.g., within 60 seconds for immediate test), trigger scheduler check
    if (parsedDate.getTime() - now.getTime() <= 60000) {
      setTimeout(() => {
        checkAndDispatchDueLetters().catch(console.error);
      }, 500);
    }

    return res.status(201).json({
      success: true,
      id: letterId,
      viewToken,
      viewUrl,
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

// Dispatch a letter immediately to the customer's recipient email
app.post('/api/letters/:id/send-now', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.execute({
      sql: `SELECT id, recipient_email, recipient_name, sender_name, view_token, title, content, deliver_at, timezone, created_at, status FROM letters WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Letter not found in the archives.' });
    }

    const letter = result.rows[0] as unknown as {
      id: string;
      recipient_email: string;
      recipient_name?: string | null;
      sender_name?: string | null;
      view_token?: string | null;
      title: string;
      content: string;
      deliver_at: string;
      timezone: string;
      created_at: string;
      status: string;
    };

    console.log(`[API] Manual immediate dispatch triggered for letter #${letter.id} to ${letter.recipient_email}`);

    const sendResult = await sendLetterEmail(letter);
    const viewUrl = getLetterViewUrl(letter);

    if (sendResult.success) {
      const deliveredAt = new Date().toISOString();
      await db.execute({
        sql: `
          UPDATE letters 
          SET status = 'delivered', 
              delivered_at = ?, 
              attempts = attempts + 1,
              last_error = NULL 
          WHERE id = ?
        `,
        args: [deliveredAt, letter.id],
      });

      await db.execute({
        sql: `
          INSERT INTO delivery_logs (letter_id, attempted_at, status, details)
          VALUES (?, ?, 'delivered', ?)
        `,
        args: [
          letter.id,
          deliveredAt,
          JSON.stringify({
            provider: sendResult.provider,
            messageId: sendResult.messageId,
            previewUrl: sendResult.previewUrl,
            viewUrl,
          }),
        ],
      });

      return res.json({
        success: true,
        message: `Letter dispatched successfully to ${letter.recipient_email}!`,
        provider: sendResult.provider,
        previewUrl: sendResult.previewUrl,
        viewUrl,
        viewToken: letter.view_token || letter.id,
      });
    } else {
      const attemptedAt = new Date().toISOString();
      await db.execute({
        sql: `
          UPDATE letters 
          SET attempts = attempts + 1, 
              last_error = ? 
          WHERE id = ?
        `,
        args: [sendResult.error, letter.id],
      });

      await db.execute({
        sql: `
          INSERT INTO delivery_logs (letter_id, attempted_at, status, details)
          VALUES (?, ?, 'failed', ?)
        `,
        args: [letter.id, attemptedAt, JSON.stringify({ error: sendResult.error })],
      });

      return res.status(500).json({
        success: false,
        error: sendResult.error || 'Failed to dispatch letter to email.',
        provider: sendResult.provider,
      });
    }
  } catch (err: any) {
    console.error('[API] Error in send-now:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Check Letter Status (Safe: returns non-sensitive metadata only)
app.get('/api/letters/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.execute({
      sql: `SELECT id, view_token, title, deliver_at, status, created_at, delivered_at FROM letters WHERE id = ?`,
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

    const token = (row.view_token as string) || (row.id as string);
    const hostOrigin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer).origin : undefined);
    const appUrl = (process.env.APP_URL || hostOrigin || 'http://localhost:5173').replace(/\/+$/, '');
    const viewUrl = `${appUrl}/letter/${token}`;

    res.json({
      id: row.id,
      viewToken: token,
      viewUrl,
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

// Dedicated Public View API for Personalized Letter Page
app.get('/api/letters/view/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Letter token is required' });
    }

    const cleanToken = token.trim();
    const result = await db.execute({
      sql: `
        SELECT id, recipient_email, recipient_name, sender_name, view_token, title, content, 
               deliver_at, timezone, created_at, delivered_at, status 
        FROM letters 
        WHERE view_token = ? OR id = ?
        LIMIT 1
      `,
      args: [cleanToken, cleanToken],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'This letter has not yet surfaced from the currents of time.',
      });
    }

    const row = result.rows[0];

    // Mask email for privacy (e.g., r***@gmail.com)
    const rawEmail = (row.recipient_email as string) || '';
    const [userPart, domainPart] = rawEmail.split('@');
    const maskedEmail = userPart && domainPart
      ? `${userPart.slice(0, 1)}***@${domainPart}`
      : 'confidential';

    return res.json({
      id: row.id,
      viewToken: (row.view_token as string) || (row.id as string),
      title: row.title,
      content: row.content,
      senderName: row.sender_name || null,
      recipientName: row.recipient_name || null,
      recipientEmailMasked: maskedEmail,
      deliverAt: row.deliver_at,
      createdAt: row.created_at,
      deliveredAt: row.delivered_at,
      status: row.status,
      timezone: row.timezone,
    });
  } catch (err: any) {
    console.error('[API] Error retrieving letter page:', err);
    return res.status(500).json({ error: 'Could not open this letter from the archives.' });
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

    const testId = `test_${Date.now()}`;
    const testToken = `test_dtv_${crypto.randomBytes(8).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const testLetter = {
      id: testId,
      recipient_email: recipientEmail.trim(),
      recipient_name: 'Gentle Reader',
      sender_name: 'The Time Postmaster 📮',
      view_token: testToken,
      title: 'A Test Whispered Through the Stars ✧',
      content: `Hello there!\n\nThis is a sample test dispatch from Dear Tomorrow to verify that your whimsical mailbox is connected and delivering letters with charm.\n\nMay your future hold gentle days, quiet courage, and warm memories.\n\n— The Time Post Office`,
      deliver_at: nowIso,
      timezone: 'UTC',
      created_at: nowIso,
    };

    // Save test letter in database so clicking the email link opens the dedicated diary page
    await db.execute({
      sql: `
        INSERT OR REPLACE INTO letters (
          id, recipient_email, recipient_name, sender_name, view_token, title, content, 
          deliver_at, timezone, status, created_at, attempts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'delivered', ?, 1)
      `,
      args: [
        testLetter.id,
        testLetter.recipient_email,
        testLetter.recipient_name,
        testLetter.sender_name,
        testLetter.view_token,
        testLetter.title,
        testLetter.content,
        testLetter.deliver_at,
        testLetter.timezone,
        testLetter.created_at,
      ],
    });

    const result = await sendLetterEmail(testLetter);
    if (!result.success) {
      return res.status(500).json(result);
    }
    const viewUrl = getLetterViewUrl(testLetter);
    res.json({ ...result, viewUrl, viewToken: testToken });
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
