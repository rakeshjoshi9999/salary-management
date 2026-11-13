import { z } from 'zod';

export interface Config {
  port: number;
  mongodbUri: string;
  corsAllowedOrigins: string[];
  nodeEnv: 'development' | 'test' | 'production';
}

/** Every problem found in the environment, so one run shows all of them. */
export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid configuration: ${issues.join('; ')}`);
  }
}

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
  const { MONGODB_URI, PORT, CORS_ALLOWED_ORIGINS, NODE_ENV } = parsed.data;
  return {
    port: PORT,
    mongodbUri: MONGODB_URI,
    corsAllowedOrigins: CORS_ALLOWED_ORIGINS,
    nodeEnv: NODE_ENV,
  };
}
