import mongoose from 'mongoose';

import { config } from './config';

export async function connectDb(uri: string = config.mongodbUri): Promise<void> {
  await mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
