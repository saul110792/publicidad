import { useId as useStableId, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  DELIVERY_METHODS,
  GIROS,
  ORIGENES,
  PAYMENT_METHODS,
  type AdminPackage,
  type AdminProductRow,
  type DeliveryMethod,
  type ManualOrderRequest,
  type OrderCreatedDTO,
  type PaymentMethod,
  type PaymentState,
} from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { price } from '../../lib/format';
import { adminApi, errorMessage, useAdmin } from '../api';
import { MoneyInput, Notice } from '../ui';
import { PAYMENT_STATES, styles as s } from '../helpers';

type Item = { key: number; ref: string; detalle: string; cantidad: number; total: number | null };

let nextKey = 1;
const newItem = (): Item => ({ key: nextKey++, ref: '', detalle: '', cantidad: 1, total: null });

/** Registra una venta cerrada por WhatsApp; con el código del mensaje se liga al lead. */
export function ManualOrder() {
  const navigate = useNavigate();
  const { data: prods } = useAdmin<AdminProductRow[]>('/products');
  const { data: pkgs } = useAdmin<AdminPackage[]>('/packages');

  const [cliente, setCliente] = useState({ nombre: '', whatsapp: '', correo: '', giro: '' });
  const [items, setItems] = useState<Item[]>([newItem()]);
  const [envio, setEnvio] = useState<number | null>(0);
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('transferencia');
  const [entrega, setEntrega] = useState<DeliveryMethod>('recoger');
  const [estadoPago, setEstadoPago] = useState<PaymentState>('pendiente');
  const [refCode, setRefCode] = useState('');
  const [comoNosConocio, setComo] = useState('');
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});

  const setItem = (key: number, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const total = items.reduce((sum, i) => sum + (i.total ?? 0), 0) + (envio ?? 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (items.some((i) => !i.ref || i.total == null)) {
      setState({ error: 'Cada línea necesita producto o paquete y su total.' });
      return;
    }
    const body: ManualOrderRequest = {
      cliente,
      items: items.map((i) => {
        const [tipo, id] = i.ref.split(':') as ['producto' | 'paquete', string];
        return { tipo, id: Number(id), detalle: i.detalle, cantidad: i.cantidad, total: i.total! };
      }),
      envio: envio ?? 0,
      metodoPago,
      entrega,
      estadoPago,
      refCode: refCode.trim(),
      comoNosConocio,
    };
    setState({ busy: true });
    try {
      const res = await adminApi.post<OrderCreatedDTO>('/orders/manual', body);
      navigate(`/admin/pedidos/${res.folio}`);
    } catch (err) {
      setState({ error: errorMessage(err) });
    }
  }

  return (
    <>
      <Link to="/admin/pedidos" className={s.back}>
        ← Pedidos
      </Link>
      <h1 className={`${s.h1} ${s.mb}`}>Registrar venta de WhatsApp</h1>

      <form className={s.stack} onSubmit={submit}>
        <fieldset className={`${s.card} ${s.stack}`}>
          <legend className={s.h2}>Cliente</legend>
          <div className={s.grid2}>
            <TextField
              label="Nombre"
              required
              value={cliente.nombre}
              onChange={(v) => setCliente({ ...cliente, nombre: v })}
            />
            <TextField
              label="WhatsApp (10 dígitos)"
              required
              type="tel"
              value={cliente.whatsapp}
              onChange={(v) => setCliente({ ...cliente, whatsapp: v })}
            />
            <TextField
              label="Correo (opcional)"
              type="email"
              value={cliente.correo}
              onChange={(v) => setCliente({ ...cliente, correo: v })}
            />
            <div className={s.field}>
              <label htmlFor="m-giro">Giro</label>
              <select
                id="m-giro"
                className={s.input}
                value={cliente.giro}
                onChange={(e) => setCliente({ ...cliente, giro: e.target.value })}
              >
                <option value="">Sin dato</option>
                {GIROS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className={`${s.card} ${s.stack}`}>
          <legend className={s.h2}>Qué compró</legend>
          {items.map((it, idx) => (
            <div key={it.key} className={s.block}>
              <div className={s.grid2}>
                <div className={s.field}>
                  <label htmlFor={`m-ref-${it.key}`}>Producto o paquete</label>
                  <select
                    id={`m-ref-${it.key}`}
                    className={s.input}
                    required
                    value={it.ref}
                    onChange={(e) => setItem(it.key, { ref: e.target.value })}
                  >
                    <option value="">Elige…</option>
                    <optgroup label="Paquetes">
                      {pkgs?.map((p) => (
                        <option key={p.id} value={`paquete:${p.id}`}>
                          Paquete {p.nombre}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Productos">
                      {prods?.map((p) => (
                        <option key={p.id} value={`producto:${p.id}`}>
                          {p.nombre}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <TextField
                  label="Detalle (opcional)"
                  value={it.detalle}
                  placeholder="Ej. couché 300 g, dos caras"
                  onChange={(v) => setItem(it.key, { detalle: v })}
                />
                <TextField
                  label="Cantidad"
                  type="number"
                  required
                  value={String(it.cantidad)}
                  onChange={(v) => setItem(it.key, { cantidad: Math.max(1, Number(v) || 1) })}
                />
                <div className={s.field}>
                  <label htmlFor={`m-total-${it.key}`}>Total de la línea</label>
                  <MoneyInput
                    id={`m-total-${it.key}`}
                    value={it.total}
                    placeholder="0"
                    onChange={(v) => setItem(it.key, { total: v })}
                  />
                </div>
              </div>
              {items.length > 1 && (
                <div>
                  <button
                    type="button"
                    className={s.textBtn}
                    onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                  >
                    Quitar línea {idx + 1}
                  </button>
                </div>
              )}
            </div>
          ))}
          <div>
            <Button variant="secondary" onClick={() => setItems((l) => [...l, newItem()])}>
              Agregar otra línea
            </Button>
          </div>
        </fieldset>

        <fieldset className={`${s.card} ${s.stack}`}>
          <legend className={s.h2}>Pago y entrega</legend>
          <div className={s.grid3}>
            <Select
              label="Método de pago"
              value={metodoPago}
              options={PAYMENT_METHODS}
              onChange={(v) => setMetodoPago(v as PaymentMethod)}
            />
            <Select
              label="Estado del pago"
              value={estadoPago}
              options={PAYMENT_STATES}
              onChange={(v) => setEstadoPago(v as PaymentState)}
            />
            <Select
              label="Entrega"
              value={entrega}
              options={DELIVERY_METHODS}
              onChange={(v) => setEntrega(v as DeliveryMethod)}
            />
            <div className={s.field}>
              <label htmlFor="m-envio">Envío</label>
              <MoneyInput id="m-envio" value={envio} placeholder="0" onChange={setEnvio} />
            </div>
            <TextField
              label="Código del lead (opcional)"
              value={refCode}
              placeholder="TJ-4F2A"
              onChange={(v) => setRefCode(v.toUpperCase())}
            />
            <Select
              label="¿Cómo nos conoció?"
              value={comoNosConocio}
              options={[{ value: '', label: 'Sin dato' }, ...ORIGENES]}
              onChange={setComo}
            />
          </div>
        </fieldset>

        {state.error && <Notice kind="err">{state.error}</Notice>}
        <div className={s.row}>
          <Button type="submit" size="lg" disabled={state.busy}>
            {state.busy ? 'Guardando…' : `Registrar venta · ${price(total)}`}
          </Button>
        </div>
      </form>
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const id = useStableId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={s.input}
        type={type}
        required={required}
        placeholder={placeholder}
        min={type === 'number' ? 1 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const id = useStableId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <select id={id} className={s.input} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
