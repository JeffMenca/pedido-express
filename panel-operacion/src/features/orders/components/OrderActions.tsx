import { useState } from 'react'
import type { OrderSummary, Role } from '../../../shared/http/contract'
import { errorMessage } from '../../../shared/http/errors'
import { Button } from '../../../shared/ui/Button'
import { useCancelOrder, useConfirmCash, useUpdateStatus } from '../hooks/useOrderMutations'
import { CancelOrderModal } from './CancelOrderModal'
import { CashPaymentModal } from './CashPaymentModal'

type Props = { order: OrderSummary; role: Role }

type Dialog = 'cash' | 'cancel' | null

const CANCELLABLE = new Set(['PENDIENTE_PAGO', 'PAGADA'])

export function OrderActions({ order, role }: Props) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const status = useUpdateStatus(order.id)
  const cash = useConfirmCash(order.id)
  const cancel = useCancelOrder(order.id)

  const isCashier = role === 'CAJERO'
  const canCollect = (isCashier || role === 'SUPERVISOR') && order.status === 'PENDIENTE_PAGO' && order.paymentMethod === 'EFECTIVO'
  const canCancel = (isCashier || role === 'SUPERVISOR') && CANCELLABLE.has(order.status)

  let primary: { label: string; pendingLabel: string; run: () => void } | null = null
  if (canCollect) {
    primary = { label: 'Cobrar', pendingLabel: 'Cobrando…', run: () => setDialog('cash') }
  } else if (role === 'COCINA' && order.status === 'PAGADA') {
    primary = { label: 'Iniciar', pendingLabel: 'Iniciando…', run: () => status.mutate('EN_PREPARACION') }
  } else if (role === 'COCINA' && order.status === 'EN_PREPARACION') {
    primary = { label: 'Marcar lista', pendingLabel: 'Guardando…', run: () => status.mutate('LISTA') }
  } else if (isCashier && order.status === 'LISTA') {
    primary = { label: 'Entregar', pendingLabel: 'Entregando…', run: () => status.mutate('ENTREGADA') }
  }

  if (!primary && !canCancel) return null

  const closeDialog = () => {
    cash.reset()
    cancel.reset()
    setDialog(null)
  }

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        {primary && (
          <Button className="flex-1" pending={status.isPending} onClick={primary.run}>
            {status.isPending ? primary.pendingLabel : primary.label}
          </Button>
        )}
        {canCancel && (
          <Button variant="ghost" onClick={() => setDialog('cancel')}>
            Cancelar
          </Button>
        )}
      </div>
      {status.isError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {errorMessage(status.error)}
        </p>
      )}

      {canCollect && (
        <CashPaymentModal
          open={dialog === 'cash'}
          orderCode={order.code}
          totalCents={order.totalCents}
          pending={cash.isPending}
          errorText={cash.isError ? errorMessage(cash.error) : null}
          onClose={closeDialog}
          onConfirm={(receivedCents) => cash.mutate(receivedCents, { onSuccess: closeDialog })}
        />
      )}
      {canCancel && (
        <CancelOrderModal
          open={dialog === 'cancel'}
          orderCode={order.code}
          paidByCard={order.paymentMethod === 'TARJETA' && order.status === 'PAGADA'}
          pending={cancel.isPending}
          errorText={cancel.isError ? errorMessage(cancel.error) : null}
          onClose={closeDialog}
          onConfirm={(reason) => cancel.mutate(reason, { onSuccess: closeDialog })}
        />
      )}
    </>
  )
}
