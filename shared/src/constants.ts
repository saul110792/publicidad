export const GIROS = [
  { value: 'comida', label: 'Comida' },
  { value: 'belleza', label: 'Belleza' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'salud', label: 'Salud' },
  { value: 'comercio', label: 'Comercio' },
] as const;

export type Giro = (typeof GIROS)[number]['value'];

export const ORDER_STATUSES = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'en_diseno', label: 'En diseño' },
  { value: 'prueba_enviada', label: 'Prueba enviada' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'en_produccion', label: 'En producción' },
  { value: 'listo', label: 'Listo' },
  { value: 'entregado', label: 'Entregado' },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value'];

export const ORIGENES = [
  { value: 'facebook_instagram', label: 'Facebook / Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'recomendacion', label: 'Recomendación' },
  { value: 'qr_impreso', label: 'QR en impreso' },
] as const;

export type Origen = (typeof ORIGENES)[number]['value'];
