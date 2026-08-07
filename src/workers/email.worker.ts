import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

import { config } from '../config';
import { EMAIL_QUEUE_NAME, deliverEmail, type EmailJob } from '../queues/email.queue';

if (!config.redisUrl) {
  console.error('REDIS_URL must be set to run the email worker');
  process.exit(1);
}

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker<EmailJob>(
  EMAIL_QUEUE_NAME,
  async (job) => {
    await deliverEmail(job.data);
  },
  { connection, concurrency: 10 },
);

worker.on('completed', (job) => {
  console.log(`Email job ${job.id} (${job.name}) delivered`);
});
worker.on('failed', (job, err) => {
  console.error(`Email job ${job?.id} (${job?.name}) failed:`, err.message);
});

console.log(`Email worker listening on queue "${EMAIL_QUEUE_NAME}"`);

async function shutdown(): Promise<void> {
  await worker.close();
  connection.disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
