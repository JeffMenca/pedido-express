import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/lib/queryKeys'
import { fetchOperationsOrders } from '../api/board'
import type { ColumnDef } from './columns'

const POLL_MS = 3000

export function useBoardOrders(columns: ColumnDef[]) {
  const statuses = columns.map((c) => c.status)
  return useQuery({
    queryKey: [...queryKeys.operationsOrders, statuses],
    queryFn: ({ signal }) => fetchOperationsOrders(statuses, signal),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  })
}
