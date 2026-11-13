import { Schema, model, type Model } from 'mongoose';

import { ROLES, type Role } from './types.js';

interface UserFields {
  email: string;
  password: string;
  role: Role;
}

interface UserMethods {
  comparePassword(plain: string): Promise<boolean>;
}

type UserModel = Model<UserFields, Record<string, never>, UserMethods>;

// Not implemented yet.
const schema = new Schema<UserFields, UserModel, UserMethods>({
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ROLES, default: 'VIEWER' },
});

schema.method('comparePassword', async function comparePassword(): Promise<boolean> {
  return false;
});

export const User = model<UserFields, UserModel>('User', schema);
