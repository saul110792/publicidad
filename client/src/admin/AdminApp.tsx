import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import type { AdminMeDTO } from '@publicidad/shared';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { site } from '../config/site';
import { adminApi, errorMessage, SESSION_EXPIRED } from './api';
import { Notice } from './ui';
import { styles as s } from './helpers';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { ManualOrder } from './pages/ManualOrder';
import { Products } from './pages/Products';
import { ProductEdit } from './pages/ProductEdit';
import { Packages } from './pages/Packages';
import { PackageEdit } from './pages/PackageEdit';
import { Categories } from './pages/Categories';
import { Services } from './pages/Services';
import { Leads } from './pages/Leads';
import { Remarketing } from './pages/Remarketing';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/leads', label: 'Leads de WhatsApp' },
  { to: '/admin/remarketing', label: 'Remarketing' },
  { to: '/admin/productos', label: 'Productos y precios' },
  { to: '/admin/paquetes', label: 'Paquetes' },
  { to: '/admin/categorias', label: 'Categorías' },
  { to: '/admin/servicios', label: 'Servicios mensuales' },
];

/** Panel de admin. Se carga aparte (lazy) para no pesar en la tienda. */
export default function AdminApp() {
  const [me, setMe] = useState<AdminMeDTO | null | undefined>(undefined);

  useEffect(() => {
    document.title = `Admin · ${site.brand}`;
    // El admin no debe indexarse.
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);

    adminApi.get<AdminMeDTO>('/me').then(setMe, () => setMe(null));
    const onExpired = () => setMe(null);
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED, onExpired);
      meta.remove();
    };
  }, []);

  if (me === undefined) {
    return (
      <div className={s.login} role="status">
        Cargando…
      </div>
    );
  }
  if (!me) return <Login onLogin={setMe} />;
  return <Shell me={me} onLogout={() => setMe(null)} />;
}

function Login({ onLogin }: { onLogin: (me: AdminMeDTO) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    try {
      onLogin(await adminApi.post<AdminMeDTO>('/login', { email, password }));
    } catch (err) {
      setState({ error: errorMessage(err) });
    }
  }

  return (
    <main className={s.login}>
      <form className={s.loginCard} onSubmit={submit}>
        <h1 className={s.h1}>Panel de {site.brand}</h1>
        <div className={s.field}>
          <label htmlFor="admin-email">Correo</label>
          <input
            id="admin-email"
            className={s.input}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={s.field}>
          <label htmlFor="admin-password">Contraseña</label>
          <input
            id="admin-password"
            className={s.input}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {state.error && <Notice kind="err">{state.error}</Notice>}
        <Button type="submit" size="lg" block disabled={state.busy}>
          {state.busy ? 'Entrando…' : 'Entrar'}
        </Button>
        <Link to="/" className={s.muted}>
          Volver a la tienda
        </Link>
      </form>
    </main>
  );
}

function Shell({ me, onLogout }: { me: AdminMeDTO; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Cierra el menú móvil al navegar.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  async function logout() {
    await adminApi.post('/logout', {}).catch(() => {});
    onLogout();
  }

  return (
    <div className={s.shell}>
      <aside className={s.side}>
        <div className={s.brand}>
          <span>
            {site.brand}
            <small>Panel de admin</small>
          </span>
          <button
            type="button"
            className={s.menuBtn}
            aria-expanded={open}
            aria-controls="admin-nav"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} size={24} />
          </button>
        </div>
        <nav id="admin-nav" aria-label="Admin" className={`${s.nav} ${open ? s.navOpen : ''}`}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
          <div className={s.navFoot}>
            <span>{me.email}</span>
            <Link to="/">Ver la tienda</Link>
            <button type="button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </nav>
      </aside>
      <main className={s.main} id="contenido">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="pedidos/nuevo" element={<ManualOrder />} />
          <Route path="pedidos/:folio" element={<OrderDetail />} />
          <Route path="leads" element={<Leads />} />
          <Route path="remarketing" element={<Remarketing />} />
          <Route path="productos" element={<Products />} />
          <Route path="productos/:id" element={<ProductEdit />} />
          <Route path="paquetes" element={<Packages />} />
          <Route path="paquetes/:id" element={<PackageEdit />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="servicios" element={<Services />} />
          <Route path="*" element={<p>Esta sección no existe.</p>} />
        </Routes>
      </main>
    </div>
  );
}
