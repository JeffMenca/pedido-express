# Decisiones

Cada punto dice qué problema había y qué decidí.

## 1. Arquitectura

- **Estructura.** La API (NestJS) es la única que calcula precios y estados; el panel (React) y la app (Flutter) solo muestran lo que responde.
- **Problema:** reglas de negocio mezcladas con la base de datos que no se pueden probar. **Decisión:** cada módulo separa `domain` (reglas puras), `application` (casos de uso), `infrastructure` (base de datos, pasarela) y `http`. La pasarela se usa mediante una interfaz, y las pruebas usan una falsa.
- **Problema:** los decimales fallan (0.1 + 0.2 ≠ 0.3). **Decisión:** todo el dinero son **centavos enteros**; 3 × Q29.90 da exactamente Q89.70.
- **Problema:** un pago llega por tres caminos a la vez (webhook, respuesta y timeout) y se pisan. **Decisión:** bloqueo pesimista de la orden (`SELECT … FOR UPDATE`). Hay poca competencia por orden y las transacciones son cortas; el bloqueo optimista obligaría a reintentar el webhook.
- **Problema:** ¿registro de clientes? **Decisión:** cliente anónimo; su orden se consulta con un UUID imposible de adivinar. Menos fricción en kiosko y mostrador.
- **Estado.** Flutter con Riverpod (carga, error y datos explícitos). Panel con TanStack Query y actualización cada 3 s (se pide 5 s o menos).

## 2. Reglas poco claras

| Qué no estaba claro | Qué decidí | Pregunta para el negocio |
| --- | --- | --- |
| RN-07 descuenta sobre el subtotal; RN-08 excluye los extras con costo | Se descuenta solo precio × cantidad. El agrandado sí, porque es parte del precio del combo | ¿El agrandado se descuenta? |
| ¿Los extras cuentan para el mínimo del cupón? | Sí; el domicilio no | ¿Es lo esperado? |
| Redondeo del descuento | Al centavo más cercano (medio centavo sube). Un cupón fijo nunca supera la compra: el total no es negativo | ¿Redondear hacia abajo? |
| Desglose del IVA (los precios ya lo incluyen) | Sobre el total: base = total ÷ 1.12 e IVA = total − base, así siempre suman exacto | ¿El domicilio lleva IVA? |
| Qué es un "artículo" (límite de 30) | Suma de cantidades; un combo cuenta como 1 | ¿Un combo cuenta como 3? |
| Cuándo cancelar | Antes de preparar y tras un rechazo; **no** con un cobro en verificación, porque el dinero podría estar cobrado | ¿Se acepta esperar la confirmación? |
| P-002 aparece dos veces (Q45.50 y Q47.00) | Gana la primera | ¿Cuál es el precio correcto? |

## 3. Datos sucios del menú

**Problema:** `menu.json` trae precios como texto, vacíos o negativos, nombres vacíos y claves repetidas. **Decisión:** se limpia al cargar (no en pantalla) y cada cambio queda en `api/reports/seed-report.json`.

| Caso | Qué hago | Por qué |
| --- | --- | --- |
| Precio como texto (`"29.90"`) | Se corrige | El valor es claro |
| Precio vacío, nulo, negativo o `"treinta"`; nombre vacío | Se descarta | No se inventa un precio |
| Clave repetida | Gana la primera | Regla simple y predecible |
| Inactivo o no disponible | Se carga, no se vende | La disponibilidad cambia |
| Combo con principal no vendible | No se vende | RN-04 |
| Cupones que solo difieren en mayúsculas | Uno solo, en mayúsculas | RN-06 |

## 4. Pagos con tarjeta

- **Problema:** cobrar dos veces (doble toque, reintento, webhook repetido). **Decisión:** tres defensas: repetir la `Idempotency-Key` devuelve el intento anterior; la base de datos permite **un solo** intento activo o exitoso por orden; y el id del intento es la clave hacia la pasarela.
- **Problema:** la pasarela tarda más de 5 s y no sabemos si cobró. **Decisión:** la orden pasa a `PAGO_EN_VERIFICACION`, nunca a "rechazada", y se resuelve por webhook o consultando la pasarela (`GET /v1/charges?reference=`) cada 10 s. Si el webhook ya había llegado, no se cambia nada.
- **Problema:** la primera respuesta (`PROCESSING`) no es definitiva. **Decisión:** el estado final lo dan solo el webhook o la consulta.
- **Problema:** webhook falso, repetido o viejo. **Decisión:** se verifica la firma (HMAC-SHA256 sobre el cuerpo recibido) y que tenga menos de 5 minutos; si falla, 401. Cada evento se guarda por su id junto con el cambio de estado, así un duplicado no hace nada.
- **Problema:** el cliente reintenta con otra tarjeta y llega tarde el resultado de la anterior. **Decisión:** solo el intento vigente puede cambiar la orden.
- **Problema:** un reembolso sin respuesta, ¿se hizo? **Decisión:** queda pendiente y se reintenta con la misma clave, sin riesgo de duplicarlo; solo un rechazo explícito lo marca como fallido.
- Cobros en efectivo, cancelaciones y reembolsos quedan en la bitácora con usuario, fecha, hora y motivo.

## 5. Seguridad y PCI

**Problema:** guardar o registrar el número de tarjeta es un riesgo legal. **Hoy:** solo se guardan los últimos 4 dígitos y el id del cobro; número y CVV no aparecen en logs ni respuestas. **En producción:** la app enviaría la tarjeta directo al procesador con su SDK y la API recibiría solo un token (`paymentToken` en lugar de `card`), así el número nunca pasa por nuestros servidores (SAQ A).

## 6. Nube (AWS)

| Pieza | Servicio | Por qué |
| --- | --- | --- |
| API | ECS Fargate tras un ALB con HTTPS y WAF | Contenedor sin servidores que mantener; las migraciones corren antes de desplegar |
| Webhooks | Receptor que valida la firma y encola en SQS FIFO; un proceso los aplica | Si la API cae o hay un pico, los eventos esperan sin perderse (cola de errores con alarma) |
| Base de datos | RDS PostgreSQL Multi-AZ | Copias automáticas, restauración a un punto en el tiempo, cifrada y accesible solo desde la API |
| Secretos, logs | Secrets Manager, CloudWatch | Claves fuera del código; alarmas por errores 5xx, órdenes en verificación y reembolsos fallidos |
| Panel y app | S3 + CloudFront; la app en las tiendas | Contenido estático rápido y barato |

**Local vs nube:** local usa Docker Compose y logs legibles; el perfil `cloud` exige conexión cifrada a la base, toma los secretos del gestor y escribe logs en JSON.
