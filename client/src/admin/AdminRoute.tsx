import { lazy, Suspense } from 'react';

// El admin se descarga aparte: no pesa en la tienda.
const AdminApp = lazy(() => import('./AdminApp'));

export function AdminRoute() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
      <AdminApp />
    </Suspense>
  );
}
