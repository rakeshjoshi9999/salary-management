import { z } from 'zod';

export interface Config {
  port: number;
  mongodbUri: string;
  corsAllowedOrigins: string[];
  nodeEnv: 'development' | 'test' | 'production';
  jwtAccessSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}

/** Every problem found in the environment, so one run shows all of them. */
export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid configuration: ${issues.join('; ')}`);
  }
}

/** A whole number of seconds from the environment; blank is a mistake, not zero (`Number('')` is 0). */
const seconds = (fallback: number) =>
  z.string().trim().min(1).transform(Number).pipe(z.number().int().positive()).default(fallback);

/**
 * What the environment may contain. Environment variables are always strings, so numbers are coerced
 * here, once, at the edge: the rest of the app only sees a typed `Config`.
 */
const environment = z.object({
  MONGODB_URI: z.string().trim().min(1),
  // `Number('')` is 0, so a blank `PORT=` line would pass as "any free port". Check the text first.
  PORT: z
    .string()
    .trim()
    .min(1)
    .transform(Number)
    .pipe(z.number().int().min(0).max(65535))
    .default(8082),
  // One origin for now; splitting a comma-separated list arrives with its first real use.
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((origin) => [origin]),
  // HS256 is an HMAC-SHA-256: RFC 7518 wants a key at least as long as the hash, 32 bytes. This checks
  // the length only; the secret itself must be random (see .env.example).
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: seconds(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: seconds(7 * 24 * 60 * 60),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/** Reads and checks the environment (twelve-factor config); a bad deploy fails at boot, not on a request. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = environment.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  const {
    MONGODB_URI,
    PORT,
    CORS_ALLOWED_ORIGINS,
    NODE_ENV,
    JWT_ACCESS_SECRET,
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
  } = parsed.data;
  return {
    port: PORT,
    mongodbUri: MONGODB_URI,
    corsAllowedOrigins: CORS_ALLOWED_ORIGINS,
    nodeEnv: NODE_ENV,
    jwtAccessSecret: JWT_ACCESS_SECRET,
    accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
  };
}
