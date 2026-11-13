import { ConfigError, loadConfig } from './config.js';
import { startServer } from './lifecycle.js';

/** The process entry point: the only file that reads `process.env`, opens a socket and handles signals. */
async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const running = await startServer(config);
  console.log(`Listening on port ${config.port} (${config.nodeEnv})`);

  // Render sends SIGTERM when it replaces a deploy; Ctrl+C sends SIGINT.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      console.log(`${signal} received: shutting down`);
      // If something never finishes, leave anyway rather than hang the deploy.
      setTimeout(() => process.exit(1), 10_000).unref();
      running.shutdown().then(
        () => process.exit(0),
        (error: unknown) => {
          console.error(error);
          process.exit(1);
        },
      );
    });
  }
}

main().catch((error: unknown) => {
  // A bad configuration is a mistake to fix, not a crash to investigate: print only the message.
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
});
