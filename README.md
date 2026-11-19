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

| Variable (server)   | Para qué                                                | Si está vacía                                           |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL                                              | La API no puede consultar la BD                         |
| `SHIPPING_COST`     | Envío a domicilio en centavos                           | El envío sale "Por confirmar"                           |
| `CLOUDINARY_URL`    | Subida de archivos de diseño                            | El cliente manda su archivo por WhatsApp                |
| `PAYMENT_PROVIDER`  | `mercadopago` o `mock` (pago simulado, solo desarrollo) | Mercado Pago si hay token                               |
| `MP_ACCESS_TOKEN`   | Cobro con tarjeta (Mercado Pago)                        | El pago con tarjeta se coordina por WhatsApp            |
| `MP_WEBHOOK_SECRET` | Validar la firma de los webhooks                        | Los webhooks se aceptan sin firma (aviso en producción) |
| `API_PUBLIC_URL`    | URL https de la API para recibir webhooks               | Solo se confirma al regresar el cliente                 |

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
- [x] 5. Pagos
- [x] 6. Medición
- [x] 7. Admin y dashboard
- [ ] 8. Deploy en Render

## Deploy en Render (Blueprint)

El repo trae `render.yaml`: **un web service** que sirve la API y el front compilado, y **una base
PostgreSQL**. Front y API en el mismo dominio: sin CORS y con cookies del mismo sitio para el admin.

1. En Render: **New > Blueprint** y elige este repositorio.
2. Render te pide las variables marcadas `sync: false` (WhatsApp, Mercado Pago, Cloudinary, GA4,
   Pixel, envío, admin). Puedes dejarlas vacías y llenarlas después en _Environment_.
3. **Apply**. En cada deploy:
   - build: `npm ci --include=dev && npm run build` (front en `client/dist`, API en `server/dist`);
   - arranque (`npm start`): aplica migraciones, carga el catálogo inicial **solo si la BD está
     vacía** y levanta el servidor en el `PORT` que asigna Render.
4. Si cambias una variable `VITE_*` (WhatsApp, GA4, Pixel), haz **Manual Deploy**: se usan al
   compilar.

Notas:

- **Planes:** el Blueprint usa `free`. El web service gratis se duerme tras ~15 min sin visitas y
  la BD gratis vence a los 30 días. Para producción usa `starter` y `basic-256mb`.
- **URL pública:** se toma de `RENDER_EXTERNAL_URL`. Con dominio propio, pon `CLIENT_URL`.
- **Mercado Pago:** el webhook es
  `https://<tu-servicio>.onrender.com/api/payments/webhook/mercadopago`; regístralo en el panel
  (evento _Pagos_) y copia la clave secreta a `MP_WEBHOOK_SECRET`.
- **BD:** `DATABASE_URL` es la URL interna (sin SSL). Con la externa se activa SSL solo.
- **Probar el build de producción en local:** `npm run build` y luego
  `NODE_ENV=production API_PORT=3100 CLIENT_URL=http://localhost:3100 npm start`.

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

## Pagos

El back solo habla con la interfaz `PaymentProvider` (`server/src/payments/types.ts`). Hoy hay dos
implementaciones: Mercado Pago Checkout Pro (`mercadopago.ts`) y un pago simulado (`mock.ts`).
Para cambiar a Stripe se escribe otra clase con los mismos tres métodos.

1. Si el cliente elige **tarjeta** y el pedido tiene total, al confirmar se crea el checkout y se le
   manda a pagar. Si algún precio está por confirmar, el pedido se guarda y el cobro se coordina por
   WhatsApp.
2. Al regresar a `/pedido/:folio`, el back consulta el pago a Mercado Pago con el `payment_id` (nunca
   confía en lo que diga la URL). El **webhook** (`POST /api/payments/webhook/mercadopago`) hace lo
   mismo y valida la firma `x-signature` con `MP_WEBHOOK_SECRET`.
3. Cada intento se guarda en `payments` (idempotente por proveedor + id). El pedido queda `pagado`
   solo con un pago aprobado por el total completo; un rechazo posterior no lo revierte.
4. Si el pago falla, la confirmación ofrece "Pagar ahora" para reintentar.

Transferencia/SPEI y pago en tienda se registran a mano (el panel de admin llega en la Fase 7).

**Probar en local sin credenciales:** pon `PAYMENT_PROVIDER=mock` en `server/.env`. "Confirmar y
pagar" lleva a `/pago-de-prueba/:folio`, donde apruebas o rechazas el pago. En producción se ignora.

**Probar con Mercado Pago:** usa el access token de prueba y las tarjetas de prueba de su
documentación. En local los webhooks no llegan (no hay URL pública), pero el pago se confirma al
regresar del checkout.

## Medición

Todo el sitio llama a `track(evento, payload)` (`client/src/lib/analytics.ts`), que manda cada
evento a tres lugares:

- **GA4**, si hay `VITE_GA4_ID` (los montos van en pesos, con `currency: 'MXN'`).
- **Meta Pixel**, si hay `VITE_META_PIXEL_ID` (eventos estándar cuando existen: `PageView`,
  `ViewContent`, `AddToCart`, `InitiateCheckout`, `Contact`, `Purchase`; el resto, personalizados).
- **La API** (`POST /api/events` → tabla `events`), que alimenta el embudo del dashboard aunque no
  haya GA4.

Los scripts de GA4 y Pixel se descargan después de que la página cargó, para no afectar el
rendimiento.

| Paso                            | Evento                                                                |
| ------------------------------- | --------------------------------------------------------------------- |
| Cambio de ruta                  | `page_view`                                                           |
| Abre un producto                | `view_item`                                                           |
| Cambia una opción del cotizador | `quote_updated`                                                       |
| Agrega producto o paquete       | `add_to_cart`                                                         |
| Clic en "Cotizar por WhatsApp"  | `click_whatsapp` (con `ref_code`)                                     |
| Abre el checkout                | `begin_checkout`                                                      |
| Se muestra / acepta / rechaza   | `package_offer_shown` / `package_upgrade` / `package_offer_dismissed` |
| Compra                          | `purchase` (con `value`, `items`, `package_upgrade`)                  |

`purchase` se manda una sola vez por folio: con tarjeta, cuando el pago se acredita; con
transferencia o pago en tienda, al crear el pedido.

**UTMs:** al llegar con `utm_source/medium/campaign` se guardan en `localStorage` (gana el último
clic, valen 30 días) y viajan en los leads de WhatsApp, los pedidos y los eventos. El QR de los
impresos apunta a `/?utm_source=qr&utm_campaign=pedido-{folio}`.

Si activas GA4 o el Pixel, menciónalo en el aviso de privacidad.

## Panel de admin (`/admin`)

- **Acceso:** correo y contraseña. El primer admin se crea al arrancar con `ADMIN_EMAIL` y
  `ADMIN_PASSWORD` (si ese correo no existe). Para crear otro o cambiar una contraseña en local:
  `ADMIN_PASSWORD=... npm run admin:password -w @publicidad/server -- correo@ejemplo.com`.
- **Sesión:** cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción, firmada con
  `SESSION_SECRET` (dura 12 horas). Tras 5 intentos fallidos se bloquea 15 minutos. Las peticiones
  que modifican datos revisan además el `Origin`.
- **Dashboard:** ventas, ticket promedio, ventas por canal (UTM) y por "¿cómo nos conociste?",
  embudo por sesiones (producto → cotización → carrito → checkout → compra), conversión a paquete
  (ofertas mostradas vs. aceptadas y clientes que pasaron de compra suelta a paquete), productos de
  entrada que más llevan a paquete y leads de WhatsApp vs. convertidos.
- **Pedidos:** lista con filtros, cambio de estado (nuevo → … → entregado) y de pago (para marcar
  transferencias y pagos en tienda), QR del pedido para el impreso y **venta manual** para lo que se
  cierra por WhatsApp. Al capturar el código del mensaje (ej. `TJ-4F2A`), el lead queda ligado.
- **Catálogo:** productos con precio base, escalas por cantidad y opciones del cotizador con su
  costo (vacío = "por confirmar"); paquetes y sus componentes; categorías y servicios mensuales.
  Al editar opciones se conservan sus ids, así no se rompen los carritos abiertos.
- **Remarketing:** clientes cuyo último pedido fue suelto hace 15 días o más y que nunca compraron
  paquete, con el paquete más parecido y un mensaje de WhatsApp listo. Se descarga en CSV.
