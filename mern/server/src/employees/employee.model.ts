import { Schema, model, type Query } from 'mongoose';

import { COUNTRY_CODES, DEPARTMENT_NAMES, isTitleInDepartment } from '../reference/data.js';

export interface EmployeeFields {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  /** Annual gross salary in minor units of the country's currency (cents, paise): exact integers (ADR-M6). */
  salaryMinor: number;
  hireDate: Date;
  /** Soft delete: set instead of removing the document; every query hides it (hooks below). */
  deletedAt: Date | null;
}

const schema = new Schema<EmployeeFields>(
  {
    fullName: { type: String, required: true, trim: true },
    // No `unique: true` here: uniqueness holds among active employees only, so it is the partial index below.
    email: { type: String, required: true, lowercase: true, trim: true },
    countryCode: { type: String, required: true, enum: COUNTRY_CODES },
    department: { type: String, required: true, enum: DEPARTMENT_NAMES },
    jobTitle: {
      type: String,
      required: true,
      validate: {
        // A `function`, not an arrow, so `this` is bound. It is the document on save() and validate()
        // only; in update validators it is the Query. Employee updates must therefore load, assign and
        // save() (the Catalog slice), never runValidators on findOneAndUpdate.
        validator: function (this: unknown, value: string) {
          return isTitleInDepartment(value, (this as EmployeeFields).department);
        },
        message: 'The job title does not belong to the department.',
      },
    },
    salaryMinor: {
      type: Number,
      required: true, // custom validators skip undefined; `required` is what catches a missing salary
      validate: {
        validator: (value: number) => Number.isInteger(value) && value > 0,
        message: 'The salary must be a positive whole number of minor units.',
      },
    },
    hireDate: { type: Date, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Unique among active employees only, so a re-hire can reuse an email. MongoDB uses this index only
// for queries that include `deletedAt: null` (a partial index must cover every possible match).
schema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
// The insights query: one country's active employees, sorted by salary for the median.
schema.index({ countryCode: 1, salaryMinor: 1 });

/** Adds `deletedAt: null` unless the caller asked about `deletedAt` itself. */
function hideDeleted(this: Query<unknown, EmployeeFields>) {
  if (this.getFilter()['deletedAt'] === undefined) {
    this.where({ deletedAt: null });
  }
}

// Query middleware: the soft-delete filter nobody can forget. `/^find/` covers find, findOne, findById
// and the findOneAnd* family; countDocuments needs its own; aggregate() is not a query at all.
schema.pre(/^find/, hideDeleted);
schema.pre('countDocuments', hideDeleted);
schema.pre('aggregate', function () {
  // Prepended, not appended: later stages ($group, $facet) must never see a deleted employee.
  this.pipeline().unshift({ $match: { deletedAt: null } });
});

export const Employee = model<EmployeeFields>('Employee', schema);
