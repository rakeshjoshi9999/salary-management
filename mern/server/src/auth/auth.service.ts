import { createHash, randomBytes, randomUUID } from 'node:crypto';

import bcrypt from 'bcrypt';
import { z } from 'zod';

import type { Config } from '../config.js';
import { HttpError } from '../problem.js';
import { RefreshToken } from './refresh-token.model.js';
import { describeIssues, registration } from './schemas.js';
import type { TokenService } from './tokens.js';
import { User } from './user.model.js';

const credentials = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

export interface PublicUser {
  id: string;
  email: string;
  role: 'HR_MANAGER' | 'VIEWER';
}

export interface Session {
  accessToken: string;
  /** The raw refresh token, for the cookie. Only its hash is stored. */
  refreshToken: string;
}

export interface AuthService {
  register(input: unknown): Promise<PublicUser>;
  login(input: unknown): Promise<Session>;
  /** The cookie value as parsed; `unknown` because cookie-parser turns `j:` cookies into objects. */
  refresh(rawToken: unknown): Promise<Session>;
  logout(rawToken: unknown): Promise<void>;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_FAILED', describeIssues(result.error));
  }
  return result.data;
}

/**
 * A real bcrypt hash (cost 12) of a throwaway string. Compared against when the email is unknown, so
 * that case costs one bcrypt compare, like a real login, and response time cannot reveal which emails
 * are registered.
 */
const DUMMY_HASH = '$2b$12$M2YzS4R0Tab3HAtvech3l.Prq.zmVeKKROItWr0tahAjYzKm0L4zS';

const invalidCredentials = () =>
  new HttpError(401, 'INVALID_CREDENTIALS', 'The email or the password is wrong.');

export function createAuthService(
  config: Pick<Config, 'refreshTokenTtlSeconds'>,
  tokens: TokenService,
  now: () => Date,
): AuthService {
  /** Stores a new refresh token (hashed) in a family and signs an access token for the user. */
  async function startSession(
    user: { id: string; role: PublicUser['role'] },
    familyId: string,
  ): Promise<Session> {
    const refreshToken = randomBytes(32).toString('base64url'); // 256 random bits
    await RefreshToken.create({
      tokenHash: sha256(refreshToken),
      userId: user.id,
      familyId,
      expiresAt: new Date(now().getTime() + config.refreshTokenTtlSeconds * 1000),
    });
    return { accessToken: tokens.signAccessToken(user), refreshToken };
  }

  return {
    async register(input) {
      const { email, password } = parse(registration, input);
      try {
        // The role is not ours to take from the client: it takes the schema default, VIEWER.
        const user = await User.create({ email, password });
        return { id: user.id, email: user.email, role: user.role };
      } catch (error) {
        // `unique` is an index: it is MongoDB that refuses the second insert, with code 11000.
        if ((error as { code?: number }).code === 11000) {
          throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
        }
        throw error;
      }
    },

    async login(input) {
      const { email, password } = parse(credentials, input);
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        await bcrypt.compare(password, DUMMY_HASH);
        throw invalidCredentials();
      }
      if (!(await user.comparePassword(password))) {
        throw invalidCredentials();
      }
      return startSession(user, randomUUID()); // a new login starts a new family
    },

    async refresh(rawToken) {
      if (typeof rawToken !== 'string' || !rawToken) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'There is no refresh token.');
      }
      const tokenHash = sha256(rawToken);
      const record = await RefreshToken.findOne({ tokenHash });
      if (!record) {
        throw new HttpError(401, 'INVALID_TOKEN', 'The refresh token is not valid.');
      }
      if (record.expiresAt <= now()) {
        throw new HttpError(401, 'TOKEN_EXPIRED', 'The refresh token has expired.');
      }

      // One atomic step: of two simultaneous requests, MongoDB lets exactly one flip `usedAt`.
      // Read-then-write would let both through.
      const claimed = await RefreshToken.findOneAndUpdate(
        { tokenHash, usedAt: null, expiresAt: { $gt: now() } },
        { usedAt: now() },
      );
      if (!claimed) {
        // Already used: someone is replaying a token. Two parties now hold tokens from one login,
        // so end the whole family and make everyone log in again.
        await RefreshToken.deleteMany({ familyId: record.familyId });
        throw new HttpError(401, 'REFRESH_TOKEN_REUSED', 'The refresh token was already used.');
      }

      // Read the user again: a role change reaches the access token here, at the latest.
      const user = await User.findById(record.userId);
      if (!user) {
        await RefreshToken.deleteMany({ familyId: record.familyId });
        throw new HttpError(401, 'INVALID_TOKEN', 'The refresh token is not valid.');
      }
      const session = await startSession(user, record.familyId);

      // A replay elsewhere may have revoked the family after we claimed the token and before we
      // stored its successor. If our parent is gone, the family was revoked: take the successor down
      // with it, or it would live on in a family that was meant to be dead.
      if (!(await RefreshToken.exists({ _id: claimed._id }))) {
        await RefreshToken.deleteMany({ familyId: record.familyId });
        throw new HttpError(401, 'REFRESH_TOKEN_REUSED', 'The refresh token was already used.');
      }
      return session;
    },

    async logout(rawToken) {
      if (typeof rawToken !== 'string' || !rawToken) {
        return;
      }
      const record = await RefreshToken.findOne({ tokenHash: sha256(rawToken) });
      if (record) {
        await RefreshToken.deleteMany({ familyId: record.familyId });
      }
    },
  };
}
