import { Button } from '../components/ui/Button';
import styles from './HomePage.module.css';

const swatches = [
  ['Tinta', '--color-ink', '#16171B'],
  ['Fondo', '--color-bg', '#F5F3EE'],
  ['Superficie', '--color-surface', '#FFFFFF'],
  ['Borde', '--color-border', '#DDD9D0'],
  ['Acento', '--color-accent', '#C8321F'],
  ['Acento hover', '--color-accent-hover', '#A12818'],
  ['Acento suave', '--color-accent-soft', '#F7E3DE'],
  ['Texto 2', '--color-text-2', '#4A4843'],
  ['Rojo sobre oscuro', '--color-accent-on-dark', '#F0A898'],
  ['Éxito', '--color-success-bg', '#E4F1E8'],
] as const;

/**
 * Fase 1: vista previa de los tokens y botones sobre el layout base.
 * En la Fase 2 se reemplaza por el Inicio completo (hero, categorías, paquetes…).
 */
export function HomePage() {
  return (
    <>
      <section className={`container ${styles.hero}`}>
        <p className={styles.eyebrow}>Imprenta + publicidad para negocios</p>
        <h1 className={styles.h1}>Todo lo que tu negocio necesita para que lo vean.</h1>
        <div className={styles.ctas}>
          <Button to="/productos" size="lg">
            Cotizar ahora
          </Button>
          <Button to="/paquetes" size="lg" variant="secondary">
            Ver paquetes por giro
          </Button>
        </div>
        <p className={styles.phase}>
          Vista previa de la Fase 1 (tokens y layout). El Inicio completo llega en la Fase 2.
        </p>
      </section>

      <section className="container" aria-labelledby="tokens-title">
        <h2 id="tokens-title" className={styles.h2}>
          Tokens de color
        </h2>
        <ul role="list" className={styles.swatches}>
          {swatches.map(([name, token, hex]) => (
            <li key={token} className={styles.swatch}>
              <span className={styles.chip} style={{ background: `var(${token})` }} />
              <span className={styles.swatchName}>{name}</span>
              <code className={styles.swatchHex}>{hex}</code>
            </li>
          ))}
        </ul>
      </section>

      <section id="como-funciona" className={`container ${styles.dark}`} aria-label="Botones">
        <h2 className={styles.h2Dark}>Botones sobre fondo oscuro</h2>
        <div className={styles.ctas}>
          <Button to="/paquetes">Elegir paquete</Button>
          <Button href="#contacto" variant="ghost-dark">
            Contacto
          </Button>
        </div>
      </section>
    </>
  );
}
