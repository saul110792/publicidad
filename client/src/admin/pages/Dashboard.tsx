import { useState } from 'react';
import { ORIGENES, type MetricsDTO } from '@publicidad/shared';
import { price } from '../../lib/format';
import { useAdmin } from '../api';
import { Notice } from '../ui';
import { styles as s } from '../helpers';

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

const CANALES: Record<string, string> = {
  directo: 'Directo / sin UTM',
  whatsapp: 'WhatsApp',
  qr: 'QR en impreso',
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google',
};
const canalLabel = (c: string) => CANALES[c] ?? c;
const origenLabel = (o: string) =>
  o === 'sin_dato' ? 'Sin dato' : (ORIGENES.find((x) => x.value === o)?.label ?? o);

export function Dashboard() {
  const [desde, setDesde] = useState(() => iso(new Date(Date.now() - 29 * DAY)));
  const [hasta, setHasta] = useState(() => iso(new Date()));
  const { data, error, loading } = useAdmin<MetricsDTO>(`/metrics?desde=${desde}&hasta=${hasta}`);

  return (
    <>
      <div className={s.head}>
        <h1 className={s.h1}>Dashboard</h1>
        <div className={s.row}>
          <div className={s.field}>
            <label htmlFor="m-desde">Desde</label>
            <input
              id="m-desde"
              type="date"
              className={s.input}
              value={desde}
              max={hasta}
              onChange={(e) => e.target.value && setDesde(e.target.value)}
            />
          </div>
          <div className={s.field}>
            <label htmlFor="m-hasta">Hasta</label>
            <input
              id="m-hasta"
              type="date"
              className={s.input}
              value={hasta}
              min={desde}
              onChange={(e) => e.target.value && setHasta(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <Notice kind="err">{error}</Notice>}
      {!data && loading && <p className={s.muted}>Cargando métricas…</p>}
      {data && <MetricsView m={data} />}
    </>
  );
}

function MetricsView({ m }: { m: MetricsDTO }) {
  const top = m.embudo[0]?.sesiones ?? 0;
  const conv = m.paquetes;
  return (
    <div className={s.stack}>
      <section aria-labelledby="kpis" className={s.kpis}>
        <h2 id="kpis" className="visually-hidden">
          Resumen
        </h2>
        <Kpi label="Pedidos" value={String(m.ventas.pedidos)} />
        <Kpi
          label="Ventas"
          value={price(m.ventas.total)}
          note={
            m.ventas.porConfirmar ? `+ ${m.ventas.porConfirmar} por confirmar precio` : undefined
          }
        />
        <Kpi
          label="Ticket promedio"
          value={m.ventas.ticketPromedio == null ? '—' : price(m.ventas.ticketPromedio)}
        />
        <Kpi
          label="Conversión a paquete"
          value={pct(conv.ofertasAceptadas, conv.ofertasMostradas)}
          note={`${conv.ofertasAceptadas} de ${conv.ofertasMostradas} ofertas`}
        />
        <Kpi
          label="Leads convertidos"
          value={pct(m.leads.convertidos, m.leads.total)}
          note={`${m.leads.convertidos} de ${m.leads.total} leads de WhatsApp`}
        />
      </section>

      <div className={s.grid2}>
        <section className={s.card} aria-labelledby="embudo">
          <h2 id="embudo" className={s.h2}>
            Embudo (sesiones)
          </h2>
          <div className={s.bars}>
            {m.embudo.map((step, i) => (
              <Bar
                key={step.paso}
                label={step.paso}
                value={step.sesiones}
                max={top}
                extra={i > 0 ? pct(step.sesiones, top) : undefined}
                accent={i === m.embudo.length - 1}
              />
            ))}
          </div>
          <p className={`${s.muted} ${s.mt}`}>
            Sesiones únicas que hicieron cada paso. "Cotizaron" incluye cambios en el cotizador y
            clics en WhatsApp.
          </p>
        </section>

        <section className={s.card} aria-labelledby="paquetes">
          <h2 id="paquetes" className={s.h2}>
            Paquetes
          </h2>
          <dl className={s.stack}>
            <Stat label="Ofertas mostradas en el carrito" value={conv.ofertasMostradas} />
            <Stat label="Ofertas aceptadas" value={conv.ofertasAceptadas} />
            <Stat label="Pedidos que cambiaron a paquete" value={conv.pedidosConUpgrade} />
            <Stat
              label="Clientes con compra suelta que después compraron paquete"
              value={`${conv.sueltoAPaquete} de ${conv.clientesConCompraSuelta}`}
            />
          </dl>
          <h3 className={`${s.h2} ${s.mt}`}>Productos de entrada que más llevan a paquete</h3>
          {m.productosDeEntrada.length ? (
            <ol className={s.bars}>
              {m.productosDeEntrada.map((p) => (
                <li key={p.producto}>
                  <Bar
                    label={p.producto}
                    value={p.upgrades}
                    max={m.productosDeEntrada[0]!.upgrades}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <p className={s.muted}>Todavía no hay cambios a paquete en este periodo.</p>
          )}
        </section>

        <section className={s.card} aria-labelledby="canal">
          <h2 id="canal" className={s.h2}>
            Ventas por canal (UTM)
          </h2>
          <Table rows={m.porCanal.map((r) => [canalLabel(r.canal), r.pedidos, r.total])} />
        </section>

        <section className={s.card} aria-labelledby="origen">
          <h2 id="origen" className={s.h2}>
            ¿Cómo nos conociste?
          </h2>
          <Table
            rows={m.porComoNosConocio.map((r) => [origenLabel(r.origen), r.pedidos, r.total])}
          />
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={s.kpi}>
      <p className={s.kpiLabel}>{label}</p>
      <p className={s.kpiValue}>{value}</p>
      {note && <p className={s.muted}>{note}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={s.statRow}>
      <dt>{label}</dt>
      <dd>
        <strong>{value}</strong>
      </dd>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  extra,
  accent,
}: {
  label: string;
  value: number;
  max: number;
  extra?: string;
  accent?: boolean;
}) {
  const w = max ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className={s.bar}>
      <span>{label}</span>
      <span className={s.barTrack} aria-hidden="true">
        <span
          className={`${s.barFill} ${accent ? s.barAccent : ''}`}
          style={{ width: `${w}%`, display: 'block' }}
        />
      </span>
      <strong className={s.num}>
        {value}
        {extra && <span className={s.muted}> · {extra}</span>}
      </strong>
    </div>
  );
}

function Table({ rows }: { rows: [string, number, number][] }) {
  if (!rows.length) return <p className={s.muted}>Sin pedidos en este periodo.</p>;
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">Canal</th>
            <th scope="col" className={s.num}>
              Pedidos
            </th>
            <th scope="col" className={s.num}>
              Ventas
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, n, total]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className={s.num}>{n}</td>
              <td className={s.num}>{price(total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
