import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header heading="Catalog">
      <button type="button" data-testid="page-action">Add employee</button>
    </app-page-header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {}

/** Each screen's title and actions, under the top bar (ADR-054). */
describe('PageHeader', () => {
  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the title as a heading below the app heading', async () => {
    const el = await render();

    const heading = el.querySelector('h2');
    expect(heading?.textContent?.trim()).toBe('Catalog');
    expect(el.querySelector('h1')).toBeNull();
  });

  it('projects page actions', async () => {
    const el = await render();

    expect(el.querySelector('app-page-header [data-testid="page-action"]')).toBeTruthy();
  });
});
