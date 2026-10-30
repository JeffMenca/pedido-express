import { http } from '../../../shared/http/client'
import type { Menu } from '../../../shared/http/contract'

export function fetchMenu(signal?: AbortSignal): Promise<Menu> {
  return http<Menu>('/menu', { signal })
}
