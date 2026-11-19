import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import QRCode from 'qrcode';
import {
  DELIVERY_METHODS,
  ORDER_STATUSES,
  ORIGENES,
  type AdminOrderDetail,
  type AdminOrderUpdate,
} from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { giroLabel } from '../../lib/format';
import { adminApi, errorMessage, useAdmin } from '../api';
import { Notice, PagoBadge } from '../ui';
import { fecha, metodoLabel, money, PAYMENT_STATES, styles as s } from '../helpers';

export function OrderDetail() {
  const { folio = '' } = useParams();
  const { data, error, reload } = useAdmin<AdminOrderDetail>(`/orders/${folio}`);

  if (error && !data) {
    return (
      <>
        <Link to="/admin/pedidos" className={s.back}>
          ← Pedidos
        </Link>
        <Notice kind="err">{error}</Notice>
      </>
    );
  }
  if (!data) return <p className={s.muted}>Cargando pedido…</p>;
  return <Detail key={data.folio} o={data} onSaved={reload} />;
}

function Detail({ o, onSaved }: { o: AdminOrderDetail; onSaved: () => void }) {
  const [estado, setEstado] = useState(o.estado);
  const [estadoPago, setEstadoPago] = useState(o.estadoPago);
  const [refCode, setRefCode] = useState(o.refCode ?? '');
  const [msg, setMsg] = useState<{ ok?: string; err?: string; busy?: boolean }>({});

  async function save(body: AdminOrderUpdate, okText: string) {
    setMsg({ busy: true });
    try {
      await adminApi.patch(`/orders/${o.folio}`, body);
      setMsg({ ok: okText });
      onSaved();
    } catch (err) {
      setMsg({ err: errorMessage(err) });
    }
  }

  const waCliente = `https://wa.me/52${o.whatsapp}?text=${encodeURIComponent(
    `Hola ${o.cliente.split(/\s+/)[0]}, te escribimos de tu pedido ${o.folio}.`,
  )}`;

  return (
    <>
      <Link to="/admin/pedidos" className={s.back}>
        ← Pedidos
      </Link>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Pedido {o.folio}</h1>
          <p className={s.muted}>
            {fecha(o.createdAt)} · canal {o.canal}
            {o.manual && ' · venta manual'}
            {o.packageUpgrade && ' · cambió a paquete'}
          </p>
        </div>
        <Button href={waCliente} variant="whatsapp">
          <Icon name="whatsapp" size={20} />
          Escribir al cliente
        </Button>
      </div>

      {msg.ok && <Notice kind="ok">{msg.ok}</Notice>}
      {msg.err && <Notice kind="err">{msg.err}</Notice>}

      <div className={`${s.grid2} ${s.mt}`}>
        <section className={`${s.card} ${s.stack}`} aria-labelledby="o-estado-t">
          <h2 id="o-estado-t" className={s.h2}>
            Estado
          </h2>
          <div className={s.grid2}>
            <div className={s.field}>
              <label htmlFor="o-estado">Estado del pedido</label>
              <select
                id="o-estado"
                className={s.input}
                value={estado}
                onChange={(e) => setEstado(e.target.value as typeof estado)}
              >
                {ORDER_STATUSES.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label htmlFor="o-pago">Pago</label>
              <select
                id="o-pago"
                className={s.input}
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value as typeof estadoPago)}
              >
                {PAYMENT_STATES.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Button
              disabled={msg.busy || (estado === o.estado && estadoPago === o.estadoPago)}
              onClick={() => save({ estado, estadoPago }, 'Estado guardado.')}
            >
              Guardar estado
            </Button>
          </div>
          <p className={s.muted}>
            Pago con {metodoLabel(o.metodoPago).toLowerCase()} · <PagoBadge estado={o.estadoPago} />
            {o.metodoPago !== 'tarjeta' &&
              ' · Transferencia y pago en tienda se marcan como pagados a mano.'}
          </p>
        </section>

        <section className={`${s.card} ${s.stack}`} aria-labelledby="o-lead-t">
          <h2 id="o-lead-t" className={s.h2}>
            Lead de WhatsApp
          </h2>
          {o.lead ? (
            <p>
              Ligado a <strong>{o.lead.refCode}</strong>
              {o.lead.producto && ` (${o.lead.producto})`} · {fecha(o.lead.fecha)}
            </p>
          ) : (
            <p className={s.muted}>
              Si la venta vino de "Cotizar por WhatsApp", captura el código del mensaje (ej.
              TJ-4F2A).
            </p>
          )}
          <div className={s.row}>
            <label htmlFor="o-ref" className="visually-hidden">
              Código de referencia
            </label>
            <input
              id="o-ref"
              className={`${s.input} ${s.auto}`}
              placeholder="XX-XXXX"
              value={refCode}
              maxLength={7}
              onChange={(e) => setRefCode(e.target.value.toUpperCase())}
            />
            <Button
              variant="dark"
              disabled={msg.busy || refCode === (o.refCode ?? '')}
              onClick={() =>
                save({ refCode }, refCode ? 'Lead ligado al pedido.' : 'Lead desligado.')
              }
            >
              {refCode ? 'Ligar código' : 'Quitar código'}
            </Button>
          </div>
        </section>
      </div>

      <section className={`${s.card} ${s.mt}`} aria-labelledby="o-items-t">
        <h2 id="o-items-t" className={s.h2}>
          Productos
        </h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Detalle</th>
                <th scope="col" className={s.num}>
                  Cantidad
                </th>
                <th scope="col" className={s.num}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {o.lineas.map((l) => (
                <tr key={l.id}>
                  <td>{l.nombre}</td>
                  <td className={s.wrap}>
                    {l.detalle.join(' · ')}
                    {l.archivo && (
                      <>
                        {' · '}
                        <a href={l.archivo.url} target="_blank" rel="noopener noreferrer">
                          Ver archivo de diseño
                        </a>
                      </>
                    )}
                  </td>
                  <td className={s.num}>{l.cantidad}</td>
                  <td className={s.num}>{money(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className={`${s.stack} ${s.mt}`}>
          <div className={s.statRow}>
            <dt>Subtotal</dt>
            <dd>{money(o.subtotal)}</dd>
          </div>
          <div className={s.statRow}>
            <dt>Envío</dt>
            <dd>{o.envio === 0 ? 'Sin costo' : money(o.envio)}</dd>
          </div>
          <div className={s.statRow}>
            <dt>
              <strong>Total</strong>
            </dt>
            <dd>
              <strong>{money(o.total)}</strong>
            </dd>
          </div>
        </dl>
      </section>

      <div className={`${s.grid2} ${s.mt}`}>
        <section className={s.card} aria-labelledby="o-cliente-t">
          <h2 id="o-cliente-t" className={s.h2}>
            Cliente
          </h2>
          <dl className={s.stack}>
            <Row label="Nombre" value={o.cliente} />
            <Row label="WhatsApp" value={o.whatsapp} />
            <Row label="Correo" value={o.correo ?? '—'} />
            <Row label="Giro" value={o.giro ? giroLabel(o.giro) : '—'} />
            <Row
              label="Entrega"
              value={DELIVERY_METHODS.find((d) => d.value === o.entrega)?.label ?? o.entrega}
            />
            {o.direccion && <Row label="Dirección" value={o.direccion} />}
            <Row
              label="¿Cómo nos conoció?"
              value={ORIGENES.find((x) => x.value === o.comoNosConocio)?.label ?? '—'}
            />
            <Row
              label="UTM"
              value={
                [o.utm.source, o.utm.medium, o.utm.campaign].filter(Boolean).join(' / ') || '—'
              }
            />
          </dl>
        </section>

        <section className={s.card} aria-labelledby="o-qr-t">
          <h2 id="o-qr-t" className={s.h2}>
            QR para el impreso
          </h2>
          <p className={s.muted}>
            Imprímelo en el pedido entregado: las visitas que lleguen con él se miden como
            recomendaciones.
          </p>
          <Qr url={o.qrUrl} folio={o.folio} />
        </section>
      </div>

      {o.pagos.length > 0 && (
        <section className={`${s.card} ${s.mt}`} aria-labelledby="o-pagos-t">
          <h2 id="o-pagos-t" className={s.h2}>
            Intentos de pago
          </h2>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Proveedor</th>
                  <th scope="col">Referencia</th>
                  <th scope="col">Estado</th>
                  <th scope="col" className={s.num}>
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody>
                {o.pagos.map((p) => (
                  <tr key={p.referencia}>
                    <td>{fecha(p.fecha)}</td>
                    <td>{p.proveedor}</td>
                    <td>{p.referencia}</td>
                    <td>
                      <PagoBadge estado={p.estado} />
                    </td>
                    <td className={s.num}>{money(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.statRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Qr({ url, folio }: { url: string; folio: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg, () =>
      setSvg(''),
    );
  }, [url]);

  const download = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${folio}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className={s.stack}>
      {/* SVG generado localmente por la librería a partir de nuestra propia URL. */}
      <div
        className={s.qr}
        role="img"
        aria-label={`Código QR a ${url}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <code className={s.code}>{url}</code>
      <div>
        <Button variant="secondary" onClick={download} disabled={!svg}>
          Descargar QR (SVG)
        </Button>
      </div>
    </div>
  );
}
