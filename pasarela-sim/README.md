# Pasarela de Pagos Simulada (PPS) — variante PE-A

Servicio que simula a un procesador de tarjetas real. **No lo modifique**: su solución debe integrarse con él tal como está, igual que se integraría con un proveedor externo.

## Ejecución

Requiere Node.js 18 o superior, sin dependencias.

```bash
cd pasarela-sim
node server.js          # escucha en http://localhost:4000
```

O con Docker: `docker build -t pasarela-sim . && docker run -p 4000:4000 pasarela-sim`. Puede (y se espera que) lo incluya en su `docker-compose.yml`.

## Credenciales de la variante

| Variable | Valor |
|---|---|
| API key (header `Authorization: Bearer ...`) | `sk_sim_pe_a_7Rk2Lq9w` |
| Secreto de webhooks | `whsec_pe_a_Xm41vTq8Zp` |

Estos valores pueden sobrescribirse con las variables `SIM_API_KEY`, `SIM_WEBHOOK_SECRET` y `SIM_PORT`. En su repositorio deben llegar a su API por variables de entorno, nunca escritos en el código.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio (sin autenticación). |
| POST | `/v1/charges` | Crea un cobro. Requiere header `Idempotency-Key`. |
| GET | `/v1/charges/{id}` | Consulta un cobro. |
| GET | `/v1/charges?reference={ref}` | Busca cobros por su referencia (útil para conciliar). |
| POST | `/v1/refunds` | Reembolsa total o parcialmente un cobro `SUCCEEDED`. Requiere `Idempotency-Key`. |
| GET | `/v1/events` | Bitácora de webhooks enviados y la respuesta que recibió de su API (sin autenticación; solo para depurar). |

### POST /v1/charges

```json
{
  "amount": 13166,
  "currency": "GTQ",
  "reference": "<id de su orden>",
  "callbackUrl": "http://api:3000/api/webhooks/payments",
  "card": { "number": "4111111111111111", "exp": "12/28", "cvv": "123" }
}
```

`amount` es un **entero en centavos**. Respuestas: `201` con `status` `PROCESSING` (o `SUCCEEDED` si ya terminó), `402` declinada, `400` validación, `401` API key, `409` misma `Idempotency-Key` con un cuerpo distinto o solicitud en curso. Repetir la misma clave con el mismo cuerpo devuelve la respuesta original sin cobrar de nuevo.

Estados de un cobro: `PROCESSING`, `SUCCEEDED`, `FAILED`, `DECLINED`, `PARTIALLY_REFUNDED`, `REFUNDED`.

### POST /v1/refunds

```json
{ "chargeId": "ch_...", "amount": 13166, "callbackUrl": "http://api:3000/api/webhooks/payments" }
```

`callbackUrl` es opcional; si se envía, llega un webhook `refund.succeeded`.

## Webhooks

Se envían por `POST` a `callbackUrl` con estos headers:

- `X-Sim-Timestamp`: segundos Unix.
- `X-Sim-Signature`: `v1=` + HMAC-SHA256 en hexadecimal, con el secreto de webhooks, sobre la cadena `<timestamp>.<cuerpo crudo>`.

Cuerpo:

```json
{ "id": "evt_...", "type": "charge.succeeded", "createdAt": "...",
  "data": { "chargeId": "ch_...", "reference": "...", "amount": 13166, "currency": "GTQ", "status": "SUCCEEDED", "declineCode": null } }
```

Tipos: `charge.succeeded`, `charge.failed`, `refund.succeeded`. Si su API responde distinto de 2xx, la pasarela reintenta hasta 3 veces (2 s, 4 s y 8 s). Se recomienda rechazar timestamps con más de 5 minutos de antigüedad.

## Tarjetas de prueba

Cualquier otra tarjeta se declina con `CARD_NOT_SUPPORTED`. Fecha de vencimiento futura y CVV de 3 dígitos cualesquiera.

| Número | Comportamiento |
|---|---|
| `4111 1111 1111 1111` | Aprobada. Responde 201 PROCESSING y ~1.5 s después envía el webhook charge.succeeded. |
| `4000 0000 0000 0002` | Declinada en línea. Responde 402 DECLINED con declineCode INSUFFICIENT_FUNDS. No envía webhook. |
| `4000 0000 0000 0119` | La respuesta HTTP tarda 15 s. El cobro SÍ se procesa y el webhook charge.succeeded llega antes que la respuesta. |
| `4000 0000 0000 0259` | Aprobada. El webhook charge.succeeded se entrega dos veces con el mismo id de evento. |
| `4000 0000 0000 0341` | Responde 201 PROCESSING y después envía el webhook charge.failed con declineCode RISK_REJECTED. |
| `4000 0000 0000 0077` | Aprobada. Primero llega un webhook con firma inválida; 3 s después llega el mismo evento con firma válida. |
