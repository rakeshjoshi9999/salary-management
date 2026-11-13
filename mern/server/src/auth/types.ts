export const ROLES = ['HR_MANAGER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

/** Who is calling: set on the request by `authenticate`, read by `authorize` and the handlers. */
export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
