import { useId } from 'react';
import type { OptionDTO, OptionGroupDTO } from '@publicidad/shared';
import { PRICE_PLACEHOLDER, price } from '../../lib/format';
import styles from './OptionGroup.module.css';

type Props = {
  group: OptionGroupDTO;
  selectedId: number;
  onSelect: (optionId: number) => void;
};

/** Pista de costo extra junto a la opción: "+$250" o "+$[PRECIO]" si aún no está definido. */
function surcharge(group: OptionGroupDTO, o: OptionDTO): string | null {
  if (o.esDefault) return null;
  if (o.modificador == null) return group.clave === 'diseno' ? `+${PRICE_PLACEHOLDER}` : null;
  if (o.modificador <= 0) return null;
  if (o.tipoModificador === 'porcentaje') return `+${o.modificador}%`;
  return `+${price(o.modificador)}${o.tipoModificador === 'por_unidad' ? ' c/u' : ''}`;
}

export function OptionGroup({ group, selectedId, onSelect }: Props) {
  const labelId = useId();
  return (
    <div className={styles.group} role="group" aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>
        {group.nombre}
      </p>
      <div className={styles.pills}>
        {group.opciones.map((o) => {
          const extra = surcharge(group, o);
          return (
            <button
              key={o.id}
              type="button"
              className={styles.pill}
              aria-pressed={o.id === selectedId}
              onClick={() => onSelect(o.id)}
            >
              {o.label}
              {extra && <span className={styles.extra}> ({extra})</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
