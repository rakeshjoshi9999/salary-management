import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(_value: number | null | undefined, _currency: string): string {
    return '';
  }
}
