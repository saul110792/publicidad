import type { PackageDTO } from '@publicidad/shared';
import { giroLabel, price } from '../../lib/format';
import { useNavigate } from 'react-router';
import { cart } from '../../features/cart/cartStore';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import styles from './PackageCard.module.css';

type Props = {
  pkg: PackageDTO;
  tone?: 'light' | 'dark';
  headingLevel?: 'h2' | 'h3';
};

export function PackageCard({ pkg, tone = 'light', headingLevel = 'h3' }: Props) {
  const Heading = headingLevel;
  const navigate = useNavigate();
  const ahorro =
    pkg.precio != null && pkg.precioSeparado != null && pkg.precioSeparado > pkg.precio
      ? pkg.precioSeparado - pkg.precio
      : null;

  return (
    <article
      className={`${styles.card} ${tone === 'dark' ? styles.dark : ''} ${
        pkg.recomendado ? styles.recommended : ''
      }`}
    >
      {pkg.recomendado && <p className={styles.badge}>Recomendado para empezar</p>}
      <p className={styles.giro}>{giroLabel(pkg.giro)}</p>
      <Heading className={styles.name}>Paquete {pkg.nombre}</Heading>
      {pkg.descripcion && <p className={styles.desc}>{pkg.descripcion}</p>}

      <ul role="list" className={styles.items}>
        {pkg.items.map((it) => (
          <li key={it.etiqueta}>
            <Icon name="check" size={18} className={styles.check} />
            {it.etiqueta}
          </li>
        ))}
      </ul>

      <div className={styles.pricing}>
        <p className={styles.separate}>
          Por separado: <s>{price(pkg.precioSeparado)}</s>
        </p>
        <p className={styles.price}>
          <span className="visually-hidden">Precio del paquete: </span>
          {price(pkg.precio)}
        </p>
        {ahorro != null && <p className={styles.saving}>Ahorras {price(ahorro)}</p>}
      </div>

      <Button
        onClick={() => {
          cart.addPackage(pkg.slug);
          navigate('/checkout');
        }}
        variant={tone === 'dark' ? 'primary' : pkg.recomendado ? 'primary' : 'dark'}
        block
      >
        Elegir paquete
      </Button>
    </article>
  );
}
