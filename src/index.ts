import cluster from 'node:cluster';

import { createApp } from './app';
import { config } from './config';
import { connectDb } from './db';

async function main(): Promise<void> {
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
