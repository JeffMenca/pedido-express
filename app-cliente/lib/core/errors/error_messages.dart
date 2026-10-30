const _messages = <String, String>{
  'NETWORK_ERROR': 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  'TIMEOUT': 'El servidor tardó demasiado en responder. Intenta de nuevo; no se duplicará tu pedido.',
  'VALIDATION_ERROR': 'Algunos datos no son válidos. Revisa el formulario.',
  'IDEMPOTENCY_KEY_REQUIRED':
      'No se pudo enviar la solicitud de forma segura. Intenta de nuevo.',
  'IDEMPOTENCY_KEY_REUSED':
      'Esta solicitud ya se envió con otros datos. Vuelve a intentarlo.',
  'ORDER_NOT_FOUND': 'No encontramos el pedido. Verifica el enlace.',
  'INVALID_STATE_TRANSITION':
      'El pedido cambió de estado. Revisa su seguimiento.',
  'PAYMENT_ALREADY_IN_PROGRESS':
      'Ya hay un pago en proceso para este pedido. Te mostramos su estado.',
  'PAYMENT_VERIFICATION_PENDING':
      'Estamos verificando un pago anterior. Te mostramos su estado.',
  'PRODUCT_NOT_FOUND':
      'Un producto de tu carrito ya no existe. Quítalo para continuar.',
  'PRODUCT_UNAVAILABLE':
      'Un producto de tu carrito no está disponible. Quítalo para continuar.',
  'COMBO_NOT_FOUND':
      'Un combo de tu carrito ya no existe. Quítalo para continuar.',
  'COMBO_UNAVAILABLE':
      'Un combo de tu carrito no está disponible. Quítalo para continuar.',
  'UPGRADE_NOT_AVAILABLE': 'Ese combo no se puede agrandar.',
  'MODIFIER_NOT_FOUND': 'Un extra seleccionado ya no existe.',
  'MODIFIER_UNAVAILABLE': 'Un extra seleccionado no está disponible.',
  'MODIFIER_NOT_APPLICABLE': 'Un extra no aplica para ese producto.',
  'QUANTITY_OUT_OF_RANGE': 'La cantidad por producto debe estar entre 1 y 20.',
  'ORDER_ITEM_LIMIT_EXCEEDED':
      'Tu pedido supera el máximo de artículos permitido. Reduce cantidades.',
  'EMPTY_ORDER': 'Tu carrito está vacío. Agrega productos del menú.',
  'COUPON_NOT_FOUND': 'El cupón no existe. Revisa el código.',
  'COUPON_INACTIVE': 'El cupón no está activo.',
  'COUPON_EXPIRED': 'El cupón ya venció.',
  'COUPON_MINIMUM_NOT_MET':
      'Tu pedido no alcanza el monto mínimo para este cupón.',
  'DELIVERY_DATA_REQUIRED':
      'Para entrega a domicilio ingresa dirección y teléfono.',
  'PAYMENT_METHOD_NOT_ALLOWED': 'Ese método de pago no está permitido para este canal. A domicilio solo se paga con tarjeta.',
  'GATEWAY_ERROR':
      'El procesador de pagos no respondió. Intenta de nuevo en unos segundos.',
};

const _fallback = 'Ocurrió un error inesperado. Intenta de nuevo.';

String messageForCode(String code) => _messages[code] ?? _fallback;

const _declineMessages = <String, String>{
  'INSUFFICIENT_FUNDS': 'fondos insuficientes.',
  'RISK_REJECTED': 'el banco lo marcó como riesgoso.',
  'CARD_NOT_SUPPORTED': 'la tarjeta no es aceptada.',
};

String declineMessage(String? declineCode) {
  final reason = _declineMessages[declineCode?.toUpperCase()];
  return reason == null
      ? 'El pago fue rechazado. Intenta con otra tarjeta.'
      : 'El pago fue rechazado: $reason Intenta con otra tarjeta.';
}
