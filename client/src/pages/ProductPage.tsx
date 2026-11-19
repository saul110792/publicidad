import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { CartFile, LeadDTO, ProductDetailDTO, Selection } from '@publicidad/shared';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { LoadError } from '../components/ui/Skeleton';
import { PagePlaceholder } from '../components/PagePlaceholder';
import { site } from '../config/site';
import { cart } from '../features/cart/cartStore';
import { uploadDesign } from '../features/cart/upload';
import { DesignFile } from '../features/quote/DesignFile';
import { OptionGroup } from '../features/quote/OptionGroup';
import { ProductGallery } from '../features/quote/ProductGallery';
import { useQuote } from '../features/quote/useQuote';
import { apiPost, ApiError } from '../lib/api';
import { price, qty } from '../lib/format';
import { useApi } from '../lib/useApi';
import { whatsappLink } from '../lib/whatsapp';
import styles from './ProductPage.module.css';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { data: product, error, loading } = useApi<ProductDetailDTO>(`/api/products/${slug}`);

  if (error && !product) {
    return (
      <PagePlaceholder title="No encontramos este producto">
        <p className={styles.notFound}>Puede que ya no esté disponible.</p>
        <Button to="/productos">Ver catálogo</Button>
      </PagePlaceholder>
    );
  }
  if (!product || (loading && product.slug !== slug)) {
    return (
      <div className={`container ${styles.loading}`} role="status">
        Cargando producto…
      </div>
    );
  }
  // `key` reinicia el estado del cotizador al cambiar de producto.
  return <ProductView key={product.slug} product={product} />;
}

function ProductView({ product }: { product: ProductDetailDTO }) {
  const [userSel, setUserSel] = useState<Selection>({});
  const [file, setFile] = useState<File | null>(null);
  const [adding, setAdding] = useState<{
    state: 'idle' | 'uploading' | 'done';
    pct?: number;
    note?: string;
  }>({ state: 'idle' });
  const [lead, setLead] = useState<{ refCode?: string; error?: string; sending?: boolean }>({});

  // Selección efectiva: lo que eligió el cliente sobre las opciones por defecto.
  const selection: Selection = {};
  for (const g of product.grupos) {
    const def = g.opciones.find((o) => o.esDefault) ?? g.opciones[0];
    const chosen = userSel[String(g.id)] ?? def?.id;
    if (chosen !== undefined) selection[String(g.id)] = chosen;
  }

  const { quote, loading: quoting, error: quoteError } = useQuote(product.slug, selection);

  const designGroup = product.grupos.find((g) => g.clave === 'diseno');
  const designOption = designGroup?.opciones.find(
    (o) => o.id === selection[String(designGroup.id)],
  );
  // Convención del seed: la primera opción del grupo de diseño es "Ya tengo mi diseño".
  const hasOwnDesign = designGroup ? designOption?.id === designGroup.opciones[0]?.id : false;

  async function addToCart() {
    let archivo: CartFile | null = null;
    let note: string | undefined;
    if (hasOwnDesign && file) {
      setAdding({ state: 'uploading', pct: 0 });
      try {
        archivo = await uploadDesign(file, (pct) => setAdding({ state: 'uploading', pct }));
      } catch (err) {
        note =
          err instanceof ApiError && err.status === 503
            ? 'Tu archivo no se guardó aquí: mándalo por WhatsApp cuando confirmes el pedido.'
            : 'No pudimos subir tu archivo. Mándalo por WhatsApp cuando confirmes el pedido.';
      }
    }
    cart.addProduct(product.slug, selection, archivo);
    setAdding({ state: 'done', note });
  }

  async function cotizarWhatsApp() {
    // La ventana se abre en el clic (síncrono) para que el navegador no la bloquee.
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    setLead({ sending: true });
    try {
      const res = await apiPost<LeadDTO>('/api/leads', {
        productSlug: product.slug,
        opciones: selection,
      });
      const url = whatsappLink(res.mensaje);
      if (win) win.location.href = url;
      else window.location.href = url;
      setLead({ refCode: res.refCode });
    } catch (err) {
      win?.close();
      setLead({
        error:
          err instanceof ApiError ? err.message : 'No pudimos abrir WhatsApp. Intenta de nuevo.',
      });
    }
  }

  const ahorro =
    product.paquete?.precio != null &&
    product.paquete.precioSeparado != null &&
    product.paquete.precioSeparado > product.paquete.precio
      ? product.paquete.precioSeparado - product.paquete.precio
      : null;

  return (
    <div className={`container ${styles.page}`}>
      <nav aria-label="Ruta de navegación" className={styles.breadcrumb}>
        <ol role="list">
          <li>
            <Link to="/">Inicio</Link>
          </li>
          <li>
            <Link to={`/productos/${product.categoria.slug}`}>{product.categoria.nombre}</Link>
          </li>
          <li>
            <span aria-current="page">{product.nombre}</span>
          </li>
        </ol>
      </nav>

      <div className={styles.layout}>
        <div className={styles.galleryArea}>
          <ProductGallery
            imagenes={product.imagenes}
            nombre={product.nombre}
            categoria={product.categoria.slug}
          />
        </div>

        <div className={styles.buyArea}>
          <header className={styles.header}>
            <p className={styles.cat}>{product.categoria.nombre}</p>
            <h1 className={styles.title}>{product.nombre}</h1>
            {product.descripcion && <p className={styles.lead}>{product.descripcion}</p>}
            <p className={styles.from}>
              Desde <strong>{price(product.precioDesde)}</strong>
              {product.cantidadMinima != null &&
                ` · ${qty(product.cantidadMinima)} ${product.unidad}`}
            </p>
          </header>

          <section className={styles.quoter} aria-labelledby="quoter-title">
            <h2 id="quoter-title" className={styles.h2}>
              Cotiza tu pedido
            </h2>
            {product.grupos.length === 0 && (
              <p className={styles.muted}>Este servicio no tiene opciones: el precio es fijo.</p>
            )}
            {product.grupos.map((g) => (
              <OptionGroup
                key={g.id}
                group={g}
                selectedId={selection[String(g.id)]!}
                onSelect={(id) => setUserSel((s) => ({ ...s, [String(g.id)]: id }))}
              />
            ))}

            {designGroup &&
              (hasOwnDesign ? (
                <DesignFile file={file} onChange={setFile} />
              ) : (
                <p className={styles.designNote}>
                  <Icon name="pencil" size={20} />
                  Un diseñador te contacta por WhatsApp para conocer tu negocio y te manda la
                  propuesta antes de imprimir.
                </p>
              ))}
          </section>

          <section className={styles.summary} aria-labelledby="summary-title">
            <h2 id="summary-title" className={styles.summaryTitle}>
              Tu cotización
            </h2>
            <dl className={styles.lines}>
              {(quote?.seleccion ?? []).map((s) => (
                <div key={s.grupo} className={styles.line}>
                  <dt>{s.grupo}</dt>
                  <dd>{s.opcion}</dd>
                </div>
              ))}
              {hasOwnDesign && file && (
                <div className={styles.line}>
                  <dt>Archivo</dt>
                  <dd className={styles.ellipsis}>{file.name}</dd>
                </div>
              )}
            </dl>
            <div className={styles.totalRow} aria-live="polite" aria-busy={quoting}>
              <span>Total</span>
              <strong className={`${styles.total} ${quoting ? styles.stale : ''}`}>
                {quote ? price(quote.total) : '…'}
              </strong>
            </div>
            {quote && quote.total != null && quote.cantidad > 1 && (
              <p className={styles.unit}>
                {price(quote.precioUnitario)} por{' '}
                {product.unidad === 'pzas' ? 'pieza' : product.unidad}
              </p>
            )}
            {quote && quote.total == null && (
              <p className={styles.pending}>
                Te confirmamos el precio exacto por WhatsApp antes de cobrar.
              </p>
            )}
            {quoteError && <LoadError message={quoteError} />}

            <div className={styles.ctas}>
              <Button block size="lg" onClick={addToCart} disabled={adding.state === 'uploading'}>
                <Icon name="cart" size={20} />
                {adding.state === 'uploading'
                  ? `Subiendo archivo… ${adding.pct ?? 0}%`
                  : 'Agregar al carrito'}
              </Button>
              {adding.state === 'done' && (
                <div className={styles.added} role="status">
                  <p className={styles.addedTitle}>
                    <Icon name="check" size={20} />
                    Agregado al carrito
                  </p>
                  {adding.note && <p className={styles.addedNote}>{adding.note}</p>}
                  <div className={styles.addedActions}>
                    <Button to="/checkout" variant="dark">
                      Ver carrito
                    </Button>
                    <Button to="/productos" variant="secondary">
                      Seguir comprando
                    </Button>
                  </div>
                </div>
              )}
              <Button
                block
                size="lg"
                variant="secondary"
                onClick={cotizarWhatsApp}
                disabled={lead.sending}
              >
                <Icon name="chat" size={20} />
                {lead.sending ? 'Abriendo WhatsApp…' : 'Cotizar por WhatsApp'}
              </Button>
              {lead.refCode && (
                <p className={styles.ref} role="status">
                  Tu código de referencia es <strong>{lead.refCode}</strong>. Ya va en el mensaje.
                </p>
              )}
              {lead.error && (
                <p className={styles.pending} role="alert">
                  {lead.error}
                </p>
              )}
            </div>
          </section>

          {product.paquete && (
            <aside className={styles.crossSell} aria-labelledby="xsell-title">
              <p className={styles.xsellEyebrow}>Ahorra con un paquete</p>
              <h2 id="xsell-title" className={styles.xsellTitle}>
                {product.nombre} viene en el Paquete {product.paquete.nombre}
              </h2>
              <ul role="list" className={styles.xsellItems}>
                {product.paquete.items.map((it) => (
                  <li key={it.etiqueta}>
                    <Icon name={it.productSlug === product.slug ? 'check' : 'plus'} size={16} />
                    {it.etiqueta}
                  </li>
                ))}
              </ul>
              <p className={styles.xsellPrice}>
                Por separado <s>{price(product.paquete.precioSeparado)}</s> · Paquete{' '}
                <strong>{price(product.paquete.precio)}</strong>
              </p>
              {ahorro != null && <p className={styles.xsellSaving}>Ahorras {price(ahorro)}</p>}
              <Button
                to={product.paquete.giro ? `/paquetes?giro=${product.paquete.giro}` : '/paquetes'}
                variant="light"
                block
              >
                Ver Paquete {product.paquete.nombre}
              </Button>
            </aside>
          )}
        </div>

        <section className={styles.detailsArea} aria-labelledby="details-title">
          <h2 id="details-title" className={styles.h2}>
            Detalles
          </h2>
          <dl className={styles.details}>
            <div>
              <dt>Tiempo de entrega</dt>
              <dd>
                {product.tiempoEntregaDias != null
                  ? `${product.tiempoEntregaDias} días hábiles`
                  : site.deliveryTime}
                {product.entregaRapida && ' · entrega rápida'}
              </dd>
            </div>
            <div>
              <dt>Pedido mínimo</dt>
              <dd>
                {product.cantidadMinima != null
                  ? `${qty(product.cantidadMinima)} ${product.unidad}`
                  : 'Sin mínimo'}
              </dd>
            </div>
            <div>
              <dt>Diseño</dt>
              <dd>
                {product.incluyeDiseno ? 'Incluido' : 'Opcional: tráelo listo o te lo diseñamos'}
              </dd>
            </div>
            <div>
              <dt>Prueba digital</dt>
              <dd>Te la mandamos por WhatsApp. No producimos sin tu aprobación.</dd>
            </div>
          </dl>
          <p className={styles.help}>
            ¿Dudas con tu archivo? Revisa{' '}
            <Link to="/preparar-archivo">cómo preparar tu archivo</Link> o{' '}
            <a
              href={whatsappLink(`Hola, tengo una duda sobre ${product.nombre}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              escríbenos
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
