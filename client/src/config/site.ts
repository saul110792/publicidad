/**
 * Datos del negocio. Mientras no haya datos reales se muestran placeholders entre corchetes.
 */
const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

export const site = {
  brand: '[TU MARCA]',
  tagline: 'Imprenta y publicidad para negocios',
  whatsappNumber,
  whatsappDisplay: whatsappNumber || '[TU NÚMERO]',
  deliveryTime: '[TIEMPO DE ENTREGA]',
  coverage: '[ZONA DE COBERTURA]',
  schedule: '[HORARIO]',
  email: '[TU CORREO]',
  address: '[TU DIRECCIÓN]',
};

export const categories = [
  { slug: 'impresos', name: 'Impresos' },
  { slug: 'gran-formato', name: 'Gran formato' },
  { slug: 'promocionales', name: 'Promocionales' },
  { slug: 'identidad-de-marca', name: 'Identidad de marca' },
  { slug: 'digital', name: 'Digital' },
];

export const mainNav = [
  { to: '/productos', label: 'Productos' },
  { to: '/paquetes', label: 'Paquetes' },
  { to: '/#como-funciona', label: 'Cómo funciona' },
  { to: '#contacto', label: 'Contacto' },
];
