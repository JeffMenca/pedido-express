import type { Role } from '../../../shared/http/contract'
import type { IconName } from '../../../shared/ui/Icon'
import type { ViewSlug } from '../hooks/views'

export const ROLE_LABEL: Record<Role, string> = { CAJERO: 'Caja', COCINA: 'Cocina', SUPERVISOR: 'Supervisión' }

export const VIEW_ICON: Record<ViewSlug, IconName> = {
  'por-cobrar': 'cash',
  pagadas: 'receipt',
  'en-cocina': 'flame',
  listas: 'bell',
}
