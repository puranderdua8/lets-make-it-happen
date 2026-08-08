import type { Handler, HandlerResponse } from '@netlify/functions';
import express from 'express';
import serverless from 'serverless-http';

import { createApp } from '../../src/app';
import { connectDb } from '../../src/db';

// The whole Express API served as a single Netlify Function. The site's
// redirect rule maps /api/* here, and the app is mounted under /api so
// Express sees matching paths.
const wrapper = express();
wrapper.use('/api', createApp());

const serverlessHandler = serverless(wrapper);

// One MongoDB connection per warm container, shared across invocations.
// The promise is cached so concurrent cold-start requests connect once.
let dbReady: Promise<void> | undefined;

export const handler: Handler = async (event, context) => {
  dbReady ??= connectDb();
  await dbReady;
  return (await serverlessHandler(event, context)) as HandlerResponse;
};
