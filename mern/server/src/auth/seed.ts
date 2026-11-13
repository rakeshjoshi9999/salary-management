import { describeIssues, registration } from './schemas.js';
import { User } from './user.model.js';

export interface SeedInput {
  email: string;
  password: string;
}

/**
 * Creates the first `HR_MANAGER` unless that email already exists. Safe to run twice (idempotent).
 * An existing account is left alone: a script must not quietly change someone's privileges.
 */
export async function seedHrManager(input: SeedInput): Promise<void> {
  // The seed makes the most powerful account, so it gets the same password rules as everyone else.
  const parsed = registration.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid seed credentials: ${describeIssues(parsed.error)}`);
  }
  const { email, password } = parsed.data;
  if (await User.exists({ email })) {
    return;
  }
  try {
    await User.create({ email, password, role: 'HR_MANAGER' }); // `pre('save')` hashes the password
  } catch (error) {
    // Two runs at once: the unique index let one win. The other has nothing left to do.
    if ((error as { code?: number }).code !== 11000) {
      throw error;
    }
  }
}
