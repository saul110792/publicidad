import { Link } from 'react-router';
import type { HomeDTO } from '@publicidad/shared';
import { PackageCard } from '../components/catalog/PackageCard';
import { ProductCard } from '../components/catalog/ProductCard';
import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { LoadError, SkeletonGrid } from '../components/ui/Skeleton';
import { site } from '../config/site';
import { iconForCategory } from '../config/categoryIcons';
import { useApi } from '../lib/useApi';
import { whatsappLink } from '../lib/whatsapp';
import styles from './HomePage.module.css';

const trustPoints: { icon: IconName; text: string }[] = [
  { icon: 'eye', text: 'Prueba digital antes de imprimir' },
  { icon: 'pencil', text: 'Diseño opcional: tú lo traes o te lo hacemos' },
  { icon: 'card', text: 'Pago en línea o en tienda' },
];

const steps = [
  { title: 'Elige y cotiza', text: 'Escoge tu producto y ve el precio al momento.' },
  { title: 'Sube tu diseño o pídelo', text: 'Manda tu archivo o deja que lo diseñemos por ti.' },
  {
    title: 'Aprueba la prueba digital',
    text: 'Te la mandamos por WhatsApp. No imprimimos sin tu OK.',
  },
  { title: 'Recibe o recoge', text: `Listo en ${site.deliveryTime}. Envío o recoges en tienda.` },
];

export function HomePage() {
  const { data, error, loading } = useApi<HomeDTO>('/api/home');

  return (
    <>
      {/* Hero */}
      <section className={styles.heroWrap}>
        <div className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Imprenta + publicidad para negocios</p>
            <h1 className={styles.h1}>Todo lo que tu negocio necesita para que lo vean.</h1>
            <p className={styles.lead}>
              Tarjetas, flyers, lonas, promocionales, logotipo y redes sociales. Cotiza en línea en
              un minuto o mándanos WhatsApp.
            </p>
            <div className={styles.ctas}>
              <Button to="/productos" size="lg">
                Cotizar ahora
              </Button>
              <Button to="/paquetes" size="lg" variant="secondary">
                Ver paquetes por giro
              </Button>
            </div>
            <ul role="list" className={styles.trust}>
              {trustPoints.map((t) => (
                <li key={t.text}>
                  <Icon name={t.icon} size={20} />
                  {t.text}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.mockups} aria-hidden="true">
            <div className={styles.lona}>
              <span className={styles.lonaBrand}>{site.brand}</span>
              <span className={styles.lonaBar} />
              <span className={styles.lonaText}>Ya abrimos</span>
            </div>
            <div className={styles.flyer}>
              <span className={styles.flyerHead} />
              <span className={styles.flyerTitle}>Promoción</span>
              <span className={styles.line} />
              <span className={styles.line} />
              <span className={`${styles.line} ${styles.short}`} />
              <span className={styles.flyerBtn} />
            </div>
            <div className={styles.tarjeta}>
              <span className={styles.tarjetaLogo} />
              <span className={styles.tarjetaLine} />
              <span className={`${styles.tarjetaLine} ${styles.short}`} />
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className={`container ${styles.section}`} aria-labelledby="cats-title">
        <h2 id="cats-title" className={styles.h2}>
          ¿Qué necesitas hoy?
        </h2>
        {error && !data && <LoadError message={error} />}
        {loading && !data ? (
          <SkeletonGrid count={5} height={150} />
        ) : (
          <ul role="list" className={styles.cats}>
            {data?.categorias.map((c) => (
              <li key={c.slug}>
                <Link to={`/productos/${c.slug}`} className={styles.cat}>
                  <span className={styles.catIcon}>
                    <Icon name={iconForCategory(c.slug)} size={26} />
                  </span>
                  <span className={styles.catName}>{c.nombre}</span>
                  <span className={styles.catDesc}>{c.descripcion}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lo más pedido */}
      <section className={`container ${styles.section}`} aria-labelledby="top-title">
        <div className={styles.sectionHead}>
          <h2 id="top-title" className={styles.h2}>
            Lo más pedido
          </h2>
          <Link to="/productos" className={styles.more}>
            Ver todo el catálogo <Icon name="arrowRight" size={18} />
          </Link>
        </div>
        {loading && !data ? (
          <SkeletonGrid count={4} />
        ) : (
          <ul role="list" className={styles.products}>
            {data?.masPedidos.map((p) => (
              <li key={p.slug}>
                <ProductCard product={p} showCta />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Paquetes destacados */}
      <section className={styles.darkWrap} aria-labelledby="pkg-title">
        <div className="container">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrowDark}>Paquetes por giro</p>
              <h2 id="pkg-title" className={styles.h2}>
                Todo junto cuesta menos.
              </h2>
              <p className={styles.darkLead}>
                Si ya vas a pedir tarjetas o una lona, el paquete de tu giro trae eso y lo que te
                falta, por menos que comprar cada pieza por separado.
              </p>
            </div>
            <Link to="/paquetes" className={`${styles.more} ${styles.moreDark}`}>
              Ver todos los paquetes <Icon name="arrowRight" size={18} />
            </Link>
          </div>
          {loading && !data ? (
            <SkeletonGrid count={3} height={420} />
          ) : (
            <ul role="list" className={styles.packages}>
              {data?.paquetesDestacados.map((p) => (
                <li key={p.slug}>
                  <PackageCard pkg={p} tone="dark" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className={`container ${styles.section}`}
        aria-labelledby="how-title"
      >
        <h2 id="how-title" className={styles.h2}>
          Cómo funciona
        </h2>
        <ol role="list" className={styles.steps}>
          {steps.map((s, i) => (
            <li key={s.title} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">
                {i + 1}
              </span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepText}>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Banner WhatsApp */}
      <section className="container" aria-labelledby="help-title">
        <div className={styles.banner}>
          <div>
            <h2 id="help-title" className={styles.bannerTitle}>
              ¿No sabes qué necesitas?
            </h2>
            <p className={styles.bannerText}>
              Cuéntanos de tu negocio y te recomendamos qué pedir según tu presupuesto.
            </p>
          </div>
          <Button
            href={whatsappLink('Hola, quiero que me recomienden qué publicidad pedir.')}
            variant="light"
            size="lg"
          >
            <Icon name="chat" size={20} />
            Escríbenos por WhatsApp
          </Button>
        </div>
      </section>
    </>
  );
}
