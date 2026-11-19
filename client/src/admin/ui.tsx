import { useId, useState, type ReactNode } from 'react';
import type { PaymentState } from '@publicidad/shared';
import { parsePesos, toPesosText } from './helpers';
import s from './admin.module.css';

/** Etiqueta + control + ayuda. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (props: { id: string; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': hint ? hintId : undefined })}
      {hint && (
        <small id={hintId} className={s.hint}>
          {hint}
        </small>
      )}
    </div>
  );
}

/**
 * Captura de dinero en pesos. Guarda el texto mientras se escribe y avisa el valor en
 * centavos (o NULL si se deja vacío).
 */
export function MoneyInput({
  value,
  onChange,
  allowNegative = false,
  placeholder = 'Por definir',
  small = false,
  ...rest
}: {
  value: number | null;
  onChange: (centavos: number | null) => void;
  allowNegative?: boolean;
  placeholder?: string;
  small?: boolean;
  id?: string;
  'aria-describedby'?: string;
  'aria-label'?: string;
}) {
  const [text, setText] = useState(toPesosText(value));
  const [bad, setBad] = useState(false);
  return (
    <div className={s.money}>
      <span aria-hidden="true">$</span>
      <input
        {...rest}
        className={`${s.input} ${small ? s.inputSm : ''}`}
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        aria-invalid={bad || undefined}
        onChange={(e) => {
          setText(e.target.value);
          const v = parsePesos(e.target.value);
          const ok = v !== 'invalid' && (allowNegative || v == null || v >= 0);
          setBad(!ok);
          if (ok) onChange(v as number | null);
        }}
      />
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'ok' | 'err' | 'warn'; children: ReactNode }) {
  return (
    <p className={s[kind]} role={kind === 'err' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

const PAGO: Record<PaymentState, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: '' },
  pagado: { label: 'Pagado', cls: 'badgeOk' },
  fallido: { label: 'Fallido', cls: 'badgeBad' },
  reembolsado: { label: 'Reembolsado', cls: 'badgeBad' },
};

export function PagoBadge({ estado }: { estado: PaymentState }) {
  const p = PAGO[estado];
  return <span className={`${s.badge} ${p.cls ? s[p.cls] : ''}`}>{p.label}</span>;
}
