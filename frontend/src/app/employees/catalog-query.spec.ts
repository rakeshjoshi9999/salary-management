import { REFERENCE } from '../core/testing/fixtures';
import { DEFAULT_QUERY, parseCatalogQuery, toQueryParams } from './catalog-query';

/** UI_DESIGN.md Catalog and ADR-051: every value in a link is checked before it reaches the API. */
describe('parseCatalogQuery', () => {
  it('uses the defaults for an empty query', () => {
    const { query, ignored } = parseCatalogQuery({}, REFERENCE);

    expect(query).toEqual({
      sortField: 'fullName',
      sortDirection: 'asc',
      page: 0,
      size: 20,
    });
    expect(ignored).toEqual([]);
  });

  it('keeps valid search, filters, sort, page and size', () => {
    const { query, ignored } = parseCatalogQuery(
      {
        q: 'asha',
        country: 'IN',
        department: 'Engineering',
        jobTitle: 'QA Engineer',
        sort: 'salary,desc',
        page: '3',
        size: '50',
      },
      REFERENCE,
    );

    expect(query).toEqual({
      q: 'asha',
      country: 'IN',
      department: 'Engineering',
      jobTitle: 'QA Engineer',
      sortField: 'salary',
      sortDirection: 'desc',
      page: 3,
      size: 50,
    });
    expect(ignored).toEqual([]);
  });

  it('drops a country, department or title that is not in the reference data, and reports it', () => {
    const { query, ignored } = parseCatalogQuery(
      { country: 'XX', department: 'Nonsense', jobTitle: 'Wizard' },
      REFERENCE,
    );

    expect(query.country).toBeUndefined();
    expect(query.department).toBeUndefined();
    expect(query.jobTitle).toBeUndefined();
    expect([...ignored].sort()).toEqual(['country', 'department', 'jobTitle']);
  });

  it('turns a size other than 20, 50 or 100 into 20, and reports it', () => {
    for (const size of ['37', '1000', 'abc', '0']) {
      const { query, ignored } = parseCatalogQuery({ size }, REFERENCE);

      expect(query.size).toBe(20);
      expect(ignored).toEqual(['size']);
    }
    expect(parseCatalogQuery({ size: '100' }, REFERENCE).query.size).toBe(100);
  });

  it('drops an unsupported sort, and reports it', () => {
    for (const sort of ['email,asc', 'salary,sideways', 'salary,desc,extra']) {
      const { query, ignored } = parseCatalogQuery({ sort }, REFERENCE);

      expect(query.sortField).toBe('fullName');
      expect(query.sortDirection).toBe('asc');
      expect(ignored).toEqual(['sort']);
    }
    // A direction is optional in the API and defaults to asc.
    expect(parseCatalogQuery({ sort: 'hireDate' }, REFERENCE).query).toMatchObject({
      sortField: 'hireDate',
      sortDirection: 'asc',
    });
  });

  it('drops a one-character q, and reports it', () => {
    const { query, ignored } = parseCatalogQuery({ q: ' a ' }, REFERENCE);

    expect(query.q).toBeUndefined();
    expect(ignored).toEqual(['q']);
    expect(parseCatalogQuery({ q: '  as ' }, REFERENCE).query.q).toBe('as');
  });

  it('turns a negative or non-numeric page into 0, and reports it', () => {
    for (const page of ['-1', 'abc', '1.5']) {
      const { query, ignored } = parseCatalogQuery({ page }, REFERENCE);

      expect(query.page).toBe(0);
      expect(ignored).toEqual(['page']);
    }
  });

  it('ignores unknown parameters, and reports them', () => {
    const { query, ignored } = parseCatalogQuery({ foo: 'bar', country: 'IN' }, REFERENCE);

    expect(query).toEqual({ ...DEFAULT_QUERY, country: 'IN' });
    expect(ignored).toEqual(['foo']);
  });
});

describe('toQueryParams', () => {
  it('writes a query back out without its defaults', () => {
    expect(toQueryParams(DEFAULT_QUERY)).toEqual({});
    expect(
      toQueryParams({
        ...DEFAULT_QUERY,
        q: 'asha',
        country: 'IN',
        sortField: 'salary',
        sortDirection: 'desc',
        page: 2,
        size: 50,
      }),
    ).toEqual({ q: 'asha', country: 'IN', sort: 'salary,desc', page: 2, size: 50 });
  });
});
