import { useState } from 'react';
import { Link } from 'react-router';
import type { AdminProductRow } from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { useAdmin } from '../api';
import { Notice } from '../ui';
import { money, styles as s } from '../helpers';

export function Products() {
  const { data, error } = useAdmin<AdminProductRow[]>('/products');
  const [soloPendientes, setSoloPendientes] = useState(false);

  const list = (data ?? []).filter(
    (p) => !soloPendientes || p.precioBase == null || p.opcionesSinPrecio > 0,
  );
  const pendientes = (data ?? []).filter((p) => p.precioBase == null).length;

  return (
    <>
      <div className={s.head}>
        <h1 className={s.h1}>Productos y precios</h1>
        <Button to="/admin/productos/nuevo">Nuevo producto</Button>
      </div>

      {data && pendientes > 0 && (
        <Notice kind="warn">
          {pendientes} de {data.length} productos no tienen precio base: la tienda los muestra como
          "$[PRECIO]" y las cotizaciones quedan "por confirmar".
        </Notice>
      )}

      <label className={`${s.check} ${s.mt}`}>
        <input
          type="checkbox"
          checked={soloPendientes}
          onChange={(e) => setSoloPendientes(e.target.checked)}
        />
        Solo los que les falta algún precio
      </label>

      {error && <Notice kind="err">{error}</Notice>}
      {!data && !error && <p className={s.muted}>Cargando productos…</p>}
      {data && (
        <div className={`${s.tableWrap} ${s.mt}`}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Categoría</th>
                <th scope="col" className={s.num}>
                  Precio por unidad
                </th>
                <th scope="col">Opciones sin costo</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className={s.link} to={`/admin/productos/${p.id}`}>
                      {p.nombre}
                    </Link>
                    <br />
                    <span className={s.muted}>/{p.slug}</span>
                  </td>
                  <td>{p.categoria}</td>
                  <td className={s.num}>
                    {money(p.precioBase)}
                    <span className={s.muted}> / {p.unidad}</span>
                  </td>
                  <td>
                    {p.opcionesSinPrecio ? (
                      <span className={`${s.badge} ${s.badgeBad}`}>{p.opcionesSinPrecio}</span>
                    ) : (
                      <span className={`${s.badge} ${s.badgeOk}`}>Completo</span>
                    )}
                  </td>
                  <td>{p.activo ? 'Activo' : <span className={s.badge}>Oculto</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
