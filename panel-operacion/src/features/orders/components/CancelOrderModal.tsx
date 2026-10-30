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
    <Modal open={open} eyebrow={orderCode} title="Cancelar orden" onClose={close}>
      <form onSubmit={submit}>
        <p className="text-sm text-humo">
          {paidByCard
            ? 'Se pedirá el reembolso total a la pasarela.'
            : 'Si ya se recibió efectivo, se registrará la devolución.'}{' '}
          El motivo queda en la bitácora.
        </p>
        <label className="mt-5 block text-sm font-semibold text-ink">
          Motivo
          <textarea
            autoFocus
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Por ejemplo: el cliente se retiró"
            className="mt-1.5 block w-full resize-none rounded-control border border-ink/15 bg-ticket px-3 py-2.5 text-base font-normal text-ink placeholder:text-ink/35 focus:border-ink focus:outline-none"
          />
        </label>
        <p className="mt-1.5 text-xs text-humo">Obligatorio, al menos {MIN_REASON} caracteres.</p>
        {errorText && (
          <p role="alert" className="mt-3 text-sm text-salsa">
            {errorText}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={close}>
            Volver
          </Button>
          <Button type="submit" disabled={!valid} pending={pending}>
            {pending ? 'Cancelando…' : 'Cancelar orden'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
