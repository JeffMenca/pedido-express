# Pedido Express

Sistema de pedidos y pagos para una cadena de comida rápida. La API es la única fuente de verdad de precios y estados; la app del cliente y el panel de operación la consumen.

| Carpeta | Descripción | Stack |
| --- | --- | --- |
| `api/` | Menú, cotización, órdenes, pagos, webhooks, auth y auditoría | NestJS 10, TypeScript, PostgreSQL 16 |
| `panel-operacion/` | Tablero de cocina y caja | React 18, Vite, Tailwind |
| `app-cliente/` | App del cliente | Flutter 3, Riverpod |
| `pasarela-sim/` | Pasarela de pagos simulada | Node.js |

Decisiones técnicas: [DECISIONES.md](DECISIONES.md).

## Requisitos

Docker 24+, Node 20 y Flutter 3.x.

## Ejecución

```bash
cp api/.env.example api/.env   # completar las credenciales de la pasarela y JWT_SECRET
docker compose up --build
```

- API: http://localhost:3000/api · Swagger: http://localhost:3000/api/docs
- Panel: http://localhost:5173
- Pasarela: http://localhost:4000

La API aplica migraciones y la carga inicial del menú al arrancar; el reporte de normalización queda en `api/reports/seed-report.json`.

Sin Docker (con `docker compose up -d db pasarela-sim`):

```bash
cd api && npm ci && npm run migration:run && npm run seed && npm run start:dev
cd panel-operacion && npm ci && npm run dev
cd app-cliente && flutter pub get && flutter run -d chrome --dart-define=API_URL=http://localhost:3000/api
```

## Usuarios semilla

| Usuario | Rol |
| --- | --- |
| `cajero` | CAJERO |
| `cocina` | COCINA |
| `supervisor` | SUPERVISOR |

Contraseña: `PedidoExpress2026`.

## Pruebas

```bash
cd api && npm test && npm run test:e2e   # e2e requiere la base levantada
cd panel-operacion && npm test
cd app-cliente && flutter test
```

## Uso de IA

Se utilizó Claude Code como asistente de programación para generación de código, pruebas y documentación.
