import { useParams } from 'react-router';
import { DELIVERY_METHODS, PAYMENT_METHODS, type OrderDTO } from '@publicidad/shared';
import { PagePlaceholder } from '../components/PagePlaceholder';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PackageOffer } from '../features/cart/PackageOffer';
import { PaymentBanner } from '../features/payment/PaymentBanner';
import { price } from '../lib/format';
import { useApi } from '../lib/useApi';
import { whatsappLink } from '../lib/whatsapp';
import styles from './OrderConfirmPage.module.css';

const label = <T extends readonly { value: string; label: string }[]>(list: T, v: string) =>
  list.find((x) => x.value === v)?.label ?? v;

function paymentStep(o: OrderDTO): string {
  if (o.metodoPago === 'tienda') {
    return o.anticipo != null
      ? `Pasa a la tienda a dejar tu anticipo de ${price(o.anticipo)} (50%) para empezar.`
      : 'Para empezar, pasas a la tienda a dejar el 50% de anticipo.';
  }
  if (o.metodoPago === 'transferencia') {
    return 'Te mandamos los datos para la transferencia o SPEI por WhatsApp.';
  }
  if (o.estadoPago === 'pagado') return 'Tu pago ya está registrado.';
  if (o.pagoEnLinea) return 'Si aún no pagas, usa el botón "Pagar ahora".';
  return 'Te mandamos el enlace de pago con tarjeta por WhatsApp.';
}

export function OrderConfirmPage() {
  const { id = '' } = useParams();
  const { data: order, error, reload } = useApi<OrderDTO>(`/api/orders/${encodeURIComponent(id)}`);

  if (error && !order) {
    return (
      <PagePlaceholder title="No encontramos este pedido">
        <p className={styles.muted}>Revisa el folio o escríbenos por WhatsApp.</p>
        <Button href={whatsappLink(`Hola, busco mi pedido ${id}.`)}>Escríbenos</Button>
      </PagePlaceholder>
    );
  }
  if (!order) {
    return (
      <div className={`container ${styles.page}`} role="status">
        Cargando tu pedido…
      </div>
    );
  }

  const pendiente = order.total == null;

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.hero}>
        <span className={styles.badge}>
          <Icon name="check" size={28} />
        </span>
        <p className={styles.eyebrow}>
          {order.estadoPago === 'pagado' ? 'Pedido pagado' : 'Pedido recibido'}
        </p>
        <h1 className={styles.h1}>Gracias, {order.nombre}</h1>
        <p className={styles.folio}>
          Tu número de pedido es <strong>{order.folio}</strong>
        </p>
      </header>

      <PaymentBanner order={order} reload={reload} />

      <div className={styles.layout}>
        <section className={styles.card} aria-labelledby="steps-title">
          <h2 id="steps-title" className={styles.h2}>
            Siguientes pasos
          </h2>
          <ol className={styles.steps}>
            <li>
              <strong>Te escribimos por WhatsApp</strong>
              <span>
                {pendiente
                  ? 'Te confirmamos el precio exacto de tu pedido. '
                  : 'Confirmamos tu pedido. '}
                {paymentStep(order)}
              </span>
            </li>
            <li>
              <strong>Recibes la prueba digital</strong>
              <span>Te mandamos el diseño por WhatsApp. No producimos sin tu aprobación.</span>
            </li>
            <li>
              <strong>Producimos tu pedido</strong>
              <span>Te avisamos en cuanto esté listo.</span>
            </li>
            <li>
              <strong>
                {order.entrega === 'recoger' ? 'Pasas a recogerlo' : 'Te lo enviamos'}
              </strong>
              <span>
                {order.entrega === 'recoger'
                  ? 'Sin costo, en nuestra tienda.'
                  : 'A la dirección que nos diste.'}
              </span>
            </li>
          </ol>
          <Button
            href={whatsappLink(`Hola, acabo de hacer el pedido ${order.folio}.`)}
            variant="secondary"
            block
          >
            <Icon name="chat" size={20} />
            Escríbenos por WhatsApp
          </Button>
        </section>

        <section className={styles.card} aria-labelledby="order-title">
          <h2 id="order-title" className={styles.h2}>
            Tu pedido
          </h2>
          <ul role="list" className={styles.lines}>
            {order.lineas.map((l) => (
              <li key={l.id} className={styles.line}>
                <div>
                  <h3 className={styles.lineName}>{l.nombre}</h3>
                  <ul role="list" className={styles.lineDetail}>
                    {l.detalle.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                    {l.archivo && <li>Archivo de diseño recibido</li>}
                  </ul>
                </div>
                <strong className={styles.price}>{price(l.total)}</strong>
              </li>
            ))}
          </ul>
          <dl className={styles.totals}>
            <div>
              <dt>Envío</dt>
              <dd>
                {order.envio === 0
                  ? 'Sin costo'
                  : order.envio == null
                    ? 'Por confirmar'
                    : price(order.envio)}
              </dd>
            </div>
            <div className={styles.totalRow}>
              <dt>Total</dt>
              <dd>{price(order.total)}</dd>
            </div>
            <div>
              <dt>Pago</dt>
              <dd>{label(PAYMENT_METHODS, order.metodoPago)}</dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd>{label(DELIVERY_METHODS, order.entrega)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {order.oferta && (
        <div className={styles.offer}>
          <PackageOffer
            offer={order.oferta}
            eyebrow="Para tu siguiente pedido"
            title={`Lo que compraste viene en el Paquete ${order.oferta.paquete.nombre}`}
          >
            <Button
              href={whatsappLink(
                `Hola, hice el pedido ${order.folio} y me interesa completar el Paquete ${order.oferta.paquete.nombre}.`,
              )}
            >
              Me interesa el paquete
            </Button>
          </PackageOffer>
        </div>
      )}
    </div>
  );
}
