import { useState, type ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';
import { iconForCategory } from '../../config/categoryIcons';
import { illustrationFor } from '../../config/productImages';
import styles from './ProductGallery.module.css';

type Props = { imagenes: string[]; nombre: string; categoria: string; slug: string };

/** Vistas de la ilustración cuando aún no hay fotos: general y dos acercamientos. */
const ILLUSTRATION_VIEWS = ['Vista general', 'Detalle', 'Acercamiento'];

/**
 * Imagen principal + miniaturas. Con fotos reales (subidas en el admin) las muestra;
 * si no, usa la ilustración del producto; si tampoco hay, un ícono de la categoría.
 */
export function ProductGallery({ imagenes, nombre, categoria, slug }: Props) {
  const [active, setActive] = useState(0);
  const photos = imagenes.slice(0, 5);
  const illustration = illustrationFor(slug);

  if (photos.length) {
    return (
      <Gallery
        count={photos.length}
        active={active}
        onSelect={setActive}
        main={
          <img
            src={photos[active]}
            alt={`${nombre}, imagen ${active + 1} de ${photos.length}`}
            width={800}
            height={600}
          />
        }
        thumb={(i) => <img src={photos[i]} alt="" loading="lazy" width={120} height={90} />}
      />
    );
  }

  if (illustration) {
    return (
      <Gallery
        count={ILLUSTRATION_VIEWS.length}
        active={active}
        onSelect={setActive}
        main={
          <div className={styles.illus}>
            <img
              src={illustration}
              alt={`${nombre}: ilustración de muestra, ${ILLUSTRATION_VIEWS[active]!.toLowerCase()}`}
              width={800}
              height={600}
              data-view={active}
              fetchPriority="high"
            />
            <span className={styles.caption}>Ilustración de muestra</span>
          </div>
        }
        thumb={(i) => (
          <span className={styles.illus}>
            <img src={illustration} alt="" width={120} height={90} data-view={i} />
          </span>
        )}
      />
    );
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        <div className={styles.art} role="img" aria-label={`${nombre}: imagen de muestra`}>
          <Icon name={iconForCategory(categoria)} size={88} />
        </div>
      </div>
    </div>
  );
}

function Gallery({
  count,
  active,
  onSelect,
  main,
  thumb,
}: {
  count: number;
  active: number;
  onSelect: (i: number) => void;
  main: ReactNode;
  thumb: (i: number) => ReactNode;
}) {
  return (
    <div className={styles.gallery}>
      <div className={styles.main}>{main}</div>
      {count > 1 && (
        <div
          className={styles.thumbs}
          style={{ gridTemplateColumns: `repeat(${Math.max(count, 3)}, 1fr)` }}
        >
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              className={styles.thumb}
              aria-pressed={i === active}
              aria-label={`Ver imagen ${i + 1} de ${count}`}
              onClick={() => onSelect(i)}
            >
              {thumb(i)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
