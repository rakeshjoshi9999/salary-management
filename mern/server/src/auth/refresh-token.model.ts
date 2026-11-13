import { Schema, Types, model } from 'mongoose';

interface RefreshTokenFields {
  tokenHash: string;
  userId: Types.ObjectId;
  familyId: string;
  usedAt?: Date;
  expiresAt: Date;
}

// Not implemented yet.
const schema = new Schema<RefreshTokenFields>({
  tokenHash: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  familyId: { type: String, required: true },
  usedAt: { type: Date },
  expiresAt: { type: Date, required: true },
});

export const RefreshToken = model<RefreshTokenFields>('RefreshToken', schema);
