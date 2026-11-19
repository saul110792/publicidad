import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { PackagesPage } from './pages/PackagesPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmPage } from './pages/OrderConfirmPage';
import { MockPaymentPage } from './pages/MockPaymentPage';
import { InfoPage } from './pages/InfoPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminRoute } from './admin/AdminRoute';

export const router = createBrowserRouter([
  {
    path: '/admin/*',
    element: <AdminRoute />,
  },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/productos', element: <CatalogPage /> },
      { path: '/productos/:categoria', element: <CatalogPage /> },
      { path: '/producto/:slug', element: <ProductPage /> },
      { path: '/paquetes', element: <PackagesPage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/pedido/:id', element: <OrderConfirmPage /> },
      { path: '/pago-de-prueba/:folio', element: <MockPaymentPage /> },
      { path: '/faq', element: <InfoPage title="Preguntas frecuentes" /> },
      { path: '/preparar-archivo', element: <InfoPage title="Cómo preparar tu archivo" /> },
      { path: '/tiempos-de-entrega', element: <InfoPage title="Tiempos de entrega" /> },
      { path: '/aviso-de-privacidad', element: <InfoPage title="Aviso de privacidad" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
