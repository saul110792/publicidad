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
      <PageViewTracker />
      <TopBar />
      <Header />
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
