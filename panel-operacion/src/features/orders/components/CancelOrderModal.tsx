import { useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'

type Props = {
  open: boolean
  orderCode: string
  paidByCard: boolean
  pending: boolean
  errorText: string | null
  onClose: () => void
  onConfirm: (reason: string) => void
}

const MIN_REASON = 3

export function CancelOrderModal({ open, orderCode, paidByCard, pending, errorText, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('')
  const valid = reason.trim().length >= MIN_REASON

  const close = () => {
    setReason('')
    onClose()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) onConfirm(reason.trim())
  }

  return (
    <Modal open={open} title={`Cancelar orden ${orderCode}`} onClose={close}>
      <form onSubmit={submit}>
        <p className="text-sm text-stone-600">
          {paidByCard
            ? 'Se solicitará el reembolso total a la pasarela.'
            : 'Si ya se recibió efectivo, se registrará la devolución.'}{' '}
          Esta acción queda en la bitácora.
        </p>
        <label className="mt-4 block text-sm font-medium text-stone-700">
          Motivo (obligatorio)
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-red-700 focus:outline-2 focus:outline-red-700/30"
          />
        </label>
        {errorText && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {errorText}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Volver
          </Button>
          <Button type="submit" variant="danger" disabled={!valid} pending={pending}>
            {pending ? 'Cancelando…' : 'Cancelar orden'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
