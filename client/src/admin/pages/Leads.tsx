import { useState } from 'react';
import { Link } from 'react-router';
import type { AdminLeadRow } from '@publicidad/shared';
import { useAdmin } from '../api';
import { Notice } from '../ui';
import { fecha, styles as s } from '../helpers';

export function Leads() {
  const [q, setQ] = useState('');
  const { data, error } = useAdmin<AdminLeadRow[]>(
    `/leads${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  );
  const convertidos = data?.filter((l) => l.folio).length ?? 0;

  return (
    <>
      <h1 className={`${s.h1} ${s.mb}`}>Leads de WhatsApp</h1>
      <p className={`${s.muted} ${s.mb}`}>
        Cada clic en "Cotizar por WhatsApp" crea un código (ej. TJ-4F2A) que va en el mensaje. Al
        registrar la venta, captura ese código en el pedido para ligarlos.
      </p>
      <div className={`${s.row} ${s.mb}`}>
        <label htmlFor="l-q" className="visually-hidden">
          Buscar código
        </label>
        <input
          id="l-q"
          className={`${s.input} ${s.auto}`}
          placeholder="Buscar código"
          value={q}
          onChange={(e) => setQ(e.target.value.toUpperCase().slice(0, 7))}
        />
        {data && (
          <span className={s.muted}>
            {data.length} leads · {convertidos} convertidos
          </span>
        )}
      </div>
      {error && <Notice kind="err">{error}</Notice>}
      {data && !data.length && <p className={s.muted}>Sin leads.</p>}
      {data && data.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Fecha</th>
                <th scope="col">Producto</th>
                <th scope="col">UTM</th>
                <th scope="col">Pedido</th>
              </tr>
            </thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.refCode}</strong>
                  </td>
                  <td>{fecha(l.createdAt)}</td>
                  <td>{l.producto ?? '—'}</td>
                  <td>{l.utmSource ?? '—'}</td>
                  <td>
                    {l.folio ? (
                      <Link className={s.link} to={`/admin/pedidos/${l.folio}`}>
                        {l.folio}
                      </Link>
                    ) : (
                      <span className={s.muted}>Sin venta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
