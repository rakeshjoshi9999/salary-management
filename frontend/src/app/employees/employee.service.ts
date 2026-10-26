import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';

import {
  Employee,
  EmployeeCreateRequest,
  EmployeeListQuery,
  EmployeePage,
  EmployeeUpdateRequest,
} from '../core/api.models';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);

  list(_query: EmployeeListQuery): Observable<EmployeePage> {
    void this.http;
    return EMPTY;
  }

  get(_id: number): Observable<Employee> {
    return EMPTY;
  }

  create(_body: EmployeeCreateRequest): Observable<Employee> {
    return EMPTY;
  }

  update(_id: number, _body: EmployeeUpdateRequest): Observable<Employee> {
    return EMPTY;
  }

  delete(_id: number): Observable<void> {
    return EMPTY;
  }
}
