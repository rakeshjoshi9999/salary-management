import { environment as local } from './environment';
import { environment as production } from './environment.production';
import { environment as stage } from './environment.stage';

/**
 * Configuration, not behaviour - but a stage file copied from production would
 * silently send stage writes to production data (ADR-031), and nothing else
 * would notice before someone clicked Save.
 */
describe('environments', () => {
  it('gives each environment a distinct name', () => {
    expect([local.name, stage.name, production.name]).toEqual(['local', 'stage', 'production']);
  });

  it("points stage at its own https API, not production's", () => {
    const stageUrl = new URL(stage.apiBaseUrl);

    expect(stageUrl.protocol).toBe('https:');
    // Hosts, not strings: a trailing slash or a path must not disguise production.
    expect(stageUrl.host).not.toBe(new URL(production.apiBaseUrl).host);
  });
});
