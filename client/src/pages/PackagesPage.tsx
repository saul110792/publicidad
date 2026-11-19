import { useNavigate, useSearchParams } from 'react-router';
import { GIROS, type PackageDTO, type ServiceDTO } from '@publicidad/shared';
import { PackageCard } from '../components/catalog/PackageCard';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { LoadError, SkeletonGrid } from '../components/ui/Skeleton';
import { price } from '../lib/format';
import { useApi } from '../lib/useApi';
import { whatsappLink } from '../lib/whatsapp';
import styles from './PackagesPage.module.css';
import { usePageMeta } from '../lib/usePageMeta';

const CHIPS = [{ value: '', label: 'Todos' }, ...GIROS];

export function PackagesPage() {
  usePageMeta(
    'Paquetes por giro',
    'Paquetes de publicidad e impresión por tipo de negocio, más baratos que comprar cada pieza por separado.',
  );
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const giro = params.get('giro') ?? '';

  const pkgs = useApi<PackageDTO[]>(`/api/packages${giro ? `?giro=${giro}` : ''}`);
  const services = useApi<ServiceDTO[]>('/api/services');

  function selectGiro(value: string) {
    navigate(value ? `/paquetes?giro=${value}` : '/paquetes', {
      replace: true,
      state: { keepScroll: true },
    });
  }

  return (
    <>
      <section className={styles.hero} aria-labelledby="pkgs-title">
        <div className="container">
          <p className={styles.eyebrow}>Paquetes por giro</p>
          <h1 id="pkgs-title" className={styles.title}>
            Todo lo que tu negocio necesita, en un solo pedido.
          </h1>
          <p className={styles.lead}>
            Cada paquete junta lo que más piden los negocios de tu giro y cuesta menos que comprar
            cada pieza por separado.
          </p>
          <div className={styles.chips} role="group" aria-label="Filtrar por giro">
            {CHIPS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={styles.chip}
                aria-pressed={giro === c.value}
                onClick={() => selectGiro(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-label="Paquetes">
        {pkgs.error && <LoadError message={pkgs.error} />}
        {!pkgs.data && pkgs.loading && <SkeletonGrid count={3} height={460} />}
        {pkgs.data && (
          <ul
            role="list"
            className={`${styles.grid} ${pkgs.loading ? styles.stale : ''}`}
            aria-busy={pkgs.loading}
          >
            {pkgs.data.map((p) => (
              <li key={p.slug}>
                <PackageCard pkg={p} headingLevel="h2" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="services-title">
        <h2 id="services-title" className={styles.h2}>
          Servicios mensuales
        </h2>
        <p className={styles.sectionLead}>
          Para que te sigan encontrando después de imprimir: nos encargamos de tus redes, anuncios y
          página web cada mes.
        </p>
        {services.error && <LoadError message={services.error} />}
        {!services.data && services.loading && <SkeletonGrid count={3} height={200} />}
        <ul role="list" className={styles.services}>
          {services.data?.map((s) => (
            <li key={s.slug} className={styles.service}>
              <h3 className={styles.serviceName}>{s.nombre}</h3>
              <p className={styles.serviceDesc}>{s.descripcion}</p>
              <p className={styles.servicePrice}>
                {price(s.precioMensual)}
                <span> /mes</span>
              </p>
              <Button
                href={whatsappLink(`Hola, me interesa el servicio de ${s.nombre}.`)}
                variant="whatsapp"
                block
              >
                <Icon name="whatsapp" size={20} />
                Me interesa
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="container" aria-labelledby="custom-title">
        <div className={styles.banner}>
          <div>
            <h2 id="custom-title" className={styles.bannerTitle}>
              ¿Tu giro no aparece? Arma tu propio paquete.
            </h2>
            <p className={styles.bannerText}>
              Dinos qué necesitas y te armamos un paquete con descuento.
            </p>
          </div>
          <Button
            href={whatsappLink('Hola, quiero armar un paquete para mi negocio.')}
            variant="whatsapp"
            size="lg"
          >
            <Icon name="whatsapp" size={22} />
            Armar mi paquete
          </Button>
        </div>
      </section>
    </>
  );
}
