import { db } from './db.js';
import { LetterRecord, sendLetterEmail } from './email.js';

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

export async function checkAndDispatchDueLetters(): Promise<{ processed: number; errors: number }> {
  if (isProcessing) {
    return { processed: 0, errors: 0 };
  }

  isProcessing = true;
  let processedCount = 0;
  let errorCount = 0;

  try {
    const nowIso = new Date().toISOString();

    // Query letters that are pending and due for delivery
    const result = await db.execute({
      sql: `
        SELECT id, recipient_email, recipient_name, title, content, deliver_at, timezone, created_at, attempts
        FROM letters
        WHERE status = 'pending' AND deliver_at <= ?
        ORDER BY deliver_at ASC
        LIMIT 20
      `,
      args: [nowIso],
    });

    const dueLetters = result.rows as unknown as (LetterRecord & { attempts: number })[];

    for (const letter of dueLetters) {
      // Atomic lock: mark status as 'processing' to prevent concurrent worker picking up same letter
      const lockResult = await db.execute({
        sql: `UPDATE letters SET status = 'processing' WHERE id = ? AND status = 'pending'`,
        args: [letter.id],
      });

      if (lockResult.rowsAffected === 0) {
        // Already picked up by another concurrent run
        continue;
      }

      console.log(`[Scheduler] Dispatching due letter #${letter.id} to ${letter.recipient_email} (scheduled for ${letter.deliver_at})`);

      try {
        const sendResult = await sendLetterEmail(letter);

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
              }),
            ],
          });

          processedCount++;
          console.log(`[Scheduler] Letter #${letter.id} successfully delivered! Provider: ${sendResult.provider}`);
        } else {
          throw new Error(sendResult.error || 'Failed to dispatch email');
        }
      } catch (err: any) {
        errorCount++;
        const errorMessage = err?.message || String(err);
        const attemptedAt = new Date().toISOString();
        const nextAttempts = (letter.attempts || 0) + 1;
        const newStatus = nextAttempts >= 5 ? 'failed' : 'pending';

        console.error(`[Scheduler] Error delivering letter #${letter.id} (attempt ${nextAttempts}):`, errorMessage);

        await db.execute({
          sql: `
            UPDATE letters 
            SET status = ?, 
                attempts = ?, 
                last_error = ?
            WHERE id = ?
          `,
          args: [newStatus, nextAttempts, errorMessage, letter.id],
        });

        await db.execute({
          sql: `
            INSERT INTO delivery_logs (letter_id, attempted_at, status, details)
            VALUES (?, ?, 'failed', ?)
          `,
          args: [letter.id, attemptedAt, JSON.stringify({ error: errorMessage, attempt: nextAttempts })],
        });
      }
    }
  } catch (err) {
    console.error('[Scheduler] Unexpected scheduler error:', err);
  } finally {
    isProcessing = false;
  }

  return { processed: processedCount, errors: errorCount };
}

export function startScheduler(intervalMs = 30000) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log(`[Scheduler] Starting background task scheduler (interval: ${intervalMs / 1000}s)`);

  // Run immediately on boot
  checkAndDispatchDueLetters().catch(err => {
    console.error('[Scheduler] Initial boot check failed:', err);
  });

  // Then recurring
  schedulerInterval = setInterval(() => {
    checkAndDispatchDueLetters().catch(err => {
      console.error('[Scheduler] Interval check failed:', err);
    });
  }, intervalMs);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped scheduler');
  }
}
