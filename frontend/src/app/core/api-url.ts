import { environment } from '../../environments/environment';

/** The versioned API root (`openapi.yaml` servers). */
export const API_ROOT = `${environment.apiBaseUrl}/api/v1`;

export function apiUrl(path: string): string {
  return `${API_ROOT}${path}`;
}
