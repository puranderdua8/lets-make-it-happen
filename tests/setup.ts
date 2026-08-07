// Must be set before src/config.ts is first imported by the test files.
// (config.ts also skips loading .env under NODE_ENV=test, so the local
// .env's real MongoDB/Redis settings can never leak into the suite.)
process.env.RATE_LIMIT_DISABLED = '1';
delete process.env.REDIS_URL;

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Wait for index builds so unique constraints are enforced from the first test
  // (the concurrent-registration test depends on the {event, user} unique index).
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

afterEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
