import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/lib/queryKeys'
import { fetchOperationsOrders } from '../api/board'
import type { ViewDef } from './views'

const POLL_MS = 3000

/** One poll for every view the role can see, so the sidebar counts stay current. */
export function useBoardOrders(views: ViewDef[]) {
  const statuses = views.map((v) => v.status)
  return useQuery({
    queryKey: [...queryKeys.operationsOrders, statuses],
    queryFn: ({ signal }) => fetchOperationsOrders(statuses, signal),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  })
}
