import { Link } from 'react-router';
import type { HomeDTO } from '@publicidad/shared';
import { PackageCard } from '../components/catalog/PackageCard';
import { ProductCard } from '../components/catalog/ProductCard';
import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { LoadError, SkeletonGrid } from '../components/ui/Skeleton';
import { site } from '../config/site';
import {
  answerSteps,
  comparison,
  diagnosisMessage,
  idealClient,
  method,
  problems,
  rhythm,
  sectors,
  services,
} from '../config/consulting';
import { iconForCategory } from '../config/categoryIcons';
import { categoryImage } from '../config/productImages';
import { useApi } from '../lib/useApi';
import { whatsappLink } from '../lib/whatsapp';
import styles from './HomePage.module.css';
import { usePageMeta } from '../lib/usePageMeta';

const storeSteps: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'search',
    title: 'Elige y cotiza',
    text: 'Escoge tu producto y ve el precio al momento.',
  },
  {
    icon: 'upload',
    title: 'Sube tu diseño o pídelo',
    text: 'Manda tu archivo o deja que lo diseñemos por ti.',
  },
  {
    icon: 'eye',
    title: 'Aprueba la prueba digital',
    text: 'Te la mandamos por WhatsApp. No imprimimos sin tu OK.',
  },
  {
    icon: 'truck',
    title: 'Recibe o recoge',
    text: `Listo en ${site.deliveryTime}. Envío o recoges en tienda.`,
  },
];

/** Barras de la gráfica decorativa del hero: dos de línea base y tres del piloto. */
const bars = ['base', 'base', 'up', 'up', 'up'] as const;

export function HomePage() {
  usePageMeta(null);
  const { data, error, loading } = useApi<HomeDTO>('/api/home');

  return (
    <>
      {/* Hero */}
      <section className={styles.heroWrap}>
        <div className={`container ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Crecimiento comercial basado en resultados</p>
            <h1 className={styles.h1}>
              No somos sólo una agencia: <span>somos un socio de crecimiento.</span>
            </h1>
            <p className={styles.lead}>
              Diagnosticamos tu negocio, encontramos dónde se fuga la rentabilidad y ejecutamos
              mejoras comerciales, operativas y digitales. El éxito se mide con indicadores
              acordados y una línea base verificable.
            </p>
            <div className={styles.ctas}>
              <Button to="/diagnostico" size="lg" variant="gold">
                Solicitar diagnóstico
              </Button>
              <Button to="/#metodo" size="lg" variant="ghost-dark">
                Cómo trabajamos
              </Button>
            </div>
          </div>

          <figure className={styles.panel} aria-hidden="true">
            <div className={styles.panelHead}>
              <span className={styles.panelLabel}>Utilidad mensual</span>
              <span className={styles.panelTag}>
                <Icon name="trendUp" size={16} />
                Incremento medido
              </span>
            </div>
            <div className={styles.chart}>
              <span className={styles.baseline} />
              {bars.map((kind, i) => (
                <span
                  key={i}
                  className={`${styles.bar} ${kind === 'base' ? styles.barBase : ''}`}
                />
              ))}
            </div>
            <div className={styles.chartAxis}>
              <span>Línea base</span>
              <span>Piloto 90 días</span>
            </div>
          </figure>
        </div>
      </section>

      {/* El problema */}
      <section className={`container ${styles.section}`} aria-labelledby="problem-title">
        <p className={styles.kicker}>El problema que resolvemos</p>
        <h2 id="problem-title" className={styles.h2}>
          Los negocios suelen comprar acciones aisladas.
        </h2>
        <ul role="list" className={styles.cards3}>
          {problems.map((p) => (
            <li key={p.title} className={`${styles.toneCard} ${styles[p.tone]}`}>
              <h3 className={styles.cardTitle}>{p.title}</h3>
              <p className={styles.cardText}>{p.text}</p>
            </li>
          ))}
        </ul>
        <div className={styles.answer}>
          <p className={styles.answerLabel}>Nuestra respuesta</p>
          <ol role="list" className={styles.answerSteps}>
            {answerSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </section>

      {/* Servicios */}
      <div className={styles.band}>
        <section
          id="servicios"
          className={`container ${styles.section}`}
          aria-labelledby="services-title"
        >
          <p className={styles.kicker}>Capacidades propias y servicios integrales</p>
          <h2 id="services-title" className={styles.h2}>
            ¿Qué incluye nuestro servicio?
          </h2>
          <ul role="list" className={styles.services}>
            {services.map((s) => (
              <li key={s.title} className={`${styles.service} ${styles[s.tone]}`}>
                <span className={styles.serviceIcon} aria-hidden="true">
                  <Icon name={s.icon} size={24} />
                </span>
                <h3 className={styles.cardTitle}>{s.title}</h3>
                <p className={styles.cardText}>{s.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Método */}
      <section id="metodo" className={styles.darkWrap} aria-labelledby="method-title">
        <div className="container">
          <p className={styles.eyebrowDark}>Un sistema repetible de 6 etapas</p>
          <h2 id="method-title" className={styles.h2}>
            Método de trabajo
          </h2>
          <ol role="list" className={styles.method}>
            {method.map((m, i) => (
              <li key={m.title} className={styles.methodStep}>
                <span className={styles.methodNum} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.methodTitle}>{m.title}</h3>
                <p className={styles.methodText}>{m.text}</p>
              </li>
            ))}
          </ol>
          <dl className={styles.rhythm}>
            {rhythm.map((r) => (
              <div key={r.label}>
                <dt>{r.value}</dt>
                <dd>{r.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Modelo de honorario */}
      <section className={`container ${styles.section}`} aria-labelledby="model-title">
        <p className={styles.kicker}>Honorario alineado al valor creado</p>
        <h2 id="model-title" className={styles.h2}>
          Cobramos una parte de la utilidad que ayudamos a generar.
        </h2>
        <div className={styles.model}>
          <ol role="list" className={styles.formula}>
            <li>
              <span className={styles.formulaLabel}>Utilidad base</span>
              <span className={styles.formulaText}>
                Lo que tu negocio gana hoy, medido y acordado.
              </span>
            </li>
            <li>
              <span className={styles.formulaLabel}>Utilidad medida</span>
              <span className={styles.formulaText}>
                Lo que gana en un periodo comparable después de las mejoras.
              </span>
            </li>
            <li className={styles.formulaResult}>
              <span className={styles.formulaLabel}>Incremento</span>
              <span className={styles.formulaText}>
                Nuestro honorario es un porcentaje acordado de esta diferencia.
              </span>
            </li>
          </ol>
          <p className={styles.modelNote}>
            Los costos de nuestros servicios profesionales y publicitarios corren por nuestra
            cuenta. Las licencias, impuestos y gastos propios de la actividad se consideran para
            calcular la utilidad medida.{' '}
            <Link to="/diagnostico#medicion">Cómo medimos de forma justa</Link>
          </p>
        </div>

        <div className={styles.compare}>
          <div className={styles.compareCol}>
            <h3 className={styles.compareTitle}>Agencia tradicional</h3>
            <ul role="list">
              {comparison.agency.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className={`${styles.compareCol} ${styles.compareUs}`}>
            <h3 className={styles.compareTitle}>{site.brand}</h3>
            <ul role="list">
              {comparison.us.map((c) => (
                <li key={c}>
                  <Icon name="check" size={18} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Cliente ideal */}
      <div className={styles.band}>
        <section className={`container ${styles.section}`} aria-labelledby="ideal-title">
          <div className={styles.ideal}>
            <div>
              <p className={styles.kicker}>Con quién trabajamos</p>
              <h2 id="ideal-title" className={styles.h2}>
                Negocios con posibilidad real de mejorar.
              </h2>
              <ul role="list" className={styles.checks}>
                {idealClient.map((c) => (
                  <li key={c}>
                    <Icon name="check" size={20} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.sectorsBox}>
              <h3 className={styles.cardTitle}>Prioridad inicial</h3>
              <ul role="list" className={styles.sectors}>
                {sectors.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p className={styles.cardText}>
                No sustituimos tu administración: trabajamos con tus responsables y tus datos para
                construir mejoras que se sostengan.
              </p>
              <Button to="/diagnostico" variant="dark" block>
                Ver cómo es el diagnóstico
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Tienda de publicidad */}
      <section id="tienda" className={`container ${styles.section}`} aria-labelledby="store-title">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Agencia integral de publicidad</p>
            <h2 id="store-title" className={styles.h2}>
              Tienda de publicidad
            </h2>
            <p className={styles.sectionLead}>
              Si lo que necesitas hoy es material, cotízalo en línea: impresos, gran formato,
              promocionales, identidad de marca y servicios digitales.
            </p>
          </div>
          <Link to="/productos" className={styles.more}>
            Ver todo el catálogo <Icon name="arrowRight" size={18} />
          </Link>
        </div>
        {error && !data && <LoadError message={error} />}
        {loading && !data ? (
          <SkeletonGrid count={5} height={150} />
        ) : (
          <ul role="list" className={styles.cats}>
            {data?.categorias.map((c) => (
              <li key={c.slug}>
                <Link to={`/productos/${c.slug}`} className={styles.cat}>
                  <span className={styles.catMedia} aria-hidden="true">
                    {categoryImage(c.slug) ? (
                      <img
                        src={categoryImage(c.slug)!}
                        alt=""
                        width={400}
                        height={300}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Icon name={iconForCategory(c.slug)} size={32} />
                    )}
                  </span>
                  <span className={styles.catName}>{c.nombre}</span>
                  <span className={styles.catDesc}>{c.descripcion}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <h3 className={styles.h3}>Lo más pedido</h3>
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
      <section className={styles.pkgWrap} aria-labelledby="pkg-title">
        <div className="container">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Paquetes por giro</p>
              <h2 id="pkg-title" className={styles.h2}>
                Todo junto cuesta menos.
              </h2>
              <p className={styles.sectionLead}>
                Si ya vas a pedir tarjetas o una lona, el paquete de tu giro trae eso y lo que te
                falta, por menos que comprar cada pieza por separado.
              </p>
            </div>
            <Link to="/paquetes" className={styles.more}>
              Ver todos los paquetes <Icon name="arrowRight" size={18} />
            </Link>
          </div>
          {loading && !data ? (
            <SkeletonGrid count={3} height={420} />
          ) : (
            <ul role="list" className={styles.packages}>
              {data?.paquetesDestacados.map((p) => (
                <li key={p.slug}>
                  <PackageCard pkg={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Cómo funciona la tienda */}
      <section
        id="como-funciona"
        className={`container ${styles.section}`}
        aria-labelledby="how-title"
      >
        <h2 id="how-title" className={styles.h2}>
          Cómo funciona la tienda
        </h2>
        <ol role="list" className={styles.steps}>
          {storeSteps.map((s, i) => (
            <li key={s.title} className={styles.step}>
              <span className={styles.stepHead} aria-hidden="true">
                <span className={styles.stepIcon}>
                  <Icon name={s.icon} size={24} />
                </span>
                <span className={styles.stepNum}>{i + 1}</span>
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
              ¿Sabes cuánto gana hoy tu negocio y por qué?
            </h2>
            <p className={styles.bannerText}>
              Platícanos de tu empresa. Si hay espacio para mejorar, te proponemos un diagnóstico
              con línea base medible.
            </p>
          </div>
          <Button href={whatsappLink(diagnosisMessage)} variant="whatsapp" size="lg">
            <Icon name="whatsapp" size={22} />
            Escríbenos por WhatsApp
          </Button>
        </div>
      </section>
    </>
  );
}
