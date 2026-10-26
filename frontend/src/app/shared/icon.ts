import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'settings'
  | 'menu'
  | 'close'
  | 'plus'
  | 'pencil'
  | 'trash'
  | 'spinner'
  | 'check-circle'
  | 'x-circle';

/**
 * Inline SVG icons, sized to the surrounding text and coloured by it. Decorative: the control that
 * holds one carries the accessible name. Paths adapted from Lucide (ISC licence). Used instead of
 * PrimeIcons, which is not a dependency of this app.
 */
@Component({
  selector: 'app-icon',
  host: { class: 'inline-flex shrink-0 align-[-0.125em]', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class.animate-spin]="name() === 'spinner'"
      [attr.width]="size()"
      [attr.height]="size()"
      focusable="false"
    >
      @switch (name()) {
        @case ('settings') {
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('menu') {
          <path d="M4 6h16M4 12h16M4 18h16" />
        }
        @case ('close') {
          <path d="M18 6 6 18M6 6l12 12" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('pencil') {
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        }
        @case ('trash') {
          <path
            d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          />
        }
        @case ('spinner') {
          <path d="M21 12a9 9 0 1 1-6.22-8.56" />
        }
        @case ('check-circle') {
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        }
        @case ('x-circle') {
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6M9 9l6 6" />
        }
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input('1.1em');
}
