import { ApiError } from './client'

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'No hay conexión con el servidor. Revisa la red; se reintentará automáticamente.',
  UNAUTHORIZED: 'Tu sesión expiró. Inicia sesión de nuevo.',
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos.',
  FORBIDDEN_ROLE: 'Tu rol no tiene permiso para esta acción.',
  ORDER_NOT_FOUND: 'La orden ya no existe. Actualiza el tablero.',
  INVALID_STATE_TRANSITION: 'La orden cambió de estado en otra estación. El tablero ya se está actualizando.',
  PAYMENT_ALREADY_IN_PROGRESS: 'Ya hay un pago en curso para esta orden.',
  PAYMENT_VERIFICATION_PENDING: 'El pago está en verificación; espera a que se confirme.',
  INSUFFICIENT_CASH: 'El monto recibido no cubre el total de la orden.',
  PAYMENT_METHOD_NOT_ALLOWED: 'Esta orden no se paga en efectivo.',
  VALIDATION_ERROR: 'Algún dato no es válido. Revisa el formulario.',
  GATEWAY_ERROR: 'La pasarela de pagos no respondió. Intenta de nuevo en unos segundos.',
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? `${error.message} (${error.code})`
  }
  return 'Error inesperado. Recarga la página; si persiste, avisa al supervisor.'
}
