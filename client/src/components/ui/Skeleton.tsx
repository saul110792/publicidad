import styles from './Skeleton.module.css';

/** Bloques grises mientras carga una lista. Se anuncia una sola vez a lectores de pantalla. */
export function SkeletonGrid({ count, height = 280 }: { count: number; height?: number }) {
  return (
    <div role="status" className={styles.grid}>
      <span className="visually-hidden">Cargando…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.block} style={{ height }} aria-hidden="true" />
      ))}
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <p role="alert" className={styles.error}>
      No pudimos cargar esta sección ({message}). Recarga la página o escríbenos por WhatsApp.
    </p>
  );
}
