import styles from './Logo.module.css';

type Props = {
  /** `dark`: sobre fondo azul marino (footer, panel). */
  tone?: 'light' | 'dark';
  className?: string;
};

/** Logotipo en texto: «ventas/medibles», con la diagonal en dorado. */
export function Logo({ tone = 'light', className }: Props) {
  return (
    <span
      className={`${styles.logo} ${tone === 'dark' ? styles.dark : ''} ${className ?? ''}`}
      aria-label="Ventas Medibles"
      role="img"
    >
      <span className={styles.strong} aria-hidden="true">
        ventas
      </span>
      <span className={styles.slash} aria-hidden="true">
        /
      </span>
      <span className={styles.light} aria-hidden="true">
        medibles
      </span>
    </span>
  );
}
