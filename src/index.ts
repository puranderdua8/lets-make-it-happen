import cluster from 'node:cluster';

import { createApp } from './app';
import { config } from './config';
import { connectDb } from './db';

/** Host + database only — never log credentials embedded in the URI. */
function describeTarget(uri: string): string {
  try {
    const u = new URL(uri);
    const db = u.pathname.replace(/^\//, '');
    return `${u.protocol}//${u.host}${db ? `/${db}` : ''}`;
  } catch {
    return '(unparseable URI)';
  }
}

// One-glance mode summary so a stale or incomplete .env is immediately
// visible at boot instead of silently changing behavior.
function logConfigSummary(): void {
  console.log(`[${process.pid}] MongoDB : ${describeTarget(config.mongodbUri)}`);
  console.log(
    `[${process.pid}] Redis   : ${
      config.redisUrl
        ? `${describeTarget(config.redisUrl)} — cache + shared rate limits + email queue (run \`npm run worker\`!)`
        : 'disabled — in-process fallbacks (cache off, per-process rate limits, direct email send)'
    }`,
  );
  console.log(
    `[${process.pid}] Email   : ${
      config.smtp.host ? `SMTP via ${config.smtp.host}` : 'Ethereal test inbox (preview URLs in logs)'
    }`,
  );
  if (config.rateLimit.disabled) {
    console.warn(`[${process.pid}] WARNING : rate limiting is DISABLED`);
  }
}

async function main(): Promise<void> {
  logConfigSummary();
  await connectDb();
  console.log(`[${process.pid}] Connected to MongoDB`);

  createApp().listen(config.port, () => {
    console.log(`[${process.pid}] Server listening on http://localhost:${config.port}`);
  });
}

// With WEB_CONCURRENCY > 1 the primary forks that many workers, all sharing
// the listening port. Each worker is a full stateless API instance.
if (config.webConcurrency > 1 && cluster.isPrimary) {
  console.log(`Primary ${process.pid}: forking ${config.webConcurrency} workers`);
  for (let i = 0; i < config.webConcurrency; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker, code) => {
    console.error(`Worker ${worker.process.pid} exited (code ${code}), restarting`);
    cluster.fork();
  });
} else {
  main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
