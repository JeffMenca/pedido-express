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

Docker 24+, Node 20, Flutter 3.x y, para iOS, Xcode con un simulador.

## Ejecución

Desde la raíz del repositorio (`api/.env` se crea solo en la primera ejecución):

| Comando | Qué levanta |
| --- | --- |
| `npm run setup` | Crea `api/.env` e instala dependencias de API, panel y app |
| `npm run backend` | Base de datos, pasarela y API en Docker (migraciones y carga inicial incluidas) |
| `npm run backend:dev` | Base de datos y pasarela en Docker, API local con recarga en caliente |
| `npm run frontend` | Panel de operación en modo desarrollo |
| `npm run mobile:ios` | App cliente en el simulador de iOS (`IOS_SIMULATOR` cambia el dispositivo) |
| `npm run mobile:android` | App cliente en el emulador de Android |
| `npm run stack` | Todo en Docker, incluido el panel |
| `npm run stop` | Detiene los contenedores |

- API: http://localhost:3000/api · Swagger: http://localhost:3000/api/docs
- Panel: http://localhost:5173 · Pasarela: http://localhost:4000
- El reporte de normalización del menú queda en `api/reports/seed-report.json`.

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
