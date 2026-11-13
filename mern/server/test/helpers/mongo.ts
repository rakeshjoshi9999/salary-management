import { MongoDBContainer } from '@testcontainers/mongodb';

/**
 * A real MongoDB for a test file (ADR-M1): the aggregation, index and concurrency behaviour we test
 * later only exists in a real server, so nothing here is mocked. Pinned to the major we deploy.
 */
export async function startMongo() {
  const container = await new MongoDBContainer('mongo:7').start();
  return {
    // The container runs a one-node replica set; connect to it directly, not through discovery.
    uri: `${container.getConnectionString()}/salary?directConnection=true`,
    stop: () => container.stop(),
  };
}
