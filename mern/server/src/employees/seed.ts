import type { EmployeeFields } from './employee.model.js';

export type SeedEmployee = Omit<EmployeeFields, 'deletedAt'>;

export interface GenerateOptions {
  count?: number;
  seed?: number;
  /** Every hire date is before this day; fixed, so the seed never reads the clock. */
  anchor?: Date;
}

/** Stub until the M5 step 1 implementation. */
export function generateEmployees(_options: GenerateOptions = {}): SeedEmployee[] {
  throw new Error('not implemented');
}

/** Stub until the M5 step 1 implementation. */
export async function seedEmployees(_employees: SeedEmployee[]): Promise<void> {
  throw new Error('not implemented');
}
