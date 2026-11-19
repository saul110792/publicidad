import { Link } from 'react-router';
import { categories, site } from '../../config/site';
import { whatsappLink } from '../../lib/whatsapp';
import { Icon } from '../ui/Icon';
import styles from './Footer.module.css';

const helpLinks = [
  { to: '/#como-funciona', label: 'Cómo funciona' },
  { to: '/faq', label: 'Preguntas frecuentes' },
  { to: '/preparar-archivo', label: 'Cómo preparar tu archivo' },
  { to: '/tiempos-de-entrega', label: 'Tiempos de entrega' },
  { to: '/aviso-de-privacidad', label: 'Aviso de privacidad' },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brandCol}>
          <Link to="/" className={styles.logo}>
            <span className={styles.mark} aria-hidden="true" />
            {site.brand}
          </Link>
          <p className={styles.blurb}>
            Impresos, gran formato, promocionales, identidad de marca y servicios digitales para
            negocios que quieren que los vean.
          </p>
        </div>

        <nav aria-labelledby="footer-productos">
          <h2 id="footer-productos" className={styles.heading}>
            Productos
          </h2>
          <ul role="list" className={styles.links}>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link to={`/productos/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
            <li>
              <Link to="/paquetes">Paquetes por giro</Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-ayuda">
          <h2 id="footer-ayuda" className={styles.heading}>
            Ayuda
          </h2>
          <ul role="list" className={styles.links}>
            {helpLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <section id="contacto" aria-labelledby="footer-contacto">
          <h2 id="footer-contacto" className={styles.heading}>
            Contacto
          </h2>
          <ul role="list" className={styles.links}>
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={18} />
                WhatsApp {site.whatsappDisplay}
              </a>
            </li>
            <li>
              <span className={styles.static}>
                <Icon name="mail" size={18} />
                {site.email}
              </span>
            </li>
            <li>
              <span className={styles.static}>
                <Icon name="mapPin" size={18} />
                {site.address}
              </span>
            </li>
            <li>
              <span className={styles.static}>
                <Icon name="clock" size={18} />
                {site.schedule}
              </span>
            </li>
          </ul>
        </section>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>
          © {new Date().getFullYear()} {site.brand}. Precios en MXN.
        </p>
      </div>
    </footer>
  );
}
