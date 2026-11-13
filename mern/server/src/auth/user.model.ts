import bcrypt from 'bcrypt';
import { Schema, model, type Model } from 'mongoose';

import { ROLES, type Role } from './types.js';

/** bcrypt's cost factor: each hash takes about a quarter of a second, and each +1 doubles that. */
export const BCRYPT_COST = 12;

interface UserFields {
  email: string;
  password: string;
  role: Role;
}

interface UserMethods {
  comparePassword(plain: string): Promise<boolean>;
}

type UserModel = Model<UserFields, Record<string, never>, UserMethods>;

const schema = new Schema<UserFields, UserModel, UserMethods>(
  {
    // `unique` builds a MongoDB index; it is the database, not Mongoose, that rejects a duplicate
    // (error code 11000). The setters make that index case-insensitive in effect.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // `select: false`: ordinary queries leave the hash out; login asks for it with `+password`.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'VIEWER' },
  },
  {
    toJSON: {
      // Whatever serialises a user (a response, a log line) never carries the hash.
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = String(ret['_id']);
        delete ret['_id'];
        delete ret['__v'];
        delete ret['password'];
        return ret;
      },
    },
  },
);

// A plain `function`, not an arrow: Mongoose sets `this` to the document being saved.
schema.pre('save', async function hashPassword() {
  // Only when the password changed; otherwise every save would hash the hash and lock the user out.
  if (!this.isModified('password')) {
    return;
  }
  this.password = await bcrypt.hash(this.password, BCRYPT_COST);
});

schema.method('comparePassword', function comparePassword(plain: string): Promise<boolean> {
  // The hash is only there when the query asked for it with `.select('+password')`.
  if (!this.password) {
    throw new Error('comparePassword needs the hash: load the user with .select("+password").');
  }
  return bcrypt.compare(plain, this.password);
});

export const User = model<UserFields, UserModel>('User', schema);
