import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { signedInAs } from '../../test/auth';
import { renderRoutes } from '../../test/render';
import { server } from '../../test/server';
import { AuthRoot } from './AuthProvider';
import { RequireRole } from './RequireRole';

/** No real page needs a role yet (decision M4-9), so the guard is tried on a route table of its own. */
const testRoutes = [
  {
    element: <AuthRoot />,
    children: [
      {
        element: <RequireRole role="HR_MANAGER" />,
        children: [{ path: '/payroll', element: <h1>Payroll</h1> }],
      },
    ],
  },
];

describe('RequireRole', () => {
  it('M4-26. requireRoleAdmitsOnlyThatRole: an HR manager is admitted', async () => {
    server.use(...signedInAs('HR_MANAGER'));

    renderRoutes(testRoutes, '/payroll');

    expect(await screen.findByRole('heading', { name: /payroll/i })).toBeInTheDocument();
  });

  it('M4-26. requireRoleAdmitsOnlyThatRole: a viewer sees "not allowed", never the page', async () => {
    server.use(...signedInAs('VIEWER'));

    renderRoutes(testRoutes, '/payroll');

    expect(await screen.findByRole('heading', { name: /not allowed/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /payroll/i })).not.toBeInTheDocument();
  });
});
