import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { TopBar } from './TopBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { ScrollManager } from './ScrollManager';
import { PageViewTracker } from './PageViewTracker';

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <ScrollManager />
      <TopBar />
      <Header />
      <main id="contenido" tabIndex={-1}>
        <Suspense
          fallback={
            <div className="container" role="status" style={{ paddingBlock: 'var(--space-16)' }}>
              Cargando…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {/* Al final: sus efectos corren después de los de la página, con el título ya puesto. */}
      <PageViewTracker />
    </>
  );
}
