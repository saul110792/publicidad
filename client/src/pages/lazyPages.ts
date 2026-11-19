/**
 * Páginas que se descargan al visitarlas. Inicio y Producto (las de entrada desde anuncios y
 * buscadores) van en el bundle principal para que carguen lo más rápido posible.
 */
import { lazy } from 'react';

export const CatalogPage = lazy(() =>
  import('./CatalogPage').then((m) => ({ default: m.CatalogPage })),
);
export const PackagesPage = lazy(() =>
  import('./PackagesPage').then((m) => ({ default: m.PackagesPage })),
);
export const CheckoutPage = lazy(() =>
  import('./CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
export const OrderConfirmPage = lazy(() =>
  import('./OrderConfirmPage').then((m) => ({ default: m.OrderConfirmPage })),
);
export const MockPaymentPage = lazy(() =>
  import('./MockPaymentPage').then((m) => ({ default: m.MockPaymentPage })),
);
export const FaqPage = lazy(() => import('./InfoPages').then((m) => ({ default: m.FaqPage })));
export const PrepareFilePage = lazy(() =>
  import('./InfoPages').then((m) => ({ default: m.PrepareFilePage })),
);
export const DeliveryPage = lazy(() =>
  import('./InfoPages').then((m) => ({ default: m.DeliveryPage })),
);
export const PrivacyPage = lazy(() =>
  import('./InfoPages').then((m) => ({ default: m.PrivacyPage })),
);
