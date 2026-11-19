import { useId, type ReactNode } from 'react';
import type { PackageOfferDTO } from '@publicidad/shared';
import { Icon } from '../../components/ui/Icon';
import { price } from '../../lib/format';
import styles from './PackageOffer.module.css';

type Props = {
  offer: PackageOfferDTO;
  eyebrow?: string;
  /** Título; por defecto "Ya llevas N de M piezas del Paquete X". */
  title?: string;
  children: ReactNode;
};

/** Tarjeta oscura de la oferta de paquete: lo que ya lleva, lo que le falta y el precio. */
export function PackageOffer({ offer, eyebrow = 'Ahorra con un paquete', title, children }: Props) {
  const titleId = useId();
  const { paquete, cubiertos, faltantes, totalCubierto } = offer;
  const n = cubiertos.length;
  const m = n + faltantes.length;
  const ahorro =
    paquete.precio != null &&
    paquete.precioSeparado != null &&
    paquete.precioSeparado > paquete.precio
      ? paquete.precioSeparado - paquete.precio
      : null;

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={titleId} className={styles.title}>
        {title ?? `Ya llevas ${n} de ${m} piezas del Paquete ${paquete.nombre}`}
      </h2>

      <ul role="list" className={styles.chips}>
        {cubiertos.map((c) => (
          <li key={`c-${c.lineaId}`} className={`${styles.chip} ${styles.have}`}>
            <Icon name="check" size={16} />
            <span className="visually-hidden">Ya lo llevas: </span>
            {c.etiqueta}
          </li>
        ))}
        {faltantes.map((f, i) => (
          <li key={`f-${i}`} className={styles.chip}>
            <Icon name="plus" size={16} />
            <span className="visually-hidden">Incluido en el paquete: </span>
            {f.etiqueta}
          </li>
        ))}
      </ul>

      <dl className={styles.compare}>
        <div>
          <dt>
            Lo que llevas ({n} {n === 1 ? 'pieza' : 'piezas'})
          </dt>
          <dd>{price(totalCubierto)}</dd>
        </div>
        <div>
          <dt>Las {m} piezas por separado</dt>
          <dd>
            <s>{price(paquete.precioSeparado)}</s>
          </dd>
        </div>
        <div className={styles.pkgRow}>
          <dt>Paquete {paquete.nombre} completo</dt>
          <dd>{price(paquete.precio)}</dd>
        </div>
      </dl>
      {ahorro != null && <p className={styles.saving}>Ahorras {price(ahorro)}</p>}

      <div className={styles.actions}>{children}</div>
    </section>
  );
}
