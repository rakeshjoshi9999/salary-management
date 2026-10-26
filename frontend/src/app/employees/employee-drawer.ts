import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SkeletonModule } from 'primeng/skeleton';
import { Observable } from 'rxjs';

import { Employee, EmployeeFields } from '../core/api.models';
import { ApiError } from '../core/api-error';
import { CLOCK, todayUtc } from '../core/clock';
import { ReferenceStore } from '../core/reference.store';
import { MoneyPipe } from '../shared/money.pipe';
import { CatalogRefresh } from './catalog-refresh';
import { EmployeeService } from './employee.service';
import {
  EARLIEST_HIRE_DATE,
  dateBetween,
  emailWithDottedDomain,
  errorMessage,
  notBlank,
  salary,
} from './employee-form.validators';

export type DrawerMode = 'view' | 'add' | 'edit';
type FieldName = keyof EmployeeFields;
type ViewStatus = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * The employee drawer over the Catalog: view, add and edit (UI_DESIGN.md). One component for all
 * three, chosen by the route's `mode`. Typed Reactive Forms; after a 409 STALE_VERSION, Save stays
 * blocked until "Reload latest" (ADR-051).
 */
@Component({
  selector: 'app-employee-drawer',
  imports: [ReactiveFormsModule, DrawerModule, ButtonModule, SkeletonModule, MoneyPipe],
  templateUrl: './employee-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDrawer {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employees = inject(EmployeeService);
  private readonly toast = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly refresh = inject(CatalogRefresh);
  private readonly changes = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly reference = inject(ReferenceStore);

  protected readonly mode = this.route.snapshot.data['mode'] as DrawerMode;
  private readonly id = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly today = todayUtc(inject(CLOCK)());
  protected readonly earliestHireDate = EARLIEST_HIRE_DATE;

  protected readonly open = signal(true);
  protected readonly employee = signal<Employee | null>(null);
  protected readonly status = signal<ViewStatus>(this.mode === 'add' ? 'ready' : 'loading');
  protected readonly saving = signal(false);
  protected readonly stale = signal(false);
  protected readonly submitted = signal(false);
  /** Set once a save succeeds, so leaving afterwards never asks. */
  private saved = false;

  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, notBlank, Validators.maxLength(200)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(254), emailWithDottedDomain],
    }),
    department: new FormControl('', { nonNullable: true, validators: Validators.required }),
    jobTitle: new FormControl(
      { value: '', disabled: true },
      { nonNullable: true, validators: Validators.required },
    ),
    countryCode: new FormControl('', { nonNullable: true, validators: Validators.required }),
    salary: new FormControl('', { nonNullable: true, validators: [Validators.required, salary] }),
    hireDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, dateBetween(EARLIEST_HIRE_DATE, this.today)],
    }),
  });

  protected readonly department = toSignal(this.form.controls.department.valueChanges, {
    initialValue: '',
  });
  private readonly country = toSignal(this.form.controls.countryCode.valueChanges, {
    initialValue: '',
  });
  protected readonly titleOptions = computed(() =>
    this.department() ? this.reference.titlesFor(this.department()) : [],
  );
  protected readonly currency = computed(
    () => this.reference.country(this.country())?.currency ?? '',
  );
  protected readonly countryName = computed(() => {
    const code = this.employee()?.countryCode;
    return this.reference.country(code)?.name ?? code ?? '';
  });
  protected readonly title = computed(() => {
    if (this.mode === 'add') return 'Add employee';
    if (this.mode === 'edit') return 'Edit employee';
    return this.employee()?.fullName ?? 'Employee';
  });

  constructor() {
    this.reference.load();

    // The title follows the department: enabled once one is picked, cleared if it does not belong.
    this.form.controls.department.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((department) => this.syncTitle(department));

    if (this.mode !== 'add') {
      this.load();
    }
  }

  /** For the unsaved-changes guard: true, or a promise of the user's answer (ADR-051). */
  canLeave(): boolean | Promise<boolean> {
    // Never mid-save: the answer would be dropped with the component.
    if (this.saving()) {
      return false;
    }
    if (this.saved || this.mode === 'view' || !this.form.dirty) {
      return true;
    }
    return new Promise<boolean>((resolve) => {
      this.confirmation.confirm({
        header: 'Discard changes?',
        message: 'Your changes to this employee will be lost.',
        acceptLabel: 'Discard',
        rejectLabel: 'Keep editing',
        accept: () => resolve(true),
        reject: () => {
          this.open.set(true);
          resolve(false);
        },
      });
    });
  }

  protected close(): void {
    if (this.saving()) {
      this.open.set(true);
      return;
    }
    this.navigateTo(['/catalog']);
  }

  protected edit(): void {
    this.navigateTo(['/catalog', this.id, 'edit']);
  }

  protected cancel(): void {
    this.navigateTo(this.mode === 'edit' ? ['/catalog', this.id] : ['/catalog']);
  }

  protected reloadLatest(): void {
    this.stale.set(false);
    this.load();
  }

  protected retry(): void {
    this.load();
  }

  protected showError(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected errorText(name: FieldName): string {
    return errorMessage(this.form.controls[name].errors);
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.stale() || this.saving() || this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const fields: EmployeeFields = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      jobTitle: value.jobTitle,
      department: value.department,
      countryCode: value.countryCode,
      salary: Number(value.salary),
      hireDate: value.hireDate,
    };
    const current = this.employee();
    if (this.mode === 'edit' && !current) {
      return;
    }
    const request: Observable<Employee> =
      this.mode === 'edit' && current
        ? this.employees.update(this.id, { ...fields, version: current.version })
        : this.employees.create(fields);

    this.saving.set(true);
    this.form.disable({ emitEvent: false });
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (savedEmployee) => {
        this.saved = true;
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', life: 3000 });
        this.refresh.request();
        this.navigateTo(['/catalog', savedEmployee.id]);
      },
      error: (error: unknown) => this.saveFailed(error),
    });
  }

  private saveFailed(error: unknown): void {
    this.saving.set(false);
    this.unlock();
    const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
    switch (code) {
      case 'VALIDATION_FAILED': {
        let shown = 0;
        for (const [field, message] of Object.entries((error as ApiError).fieldErrors)) {
          const control = this.form.get(field);
          if (control) {
            control.setErrors({ server: message });
            control.markAsTouched();
            shown++;
          }
        }
        // An error on no visible field (an unknown property, the version) must still be seen.
        if (shown === 0) {
          this.saveErrorToast();
        }
        break;
      }
      case 'DUPLICATE_EMAIL':
        this.form.controls.email.setErrors({
          server: 'Another employee already has this email',
        });
        break;
      case 'STALE_VERSION':
        this.stale.set(true);
        break;
      case 'EMPLOYEE_NOT_FOUND':
        // Nothing left to save, so leaving must not ask about discarding.
        this.saved = true;
        this.status.set('not-found');
        break;
      default:
        this.saveErrorToast();
    }
    this.changes.markForCheck();
  }

  private saveErrorToast(): void {
    this.toast.add({
      severity: 'error',
      summary: "Couldn't save",
      detail: 'Your changes are still here. Try again.',
    });
  }

  private load(): void {
    if (!Number.isInteger(this.id) || this.id < 1) {
      this.status.set('not-found');
      return;
    }
    this.status.set('loading');
    this.employees
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (employee) => {
          this.employee.set(employee);
          if (this.mode === 'edit') {
            this.fill(employee);
          }
          this.status.set('ready');
        },
        error: (error: unknown) =>
          this.status.set(
            error instanceof ApiError && error.code === 'EMPLOYEE_NOT_FOUND'
              ? 'not-found'
              : 'error',
          ),
      });
  }

  private fill(employee: Employee): void {
    this.form.reset({
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      jobTitle: employee.jobTitle,
      countryCode: employee.countryCode,
      salary: String(employee.salary),
      hireDate: employee.hireDate,
    });
    this.submitted.set(false);
    this.changes.markForCheck();
  }

  private syncTitle(department: string): void {
    const title = this.form.controls.jobTitle;
    if (department) {
      title.enable({ emitEvent: false });
    } else {
      title.disable({ emitEvent: false });
    }
    if (title.value && !this.reference.titlesFor(department).includes(title.value)) {
      title.setValue('');
    }
  }

  private unlock(): void {
    this.form.enable({ emitEvent: false });
    this.syncTitle(this.form.controls.department.value);
  }

  private navigateTo(commands: unknown[]): void {
    void this.router.navigate(commands, { queryParamsHandling: 'preserve' }).then((navigated) => {
      if (!navigated) {
        this.open.set(true);
      }
    });
  }
}
