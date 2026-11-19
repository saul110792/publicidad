import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  GIROS,
  type AdminPackage,
  type AdminPackageItem,
  type AdminProductRow,
} from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { adminApi, errorMessage, useAdmin } from '../api';
import { MoneyInput, Notice } from '../ui';
import { slugify, styles as s } from '../helpers';

const EMPTY: AdminPackage = {
  slug: '',
  nombre: '',
  giro: null,
  descripcion: null,
  precio: null,
  destacado: false,
  recomendado: false,
  activo: true,
  orden: 0,
  items: [],
};

export function PackageEdit() {
  const { id = '' } = useParams();
  const isNew = id === 'nuevo';
  const { data: all, error } = useAdmin<AdminPackage[]>('/packages');
  const { data: prods } = useAdmin<AdminProductRow[]>('/products');

  if (error && !all) return <Notice kind="err">{error}</Notice>;
  if (!all || !prods) return <p className={s.muted}>Cargando…</p>;
  const pkg = isNew ? EMPTY : all.find((p) => String(p.id) === id);
  if (!pkg) return <Notice kind="err">Paquete no encontrado.</Notice>;
  return <Editor key={pkg.id ?? 'nuevo'} initial={pkg} prods={prods} />;
}

let uid = 1;
type Item = AdminPackageItem & { _k: number; defaults: string };

/** opciones_default como texto "clave: opción" por línea, ej. "medida: 2 × 1 m". */
const defaultsToText = (d: Record<string, string>) =>
  Object.entries(d)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
const textToDefaults = (t: string) =>
  Object.fromEntries(
    t
      .split('\n')
      .map((l) => l.split(':'))
      .filter((p) => p.length >= 2 && p[0]!.trim())
      .map(([k, ...v]) => [k!.trim(), v.join(':').trim()]),
  );

function Editor({ initial, prods }: { initial: AdminPackage; prods: AdminProductRow[] }) {
  const navigate = useNavigate();
  const [p, setP] = useState(initial);
  const [items, setItems] = useState<Item[]>(() =>
    initial.items.map((i) => ({ ...i, _k: uid++, defaults: defaultsToText(i.opcionesDefault) })),
  );
  const [msg, setMsg] = useState<{ ok?: string; err?: string; busy?: boolean }>({});
  const set = <K extends keyof AdminPackage>(k: K, v: AdminPackage[K]) =>
    setP((x) => ({ ...x, [k]: v }));
  const setItem = (k: number, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i._k === k ? { ...i, ...patch } : i)));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!items.length || items.some((i) => !i.productId)) {
      setMsg({ err: 'Agrega al menos un componente y elige su producto.' });
      return;
    }
    const body: AdminPackage = {
      ...p,
      items: items.map(({ _k, defaults, ...i }) => ({
        ...i,
        opcionesDefault: textToDefaults(defaults),
      })),
    };
    setMsg({ busy: true });
    try {
      if (p.id) {
        await adminApi.put(`/packages/${p.id}`, body);
        setMsg({ ok: 'Paquete guardado.' });
      } else {
        const res = await adminApi.post<{ id: number }>('/packages', body);
        navigate(`/admin/paquetes/${res.id}`, { replace: true });
      }
    } catch (err) {
      setMsg({ err: errorMessage(err) });
    }
  }

  async function remove() {
    if (!p.id || !window.confirm(`¿Borrar el Paquete ${p.nombre}? No se puede deshacer.`)) return;
    try {
      await adminApi.del(`/packages/${p.id}`);
      navigate('/admin/paquetes');
    } catch (err) {
      setMsg({ err: errorMessage(err) });
    }
  }

  return (
    <>
      <Link to="/admin/paquetes" className={s.back}>
        ← Paquetes
      </Link>
      <h1 className={`${s.h1} ${s.mb}`}>{p.id ? `Paquete ${p.nombre}` : 'Nuevo paquete'}</h1>

      <form className={s.stack} onSubmit={save}>
        <fieldset className={`${s.card} ${s.stack}`}>
          <legend className={s.h2}>Datos</legend>
          <div className={s.grid2}>
            <div className={s.field}>
              <label htmlFor="k-nombre">Nombre (sin "Paquete")</label>
              <input
                id="k-nombre"
                className={s.input}
                required
                value={p.nombre}
                onChange={(e) => {
                  set('nombre', e.target.value);
                  if (!p.id) set('slug', slugify(e.target.value));
                }}
              />
            </div>
            <div className={s.field}>
              <label htmlFor="k-slug">Slug</label>
              <input
                id="k-slug"
                className={s.input}
                required
                value={p.slug}
                onChange={(e) => set('slug', slugify(e.target.value))}
              />
            </div>
            <div className={s.field}>
              <label htmlFor="k-giro">Giro</label>
              <select
                id="k-giro"
                className={s.input}
                value={p.giro ?? ''}
                onChange={(e) => set('giro', e.target.value || null)}
              >
                <option value="">Cualquier negocio</option>
                {GIROS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="k-precio">Precio del paquete</label>
              <MoneyInput id="k-precio" value={p.precio} onChange={(v) => set('precio', v)} />
              <small className={s.hint}>Vacío = "$[PRECIO]" en la tienda.</small>
            </div>
          </div>
          <div className={s.field}>
            <label htmlFor="k-desc">Descripción</label>
            <textarea
              id="k-desc"
              className={s.input}
              rows={2}
              value={p.descripcion ?? ''}
              onChange={(e) => set('descripcion', e.target.value || null)}
            />
          </div>
          <div className={s.row}>
            {(
              [
                ['activo', 'Visible en la tienda'],
                ['destacado', 'Destacado en el inicio'],
                ['recomendado', 'Recomendado para empezar (solo uno)'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className={s.check}>
                <input type="checkbox" checked={p[k]} onChange={(e) => set(k, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={`${s.card} ${s.stack}`}>
          <legend className={s.h2}>Componentes</legend>
          <p className={s.muted}>
            Opciones por defecto: una por línea como "clave: opción", ej. "medida: 2 × 1 m". Si el
            cliente ya llevaba el producto, se conservan sus opciones salvo la cantidad y estas.
          </p>
          {items.map((it) => (
            <div key={it._k} className={s.block}>
              <div className={s.grid3}>
                <div className={s.field}>
                  <label htmlFor={`ki-p-${it._k}`}>Producto</label>
                  <select
                    id={`ki-p-${it._k}`}
                    className={s.input}
                    required
                    value={it.productId || ''}
                    onChange={(e) => setItem(it._k, { productId: Number(e.target.value) })}
                  >
                    <option value="">Elige…</option>
                    {prods.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.field}>
                  <label htmlFor={`ki-e-${it._k}`}>Texto en la tarjeta</label>
                  <input
                    id={`ki-e-${it._k}`}
                    className={s.input}
                    required
                    placeholder="500 tarjetas"
                    value={it.etiqueta}
                    onChange={(e) => setItem(it._k, { etiqueta: e.target.value })}
                  />
                </div>
                <div className={s.field}>
                  <label htmlFor={`ki-c-${it._k}`}>Cantidad</label>
                  <input
                    id={`ki-c-${it._k}`}
                    className={s.input}
                    inputMode="numeric"
                    value={it.cantidad ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setItem(it._k, { cantidad: v ? Number(v) : null });
                    }}
                  />
                </div>
              </div>
              <div className={s.field}>
                <label htmlFor={`ki-d-${it._k}`}>Opciones por defecto</label>
                <textarea
                  id={`ki-d-${it._k}`}
                  className={s.input}
                  rows={2}
                  value={it.defaults}
                  onChange={(e) => setItem(it._k, { defaults: e.target.value })}
                />
              </div>
              <div>
                <button
                  type="button"
                  className={s.textBtn}
                  onClick={() => setItems((l) => l.filter((x) => x._k !== it._k))}
                >
                  Quitar componente
                </button>
              </div>
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              onClick={() =>
                setItems((l) => [
                  ...l,
                  {
                    _k: uid++,
                    productId: 0,
                    etiqueta: '',
                    cantidad: null,
                    opcionesDefault: {},
                    defaults: '',
                  },
                ])
              }
            >
              Agregar componente
            </Button>
          </div>
        </fieldset>

        {msg.ok && <Notice kind="ok">{msg.ok}</Notice>}
        {msg.err && <Notice kind="err">{msg.err}</Notice>}
        <div className={s.row}>
          <Button type="submit" size="lg" disabled={msg.busy}>
            {msg.busy ? 'Guardando…' : 'Guardar paquete'}
          </Button>
          {p.id && (
            <button type="button" className={s.textBtn} onClick={remove}>
              Borrar paquete
            </button>
          )}
        </div>
      </form>
    </>
  );
}
