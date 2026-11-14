import { Schema, model } from 'mongoose';

/** Stub until the M5 step 1 implementation: no validators, no indexes, no hooks yet. */
export interface EmployeeFields {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  salaryMinor: number;
  hireDate: Date;
  deletedAt: Date | null;
}

const schema = new Schema<EmployeeFields>({
  fullName: String,
  email: String,
  jobTitle: String,
  department: String,
  countryCode: String,
  salaryMinor: Number,
  hireDate: Date,
  deletedAt: { type: Date, default: null },
});

export const Employee = model<EmployeeFields>('Employee', schema);
