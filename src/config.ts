import dotenv from 'dotenv';

// Tests must be hermetic: they run against an in-memory MongoDB with all
// Redis features disabled, so the developer's .env (real Atlas/Redis
// credentials) must never leak into them. Jest sets NODE_ENV=test.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/virtual-events',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  redisUrl: process.env.REDIS_URL,
  // Await email delivery inside the request instead of fire-and-forget.
  // Required on serverless platforms (a frozen function kills pending sends).
  emailAwait: process.env.EMAIL_AWAIT === '1',
  webConcurrency: Number(process.env.WEB_CONCURRENCY ?? 1),
  rateLimit: {
    disabled: process.env.RATE_LIMIT_DISABLED === '1',
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
    globalMax: Number(process.env.GLOBAL_RATE_LIMIT_MAX ?? 1000),
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM ?? 'Virtual Events <no-reply@virtual-events.local>',
  },
};
