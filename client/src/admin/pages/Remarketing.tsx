import { Button } from '../../components/ui/Button';
import { adminUrl, useAdmin } from '../api';
import { Notice } from '../ui';
import { fecha, money, styles as s } from '../helpers';

type Row = {
  nombre: string;
  whatsapp: string;
  ultimoFolio: string;
  ultimaCompra: string;
  dias: number;
  compro: string[];
  paquete: string | null;
  leFaltan: string[];
  precioPaquete: number | null;
  whatsappLink: string;
};

export function Remarketing() {
  const { data, error } = useAdmin<Row[]>('/remarketing');

  return (
    <>
      <div className={s.head}>
        <h1 className={s.h1}>Remarketing</h1>
        <Button href={adminUrl('/remarketing?formato=csv')} variant="dark">
          Descargar CSV
        </Button>
      </div>
      <p className={`${s.muted} ${s.mb}`}>
        Clientes cuyo último pedido fue de piezas sueltas hace 15 días o más y que nunca han
        comprado un paquete, con el paquete que más se parece a lo que compraron. El mensaje de
        WhatsApp ya va redactado; revísalo antes de enviarlo.
      </p>
      {error && <Notice kind="err">{error}</Notice>}
      {!data && !error && <p className={s.muted}>Cargando…</p>}
      {data && !data.length && <p className={s.muted}>Nadie entra a la lista todavía.</p>}
      {data && data.length > 0 && (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Último pedido</th>
                <th scope="col">Compró</th>
                <th scope="col">Paquete sugerido</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.whatsapp}>
                  <td>
                    {r.nombre}
                    <br />
                    <span className={s.muted}>{r.whatsapp}</span>
                  </td>
                  <td>
                    {r.ultimoFolio}
                    <br />
                    <span className={s.muted}>
                      {fecha(r.ultimaCompra)} · hace {r.dias} días
                    </span>
                  </td>
                  <td className={s.wrap}>{r.compro.join(', ')}</td>
                  <td className={s.wrap}>
                    {r.paquete ? (
                      <>
                        <strong>{r.paquete}</strong> · {money(r.precioPaquete)}
                        {r.leFaltan.length > 0 && (
                          <>
                            <br />
                            <span className={s.muted}>Le falta: {r.leFaltan.join(', ')}</span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className={s.muted}>Ninguno encaja</span>
                    )}
                  </td>
                  <td>
                    <a
                      className={s.link}
                      href={r.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Escribir por WhatsApp
                    </a>
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
