import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Employee,
  EmployeeCreateRequest,
  EmployeeFields,
  EmployeeListQuery,
  EmployeePage,
  EmployeeUpdateRequest,
} from '../core/api.models';
import { apiUrl } from '../core/api-url';

/** Only the contract's query parameters; anything else on the object is never sent. */
const LIST_PARAMS = ['q', 'country', 'department', 'jobTitle', 'sort', 'page', 'size'] as const;

/** Request bodies are strict (ADR-014): send exactly the contract's fields, nothing extra. */
function fieldsOf(body: EmployeeFields): EmployeeFields {
  const { fullName, email, jobTitle, department, countryCode, salary, hireDate } = body;
  return { fullName, email, jobTitle, department, countryCode, salary, hireDate };
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);

  /** Unset parameters are left out, so the API applies its defaults and never sees "undefined". */
  list(query: EmployeeListQuery): Observable<EmployeePage> {
    let params = new HttpParams();
    for (const key of LIST_PARAMS) {
      const value = query[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<EmployeePage>(apiUrl('/employees'), { params });
  }

  get(id: number): Observable<Employee> {
    return this.http.get<Employee>(apiUrl(`/employees/${id}`));
  }

  create(body: EmployeeCreateRequest): Observable<Employee> {
    return this.http.post<Employee>(apiUrl('/employees'), fieldsOf(body));
  }

  update(id: number, body: EmployeeUpdateRequest): Observable<Employee> {
    return this.http.put<Employee>(apiUrl(`/employees/${id}`), {
      ...fieldsOf(body),
      version: body.version,
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(apiUrl(`/employees/${id}`));
  }
}
