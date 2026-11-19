import { useState } from 'react';
import type { AdminService } from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { adminApi, errorMessage, useAdmin } from '../api';
import { MoneyInput, Notice } from '../ui';
import { slugify, styles as s } from '../helpers';

const EMPTY: AdminService = {
  slug: '',
  nombre: '',
  descripcion: null,
  precioMensual: null,
  orden: 0,
};

export function Services() {
  const { data, error, reload } = useAdmin<AdminService[]>('/services');
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const done = (m: { ok?: string; err?: string }) => {
    setMsg(m);
    reload();
  };

  return (
    <>
      <h1 className={`${s.h1} ${s.mb}`}>Servicios mensuales</h1>
      <p className={`${s.muted} ${s.mb}`}>
        Se muestran en la página de Paquetes con su precio por mes.
      </p>
      {msg.ok && <Notice kind="ok">{msg.ok}</Notice>}
      {msg.err && <Notice kind="err">{msg.err}</Notice>}
      {error && <Notice kind="err">{error}</Notice>}
      <div className={`${s.stack} ${s.mt}`}>
        {data?.map((sv) => (
          <ServiceRow key={sv.id} initial={sv} onDone={done} />
        ))}
        {data && (
          <ServiceRow
            key={`nuevo-${data.length}`}
            initial={{ ...EMPTY, orden: data.length + 1 }}
            onDone={done}
          />
        )}
      </div>
    </>
  );
}

function ServiceRow({
  initial,
  onDone,
}: {
  initial: AdminService;
  onDone: (m: { ok?: string; err?: string }) => void;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const isNew = !initial.id;
  const k = initial.id ?? 'nuevo';
  const { id: _id, ...body } = v;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      onDone({ ok });
    } catch (err) {
      onDone({ err: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={`${s.card} ${s.stack}`}
      aria-label={isNew ? 'Nuevo servicio' : `Servicio ${initial.nombre}`}
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            isNew
              ? adminApi.post('/services', body)
              : adminApi.put(`/services/${initial.id}`, body),
          isNew ? 'Servicio creado.' : 'Servicio guardado.',
        );
      }}
    >
      {isNew && <h2 className={s.h2}>Nuevo servicio</h2>}
      <div className={s.grid3}>
        <div className={s.field}>
          <label htmlFor={`sv-n-${k}`}>Nombre</label>
          <input
            id={`sv-n-${k}`}
            className={s.input}
            required
            value={v.nombre}
            onChange={(e) =>
              setV({ ...v, nombre: e.target.value, slug: isNew ? slugify(e.target.value) : v.slug })
            }
          />
        </div>
        <div className={s.field}>
          <label htmlFor={`sv-p-${k}`}>Precio por mes</label>
          <MoneyInput
            id={`sv-p-${k}`}
            value={v.precioMensual}
            onChange={(p) => setV({ ...v, precioMensual: p })}
          />
        </div>
        <div className={s.field}>
          <label htmlFor={`sv-s-${k}`}>Slug</label>
          <input
            id={`sv-s-${k}`}
            className={s.input}
            required
            value={v.slug}
            onChange={(e) => setV({ ...v, slug: slugify(e.target.value) })}
          />
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor={`sv-d-${k}`}>Descripción</label>
        <input
          id={`sv-d-${k}`}
          className={s.input}
          value={v.descripcion ?? ''}
          onChange={(e) => setV({ ...v, descripcion: e.target.value || null })}
        />
      </div>
      <div className={s.row}>
        <Button type="submit" variant={isNew ? 'primary' : 'dark'} disabled={busy}>
          {isNew ? 'Crear servicio' : 'Guardar'}
        </Button>
        {!isNew && (
          <button
            type="button"
            className={s.textBtn}
            disabled={busy}
            onClick={() =>
              window.confirm(`¿Borrar ${initial.nombre}?`) &&
              void run(() => adminApi.del(`/services/${initial.id}`), 'Servicio borrado.')
            }
          >
            Borrar
          </button>
        )}
      </div>
    </form>
  );
}
