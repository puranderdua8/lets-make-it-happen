import express from 'express';

import { errorHandler, notFoundHandler } from './middleware/error';
import { globalLimiter } from './middleware/rate-limit';
import { authRouter } from './routes/auth.routes';
import { eventRouter } from './routes/event.routes';

export function createApp(): express.Express {
  const app = express();

  // Behind Netlify/other proxies, use forwarded headers so req.ip (the
  // rate-limit key) reflects the client, not the proxy.
  app.set('trust proxy', true);

  app.use(express.json());
  app.use(globalLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/', authRouter);
  app.use('/events', eventRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
