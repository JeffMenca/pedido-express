import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { computeChangeCents, formatGTQ, parseAmountToCents } from '../../../shared/lib/money'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'

type Props = {
  open: boolean
  orderCode: string
  totalCents: number
  pending: boolean
  errorText: string | null
  onClose: () => void
  onConfirm: (receivedCents: number) => void
}

export function CashPaymentModal({ open, orderCode, totalCents, pending, errorText, onClose, onConfirm }: Props) {
  const [raw, setRaw] = useState('')
  const reduceMotion = useReducedMotion()
  const receivedCents = parseAmountToCents(raw)
  const changeCents = computeChangeCents(totalCents, receivedCents)
  const invalidInput = raw.trim() !== '' && receivedCents === null
  const insufficient = receivedCents !== null && changeCents === null

  const close = () => {
    setRaw('')
    onClose()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (receivedCents !== null && changeCents !== null) onConfirm(receivedCents)
  }

  return (
    <Modal open={open} title={`Cobrar en efectivo · ${orderCode}`} onClose={close}>
      <form onSubmit={submit}>
        <p className="text-sm text-stone-600">Total a cobrar</p>
        <p className="text-3xl font-semibold tabular-nums text-stone-900">{formatGTQ(totalCents)}</p>

        <label className="mt-5 block text-sm font-medium text-stone-700">
          Monto recibido (Q)
          <input
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0.00"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            aria-invalid={invalidInput || insufficient}
            className="mt-1 block min-h-11 w-full rounded-lg border border-stone-300 px-3 text-lg tabular-nums text-stone-900 focus:border-[#C2410C] focus:outline-2 focus:outline-[#C2410C]/30"
          />
        </label>

        <div className="mt-4 flex items-baseline justify-between border-t border-stone-200 pt-4" aria-live="polite">
          <span className="text-sm text-stone-600">Cambio</span>
          <span className="relative h-8 overflow-hidden text-2xl font-semibold tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={changeCents ?? 'none'}
                data-testid="cash-change"
                className={`block ${changeCents === null ? 'text-stone-400' : 'text-emerald-700'}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {changeCents === null ? '—' : formatGTQ(changeCents)}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        {invalidInput && <p className="mt-2 text-sm text-red-700">Escribe un monto válido, por ejemplo 150 o 150.50.</p>}
        {insufficient && (
          <p className="mt-2 text-sm text-red-700">
            Faltan {formatGTQ(totalCents - (receivedCents ?? 0))} para cubrir el total.
          </p>
        )}
        {errorText && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {errorText}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Volver
          </Button>
          <Button type="submit" disabled={changeCents === null} pending={pending}>
            {pending ? 'Confirmando…' : 'Confirmar cobro'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
