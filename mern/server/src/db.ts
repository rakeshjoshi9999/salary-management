export interface ConnectOptions {
  serverSelectionTimeoutMS?: number;
}

export async function connectDb(_uri: string, _options: ConnectOptions = {}): Promise<void> {
  // Not implemented yet.
}

export async function disconnectDb(): Promise<void> {
  // Not implemented yet.
}

export async function pingDb(): Promise<boolean> {
  return false;
}
