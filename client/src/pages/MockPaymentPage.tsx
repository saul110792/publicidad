import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { OrderDTO } from '@publicidad/shared';
import { PagePlaceholder } from '../components/PagePlaceholder';
import { Button } from '../components/ui/Button';
import { apiPost, ApiError } from '../lib/api';
import { price } from '../lib/format';
import { useApi } from '../lib/useApi';
import styles from './MockPaymentPage.module.css';
import { usePageMeta } from '../lib/usePageMeta';

/**
 * Checkout simulado (PAYMENT_PROVIDER=mock). Sirve para probar el flujo completo en local
 * sin credenciales de Mercado Pago. El back lo desactiva en producción.
 */
export function MockPaymentPage() {
  usePageMeta('Pago de prueba');
  const { folio = '' } = useParams();
  const navigate = useNavigate();
  const { data: order, error } = useApi<OrderDTO>(`/api/orders/${encodeURIComponent(folio)}`);
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});

  async function resolve(aprobar: boolean) {
    setState({ busy: true });
    try {
      await apiPost(`/api/pago-de-prueba/${folio}`, { aprobar });
      navigate(`/pedido/${folio}?pago=${aprobar ? 'aprobado' : 'rechazado'}`, { replace: true });
    } catch (err) {
      setState({
        error:
          err instanceof ApiError && err.status === 404
            ? 'El pago de prueba no está activo en este servidor.'
            : 'No se pudo simular el pago.',
      });
    }
  }

  if (error && !order) {
    return <PagePlaceholder title="Pedido no encontrado" />;
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <p className={styles.badge}>Modo de prueba</p>
        <h1 className={styles.h1}>Pago simulado</h1>
        <p className={styles.note}>
          Esta pantalla reemplaza al checkout de Mercado Pago mientras desarrollas. No se cobra
          nada.
        </p>
        <dl className={styles.data}>
          <div>
            <dt>Pedido</dt>
            <dd>{folio}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{order ? price(order.total) : '…'}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          <Button onClick={() => resolve(true)} disabled={!order || state.busy}>
            Aprobar pago
          </Button>
          <Button
            variant="secondary"
            onClick={() => resolve(false)}
            disabled={!order || state.busy}
          >
            Rechazar pago
          </Button>
        </div>
        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}
