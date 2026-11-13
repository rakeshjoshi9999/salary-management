import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A screen's title and its actions, under the top bar (ADR-054). The title is an `h2`: the shell holds
 * the page's one `h1`. Sticky from tablet up, so a long list keeps its actions in reach; on phones it
 * scrolls away to leave room for content.
 */
@Component({
  selector: 'app-page-header',
  host: { class: 'block bg-canvas/90 backdrop-blur sm:sticky sm:top-14 sm:z-20' },
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3 py-5">
      <h2 class="text-2xl font-semibold tracking-tight text-ink">{{ heading() }}</h2>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly heading = input.required<string>();
}
