import { Queue } from 'bullmq';

import { config } from '../config';
import { getRedis } from '../redis';
import { sendEventRegistrationEmail, sendWelcomeEmail } from '../services/email.service';

export const EMAIL_QUEUE_NAME = 'emails';

export type EmailJob =
  | { type: 'welcome'; to: string; name: string }
  | {
      type: 'event-registration';
      to: string;
      name: string;
      event: { title: string; date: string; time: string };
    };

let queue: Queue<EmailJob> | undefined;

function getQueue(): Queue<EmailJob> | undefined {
  const redis = getRedis();
  if (!redis) return undefined;
  queue ??= new Queue<EmailJob>(EMAIL_QUEUE_NAME, { connection: redis });
  return queue;
}

/** Performs the actual send. Used by the worker, and as the no-Redis fallback. */
export async function deliverEmail(job: EmailJob): Promise<void> {
  switch (job.type) {
    case 'welcome':
      await sendWelcomeEmail(job.to, job.name);
      break;
    case 'event-registration':
      await sendEventRegistrationEmail(job.to, job.name, job.event);
      break;
  }
}

/**
 * Enqueues the email for the worker process (durable, retried with backoff).
 * Without Redis, degrades to sending directly in-process.
 */
export async function enqueueEmail(job: EmailJob): Promise<void> {
  const q = getQueue();
  if (!q) {
    await deliverEmail(job);
    return;
  }
  await q.add(job.type, job, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}
