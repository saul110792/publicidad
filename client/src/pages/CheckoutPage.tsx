import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  anticipoDe,
  DELIVERY_METHODS,
  GIROS,
  ORIGENES,
  PAYMENT_METHODS,
  sumOrNull,
  type DeliveryMethod,
  type OrderCreatedDTO,
  type OrderRequest,
  type PaymentMethod,
} from '@publicidad/shared';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { LoadError } from '../components/ui/Skeleton';
import { cart, useCart } from '../features/cart/cartStore';
import { PackageOffer } from '../features/cart/PackageOffer';
import { useCartQuote } from '../features/cart/useCartQuote';
import { apiPost, ApiError } from '../lib/api';
import { price } from '../lib/format';
import styles from './CheckoutPage.module.css';

type Form = {
  nombre: string;
  whatsapp: string;
  correo: string;
  giro: string;
  entrega: DeliveryMethod;
  direccion: string;
  metodoPago: PaymentMethod;
  comoNosConocio: string;
};

const INITIAL: Form = {
  nombre: '',
  whatsapp: '',
  correo: '',
  giro: '',
  entrega: 'recoger',
  direccion: '',
  metodoPago: 'tarjeta',
  comoNosConocio: '',
};

export function CheckoutPage() {
  const state = useCart();
  const { data, error, loading } = useCartQuote(state);
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(INITIAL);
  const [submit, setSubmit] = useState<{ sending?: boolean; error?: string }>({});

  const field =
    <K extends keyof Form>(key: K) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value as Form[K] }));

  // Mientras llega la cotización nueva se muestran las líneas anteriores que sigan en el carrito.
  const ids = new Set(state.lineas.map((l) => l.id));
  const lineas = (data?.lineas ?? []).filter((l) => ids.has(l.id) && l.disponible);
  const empty = state.lineas.length === 0;

  const envio = form.entrega === 'recoger' ? 0 : data ? data.envioDomicilio : null;
  const total = data ? sumOrNull([data.subtotal, envio]) : null;
  const anticipo = form.metodoPago === 'tienda' ? anticipoDe(total) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || submit.sending) return;
    setSubmit({ sending: true });
    const body: OrderRequest = {
      lineas: state.lineas,
      cliente: {
        nombre: form.nombre,
        whatsapp: form.whatsapp,
        correo: form.correo,
        giro: form.giro as OrderRequest['cliente']['giro'],
      },
      entrega: form.entrega,
      direccion: form.entrega === 'domicilio' ? form.direccion : undefined,
      metodoPago: form.metodoPago,
      comoNosConocio: form.comoNosConocio as OrderRequest['comoNosConocio'],
    };
    try {
      const res = await apiPost<OrderCreatedDTO>('/api/orders', body);
      cart.clear();
      navigate(`/pedido/${res.folio}`);
    } catch (err) {
      setSubmit({
        error:
          err instanceof ApiError && err.status === 400
            ? 'Revisa tus datos: el WhatsApp debe tener 10 dígitos y la dirección estar completa.'
            : err instanceof ApiError
              ? err.message
              : 'No pudimos confirmar tu pedido. Intenta de nuevo.',
      });
    }
  }

  if (empty) {
    return (
      <div className={`container ${styles.page}`}>
        <h1 className={styles.h1}>Tu carrito</h1>
        {state.deshacer ? (
          <UndoNotice paquete={state.deshacer.paquete} />
        ) : (
          <div className={styles.empty}>
            <Icon name="cart" size={32} />
            <p>Tu carrito está vacío.</p>
            <div className={styles.emptyActions}>
              <Button to="/productos">Ver productos</Button>
              <Button to="/paquetes" variant="secondary">
                Ver paquetes por giro
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const offer = !loading ? data?.oferta : null;

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.h1}>Tu carrito</h1>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section aria-labelledby="lines-title" aria-busy={loading}>
            <h2 id="lines-title" className="visually-hidden">
              Productos en tu carrito
            </h2>
            {!data && loading && (
              <p className={styles.muted} role="status">
                Cargando tu carrito…
              </p>
            )}
            {error && <LoadError message={error} />}
            <ul role="list" className={`${styles.lines} ${loading && data ? styles.stale : ''}`}>
              {lineas.map((l) => (
                <li key={l.id} className={styles.line}>
                  <div className={styles.lineInfo}>
                    <h3 className={styles.lineName}>
                      {l.tipo === 'producto' ? (
                        <Link to={`/producto/${l.slug}`}>{l.nombre}</Link>
                      ) : (
                        l.nombre
                      )}
                    </h3>
                    <ul role="list" className={styles.lineDetail}>
                      {l.detalle.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                      {l.archivo && <li>Archivo: {l.archivo.nombre}</li>}
                    </ul>
                  </div>
                  <div className={styles.lineSide}>
                    <strong className={styles.linePrice}>{price(l.total)}</strong>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => cart.remove(l.id)}
                      aria-label={`Quitar ${l.nombre}`}
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {state.deshacer && <UndoNotice paquete={state.deshacer.paquete} />}

          {offer && (
            <PackageOffer offer={offer}>
              <Button onClick={() => cart.acceptOffer(offer)}>Cambiar a paquete</Button>
              <Button variant="ghost-dark" onClick={() => cart.dismissOffer(offer.paquete.slug)}>
                No, gracias
              </Button>
            </PackageOffer>
          )}

          <form id="checkout" className={styles.form} onSubmit={onSubmit}>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Tus datos</legend>
              <div className={styles.grid2}>
                <label className={styles.field}>
                  <span>Nombre</span>
                  <input
                    className={styles.input}
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={form.nombre}
                    onChange={field('nombre')}
                  />
                </label>
                <label className={styles.field}>
                  <span>WhatsApp</span>
                  <input
                    className={styles.input}
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    pattern="[0-9 ()+\-]{10,18}"
                    placeholder="10 dígitos"
                    aria-describedby="wa-hint"
                    value={form.whatsapp}
                    onChange={field('whatsapp')}
                  />
                  <small id="wa-hint" className={styles.hint}>
                    Por aquí te mandamos la prueba digital.
                  </small>
                </label>
                <label className={styles.field}>
                  <span>
                    Correo <span className={styles.optional}>(opcional)</span>
                  </span>
                  <input
                    className={styles.input}
                    type="email"
                    autoComplete="email"
                    maxLength={200}
                    value={form.correo}
                    onChange={field('correo')}
                  />
                </label>
                <label className={styles.field}>
                  <span>Tipo de negocio</span>
                  <select className={styles.input} value={form.giro} onChange={field('giro')}>
                    <option value="">Selecciona tu giro</option>
                    {GIROS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Entrega</legend>
              <div className={styles.choices}>
                {DELIVERY_METHODS.map((d) => (
                  <label key={d.value} className={styles.choice}>
                    <input
                      type="radio"
                      name="entrega"
                      value={d.value}
                      checked={form.entrega === d.value}
                      onChange={field('entrega')}
                    />
                    <span className={styles.choiceText}>
                      <strong>{d.label}</strong>
                      <span>
                        {d.value === 'recoger'
                          ? d.nota
                          : data?.envioDomicilio != null
                            ? price(data.envioDomicilio)
                            : 'Costo por confirmar'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {form.entrega === 'domicilio' && (
                <label className={styles.field}>
                  <span>Dirección de entrega</span>
                  <textarea
                    className={styles.input}
                    required
                    minLength={10}
                    maxLength={500}
                    rows={3}
                    autoComplete="street-address"
                    placeholder="Calle, número, colonia, municipio y código postal"
                    value={form.direccion}
                    onChange={field('direccion')}
                  />
                </label>
              )}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Pago</legend>
              <div className={styles.choices}>
                {PAYMENT_METHODS.map((p) => (
                  <label key={p.value} className={styles.choice}>
                    <input
                      type="radio"
                      name="metodoPago"
                      value={p.value}
                      checked={form.metodoPago === p.value}
                      onChange={field('metodoPago')}
                    />
                    <span className={styles.choiceText}>
                      <strong>{p.label}</strong>
                      <span>{p.nota}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>¿Cómo nos conociste?</legend>
              <label className={styles.field}>
                <span className="visually-hidden">¿Cómo nos conociste?</span>
                <select
                  className={styles.input}
                  value={form.comoNosConocio}
                  onChange={field('comoNosConocio')}
                >
                  <option value="">Selecciona una opción</option>
                  {ORIGENES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          </form>
        </div>

        <aside className={styles.summary} aria-labelledby="summary-title">
          <h2 id="summary-title" className={styles.summaryTitle}>
            Resumen
          </h2>
          <dl className={styles.totals} aria-live="polite" aria-busy={loading}>
            <div>
              <dt>
                Subtotal ({lineas.length} {lineas.length === 1 ? 'producto' : 'productos'})
              </dt>
              <dd>{data ? price(data.subtotal) : '…'}</dd>
            </div>
            <div>
              <dt>Envío</dt>
              <dd>{envio === 0 ? 'Sin costo' : envio == null ? 'Por confirmar' : price(envio)}</dd>
            </div>
            <div className={styles.totalRow}>
              <dt>Total</dt>
              <dd>{data ? price(total) : '…'}</dd>
            </div>
            {form.metodoPago === 'tienda' && (
              <div>
                <dt>Anticipo para empezar (50%)</dt>
                <dd>{price(anticipo)}</dd>
              </div>
            )}
          </dl>
          {data && total == null && (
            <p className={styles.pending}>
              Algunos precios están por confirmar. Te mandamos el total exacto por WhatsApp antes de
              cobrar.
            </p>
          )}
          <Button
            type="submit"
            form="checkout"
            size="lg"
            block
            disabled={submit.sending || (loading && !data)}
          >
            {submit.sending ? 'Confirmando…' : 'Confirmar y pagar'}
          </Button>
          {submit.error && (
            <p className={styles.error} role="alert">
              {submit.error}
            </p>
          )}
          <p className={styles.note}>
            <Icon name="chat" size={18} />
            Recibirás la prueba digital por WhatsApp
          </p>
        </aside>
      </div>
    </div>
  );
}

function UndoNotice({ paquete }: { paquete: string }) {
  return (
    <div className={styles.undo} role="status">
      <p>
        <Icon name="check" size={20} />
        <span>
          Cambiaste a <strong>Paquete {paquete}</strong>. Conservamos las opciones que ya habías
          elegido.
        </span>
      </p>
      <button type="button" className={styles.undoBtn} onClick={() => cart.undo()}>
        Deshacer
      </button>
    </div>
  );
}
