import { Link } from 'react-router';
import type { AdminPackage } from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { giroLabel } from '../../lib/format';
import { useAdmin } from '../api';
import { Notice } from '../ui';
import { money, styles as s } from '../helpers';

export function Packages() {
  const { data, error } = useAdmin<AdminPackage[]>('/packages');
  return (
    <>
      <div className={s.head}>
        <h1 className={s.h1}>Paquetes</h1>
        <Button to="/admin/paquetes/nuevo">Nuevo paquete</Button>
      </div>
      <p className={`${s.muted} ${s.mb}`}>
        La oferta "Cambiar a paquete" del carrito compara los productos del cliente contra los
        componentes de cada paquete activo.
      </p>
      {error && <Notice kind="err">{error}</Notice>}
      {!data && !error && <p className={s.muted}>Cargando paquetes…</p>}
      {data && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Paquete</th>
                <th scope="col">Giro</th>
                <th scope="col">Componentes</th>
                <th scope="col" className={s.num}>
                  Precio
                </th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className={s.link} to={`/admin/paquetes/${p.id}`}>
                      {p.nombre}
                    </Link>
                    {p.recomendado && (
                      <span className={`${s.badge} ${s.badgeOk}`}> recomendado</span>
                    )}
                    {p.destacado && <span className={s.badge}> destacado</span>}
                  </td>
                  <td>{giroLabel(p.giro)}</td>
                  <td className={s.wrap}>{p.items.map((i) => i.etiqueta).join(', ')}</td>
                  <td className={s.num}>{money(p.precio)}</td>
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
