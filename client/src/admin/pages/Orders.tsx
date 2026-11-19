import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ORDER_STATUSES, type AdminOrdersDTO } from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { useAdmin } from '../api';
import { Notice, PagoBadge } from '../ui';
import { estadoLabel, fecha, metodoLabel, money, PAYMENT_STATES, styles as s } from '../helpers';

const PAGE_SIZE = 25;

export function Orders() {
  const [params, setParams] = useSearchParams();
  const estado = params.get('estado') ?? '';
  const estadoPago = params.get('pago') ?? '';
  const q = params.get('q') ?? '';
  const pagina = Number(params.get('pagina') ?? 1) || 1;
  const [search, setSearch] = useState(q);

  const qs = new URLSearchParams();
  if (estado) qs.set('estado', estado);
  if (estadoPago) qs.set('estadoPago', estadoPago);
  if (q) qs.set('q', q);
  qs.set('pagina', String(pagina));
  const { data, error, loading } = useAdmin<AdminOrdersDTO>(`/orders?${qs}`);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('pagina');
    setParams(next, { replace: true });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    update('q', search.trim());
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <div className={s.head}>
        <h1 className={s.h1}>Pedidos</h1>
        <Button to="/admin/pedidos/nuevo">Registrar venta de WhatsApp</Button>
      </div>

      <div className={`${s.row} ${s.mb}`}>
        <form className={s.row} onSubmit={onSearch} role="search">
          <label htmlFor="o-q" className="visually-hidden">
            Buscar pedido
          </label>
          <input
            id="o-q"
            className={s.input}
            placeholder="Folio, cliente, WhatsApp o código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="dark">
            Buscar
          </Button>
        </form>
        <label htmlFor="o-estado" className="visually-hidden">
          Estado
        </label>
        <select
          id="o-estado"
          className={`${s.input} ${s.auto}`}
          value={estado}
          onChange={(e) => update('estado', e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ORDER_STATUSES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label htmlFor="o-pago" className="visually-hidden">
          Pago
        </label>
        <select
          id="o-pago"
          className={`${s.input} ${s.auto}`}
          value={estadoPago}
          onChange={(e) => update('pago', e.target.value)}
        >
          <option value="">Cualquier pago</option>
          {PAYMENT_STATES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <Notice kind="err">{error}</Notice>}
      {!data && loading && <p className={s.muted}>Cargando pedidos…</p>}
      {data && !data.pedidos.length && <p className={s.muted}>No hay pedidos con esos filtros.</p>}
      {data && data.pedidos.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Folio</th>
                <th scope="col">Fecha</th>
                <th scope="col">Cliente</th>
                <th scope="col" className={s.num}>
                  Total
                </th>
                <th scope="col">Estado</th>
                <th scope="col">Pago</th>
                <th scope="col">Canal</th>
              </tr>
            </thead>
            <tbody>
              {data.pedidos.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className={s.link} to={`/admin/pedidos/${o.folio}`}>
                      {o.folio}
                    </Link>
                    {o.packageUpgrade && (
                      <span className={`${s.badge} ${s.badgeOk}`}> paquete</span>
                    )}
                  </td>
                  <td>{fecha(o.createdAt)}</td>
                  <td>
                    {o.cliente}
                    <br />
                    <span className={s.muted}>{o.whatsapp}</span>
                  </td>
                  <td className={s.num}>{money(o.total)}</td>
                  <td>{estadoLabel(o.estado)}</td>
                  <td>
                    <PagoBadge estado={o.estadoPago} />
                    <br />
                    <span className={s.muted}>{metodoLabel(o.metodoPago)}</span>
                  </td>
                  <td>
                    {o.canal}
                    {o.refCode && <span className={s.muted}> · {o.refCode}</span>}
                    {o.manual && <span className={s.muted}> · manual</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && pages > 1 && (
        <nav aria-label="Páginas" className={`${s.row} ${s.mt}`}>
          <Button
            variant="secondary"
            disabled={pagina <= 1}
            onClick={() => setParams((p) => (p.set('pagina', String(pagina - 1)), p))}
          >
            Anterior
          </Button>
          <span className={s.muted}>
            Página {pagina} de {pages} · {data.total} pedidos
          </span>
          <Button
            variant="secondary"
            disabled={pagina >= pages}
            onClick={() => setParams((p) => (p.set('pagina', String(pagina + 1)), p))}
          >
            Siguiente
          </Button>
        </nav>
      )}
    </>
  );
}
