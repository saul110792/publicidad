import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { OrderDTO, PaymentStartDTO } from '@publicidad/shared';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { apiPost, ApiError } from '../../lib/api';
import { price } from '../../lib/format';
import styles from './PaymentBanner.module.css';

type Props = { order: OrderDTO; reload: () => void };

const MAX_POLLS = 6;

/**
 * Estado del pago en la confirmación del pedido.
 * Al regresar del checkout, el proveedor agrega `payment_id` a la URL: el back lo consulta
 * (no se confía en `?pago=aprobado`) y mientras el pago no se refleje se vuelve a preguntar
 * unas cuantas veces, por si el webhook tarda.
 */
export function PaymentBanner({ order, reload }: Props) {
  const [params] = useSearchParams();
  const regreso = params.get('pago');
  const paymentId = params.get('payment_id') ?? params.get('collection_id');
  const [paying, setPaying] = useState<{ busy?: boolean; error?: string }>({});
  const [polls, setPolls] = useState(0);
  const confirmed = useRef(false);

  const pagado = order.estadoPago === 'pagado';

  useEffect(() => {
    if (!paymentId || pagado || confirmed.current) return;
    confirmed.current = true;
    apiPost(`/api/orders/${order.folio}/pago/confirmar`, { paymentId }).then(reload, () => {});
  }, [paymentId, pagado, order.folio, reload]);

  const waiting = regreso === 'aprobado' && !pagado && order.estadoPago !== 'fallido';
  useEffect(() => {
    if (!waiting || polls >= MAX_POLLS) return;
    const t = setTimeout(() => {
      setPolls((n) => n + 1);
      reload();
    }, 2500);
    return () => clearTimeout(t);
  }, [waiting, polls, reload]);

  async function pay() {
    setPaying({ busy: true });
    try {
      const res = await apiPost<PaymentStartDTO>(`/api/orders/${order.folio}/pago`, {});
      window.location.assign(res.redirectUrl);
    } catch (err) {
      setPaying({
        error:
          err instanceof ApiError ? err.message : 'No pudimos abrir el pago. Intenta de nuevo.',
      });
    }
  }

  const payButton = order.pagoEnLinea && (
    <Button onClick={pay} disabled={paying.busy}>
      <Icon name="card" size={20} />
      {paying.busy ? 'Abriendo el pago…' : `Pagar ahora ${price(order.total)}`}
    </Button>
  );
  const payError = paying.error && (
    <p className={styles.error} role="alert">
      {paying.error}
    </p>
  );

  if (pagado) {
    return (
      <div className={`${styles.banner} ${styles.ok}`} role="status">
        <Icon name="check" size={22} />
        <div>
          <p className={styles.title}>Pago recibido</p>
          <p>Ya registramos tu pago de {price(order.total)}. Gracias.</p>
        </div>
      </div>
    );
  }

  if (order.estadoPago === 'reembolsado') {
    return (
      <div className={styles.banner} role="status">
        <div>
          <p className={styles.title}>Pago reembolsado</p>
          <p>Tu pago fue reembolsado. Si tienes dudas, escríbenos por WhatsApp.</p>
        </div>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className={styles.banner} role="status">
        <Icon name="clock" size={22} />
        <div>
          <p className={styles.title}>Estamos confirmando tu pago…</p>
          <p>
            {polls >= MAX_POLLS
              ? 'Está tardando más de lo normal. Te avisamos por WhatsApp en cuanto se acredite.'
              : 'Esto tarda unos segundos.'}
          </p>
        </div>
      </div>
    );
  }

  if (order.estadoPago === 'fallido' || regreso === 'rechazado') {
    return (
      <div className={`${styles.banner} ${styles.bad}`} role="alert">
        <div className={styles.body}>
          <p className={styles.title}>No se pudo completar el pago</p>
          <p>Tu pedido sigue guardado. Puedes intentar con otra tarjeta o escribirnos.</p>
          {payButton}
          {payError}
        </div>
      </div>
    );
  }

  if (regreso === 'pendiente') {
    return (
      <div className={styles.banner} role="status">
        <Icon name="clock" size={22} />
        <div>
          <p className={styles.title}>Tu pago está en revisión</p>
          <p>Te avisamos por WhatsApp en cuanto se acredite.</p>
        </div>
      </div>
    );
  }

  if (order.pagoEnLinea) {
    return (
      <div className={styles.banner}>
        <div className={styles.body}>
          <p className={styles.title}>Falta pagar tu pedido</p>
          <p>Paga con tarjeta de forma segura con Mercado Pago.</p>
          {payButton}
          {payError}
        </div>
      </div>
    );
  }

  return null;
}
