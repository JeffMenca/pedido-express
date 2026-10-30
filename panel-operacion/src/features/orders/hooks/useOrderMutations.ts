import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../shared/lib/queryKeys'
import { cancelOrder, confirmCashPayment, updateOrderStatus, type StaffTransition } from '../api/orders'

function useInvalidateBoard() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.operationsOrders })
}

export function useUpdateStatus(orderId: string) {
  const invalidate = useInvalidateBoard()
  return useMutation({
    mutationFn: (status: StaffTransition) => updateOrderStatus(orderId, status),
    // A 409 means another station moved the order first; refetch either way.
    onSettled: invalidate,
  })
}

export function useConfirmCash(orderId: string) {
  const invalidate = useInvalidateBoard()
  return useMutation({
    mutationFn: (receivedCents: number) => confirmCashPayment(orderId, receivedCents),
    onSettled: invalidate,
  })
}

export function useCancelOrder(orderId: string) {
  const invalidate = useInvalidateBoard()
  return useMutation({
    mutationFn: (reason: string) => cancelOrder(orderId, reason),
    onSettled: invalidate,
  })
}
