export interface SeedInput {
  email: string;
  password: string;
}

/** Creates the first `HR_MANAGER` unless that email already exists. Safe to run twice. */
export async function seedHrManager(_input: SeedInput): Promise<void> {
  // Not implemented yet.
}
