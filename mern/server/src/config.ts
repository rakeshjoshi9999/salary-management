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

export function loadConfig(_env: NodeJS.ProcessEnv): Config {
  return { port: 0, mongodbUri: '', corsAllowedOrigins: [], nodeEnv: 'test' };
}
