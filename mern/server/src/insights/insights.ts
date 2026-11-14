import { Employee } from '../employees/employee.model.js';
import { currencyOf, type CountryCode } from '../reference/data.js';
import { divideHalfEven, formatMinor } from './money.js';

interface FacetResult {
  stats: { headcount: number; min: number; max: number; total: number }[];
  middle: { salaryMinor: number }[];
  byJobTitle: { _id: { jobTitle: string; department: string }; headcount: number; total: number }[];
  byDepartment: { _id: string; headcount: number }[];
}

export interface CountryInsights {
  countryCode: CountryCode;
  currency: string;
  salary: {
    headcount: number;
    min: string | null;
    max: string | null;
    average: string | null;
    median: string | null;
  };
  averageByJobTitle: { jobTitle: string; department: string; headcount: number; average: string }[];
  headcountByDepartment: { department: string; headcount: number }[];
}

/**
 * One aggregation, one round trip (ADR-M6). The model's hook prepends `$match: { deletedAt: null }`,
 * which MongoDB merges with the country `$match` into one index scan; the four `$facet` branches then
 * read that one stream. Sums and counts come from MongoDB; division and rounding happen here, exactly.
 */
export async function countryInsights(countryCode: CountryCode): Promise<CountryInsights> {
  const [result] = await Employee.aggregate<FacetResult>([
    { $match: { countryCode } },
    {
      $facet: {
        stats: [
          {
            $group: {
              _id: null,
              headcount: { $count: {} },
              min: { $min: '$salaryMinor' },
              max: { $max: '$salaryMinor' },
              total: { $sum: '$salaryMinor' }, // exact: integers, never $avg (a double)
            },
          },
        ],
        // The median: number every employee in salary order, keep the middle one (odd n) or two (even n).
        middle: [
          {
            $setWindowFields: {
              sortBy: { salaryMinor: 1 },
              output: {
                rank: { $documentNumber: {} },
                total: { $count: {}, window: { documents: ['unbounded', 'unbounded'] } },
              },
            },
          },
          {
            $match: {
              $expr: {
                $in: [
                  '$rank',
                  [
                    { $floor: { $divide: [{ $add: ['$total', 1] }, 2] } },
                    { $add: [{ $floor: { $divide: ['$total', 2] } }, 1] },
                  ],
                ],
              },
            },
          },
          { $project: { _id: 0, salaryMinor: 1 } },
        ],
        byJobTitle: [
          {
            $group: {
              _id: { jobTitle: '$jobTitle', department: '$department' },
              headcount: { $count: {} },
              total: { $sum: '$salaryMinor' },
            },
          },
        ],
        byDepartment: [
          { $group: { _id: '$department', headcount: { $count: {} } } },
          { $sort: { headcount: -1, _id: 1 } },
        ],
      },
    },
  ]);

  const stats = result?.stats[0];
  const salary = stats
    ? {
        headcount: stats.headcount,
        min: formatMinor(stats.min),
        max: formatMinor(stats.max),
        average: formatMinor(divideHalfEven(BigInt(stats.total), BigInt(stats.headcount))),
        median: formatMinor(median(result.middle.map((row) => BigInt(row.salaryMinor)))),
      }
    : { headcount: 0, min: null, max: null, average: null, median: null }; // never divide by zero

  // Rounded first, then sorted on the rounded minor units (what the user sees), ties by title.
  const averageByJobTitle = (result?.byJobTitle ?? [])
    .map((row) => ({
      jobTitle: row._id.jobTitle,
      department: row._id.department,
      headcount: row.headcount,
      averageMinor: divideHalfEven(BigInt(row.total), BigInt(row.headcount)),
    }))
    .sort((a, b) =>
      a.averageMinor === b.averageMinor
        ? codeUnitOrder(a.jobTitle, b.jobTitle)
        : a.averageMinor > b.averageMinor
          ? -1
          : 1,
    )
    .map(({ averageMinor, ...row }) => ({ ...row, average: formatMinor(averageMinor) }));

  return {
    countryCode,
    currency: currencyOf(countryCode),
    salary,
    averageByJobTitle,
    headcountByDepartment: (result?.byDepartment ?? []).map((row) => ({
      department: row._id,
      headcount: row.headcount,
    })),
  };
}

/** Plain code-unit order, the same rule MongoDB's `$sort` uses for the department ties. */
function codeUnitOrder(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The mean of the middle value(s): one row for an odd count, two for an even one. */
function median(middle: bigint[]): bigint {
  return divideHalfEven(
    middle.reduce((sum, value) => sum + value, 0n),
    BigInt(middle.length),
  );
}
