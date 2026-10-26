/**
 * API models, written by hand from docs/openapi.yaml (ADR-013, ADR-051).
 * Each type names the schema it mirrors. Money is a JSON number that the UI formats
 * and never calculates with (ADR-015).
 */

/** `CountryCode`: two uppercase letters, e.g. `IN`. */
export type CountryCode = string;

/** `EmployeeFields`: what the HR Manager types in. */
export interface EmployeeFields {
  readonly fullName: string;
  readonly email: string;
  readonly jobTitle: string;
  readonly department: string;
  readonly countryCode: CountryCode;
  readonly salary: number;
  /** ISO date, `2021-04-12`. */
  readonly hireDate: string;
}

/** `EmployeeCreateRequest`. Strict: no `id`, no `currency`. */
export type EmployeeCreateRequest = EmployeeFields;

/** `EmployeeUpdateRequest`: a full replacement carrying the version it was read at. */
export interface EmployeeUpdateRequest extends EmployeeFields {
  readonly version: number;
}

/** `Employee`. */
export interface Employee extends EmployeeFields {
  readonly id: number;
  readonly currency: string;
  readonly version: number;
}

/** `EmployeePage`. `page` is 0-based. */
export interface EmployeePage {
  readonly items: readonly Employee[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export type SortField = 'fullName' | 'salary' | 'hireDate';
export type SortDirection = 'asc' | 'desc';

/** The `GET /employees` query parameters. Anything left out takes the API's default. */
export interface EmployeeListQuery {
  readonly q?: string;
  readonly country?: CountryCode;
  readonly department?: string;
  readonly jobTitle?: string;
  /** `field,direction`, e.g. `salary,desc`. */
  readonly sort?: string;
  readonly page?: number;
  readonly size?: number;
}

/** `SalaryStats`. Every statistic is null when headcount is 0. */
export interface SalaryStats {
  readonly headcount: number;
  readonly min: number | null;
  readonly max: number | null;
  readonly average: number | null;
  readonly median: number | null;
}

export interface TitleAverage {
  readonly jobTitle: string;
  readonly department: string;
  readonly headcount: number;
  readonly average: number;
}

export interface DepartmentHeadcount {
  readonly department: string;
  readonly headcount: number;
}

/** `CountryInsights`. Lists are sorted by the API (ADR-017). */
export interface CountryInsights {
  readonly countryCode: CountryCode;
  readonly currency: string;
  readonly salary: SalaryStats;
  readonly averageByJobTitle: readonly TitleAverage[];
  readonly headcountByDepartment: readonly DepartmentHeadcount[];
}

export interface Country {
  readonly code: CountryCode;
  readonly name: string;
  readonly currency: string;
}

export interface Department {
  readonly name: string;
  readonly jobTitles: readonly string[];
}

/** `ReferenceData`, sorted by name throughout. */
export interface ReferenceData {
  readonly countries: readonly Country[];
  readonly departments: readonly Department[];
}

/** `Settings` (ADR-028). */
export interface Settings {
  readonly defaultCountryCode: CountryCode;
  readonly version: number;
}

/** `SettingsUpdateRequest`. */
export type SettingsUpdateRequest = Settings;

/** `Problem`: RFC 7807 with a stable `code` (ADR-018, ADR-043). */
export interface Problem {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly instance?: string;
  readonly errors?: readonly { readonly field: string; readonly message: string }[];
  readonly currentVersion?: number;
  readonly errorId?: string;
}
