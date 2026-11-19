# [TU MARCA] · Imprenta y publicidad

Sitio para vender publicidad e impresos a negocios pequeños: cotizador en línea, carrito, oferta de paquetes por giro y medición del embudo de venta.

## Stack

| Parte    | Tecnología                                              |
| -------- | ------------------------------------------------------- |
| Front    | React 19 + Vite + React Router, TypeScript, CSS Modules |
| Back     | Node 22 + Express 5, TypeScript, zod                    |
| BD       | PostgreSQL + Drizzle ORM (Fase 2)                       |
| Pagos    | Mercado Pago detrás de `PaymentProvider` (Fase 5)       |
| Medición | GA4 + Meta Pixel detrás de `track()` (Fase 6)           |
| Deploy   | Render: static site + web service + Postgres (Fase 8)   |

## Estructura

```
client/   Front (Vite). Tokens de diseño en src/styles/tokens.css
server/   API Express. Tests en server/tests
shared/   Tipos y constantes compartidos (giros, estados de pedido, formato MXN)
```

## Correr en local

Requisitos: Node 22+.

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

- Front: http://localhost:5173
- API: http://localhost:3001/api/health (en desarrollo Vite hace proxy de `/api`)

## Scripts

| Comando             | Qué hace                                            |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Levanta API y front juntos                          |
| `npm run build`     | Compila front (`client/dist`) y API (`server/dist`) |
| `npm run lint`      | ESLint (incluye reglas de accesibilidad)            |
| `npm run format`    | Prettier                                            |
| `npm run typecheck` | TypeScript en los tres paquetes                     |
| `npm test`          | Tests (Vitest)                                      |

## Variables de entorno

Ver `server/.env.example` y `client/.env.example`. Los archivos `.env` nunca se suben al repositorio.

## Avance por fases

- [x] 1. Setup: monorepo, lint, prettier, env, tokens de diseño y layout base
- [ ] 2. Catálogo estático (Inicio, Catálogo, Paquetes) con seed en BD
- [ ] 3. Cotizador y WhatsApp con `ref_code`
- [ ] 4. Carrito, checkout y oferta de paquete
- [ ] 5. Pagos
- [ ] 6. Medición
- [ ] 7. Admin y dashboard
- [ ] 8. Deploy en Render

## Deploy

Se documenta en la Fase 8.
