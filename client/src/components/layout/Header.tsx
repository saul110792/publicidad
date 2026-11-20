import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { mainNav } from '../../config/site';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Logo } from '../ui/Logo';
import { useCart } from '../../features/cart/cartStore';
import styles from './Header.module.css';

export function Header() {
  const [open, setOpen] = useState(false);
  const cartCount = useCart().lineas.length;
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.logo} onClick={close}>
          <Logo />
        </Link>

        <nav
          id="menu-principal"
          aria-label="Principal"
          className={`${styles.nav} ${open ? styles.navOpen : ''}`}
        >
          <ul role="list" className={styles.navList}>
            {mainNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive && !item.to.includes('#') ? styles.active : ''}`
                  }
                  onClick={close}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className={styles.navCta}>
            <Button to="/diagnostico" block>
              Solicitar diagnóstico
            </Button>
          </div>
        </nav>

        <div className={styles.actions}>
          <Link
            to="/checkout"
            className={styles.cart}
            aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}`}
            onClick={close}
          >
            <Icon name="cart" size={22} />
            {cartCount > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {cartCount}
              </span>
            )}
          </Link>
          <Button to="/diagnostico" className={styles.cta}>
            Solicitar diagnóstico
          </Button>
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
