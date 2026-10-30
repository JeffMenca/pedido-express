import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { centsToInput, computeChangeCents, formatGTQ, parseAmountToCents } from '../../../shared/lib/money'
import { Button } from '../../../shared/ui/Button'
import { Divider } from '../../../shared/ui/Divider'
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

const BILLS_CENTS = [5_000, 10_000, 20_000]

export function CashPaymentModal({ open, orderCode, totalCents, pending, errorText, onClose, onConfirm }: Props) {
  const [raw, setRaw] = useState('')
  const reduceMotion = useReducedMotion()
  const receivedCents = parseAmountToCents(raw)
  const changeCents = computeChangeCents(totalCents, receivedCents)
  const invalidInput = raw.trim() !== '' && receivedCents === null
  const insufficient = receivedCents !== null && changeCents === null

  const quickAmounts = [
    { label: 'Exacto', cents: totalCents },
    ...BILLS_CENTS.map((cents) => ({ label: `Q${cents / 100}`, cents })),
  ]

  const close = () => {
    setRaw('')
    onClose()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (receivedCents !== null && changeCents !== null) onConfirm(receivedCents)
  }

  return (
    <Modal open={open} eyebrow={orderCode} title="Cobrar en efectivo" onClose={close}>
      <form onSubmit={submit}>
        <p className="text-xs font-semibold text-humo">Total a cobrar</p>
        <p className="mt-1 font-mono text-[40px] leading-none font-bold tabular-nums text-ink">{formatGTQ(totalCents)}</p>

        <label className="mt-6 block text-sm font-semibold text-ink">
          Monto recibido (Q)
          <input
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0.00"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            aria-invalid={invalidInput || insufficient}
            className="mt-1.5 block min-h-12 w-full rounded-control border border-ink/15 bg-ticket px-3 font-mono text-xl font-semibold tabular-nums text-ink placeholder:text-ink/25 focus:border-ink focus:outline-none aria-[invalid=true]:border-salsa"
          />
        </label>

        <div role="group" aria-label="Montos rápidos" className="mt-3 grid grid-cols-4 gap-2">
          {quickAmounts.map((q) => (
            <button
              key={q.label}
              type="button"
              disabled={q.cents < totalCents}
              aria-pressed={receivedCents === q.cents}
              onClick={() => setRaw(centsToInput(q.cents))}
              className={`min-h-11 rounded-control border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:border-ink/5 disabled:text-ink/25 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white ${
                q.label === 'Exacto' ? '' : 'font-mono'
              } border-ink/15 text-ink hover:border-ink/50`}
            >
              {q.label}
            </button>
          ))}
        </div>

        <Divider className="mt-6" />

        <div className="mt-4 flex items-baseline justify-between" aria-live="polite">
          <span className="text-sm font-semibold text-humo">Cambio</span>
          <span className="relative h-9 overflow-hidden font-mono text-[28px] leading-9 font-bold tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={changeCents ?? 'none'}
                data-testid="cash-change"
                className={`block ${changeCents === null ? 'text-ink/25' : 'text-albahaca'}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                {changeCents === null ? '—' : formatGTQ(changeCents)}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        {invalidInput && <p className="mt-2 text-sm text-salsa">Escribe un monto válido, por ejemplo 150 o 150.50.</p>}
        {insufficient && (
          <p className="mt-2 text-sm text-salsa">Faltan {formatGTQ(totalCents - (receivedCents ?? 0))} para cubrir el total.</p>
        )}
        {errorText && (
          <p role="alert" className="mt-2 text-sm text-salsa">
            {errorText}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="quiet" onClick={close}>
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
