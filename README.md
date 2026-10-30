# Pedido Express

Sistema integral de pedidos y pagos para una cadena de comida rápida.

| Carpeta | Componente | Tecnología |
| --- | --- | --- |
| `api/` | API: menú, cotización, órdenes, pagos, webhooks, auth, auditoría | NestJS 10 · TypeScript (strict) · Node 20 |
| `app-cliente/` | App del cliente: menú, carrito, checkout, seguimiento | Flutter 3.x |
| `panel-operacion/` | Tablero de cocina y caja | React 18 · TypeScript · Vite |
| `pasarela-sim/` | Pasarela de pagos simulada (insumo, no se modifica) | Node.js |
| `datos/` | `menu.json` original (se normaliza en la carga inicial) | JSON |

Documentación: [plan](docs/PLAN.md) · [contrato de la API](docs/API.md) · [normalización](docs/NORMALIZACION.md) · [guía UI/UX](docs/UI-UX.md) · [decisiones](DECISIONES.md)

## Requisitos

- Node 20 (`nvm use`)
- Flutter 3.x
- Docker y Docker Compose

> Pasos de ejecución, usuarios semilla, pruebas y declaración de uso de IA: pendiente.
