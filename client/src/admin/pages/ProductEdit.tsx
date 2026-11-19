import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  GIROS,
  type AdminCategory,
  type AdminOption,
  type AdminOptionGroup,
  type AdminProduct,
  type ModifierType,
} from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { adminApi, errorMessage, useAdmin } from '../api';
import { MoneyInput, Notice } from '../ui';
import { slugify, styles as s } from '../helpers';

const EMPTY: AdminProduct = {
  slug: '',
  categoryId: 0,
  nombre: '',
  descripcion: null,
  imagenes: [],
  precioBase: null,
  unidad: 'pzas',
  cantidadMinima: null,
  tiempoEntregaDias: null,
  entregaRapida: false,
  incluyeDiseno: false,
  activo: true,
  giros: [],
  popularidad: 0,
  refPrefijo: null,
  grupos: [],
  tiers: [],
};

const MOD_TYPES: { value: ModifierType; label: string }[] = [
  { value: 'fijo', label: 'Fijo (una vez)' },
  { value: 'por_unidad', label: 'Por pieza' },
  { value: 'porcentaje', label: 'Porcentaje' },
];

export function ProductEdit() {
  const { id = '' } = useParams();
  const isNew = id === 'nuevo';
  const { data, error } = useAdmin<AdminProduct>(isNew ? null : `/products/${id}`);
  const { data: cats } = useAdmin<AdminCategory[]>('/categories');

  if (error && !data) return <Notice kind="err">{error}</Notice>;
  if ((!isNew && !data) || !cats) return <p className={s.muted}>Cargando…</p>;
  return (
    <Editor
      key={data?.id ?? 'nuevo'}
      initial={isNew ? { ...EMPTY, categoryId: cats[0]?.id ?? 0 } : data!}
      cats={cats}
    />
  );
}

/** Llave estable para listas que se editan en el navegador. */
let uid = 1;
type Keyed<T> = T & { _k: number };
const keyed = <T,>(x: T): Keyed<T> => ({ ...x, _k: uid++ });

type GroupState = Keyed<Omit<AdminOptionGroup, 'opciones'> & { opciones: Keyed<AdminOption>[] }>;

function Editor({ initial, cats }: { initial: AdminProduct; cats: AdminCategory[] }) {
  const navigate = useNavigate();
  const [p, setP] = useState(initial);
  const [grupos, setGrupos] = useState<GroupState[]>(() =>
    initial.grupos.map((g) => keyed({ ...g, opciones: g.opciones.map(keyed) })),
  );
  const [tiers, setTiers] = useState(() => initial.tiers.map(keyed));
  const [imagenes, setImagenes] = useState(initial.imagenes.join('\n'));
  const [msg, setMsg] = useState<{ ok?: string; err?: string; busy?: boolean }>({});

  const set = <K extends keyof AdminProduct>(k: K, v: AdminProduct[K]) =>
    setP((x) => ({ ...x, [k]: v }));
  const setGroup = (k: number, patch: Partial<GroupState>) =>
    setGrupos((gs) => gs.map((g) => (g._k === k ? { ...g, ...patch } : g)));
  const setOpt = (gk: number, ok: number, patch: Partial<AdminOption>) =>
    setGrupos((gs) =>
      gs.map((g) =>
        g._k === gk
          ? { ...g, opciones: g.opciones.map((o) => (o._k === ok ? { ...o, ...patch } : o)) }
          : g,
      ),
    );

  async function save(e: FormEvent) {
    e.preventDefault();
    const body: AdminProduct = {
      ...p,
      imagenes: imagenes
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean),
      grupos: grupos.map(({ _k, opciones, ...g }) => ({
        ...g,
        opciones: opciones.map(({ _k: _o, ...o }) => o),
      })),
      tiers: tiers.map(({ _k, ...t }) => t),
    };
    setMsg({ busy: true });
    try {
      if (p.id) {
        await adminApi.put(`/products/${p.id}`, body);
        setMsg({ ok: 'Producto guardado. La tienda ya muestra los cambios.' });
      } else {
        const res = await adminApi.post<{ id: number }>('/products', body);
        navigate(`/admin/productos/${res.id}`, { replace: true });
      }
    } catch (err) {
      setMsg({ err: errorMessage(err) });
    }
  }

  async function remove() {
    if (!p.id || !window.confirm(`¿Borrar "${p.nombre}"? No se puede deshacer.`)) return;
    try {
      await adminApi.del(`/products/${p.id}`);
      navigate('/admin/productos');
    } catch (err) {
      setMsg({ err: errorMessage(err) });
    }
  }

  return (
    <>
      <Link to="/admin/productos" className={s.back}>
        ← Productos
      </Link>
      <div className={s.head}>
        <h1 className={s.h1}>{p.id ? p.nombre : 'Nuevo producto'}</h1>
        {p.id && p.activo && (
          <Button to={`/producto/${p.slug}`} variant="secondary">
            Ver en la tienda
          </Button>
        )}
      </div>

      <form className={s.stack} onSubmit={save}>
        <fieldset className={`${s.card} ${s.stack}`}>
          <legend className={s.h2}>Datos</legend>
          <div className={s.grid2}>
            <Input
              label="Nombre"
              required
              value={p.nombre}
              onChange={(v) => {
                set('nombre', v);
                if (!p.id) set('slug', slugify(v));
              }}
            />
            <Input
              label="Slug (URL)"
              required
              hint="Cambiarlo rompe los enlaces que ya compartiste."
              value={p.slug}
              onChange={(v) => set('slug', slugify(v))}
            />
            <div className={s.field}>
              <label htmlFor="p-cat">Categoría</label>
              <select
                id="p-cat"
                className={s.input}
                value={p.categoryId}
                onChange={(e) => set('categoryId', Number(e.target.value))}
              >
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Unidad"
              hint="pzas, m², servicio…"
              required
              value={p.unidad}
              onChange={(v) => set('unidad', v)}
            />
          </div>
          <div className={s.field}>
            <label htmlFor="p-desc">Descripción</label>
            <textarea
              id="p-desc"
              className={s.input}
              rows={3}
              value={p.descripcion ?? ''}
              onChange={(e) => set('descripcion', e.target.value || null)}
            />
          </div>
          <div className={s.field}>
            <label htmlFor="p-img">Imágenes (una URL por línea)</label>
            <textarea
              id="p-img"
              className={s.input}
              rows={2}
              placeholder="https://res.cloudinary.com/…"
              value={imagenes}
              onChange={(e) => setImagenes(e.target.value)}
            />
          </div>
          <div className={s.row}>
            <Check
              label="Visible en la tienda"
              checked={p.activo}
              onChange={(v) => set('activo', v)}
            />
            <Check
              label="Entrega rápida"
              checked={p.entregaRapida}
              onChange={(v) => set('entregaRapida', v)}
            />
            <Check
              label="Incluye diseño"
              checked={p.incluyeDiseno}
              onChange={(v) => set('incluyeDiseno', v)}
            />
          </div>
          <fieldset>
            <legend className={s.field}>Giros (vacío = aplica a todos)</legend>
            <div className={s.row}>
              {GIROS.map((g) => (
                <Check
                  key={g.value}
                  label={g.label}
                  checked={p.giros.includes(g.value)}
                  onChange={(v) =>
                    set('giros', v ? [...p.giros, g.value] : p.giros.filter((x) => x !== g.value))
                  }
                />
              ))}
            </div>
          </fieldset>
          <div className={s.grid3}>
            <NumberInput
              label="Días de entrega"
              value={p.tiempoEntregaDias}
              onChange={(v) => set('tiempoEntregaDias', v)}
            />
            <NumberInput
              label="Popularidad"
              hint="Más alto = sale primero en 'Más pedidos'."
              value={p.popularidad}
              onChange={(v) => set('popularidad', v ?? 0)}
            />
            <Input
              label="Prefijo del código de WhatsApp"
              hint="2 letras, ej. TJ → TJ-4F2A"
              value={p.refPrefijo ?? ''}
              onChange={(v) => set('refPrefijo', v.toUpperCase().slice(0, 2) || null)}
            />
          </div>
        </fieldset>

        <fieldset className={`${s.card} ${s.stack}`}>
          <legend className={s.h2}>Precio</legend>
          <div className={s.grid3}>
            <div className={s.field}>
              <label htmlFor="p-base">
                Precio base por {p.unidad === 'pzas' ? 'pieza' : p.unidad}
              </label>
              <MoneyInput id="p-base" value={p.precioBase} onChange={(v) => set('precioBase', v)} />
              <small className={s.hint}>Vacío = la tienda muestra "$[PRECIO]".</small>
            </div>
            <NumberInput
              label="Pedido mínimo"
              hint="Se usa si el producto no tiene grupo 'cantidad'."
              value={p.cantidadMinima}
              onChange={(v) => set('cantidadMinima', v)}
            />
          </div>

          <div className={s.block}>
            <p className={s.field}>Escalas por cantidad (precio por pieza desde X piezas)</p>
            {tiers.map((t) => (
              <div key={t._k} className={s.row}>
                <NumberInput
                  label="Desde (piezas)"
                  value={t.cantidad}
                  onChange={(v) =>
                    setTiers((ts) =>
                      ts.map((x) => (x._k === t._k ? { ...x, cantidad: v ?? 1 } : x)),
                    )
                  }
                />
                <div className={s.field}>
                  <label htmlFor={`t-${t._k}`}>Precio por pieza</label>
                  <MoneyInput
                    id={`t-${t._k}`}
                    value={t.precioUnitario}
                    placeholder="0"
                    onChange={(v) =>
                      setTiers((ts) =>
                        ts.map((x) => (x._k === t._k ? { ...x, precioUnitario: v ?? 0 } : x)),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  className={s.textBtn}
                  onClick={() => setTiers((ts) => ts.filter((x) => x._k !== t._k))}
                >
                  Quitar
                </button>
              </div>
            ))}
            <div>
              <Button
                variant="secondary"
                onClick={() =>
                  setTiers((ts) => [...ts, keyed({ cantidad: 500, precioUnitario: 0 })])
                }
              >
                Agregar escala
              </Button>
            </div>
          </div>
        </fieldset>

        <fieldset className={`${s.card} ${s.stack}`}>
          <legend className={s.h2}>Opciones del cotizador</legend>
          <p className={s.muted}>
            Costo vacío = "por confirmar" (la cotización no da total). La primera opción marcada
            como "por defecto" es la que aparece elegida. En el grupo con clave "cantidad", cada
            opción indica cuántas piezas son.
          </p>
          {grupos.map((g) => (
            <div key={g._k} className={s.block}>
              <div className={s.grid3}>
                <Input
                  label="Nombre del grupo"
                  required
                  value={g.nombre}
                  onChange={(v) => setGroup(g._k, { nombre: v })}
                />
                <Input
                  label="Clave"
                  required
                  hint="cantidad, material, acabado, caras, diseno…"
                  value={g.clave}
                  onChange={(v) =>
                    setGroup(g._k, { clave: v.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                  }
                />
              </div>
              {g.opciones.map((o) => (
                <div key={o._k} className={s.optRow}>
                  <Input
                    label="Opción"
                    required
                    small
                    value={o.label}
                    onChange={(v) => setOpt(g._k, o._k, { label: v })}
                  />
                  <div className={s.field}>
                    <label htmlFor={`o-${o._k}`}>
                      {o.tipoModificador === 'porcentaje' ? 'Porcentaje (+/-)' : 'Costo extra'}
                    </label>
                    {o.tipoModificador === 'porcentaje' ? (
                      <input
                        id={`o-${o._k}`}
                        className={`${s.input} ${s.inputSm}`}
                        inputMode="numeric"
                        placeholder="Por definir"
                        value={o.modificador ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          if (v === '') setOpt(g._k, o._k, { modificador: null });
                          else if (/^-?\d{1,3}$/.test(v))
                            setOpt(g._k, o._k, { modificador: Number(v) });
                        }}
                      />
                    ) : (
                      <MoneyInput
                        id={`o-${o._k}`}
                        small
                        allowNegative
                        value={o.modificador}
                        onChange={(v) => setOpt(g._k, o._k, { modificador: v })}
                      />
                    )}
                  </div>
                  <div className={s.field}>
                    <label htmlFor={`ot-${o._k}`}>Tipo</label>
                    <select
                      id={`ot-${o._k}`}
                      className={`${s.input} ${s.inputSm}`}
                      value={o.tipoModificador}
                      onChange={(e) =>
                        setOpt(g._k, o._k, { tipoModificador: e.target.value as ModifierType })
                      }
                    >
                      {MOD_TYPES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {g.clave === 'cantidad' ? (
                    <NumberInput
                      label="Piezas"
                      small
                      value={o.valorCantidad}
                      onChange={(v) => setOpt(g._k, o._k, { valorCantidad: v })}
                    />
                  ) : (
                    <span />
                  )}
                  <label className={s.check}>
                    <input
                      type="radio"
                      name={`def-${g._k}`}
                      checked={o.esDefault}
                      onChange={() =>
                        setGroup(g._k, {
                          opciones: g.opciones.map((x) => ({ ...x, esDefault: x._k === o._k })),
                        })
                      }
                    />
                    Por defecto
                  </label>
                  <button
                    type="button"
                    className={s.textBtn}
                    disabled={g.opciones.length <= 1}
                    onClick={() =>
                      setGroup(g._k, { opciones: g.opciones.filter((x) => x._k !== o._k) })
                    }
                    aria-label={`Quitar opción ${o.label}`}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <div className={s.row}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setGroup(g._k, {
                      opciones: [
                        ...g.opciones,
                        keyed<AdminOption>({
                          label: '',
                          modificador: null,
                          tipoModificador: 'fijo',
                          valorCantidad: null,
                          esDefault: false,
                        }),
                      ],
                    })
                  }
                >
                  Agregar opción
                </Button>
                <button
                  type="button"
                  className={s.textBtn}
                  onClick={() => setGrupos((gs) => gs.filter((x) => x._k !== g._k))}
                >
                  Quitar grupo "{g.nombre || 'sin nombre'}"
                </button>
              </div>
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              onClick={() =>
                setGrupos((gs) => [
                  ...gs,
                  keyed({
                    nombre: '',
                    clave: '',
                    opciones: [
                      keyed<AdminOption>({
                        label: '',
                        modificador: 0,
                        tipoModificador: 'fijo',
                        valorCantidad: null,
                        esDefault: true,
                      }),
                    ],
                  }),
                ])
              }
            >
              Agregar grupo de opciones
            </Button>
          </div>
        </fieldset>

        {msg.ok && <Notice kind="ok">{msg.ok}</Notice>}
        {msg.err && <Notice kind="err">{msg.err}</Notice>}
        <div className={s.row}>
          <Button type="submit" size="lg" disabled={msg.busy}>
            {msg.busy ? 'Guardando…' : 'Guardar producto'}
          </Button>
          {p.id && (
            <button type="button" className={s.textBtn} onClick={remove}>
              Borrar producto
            </button>
          )}
        </div>
      </form>
    </>
  );
}

// --- Controles ---

let fid = 1;
function useFieldId() {
  const [id] = useState(() => `pf-${fid++}`);
  return id;
}

function Input({
  label,
  value,
  onChange,
  hint,
  required,
  small,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  required?: boolean;
  small?: boolean;
}) {
  const id = useFieldId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`${s.input} ${small ? s.inputSm : ''}`}
        required={required}
        value={value}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && (
        <small id={`${id}-h`} className={s.hint}>
          {hint}
        </small>
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  hint,
  small,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
  small?: boolean;
}) {
  const id = useFieldId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`${s.input} ${small ? s.inputSm : ''}`}
        inputMode="numeric"
        value={value ?? ''}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '');
          onChange(v === '' ? null : Number(v));
        }}
      />
      {hint && (
        <small id={`${id}-h`} className={s.hint}>
          {hint}
        </small>
      )}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={s.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
