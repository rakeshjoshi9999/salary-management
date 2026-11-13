import mongoose from 'mongoose';

export interface ConnectOptions {
  /** How long to look for a reachable server before giving up (the driver's default is 30 s). */
  serverSelectionTimeoutMS?: number;
}

/**
 * Connects once, at startup. A short selection timeout makes a wrong address fail in seconds with a
 * clear error, instead of the app appearing to hang. Mongoose keeps one default connection per process.
 */
export async function connectDb(
  uri: string,
  { serverSelectionTimeoutMS = 5_000 }: ConnectOptions = {},
): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

/** True only when connected and the server answers a ping; any failure counts as "down". */
export async function pingDb(): Promise<boolean> {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    return false;
  }
  const db = mongoose.connection.db;
  if (!db) {
    return false;
  }
  try {
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
