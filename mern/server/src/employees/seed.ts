import { COUNTRIES, DEPARTMENTS, type CountryCode } from '../reference/data.js';
import { Employee, type EmployeeFields } from './employee.model.js';

export type SeedEmployee = Omit<EmployeeFields, 'deletedAt'>;

export interface GenerateOptions {
  count?: number;
  seed?: number;
  /** Every hire date is before this day; fixed, so the seed never reads the clock. */
  anchor?: Date;
}

const DEFAULT_ANCHOR = new Date('2026-01-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TENURE_DAYS = 20 * 365;

/**
 * mulberry32: a tiny seeded PRNG. `Math.random()` cannot be seeded in JavaScript (unlike Java's
 * `new Random(42)`), so the seed brings its own: the same seed gives the same sequence on every machine.
 */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many employees each country gets, out of 100. */
const COUNTRY_WEIGHTS: Record<CountryCode, number> = { US: 30, IN: 30, GB: 15, DE: 15, FR: 10 };

/** Typical annual salary per title, in major units of the country's currency. */
const BASE_SALARY: Record<CountryCode, number> = {
  US: 95_000,
  GB: 60_000,
  DE: 65_000,
  FR: 55_000,
  IN: 1_400_000,
};

/** How each title compares with the country's typical salary. */
const TITLE_FACTOR: Record<string, number> = {
  'Software Engineer': 1.0,
  'Senior Software Engineer': 1.35,
  'QA Engineer': 0.85,
  'Engineering Manager': 1.6,
  'Sales Representative': 0.7,
  'Account Executive': 0.95,
  'Sales Manager': 1.3,
  'Marketing Specialist': 0.75,
  'Content Strategist': 0.8,
  'Marketing Manager': 1.25,
  Accountant: 0.8,
  'Financial Analyst': 0.9,
  'Finance Manager': 1.35,
  'HR Generalist': 0.7,
  Recruiter: 0.72,
  'HR Manager': 1.2,
  'Operations Analyst': 0.78,
  'Operations Manager': 1.25,
};

const FIRST_NAMES: Record<CountryCode, readonly string[]> = {
  US: [
    'James',
    'Mary',
    'Robert',
    'Patricia',
    'Michael',
    'Jennifer',
    'David',
    'Linda',
    'Emily',
    'Daniel',
    'Sarah',
    'Kevin',
    'Laura',
    'Brian',
    'Rachel',
    'Jason',
    'Megan',
    'Eric',
    'Olivia',
    'Tyler',
    'Hannah',
    'Andrew',
    'Lauren',
    'Ryan',
    'Natalie',
  ],
  GB: [
    'Oliver',
    'Amelia',
    'George',
    'Isla',
    'Harry',
    'Ava',
    'Jack',
    'Mia',
    'Charlie',
    'Grace',
    'Thomas',
    'Poppy',
    'William',
    'Freya',
    'Alfie',
    'Ella',
    'Oscar',
    'Lily',
    'Henry',
    'Evie',
    'Archie',
    'Sophia',
    'Leo',
    'Florence',
    'Theo',
  ],
  IN: [
    'Aarav',
    'Ananya',
    'Vivaan',
    'Diya',
    'Arjun',
    'Isha',
    'Rohan',
    'Priya',
    'Kabir',
    'Meera',
    'Aditya',
    'Kavya',
    'Siddharth',
    'Neha',
    'Vikram',
    'Pooja',
    'Rahul',
    'Sneha',
    'Karan',
    'Riya',
    'Nikhil',
    'Aditi',
    'Varun',
    'Shruti',
    'Manish',
  ],
  DE: [
    'Lukas',
    'Emma',
    'Leon',
    'Hannah',
    'Finn',
    'Lea',
    'Paul',
    'Sophie',
    'Jonas',
    'Marie',
    'Felix',
    'Lena',
    'Maximilian',
    'Laura',
    'Elias',
    'Anna',
    'Noah',
    'Clara',
    'Julian',
    'Mila',
    'Moritz',
    'Johanna',
    'Tim',
    'Greta',
    'Niklas',
  ],
  FR: [
    'Louis',
    'Chloé',
    'Gabriel',
    'Léa',
    'Raphaël',
    'Manon',
    'Arthur',
    'Camille',
    'Hugo',
    'Inès',
    'Jules',
    'Sarah',
    'Lucas',
    'Emma',
    'Adam',
    'Jade',
    'Nathan',
    'Louise',
    'Théo',
    'Alice',
    'Paul',
    'Lina',
    'Victor',
    'Zoé',
    'Maxime',
  ],
};

const LAST_NAMES: Record<CountryCode, readonly string[]> = {
  US: [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Miller',
    'Davis',
    'Garcia',
    'Wilson',
    'Moore',
    'Taylor',
    'Anderson',
    'Thomas',
    'Jackson',
    'White',
    'Harris',
    'Martin',
    'Thompson',
    'Clark',
    'Lewis',
    'Young',
    'Allen',
    'King',
    'Scott',
    'Baker',
  ],
  GB: [
    'Taylor',
    'Davies',
    'Evans',
    'Thomas',
    'Roberts',
    'Walker',
    'Wright',
    'Hughes',
    'Green',
    'Hall',
    'Wood',
    'Edwards',
    'Turner',
    'Hill',
    'Cooper',
    'Ward',
    'Morris',
    'Moore',
    'Clarke',
    'Watson',
    'Harrison',
    'Baker',
    'Bennett',
    'Shaw',
    'Lloyd',
  ],
  IN: [
    'Sharma',
    'Verma',
    'Patel',
    'Iyer',
    'Reddy',
    'Nair',
    'Gupta',
    'Singh',
    'Joshi',
    'Mehta',
    'Kumar',
    'Rao',
    'Chopra',
    'Malhotra',
    'Desai',
    'Kapoor',
    'Agarwal',
    'Bose',
    'Menon',
    'Pillai',
    'Banerjee',
    'Kulkarni',
    'Saxena',
    'Bhat',
    'Chatterjee',
  ],
  DE: [
    'Müller',
    'Schmidt',
    'Schneider',
    'Fischer',
    'Weber',
    'Meyer',
    'Wagner',
    'Becker',
    'Hoffmann',
    'Koch',
    'Schulz',
    'Bauer',
    'Richter',
    'Klein',
    'Wolf',
    'Schröder',
    'Neumann',
    'Schwarz',
    'Zimmermann',
    'Braun',
    'Krüger',
    'Hofmann',
    'Hartmann',
    'Lange',
    'Werner',
  ],
  FR: [
    'Martin',
    'Bernard',
    'Dubois',
    'Thomas',
    'Robert',
    'Richard',
    'Petit',
    'Durand',
    'Leroy',
    'Moreau',
    'Simon',
    'Laurent',
    'Lefebvre',
    'Michel',
    'Garcia',
    'David',
    'Bertrand',
    'Roux',
    'Vincent',
    'Fournier',
    'Morel',
    'Girard',
    'André',
    'Mercier',
    'Blanc',
  ],
};

/** Individual contributors are far more common than managers: about one manager in six. */
const titleWeight = (jobTitle: string) =>
  /Manager$/.test(jobTitle) ? 1 : jobTitle.startsWith('Senior') ? 3 : 4;

const WEIGHTED_TITLES = DEPARTMENTS.flatMap((department) =>
  department.jobTitles.flatMap((jobTitle) =>
    Array.from({ length: titleWeight(jobTitle) }, () => ({
      jobTitle,
      department: department.name,
    })),
  ),
);

/** `Müller` → `muller`: email local parts stay plain ASCII. */
const asciiLower = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();

/**
 * 10,000 realistic employees, the same on every run: every choice comes from the seeded PRNG and every
 * date from `anchor`. Emails carry the running number, so they are unique by construction.
 */
export function generateEmployees(options: GenerateOptions = {}): SeedEmployee[] {
  const { count = 10_000, seed = 42, anchor = DEFAULT_ANCHOR } = options;
  const random = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const weighted = COUNTRIES.flatMap((country) =>
    Array<CountryCode>(COUNTRY_WEIGHTS[country.code]).fill(country.code),
  );

  return Array.from({ length: count }, (_unused, index): SeedEmployee => {
    const countryCode = pick(weighted);
    const first = pick(FIRST_NAMES[countryCode]);
    const last = pick(LAST_NAMES[countryCode]);
    const { jobTitle, department } = pick(WEIGHTED_TITLES);
    // ±20 % around the title's typical pay, rounded to whole currency units, then to minor units.
    const spread = 0.8 + random() * 0.4;
    const salaryMajor = Math.round(BASE_SALARY[countryCode] * TITLE_FACTOR[jobTitle]! * spread);
    const daysBefore = 1 + Math.floor(random() * MAX_TENURE_DAYS);
    return {
      fullName: `${first} ${last}`,
      email: `${asciiLower(first)}.${asciiLower(last)}.${String(index + 1).padStart(5, '0')}@acme.example`,
      jobTitle,
      department,
      countryCode,
      salaryMinor: salaryMajor * 100,
      hireDate: new Date(anchor.getTime() - daysBefore * DAY_MS),
    };
  });
}

/**
 * Inserts the employees that are not in the database yet (amendment to ADR-M6). One read of every
 * existing email, deleted ones included, then one `insertMany` of the rest: idempotent, repairs a partial
 * run, never overwrites an edit and never brings back someone HR deleted.
 */
export async function seedEmployees(employees: SeedEmployee[]): Promise<number> {
  // The raw collection, not the model: the soft-delete hooks would hide deleted emails from this read.
  const existing = new Set<string>(await Employee.collection.distinct('email'));
  const missing = employees.filter((employee) => !existing.has(employee.email));
  if (missing.length === 0) {
    return 0;
  }
  try {
    // `ordered: false`: one duplicate (a concurrent run won the race) does not stop the rest.
    // `throwOnValidationError`: without it Mongoose silently drops invalid documents in this mode.
    const inserted = await Employee.insertMany(missing, {
      ordered: false,
      throwOnValidationError: true,
    });
    return inserted.length;
  } catch (error) {
    const failure = error as {
      writeErrors?: { code?: number; err?: { code?: number } }[];
      writeConcernError?: unknown;
      insertedDocs?: unknown[];
    };
    // Only "someone else inserted this email first" is harmless. An empty list here means a different
    // failure (a write-concern timeout, for example), which must not be reported as success.
    const onlyDuplicates =
      !failure.writeConcernError &&
      !!failure.writeErrors?.length &&
      failure.writeErrors.every((e) => (e.code ?? e.err?.code) === 11000);
    if (!onlyDuplicates) {
      throw error;
    }
    return failure.insertedDocs?.length ?? 0;
  }
}
