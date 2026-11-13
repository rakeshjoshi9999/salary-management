import { z } from 'zod';

/** What a client may send to register. Anything else in the body is dropped: no mass assignment. */
export const registration = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z
    .string()
    .min(8)
    // bcrypt ignores everything after byte 72, and `.max(72)` would count characters, not bytes.
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Too long: at most 72 bytes',
    }),
});

/** One line per problem, naming the field: what a 400 `detail` and a seed error both show. */
export function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}
