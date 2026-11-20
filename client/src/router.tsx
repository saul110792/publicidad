import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import {
  CatalogPage,
  CheckoutPage,
  DeliveryPage,
  DiagnosisPage,
  FaqPage,
  MockPaymentPage,
  OrderConfirmPage,
  PackagesPage,
  PrepareFilePage,
  PrivacyPage,
} from './pages/lazyPages';
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
      { path: '/diagnostico', element: <DiagnosisPage /> },
      { path: '/faq', element: <FaqPage /> },
      { path: '/preparar-archivo', element: <PrepareFilePage /> },
      { path: '/tiempos-de-entrega', element: <DeliveryPage /> },
      { path: '/aviso-de-privacidad', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
