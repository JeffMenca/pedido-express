# Decisiones

## Arquitectura

- **API** modular por contexto (`menu`, `pricing`, `orders`, `payments`, `auth`, `audit`), cada uno en capas `domain` (TS puro) → `application` → `infrastructure` → `http`. La pasarela se accede por un puerto `PaymentGateway`.
- **Dinero** en centavos enteros de punta a punta; los textos se parsean sin aritmética flotante.
- **Concurrencia**: bloqueo pesimista (`SELECT … FOR UPDATE`) sobre la orden en cada transición. Serializa de forma simple webhook, respuesta de la pasarela y timeout.
- **Cliente anónimo**: la orden se consulta por su UUID; evita fricción en kiosko y mostrador.
- **Flutter** con Riverpod (estado asíncrono explícito y fácil de probar). **Panel** con TanStack Query y polling cada 3 s.

## Reglas ambiguas

| Tema | Decisión | Pregunta al negocio |
| --- | --- | --- |
| Base del descuento (RN-07 vs RN-08) | Precio unitario × cantidad, sin modificadores ni domicilio; el upgrade sí descuenta | ¿El upgrade es descontable? |
| Mínimo del cupón | Subtotal de líneas con modificadores, sin domicilio | ¿Los modificadores cuentan? |
| Redondeo | Porcentaje con half-up al centavo; monto fijo topado a la base; total nunca negativo | ¿Truncar a favor del negocio? |
| IVA | Sobre el total final: `base = total / 1.12` (half-up), `iva = total − base` | ¿El domicilio está gravado? |
| Máximo 30 artículos | Suma de cantidades; un combo cuenta como 1 | ¿Un combo cuenta como 3? |
| Cancelación | Permitida en `PENDIENTE_PAGO`, `PAGO_RECHAZADO` y `PAGADA`; no con un cobro en curso | ¿Esperar la conciliación antes de cancelar? |
| Clave duplicada en menú | Gana la primera | ¿P-002 vale Q45.50 o Q47.00? |

## Normalización

Precio texto numérico → se corrige. Precio vacío, nulo, negativo o no numérico, y nombre vacío → se descarta. Clave duplicada → se conserva la primera. Inactivo o no disponible → se carga como no vendible. Combo con principal no vendible → no vendible. Cupones en mayúsculas, sin duplicados. Todo queda en `api/reports/seed-report.json`.

## Pagos

- **Idempotencia** en tres niveles: `Idempotency-Key` del cliente única por orden, índice único que permite un solo intento activo o exitoso por orden, y el id del intento como clave hacia la pasarela.
- **Timeout de 5 s**: la orden pasa a `PAGO_EN_VERIFICACION`, nunca a rechazada. Si el webhook llegó antes, no cambia nada.
- **Conciliación** periódica con `GET /v1/charges?reference=` para intentos sin resolver y reembolsos pendientes.
- **Webhooks**: HMAC-SHA256 sobre el cuerpo crudo, comparación en tiempo constante, ventana de 5 min (401 si falla). Cada evento se registra por id en la misma transacción que el cambio de estado; los duplicados no tienen efecto.
- **Reembolsos** con clave determinista por orden; un resultado incierto queda pendiente y se reintenta. Cancelaciones, reembolsos y cobros en efectivo quedan en la bitácora.

## Seguridad y PCI

Solo se guardan los últimos 4 dígitos y el id del cobro; la tarjeta se redacta en logs. En producción la app tokenizaría con el SDK del procesador y enviaría un token en lugar de la tarjeta (SAQ A), de modo que el PAN nunca pase por nuestros servidores.

## Nube (AWS)

- **API** en ECS Fargate detrás de un ALB con HTTPS y WAF; migraciones como tarea previa al despliegue.
- **Webhooks**: receptor que valida la firma y encola en SQS FIFO; un worker los procesa. DLQ con alarma.
- **Base de datos**: RDS PostgreSQL Multi-AZ, backups con PITR, cifrado y TLS, accesible solo desde la API.
- **Secretos** en Secrets Manager; logs JSON y alarmas en CloudWatch (5xx, órdenes en verificación, DLQ, reembolsos fallidos).
- **Panel** en S3 + CloudFront; **app** en tiendas y web en S3 + CloudFront.
- **Local vs nube**: el perfil `cloud` exige TLS a la base y usa secretos gestionados; local usa Docker Compose.

## Pendientes

- Job de expiración a los 15 min (la transición ya existe).
- Reembolso automático de un cobro exitoso que llega sobre una orden cancelada (hoy se alerta en logs).
- WebSocket/SSE en lugar de polling.
