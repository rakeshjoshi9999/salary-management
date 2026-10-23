import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { environment } from '../../environments/environment';
import { HealthService } from './health.service';

type Phase = 'pending' | 'reachable' | 'unreachable';

@Component({
  selector: 'app-health-page',
  imports: [ButtonModule],
  templateUrl: './health-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthPage {
  private readonly health = inject(HealthService);

  protected readonly apiBaseUrl = environment.apiBaseUrl;
  protected readonly phase = signal<Phase>('pending');

  /**
   * Why it is not reachable, in the user's terms. Both failures land in one
   * visual state, but they are not the same problem and the copy says which.
   */
  protected readonly detail = signal('');

  constructor() {
    this.check();
  }

  protected check(): void {
    this.phase.set('pending');
    this.detail.set('');

    this.health.check().subscribe({
      next: (result) => {
        if (result.reachable) {
          this.phase.set('reachable');
          return;
        }
        this.phase.set('unreachable');
        this.detail.set(
          `The API answered but reported its status as ${result.status}. It is running and ` +
            `cannot reach its database.`,
        );
      },
      error: () => {
        this.phase.set('unreachable');
        this.detail.set(
          'The API did not answer. It may still be starting up, or the browser may have ' +
            'blocked the request because this origin is not in the allowed list.',
        );
      },
    });
  }
}
