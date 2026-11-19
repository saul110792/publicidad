import { Link } from 'react-router';
import type { ProductCardDTO } from '@publicidad/shared';
import { iconForCategory } from '../../config/categoryIcons';
import { productImage } from '../../config/productImages';
import { price, qty } from '../../lib/format';
import { Icon } from '../ui/Icon';
import styles from './ProductCard.module.css';

type Props = {
  product: ProductCardDTO;
  /** Muestra el botón "Cotizar" (Inicio). En el catálogo toda la tarjeta es el link. */
  showCta?: boolean;
  headingLevel?: 'h2' | 'h3';
};

export function ProductCard({ product: p, showCta = false, headingLevel = 'h3' }: Props) {
  const Heading = headingLevel;
  const href = `/producto/${p.slug}`;
  const img = productImage(p.slug, p.imagen);
  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {img ? (
          <img src={img} alt="" loading="lazy" decoding="async" width={400} height={300} />
        ) : (
          <div className={styles.art} data-cat={p.categoria.slug} aria-hidden="true">
            <Icon name={iconForCategory(p.categoria.slug)} size={44} />
          </div>
        )}
        {p.entregaRapida && <span className={styles.badge}>Entrega rápida</span>}
      </div>
      <div className={styles.body}>
        <p className={styles.cat}>{p.categoria.nombre}</p>
        <Heading className={styles.name}>
          <Link to={href} className={styles.link}>
            {p.nombre}
          </Link>
        </Heading>
        <p className={styles.price}>
          Desde <strong>{price(p.precioDesde)}</strong>
          {p.cantidadMinima != null && (
            <span>
              {' '}
              · {qty(p.cantidadMinima)} {p.unidad}
            </span>
          )}
        </p>
        {showCta && (
          <span className={styles.cta} aria-hidden="true">
            Cotizar <Icon name="arrowRight" size={16} />
          </span>
        )}
      </div>
    </article>
  );
}
