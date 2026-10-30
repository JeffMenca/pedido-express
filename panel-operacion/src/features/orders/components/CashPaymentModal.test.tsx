import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CashPaymentModal } from './CashPaymentModal'

function renderModal(onConfirm = vi.fn()) {
  render(
    <CashPaymentModal
      open
      orderCode="PE-0042"
      totalCents={8750}
      pending={false}
      errorText={null}
      onClose={vi.fn()}
      onConfirm={onConfirm}
    />,
  )
  return { onConfirm, input: screen.getByLabelText(/monto recibido/i), confirm: screen.getByRole('button', { name: /confirmar cobro/i }) }
}

describe('CashPaymentModal', () => {
  it('keeps confirm disabled while the received amount is insufficient', async () => {
    const user = userEvent.setup()
    const { input, confirm, onConfirm } = renderModal()

    expect(confirm).toBeDisabled()
    await user.type(input, '80')
    expect(confirm).toBeDisabled()
    expect(screen.getByText(/faltan/i)).toBeInTheDocument()

    await user.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows live change and confirms with integer cents once covered', async () => {
    const user = userEvent.setup()
    const { input, confirm, onConfirm } = renderModal()

    await user.type(input, '100.00')
    expect(confirm).toBeEnabled()
    expect(await screen.findByTestId('cash-change')).toHaveTextContent(/12\.50/)

    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith(10000)
  })
})
