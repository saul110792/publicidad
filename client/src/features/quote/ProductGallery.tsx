import { useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { iconForCategory } from '../../config/categoryIcons';
import styles from './ProductGallery.module.css';

type Props = { imagenes: string[]; nombre: string; categoria: string };

const PLACEHOLDER_VIEWS = ['Vista general', 'Detalle', 'En uso', 'Acabado', 'Muestra'];

/** Imagen principal + 4 miniaturas. Sin fotos reales muestra vistas de muestra. */
export function ProductGallery({ imagenes, nombre, categoria }: Props) {
  const [active, setActive] = useState(0);
  const hasPhotos = imagenes.length > 0;
  const views = hasPhotos ? imagenes.slice(0, 5) : PLACEHOLDER_VIEWS;
  const icon = iconForCategory(categoria);

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        {hasPhotos ? (
          <img
            src={imagenes[active]}
            alt={`${nombre}, imagen ${active + 1} de ${views.length}`}
            width={800}
            height={600}
          />
        ) : (
          <div
            className={styles.art}
            data-variant={active}
            role="img"
            aria-label={`${nombre}: imagen de muestra`}
          >
            <Icon name={icon} size={88} />
            <span className={styles.caption}>Imagen de muestra · {views[active]}</span>
          </div>
        )}
      </div>
      <div className={styles.thumbs}>
        {views.map((v, i) => (
          <button
            key={v}
            type="button"
            className={styles.thumb}
            aria-pressed={i === active}
            aria-label={`Ver imagen ${i + 1} de ${views.length}`}
            onClick={() => setActive(i)}
          >
            {hasPhotos ? (
              <img src={v} alt="" loading="lazy" width={120} height={90} />
            ) : (
              <span className={styles.art} data-variant={i} aria-hidden="true">
                <Icon name={icon} size={24} />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
