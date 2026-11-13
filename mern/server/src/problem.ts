import { STATUS_CODES } from 'node:http';

import type { ErrorRequestHandler, RequestHandler } from 'express';

/**
 * RFC 9457 Problem Details (which replaced RFC 7807): the one shape every error response has. `code` is
 * an extension member: a stable, machine-readable name, like Node's own `err.code` ('ENOENT'). Clients
 * branch on it; `detail` is for people and its wording may change.
 */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
}

/** An error the app throws on purpose, with the status, the code and the message to show the client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail);
  }
}

/** The last ordinary middleware: reached only when no route answered. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}.`));
};

/** body-parser tags its errors with a `type`; these are the ones worth naming for a client. */
const BODY_PARSER_ERRORS: Record<string, { code: string; detail: string }> = {
  'entity.parse.failed': { code: 'INVALID_JSON', detail: 'The request body is not valid JSON.' },
  'entity.too.large': { code: 'PAYLOAD_TOO_LARGE', detail: 'The request body is too large.' },
};

interface Described {
  status: number;
  code: string;
  detail: string;
  expected: boolean;
}

function toProblem(err: unknown, instance: string): { problem: Problem; expected: boolean } {
  const { status, code, detail, expected } = describe(err);
  const title = STATUS_CODES[status] ?? 'Error';
  // `about:blank` means "no more than the status says": the honest value until problem types have docs.
  return { problem: { type: 'about:blank', title, status, detail, instance, code }, expected };
}

function describe(err: unknown): Described {
  if (err instanceof HttpError) {
    return { status: err.status, code: err.code, detail: err.detail, expected: true };
  }
  // Errors from Express's own middleware (body-parser and friends) carry a client-error status.
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const { status, type } = err as { status: unknown; type?: unknown };
    if (typeof status === 'number' && status >= 400 && status < 500) {
      const known = typeof type === 'string' ? BODY_PARSER_ERRORS[type] : undefined;
      return {
        status,
        code: known?.code ?? 'BAD_REQUEST',
        detail: known?.detail ?? 'The request could not be processed.',
        expected: true,
      };
    }
  }
  // Anything else is a bug or an outage: say nothing about it to the client.
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    detail: 'Something went wrong on our side.',
    expected: false,
  };
}

/**
 * The single error handler, registered last. Express recognises it by its four parameters. It turns any
 * error into Problem Details and never sends a stack trace; unexpected errors are logged, not shown.
 */
export function createErrorHandler(log: (err: unknown) => void): ErrorRequestHandler {
  return (err, req, res, next) => {
    // Once the response has started, only Express's default handler can safely close the connection.
    if (res.headersSent) {
      next(err);
      return;
    }
    const { problem, expected } = toProblem(err, req.originalUrl);
    if (!expected) {
      log(err);
    }
    res.status(problem.status).type('application/problem+json').json(problem);
  };
}
