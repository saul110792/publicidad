import { useState } from 'react';
import type { AdminCategory } from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { adminApi, errorMessage, useAdmin } from '../api';
import { Notice } from '../ui';
import { slugify, styles as s } from '../helpers';

const EMPTY: AdminCategory = { id: 0, slug: '', nombre: '', descripcion: null, orden: 0 };

export function Categories() {
  const { data, error, reload } = useAdmin<AdminCategory[]>('/categories');
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  return (
    <>
      <h1 className={`${s.h1} ${s.mb}`}>Categorías</h1>
      {msg.ok && <Notice kind="ok">{msg.ok}</Notice>}
      {msg.err && <Notice kind="err">{msg.err}</Notice>}
      {error && <Notice kind="err">{error}</Notice>}
      {!data && !error && <p className={s.muted}>Cargando…</p>}
      <div className={`${s.stack} ${s.mt}`}>
        {data?.map((c) => (
          <CategoryRow key={c.id} initial={c} onDone={(m) => (setMsg(m), reload())} />
        ))}
        {data && (
          <CategoryRow
            key={`nueva-${data.length}`}
            initial={{ ...EMPTY, orden: data.length + 1 }}
            onDone={(m) => (setMsg(m), reload())}
          />
        )}
      </div>
    </>
  );
}

function CategoryRow({
  initial,
  onDone,
}: {
  initial: AdminCategory;
  onDone: (m: { ok?: string; err?: string }) => void;
}) {
  const [c, setC] = useState(initial);
  const [busy, setBusy] = useState(false);
  const isNew = !initial.id;
  const body = { slug: c.slug, nombre: c.nombre, descripcion: c.descripcion, orden: c.orden };

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
      aria-label={isNew ? 'Nueva categoría' : `Categoría ${initial.nombre}`}
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          () =>
            isNew ? adminApi.post('/categories', body) : adminApi.put(`/categories/${c.id}`, body),
          isNew ? 'Categoría creada.' : 'Categoría guardada.',
        );
      }}
    >
      {isNew && <h2 className={s.h2}>Nueva categoría</h2>}
      <div className={s.grid3}>
        <div className={s.field}>
          <label htmlFor={`c-n-${c.id}`}>Nombre</label>
          <input
            id={`c-n-${c.id}`}
            className={s.input}
            required
            value={c.nombre}
            onChange={(e) =>
              setC({ ...c, nombre: e.target.value, slug: isNew ? slugify(e.target.value) : c.slug })
            }
          />
        </div>
        <div className={s.field}>
          <label htmlFor={`c-s-${c.id}`}>Slug</label>
          <input
            id={`c-s-${c.id}`}
            className={s.input}
            required
            value={c.slug}
            onChange={(e) => setC({ ...c, slug: slugify(e.target.value) })}
          />
        </div>
        <div className={s.field}>
          <label htmlFor={`c-o-${c.id}`}>Orden</label>
          <input
            id={`c-o-${c.id}`}
            className={s.input}
            inputMode="numeric"
            value={c.orden}
            onChange={(e) => setC({ ...c, orden: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          />
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor={`c-d-${c.id}`}>Descripción</label>
        <input
          id={`c-d-${c.id}`}
          className={s.input}
          value={c.descripcion ?? ''}
          onChange={(e) => setC({ ...c, descripcion: e.target.value || null })}
        />
      </div>
      <div className={s.row}>
        <Button type="submit" variant={isNew ? 'primary' : 'dark'} disabled={busy}>
          {isNew ? 'Crear categoría' : 'Guardar'}
        </Button>
        {!isNew && (
          <>
            <span className={s.muted}>{initial.totalProductos ?? 0} productos</span>
            <button
              type="button"
              className={s.textBtn}
              disabled={busy}
              onClick={() =>
                window.confirm(`¿Borrar la categoría ${initial.nombre}?`) &&
                void run(() => adminApi.del(`/categories/${c.id}`), 'Categoría borrada.')
              }
            >
              Borrar
            </button>
          </>
        )}
      </div>
    </form>
  );
}
