import { Schema, Types, model } from 'mongoose';

interface RefreshTokenFields {
  /** SHA-256 of the token. The raw token exists only in the cookie, never in the database. */
  tokenHash: string;
  userId: Types.ObjectId;
  /** Every token that descends from one login shares a family, so a replay can revoke them all. */
  familyId: string;
  /** Set when the token is rotated; a token with `usedAt` that comes back is a replay. */
  usedAt?: Date | null;
  expiresAt: Date;
}

const schema = new Schema<RefreshTokenFields>({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  familyId: { type: String, required: true, index: true },
  usedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
});

// A TTL index: MongoDB deletes each document once its own `expiresAt` has passed, using a background
// task that runs about once a minute, so the code still checks expiry itself.
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<RefreshTokenFields>('RefreshToken', schema);
