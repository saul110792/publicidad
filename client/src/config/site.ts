/**
 * Datos del negocio. Mientras no haya datos reales se muestran placeholders entre corchetes.
 */
const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

export const site = {
  brand: 'Ventas Medibles',
  tagline: 'Crecimiento comercial basado en resultados',
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
  { to: '/#servicios', label: 'Servicios' },
  { to: '/#metodo', label: 'Método' },
  { to: '/diagnostico', label: 'Diagnóstico' },
  { to: '/productos', label: 'Tienda' },
  { to: '/paquetes', label: 'Paquetes' },
  { to: '#contacto', label: 'Contacto' },
];
