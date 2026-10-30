export type Role = 'CAJERO' | 'COCINA' | 'SUPERVISOR'
export type Channel = 'MOSTRADOR' | 'KIOSKO' | 'AUTOSERVICIO' | 'DOMICILIO'
export type PaymentMethod = 'TARJETA' | 'EFECTIVO'
export type OrderStatus =
  | 'PENDIENTE_PAGO'
  | 'PAGO_EN_VERIFICACION'
  | 'PAGADA'
  | 'PAGO_RECHAZADO'
  | 'EN_PREPARACION'
  | 'LISTA'
  | 'ENTREGADA'
  | 'CANCELADA'
  | 'EXPIRADA'

export type SessionUser = { id: string; username: string; role: Role }

export type OrderLineSummary = { name: string; quantity: number }

export type OrderSummary = {
  id: string
  code: string
  channel: Channel
  paymentMethod: PaymentMethod
  status: OrderStatus
  totalCents: number
  lines?: OrderLineSummary[]
  createdAt: string
  updatedAt: string
}

export type Order = OrderSummary & {
  refund: { status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'RECORDED'; amountCents: number } | null
}
