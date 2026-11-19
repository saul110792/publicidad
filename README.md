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

Requisitos: Node 22+ y PostgreSQL 16+.

```bash
npm install
cp server/.env.example server/.env   # pon tu DATABASE_URL
cp client/.env.example client/.env
npm run db:create -w @publicidad/server    # crea la base si no existe
npm run db:migrate -w @publicidad/server   # aplica migraciones
npm run db:seed -w @publicidad/server      # carga el catálogo inicial
npm run dev
```

- Front: http://localhost:5173
- API: http://localhost:3001/api/health (en desarrollo Vite hace proxy de `/api`)

### Base de datos

| Comando (en `server/`) | Qué hace                                                      |
| ---------------------- | ------------------------------------------------------------- |
| `npm run db:generate`  | Genera una migración nueva a partir de `src/db/schema.ts`     |
| `npm run db:migrate`   | Aplica las migraciones pendientes                             |
| `npm run db:seed`      | Borra y vuelve a cargar el catálogo (se niega si hay pedidos) |
| `npm run db:studio`    | Abre Drizzle Studio para ver y editar datos                   |

Los precios del seed están en `NULL` a propósito: la UI muestra `$[PRECIO]` hasta que el negocio
capture los precios reales. Todo el dinero se guarda en centavos.

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

| Variable (server) | Para qué                      | Si está vacía                            |
| ----------------- | ----------------------------- | ---------------------------------------- |
| `DATABASE_URL`    | PostgreSQL                    | La API no puede consultar la BD          |
| `SHIPPING_COST`   | Envío a domicilio en centavos | El envío sale "Por confirmar"            |
| `CLOUDINARY_URL`  | Subida de archivos de diseño  | El cliente manda su archivo por WhatsApp |

Para Cloudinary: crea una cuenta, copia el "API environment variable" del dashboard
(`cloudinary://API_KEY:API_SECRET@CLOUD_NAME`) y pégalo en `CLOUDINARY_URL`. El navegador sube
el archivo directo a Cloudinary con una firma que genera la API; el secreto nunca llega al front.
Revisa el límite de tamaño de tu plan: el sitio acepta hasta 50 MB, pero el plan gratuito de
Cloudinary puede permitir menos por archivo.

## Avance por fases

- [x] 1. Setup: monorepo, lint, prettier, env, tokens de diseño y layout base
- [x] 2. Catálogo estático (Inicio, Catálogo, Paquetes) con seed en BD
- [x] 3. Cotizador y WhatsApp con `ref_code`
- [x] 4. Carrito, checkout y oferta de paquete
- [ ] 5. Pagos
- [ ] 6. Medición
- [ ] 7. Admin y dashboard
- [ ] 8. Deploy en Render

## Deploy

Se documenta en la Fase 8.

## Cómo se calcula el precio

El cálculo vive solo en el back (`server/src/services/pricing.ts`); el front muestra lo que responde `POST /api/quote`.

1. Cantidad: la opción del grupo `cantidad` o la cantidad mínima del producto.
2. Precio unitario: la escala (`price_tiers`) más alta que no supere la cantidad; si no hay, `precio_base`.
3. Opciones: `por_unidad` suma × cantidad, `fijo` suma una vez y `porcentaje` se aplica al final.
4. Si falta cualquier precio (base u opción elegida), el total es `null` y la UI muestra `$[PRECIO]`.

Cada clic en "Cotizar por WhatsApp" crea un `lead` con un código como `TJ-4F2A`, que va dentro del mensaje.

## Carrito y oferta de paquete

- El carrito vive en `localStorage` y solo guarda slugs, opciones y archivos subidos.
  `POST /api/cart` devuelve nombres, precios y la oferta; `POST /api/orders` vuelve a calcular todo
  antes de guardar.
- **Oferta** (`server/src/services/packageMatch.ts`): cada línea suelta del carrito cubre un componente
  de paquete. Si un paquete queda cubierto en 2 o más componentes, se ofrece el que cubre más; a
  igual cobertura, el más cercano a completarse, luego el recomendado y luego el orden del catálogo.
  No se ofrecen paquetes que ya van en el carrito ni los rechazados con "No, gracias".
- **Cambiar a paquete** reemplaza esas líneas por el paquete. Se conservan las opciones del cliente
  (papel, acabado, diseño, archivo), pero la cantidad y lo que fija el paquete (ej. "Lona 2×1 m") lo
  define el paquete. "Deshacer" regresa el carrito como estaba.
- Si falta algún precio, el pedido se guarda con total `NULL` y la confirmación dice que el precio
  se confirma por WhatsApp. El pago en tienda muestra el 50% de anticipo.
- La confirmación `/pedido/:folio` usa un folio aleatorio (`P-7KQ2MX`) y solo muestra el primer
  nombre del cliente. Si compró piezas sueltas que encajan en un paquete, ofrece completarlo.
